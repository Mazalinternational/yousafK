import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Response } from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../../common/auth/auth-types.js';
import { authConfig } from '../../common/auth/auth.config.js';
import {
  clearAuthCookies,
  setAccessCookie,
  setCsrfCookie,
  setRefreshCookie,
} from '../../common/auth/cookie.util.js';
import { PermissionCacheService } from '../../common/auth/permission-cache.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { ResetPasswordDto } from './dto/reset-password.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import {
  buildProfilePictureFileName,
  buildProfilePictureUrl,
  isAllowedProfilePictureMime,
  MAX_PROFILE_PICTURE_BYTES,
  PROFILE_UPLOAD_DIR,
  resolveProfilePictureDiskPath,
} from './profile-picture.util.js';

interface RequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

const sha256 = (input: string) =>
  createHash('sha256').update(input).digest('hex');
const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly permCache: PermissionCacheService,
  ) {}

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto, res: Response, ctx: RequestContext) {
    const emailNormalized = normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: { emailNormalized, deletedAt: null },
    });

    // Always run a hash comparison to avoid leaking whether the email exists
    // via a measurable timing difference.
    if (!user) {
      await argon2
        .verify(
          '$argon2id$v=19$m=65536,t=3,p=4$ZHVtbXkxMjM0NTY3OA$kY8Ws3i4nQlIb0r9jB+T93xxK3Z4q5sM3FJv2Vt93vY',
          dto.password,
        )
        .catch(() => false);
      await this.audit.record({
        action: 'auth.login',
        module: 'auth',
        status: 'failure',
        actorEmail: emailNormalized,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        metadata: { reason: 'unknown_email' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.recordFailure(user.id, emailNormalized, ctx, 'inactive');
      throw new UnauthorizedException('Account disabled');
    }

    if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordFailure(user.id, emailNormalized, ctx, 'locked');
      throw new UnauthorizedException(
        `Account temporarily locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    const ok = await argon2
      .verify(user.passwordHash, dto.password)
      .catch(() => false);
    if (!ok) {
      await this.handleFailedLogin(user.id, emailNormalized, ctx);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Successful credentials -> reset counters, create session+tokens.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        isLocked: false,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ctx.ip ?? null,
      },
    });

    const tokens = await this.createSessionAndTokens(user.id, ctx);
    this.applyAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.csrfToken,
    );
    this.permCache.invalidate(user.id);
    const userPayload = await this.buildUserPayload(user.id);

    await this.audit.record({
      action: 'auth.login',
      module: 'auth',
      status: 'success',
      userId: user.id,
      actorEmail: emailNormalized,
      ipAddress: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: { sessionId: tokens.sessionId },
    });

    return { user: userPayload };
  }

  // ---------------------------------------------------------------------------
  // REFRESH (rotation + reuse detection)
  // ---------------------------------------------------------------------------

  async refresh(
    rawRefreshToken: string,
    payload: RefreshTokenPayload,
    res: Response,
    ctx: RequestContext,
  ) {
    const tokenHash = sha256(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      // Token signature was valid but it isn't in our DB. Could be a previously
      // revoked token whose row was wiped, or a forged-but-validly-signed
      // token (very unlikely with a strong secret). Try to invalidate the
      // family if we can find one by jti->family.
      await this.maybeInvalidateFamilyByJti(payload.family);
      clearAuthCookies(res);
      throw new UnauthorizedException('Refresh token invalid');
    }

    // Reuse detection: if this token has already been revoked, an attacker
    // (or an old browser tab) is trying to spend it again -> kill the family.
    if (stored.revokedAt) {
      await this.invalidateFamily(stored.family, 'reuse_detected');
      clearAuthCookies(res);
      await this.audit.record({
        action: 'auth.refresh.reuse_detected',
        module: 'auth',
        status: 'failure',
        userId: stored.userId,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        metadata: { family: stored.family },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt < new Date()) {
      clearAuthCookies(res);
      throw new UnauthorizedException('Refresh token expired');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: stored.sessionId },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      clearAuthCookies(res);
      throw new UnauthorizedException('Session no longer valid');
    }

    // Mint replacement tokens, then atomically revoke the old refresh row and
    // insert the new one — rotation.
    const newJti = randomUUID();
    const newRefresh = await this.signRefreshToken({
      sub: stored.userId,
      sid: stored.sessionId,
      family: stored.family,
      jti: newJti,
    });
    const newRefreshHash = sha256(newRefresh);
    const refreshExpiresAt = new Date(
      Date.now() + authConfig.refreshTokenTtlMs,
    );

    const accessToken = await this.signAccessToken({
      sub: stored.userId,
      sid: stored.sessionId,
    });
    const csrfToken = randomBytes(32).toString('hex');

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          id: newJti,
          userId: stored.userId,
          sessionId: stored.sessionId,
          tokenHash: newRefreshHash,
          family: stored.family,
          expiresAt: refreshExpiresAt,
          ipAddress: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      }),
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { replacedById: newJti },
      }),
      this.prisma.session.update({
        where: { id: stored.sessionId },
        data: { lastUsedAt: new Date() },
      }),
    ]);

    this.applyAuthCookies(res, accessToken, newRefresh, csrfToken);
    const userPayload = await this.buildUserPayload(stored.userId);

    await this.audit.record({
      action: 'auth.refresh',
      module: 'auth',
      status: 'success',
      userId: stored.userId,
      ipAddress: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: { sessionId: stored.sessionId, family: stored.family },
    });

    return { user: userPayload };
  }

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------

  async logout(
    userId: string,
    sessionId: string,
    res: Response,
    ctx: RequestContext,
  ) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    clearAuthCookies(res);
    this.permCache.invalidate(userId);

    await this.audit.record({
      action: 'auth.logout',
      module: 'auth',
      status: 'success',
      userId,
      ipAddress: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: { sessionId },
    });
  }

  // ---------------------------------------------------------------------------
  // FORGOT / RESET / CHANGE PASSWORD
  // ---------------------------------------------------------------------------

  /**
   * Issue a reset token. We always return success (HTTP 200) to avoid email
   * enumeration. In dev (per ADR), we log the token to the server console so
   * the developer can copy it; in prod you'd swap this for an email send.
   */
  async forgotPassword(dto: ForgotPasswordDto, ctx: RequestContext) {
    const emailNormalized = normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: { emailNormalized, deletedAt: null },
    });

    if (user && user.isActive) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = sha256(rawToken);
      const expiresAt = new Date(Date.now() + authConfig.passwordResetTtlMs);

      await this.prisma.$transaction([
        this.prisma.passwordReset.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        }),
        this.prisma.passwordReset.create({
          data: { userId: user.id, tokenHash, expiresAt },
        }),
      ]);

      const link = `${authConfig.frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
      this.logger.warn(
        `[password-reset] (DEV) email=${emailNormalized} link=${link} (replace this log with an email send in production)`,
      );

      await this.audit.record({
        action: 'auth.password.reset.requested',
        module: 'auth',
        status: 'success',
        userId: user.id,
        actorEmail: emailNormalized,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      });
    } else {
      await this.audit.record({
        action: 'auth.password.reset.requested',
        module: 'auth',
        status: 'failure',
        actorEmail: emailNormalized,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        metadata: { reason: 'unknown_or_inactive' },
      });
    }
  }

  async resetPassword(dto: ResetPasswordDto, ctx: RequestContext) {
    const tokenHash = sha256(dto.token);
    const reset = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
    });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: now,
          failedLoginCount: 0,
          isLocked: false,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: now },
      }),
      // Invalidate every existing session/refresh-token: forces re-login.
      this.prisma.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    this.permCache.invalidate(reset.userId);

    await this.audit.record({
      action: 'auth.password.reset.completed',
      module: 'auth',
      status: 'success',
      userId: reset.userId,
      ipAddress: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ctx: RequestContext,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const ok = await argon2
      .verify(user.passwordHash, dto.currentPassword)
      .catch(() => false);
    if (!ok) {
      await this.audit.record({
        action: 'auth.password.change',
        module: 'auth',
        status: 'failure',
        userId,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        metadata: { reason: 'wrong_current_password' },
      });
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });
    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, passwordChangedAt: now },
    });

    await this.audit.record({
      action: 'auth.password.change',
      module: 'auth',
      status: 'success',
      userId,
      ipAddress: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    });
  }

  // ---------------------------------------------------------------------------
  // GET CURRENT USER (used by /auth/me on app boot)
  // ---------------------------------------------------------------------------

  async getMe(userId: string) {
    return this.buildUserPayload(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    return this.buildUserPayload(userId);
  }

  async uploadProfilePicture(
    userId: string,
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
        }
      | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Profile picture file is required');
    }

    if (!isAllowedProfilePictureMime(file.mimetype)) {
      throw new BadRequestException(
        'Profile picture must be a JPEG, PNG, WebP, or GIF image',
      );
    }

    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
      throw new BadRequestException('Profile picture must be 2 MB or smaller');
    }

    const fileName = buildProfilePictureFileName(userId, file.mimetype);
    if (!fileName) {
      throw new BadRequestException('Unsupported image type');
    }

    if (!existsSync(PROFILE_UPLOAD_DIR)) {
      mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicturePath: true },
    });
    if (!user) throw new UnauthorizedException();

    const diskPath = resolveProfilePictureDiskPath(fileName);
    const { writeFile } = await import('node:fs/promises');
    await writeFile(diskPath, file.buffer);

    if (user.profilePicturePath && user.profilePicturePath !== fileName) {
      await this.deleteProfilePictureFile(user.profilePicturePath);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePicturePath: fileName },
    });

    return this.buildUserPayload(userId);
  }

  async removeProfilePicture(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicturePath: true },
    });
    if (!user) throw new UnauthorizedException();

    if (user.profilePicturePath) {
      await this.deleteProfilePictureFile(user.profilePicturePath);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePicturePath: null },
    });

    return this.buildUserPayload(userId);
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  private async deleteProfilePictureFile(fileName: string) {
    try {
      await unlink(resolveProfilePictureDiskPath(fileName));
    } catch {
      // ignore missing files
    }
  }

  private async buildUserPayload(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicturePath: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    const { roles, permissions, isAdmin } =
      await this.permCache.getForUser(userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profilePictureUrl: buildProfilePictureUrl(user.profilePicturePath),
      isActive: user.isActive,
      roles,
      permissions: isAdmin ? ['*'] : Array.from(permissions),
      isAdmin,
      createdAt: user.createdAt,
    };
  }

  private async createSessionAndTokens(userId: string, ctx: RequestContext) {
    const family = randomUUID();
    const sessionExpiresAt = new Date(
      Date.now() + authConfig.refreshTokenTtlMs,
    );
    const session = await this.prisma.session.create({
      data: {
        userId,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        expiresAt: sessionExpiresAt,
      },
    });

    const refreshJti = randomUUID();
    const refreshToken = await this.signRefreshToken({
      sub: userId,
      sid: session.id,
      family,
      jti: refreshJti,
    });
    const refreshHash = sha256(refreshToken);
    const refreshExpiresAt = new Date(
      Date.now() + authConfig.refreshTokenTtlMs,
    );

    await this.prisma.refreshToken.create({
      data: {
        id: refreshJti,
        userId,
        sessionId: session.id,
        tokenHash: refreshHash,
        family,
        expiresAt: refreshExpiresAt,
        ipAddress: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    });

    const accessToken = await this.signAccessToken({
      sub: userId,
      sid: session.id,
    });
    const csrfToken = randomBytes(32).toString('hex');

    return { accessToken, refreshToken, csrfToken, sessionId: session.id };
  }

  private applyAuthCookies(
    res: Response,
    access: string,
    refresh: string,
    csrf: string,
  ) {
    clearAuthCookies(res);
    setAccessCookie(res, access, authConfig.accessTokenTtlMs);
    setRefreshCookie(res, refresh, authConfig.refreshTokenTtlMs);
    setCsrfCookie(res, csrf, authConfig.csrfTtlMs);
  }

  private signAccessToken(claims: {
    sub: string;
    sid: string;
  }): Promise<string> {
    const payload: AccessTokenPayload = { ...claims, type: 'access' };
    return this.jwt.signAsync(payload, {
      secret: authConfig.jwt.accessSecret,
      expiresIn: Math.floor(authConfig.accessTokenTtlMs / 1000),
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });
  }

  private signRefreshToken(claims: {
    sub: string;
    sid: string;
    family: string;
    jti: string;
  }): Promise<string> {
    // `jti` lives directly on the payload so JWT consumers see it as a
    // standard claim. We deliberately don't pass `options.jwtid` — that
    // would conflict with the existing payload claim.
    const payload: RefreshTokenPayload = { ...claims, type: 'refresh' };
    return this.jwt.signAsync(payload, {
      secret: authConfig.jwt.refreshSecret,
      expiresIn: Math.floor(authConfig.refreshTokenTtlMs / 1000),
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });
  }

  private async handleFailedLogin(
    userId: string,
    email: string,
    ctx: RequestContext,
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
    });
    let lockedUntil: Date | null = null;
    let isLocked = updated.isLocked;
    if (updated.failedLoginCount >= authConfig.maxFailedLogins) {
      lockedUntil = new Date(Date.now() + authConfig.lockoutDurationMs);
      isLocked = true;
      await this.prisma.user.update({
        where: { id: userId },
        data: { isLocked: true, lockedUntil, failedLoginCount: 0 },
      });
    }

    await this.audit.record({
      action: 'auth.login',
      module: 'auth',
      status: 'failure',
      userId,
      actorEmail: email,
      ipAddress: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: {
        reason: 'bad_password',
        failedCount: updated.failedLoginCount,
        lockedUntil: lockedUntil?.toISOString() ?? null,
        isLocked,
      },
    });
  }

  private async recordFailure(
    userId: string,
    email: string,
    ctx: RequestContext,
    reason: string,
  ) {
    await this.audit.record({
      action: 'auth.login',
      module: 'auth',
      status: 'failure',
      userId,
      actorEmail: email,
      ipAddress: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: { reason },
    });
  }

  private async invalidateFamily(family: string, reason: string) {
    const now = new Date();
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: {
        revokedAt: now,
        reuseDetectedAt: reason === 'reuse_detected' ? now : null,
      },
    });
    const session = await this.prisma.refreshToken.findFirst({
      where: { family },
      select: { sessionId: true },
    });
    if (session) {
      await this.prisma.session.update({
        where: { id: session.sessionId },
        data: { revokedAt: now },
      });
    }
  }

  private async maybeInvalidateFamilyByJti(family: string) {
    if (!family) return;
    await this.invalidateFamily(family, 'unknown_token');
  }
}
