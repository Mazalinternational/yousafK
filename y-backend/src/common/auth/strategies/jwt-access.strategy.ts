import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { AccessTokenPayload, AuthenticatedUser } from '../auth-types.js';
import { authConfig } from '../auth.config.js';
import { ACCESS_COOKIE } from '../cookie.util.js';
import { PermissionCacheService } from '../permission-cache.service.js';

function cookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.[ACCESS_COOKIE] ?? null;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permCache: PermissionCacheService,
  ) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: authConfig.jwt.accessSecret,
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access')
      throw new UnauthorizedException('Invalid token type');

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        isLocked: true,
      },
    });
    if (!user || !user.isActive || user.isLocked) {
      throw new UnauthorizedException('User is not allowed to authenticate');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      select: { id: true, revokedAt: true, expiresAt: true, userId: true },
    });
    if (!session || session.userId !== user.id)
      throw new UnauthorizedException('Session not found');
    if (session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    const { roles, permissions, isAdmin } = await this.permCache.getForUser(
      user.id,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      sessionId: session.id,
      roles,
      permissions: Array.from(permissions),
      isAdmin,
    };
  }
}
