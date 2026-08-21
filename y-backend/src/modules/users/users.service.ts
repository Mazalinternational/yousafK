import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PermissionCacheService } from '../../common/auth/permission-cache.service.js';
import { SYSTEM_ROLES } from '../../common/rbac/roles.const.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AssignRolesDto } from './dto/assign-roles.dto.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

interface ActorContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permCache: PermissionCacheService,
  ) {}

  async findAll(filters: {
    pageNumber?: number;
    pageSize?: number;
    query?: string;
    isActive?: boolean;
    role?: string;
  }) {
    const page = Math.max(1, Number(filters.pageNumber) || 1);
    const size = Math.min(100, Math.max(1, Number(filters.pageSize) || 25));

    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (typeof filters.isActive === 'boolean')
      where.isActive = filters.isActive;
    if (filters.query?.trim()) {
      const q = filters.query.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { emailNormalized: { contains: q.toLowerCase() } },
      ];
    }
    if (filters.role) {
      where.roles = { some: { role: { slug: filters.role } } };
    }

    const [items, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalCount / size));

    return {
      items: items.map((u) => this.serialize(u)),
      totalCount,
      pageNumber: page,
      pageSize: size,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      isFirstPage: page === 1,
      isLastPage: page >= totalPages,
      firstPageNumber: 1,
      lastPageNumber: totalPages,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.serialize(user);
  }

  async create(dto: CreateUserDto, actor: ActorContext) {
    const emailNormalized = normalizeEmail(dto.email);
    const existing = await this.prisma.user.findFirst({
      where: { emailNormalized },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const created = await this.prisma.$transaction(async (tx) => {
      // If the email existed but the user was soft-deleted, "restore" that row
      // instead of creating a new one (unique constraints would block anyway).
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              email: dto.email.trim(),
              emailNormalized,
              name: dto.name.trim(),
              passwordHash,
              isActive: dto.isActive ?? true,
              deletedAt: null,
              isLocked: false,
              lockedUntil: null,
              failedLoginCount: 0,
              createdById: actor.actorId,
              passwordChangedAt: new Date(),
            },
          })
        : await tx.user.create({
            data: {
              email: dto.email.trim(),
              emailNormalized,
              name: dto.name.trim(),
              passwordHash,
              isActive: dto.isActive ?? true,
              createdById: actor.actorId,
              passwordChangedAt: new Date(),
            },
          });

      // Reset roles for restored users as well.
      if (existing) {
        await tx.userRole.deleteMany({ where: { userId: user.id } });
      }
      if (dto.roles?.length) {
        await this.assignRoleSlugs(tx, user.id, dto.roles, actor.actorId);
      }
      return user;
    });

    await this.audit.record({
      action: 'user.create',
      module: 'users',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: created.id,
      resourceType: 'user',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
      metadata: { email: created.email, roles: dto.roles ?? [] },
    });

    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateUserDto, actor: ActorContext) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) {
      const emailNormalized = normalizeEmail(dto.email);
      const dup = await this.prisma.user.findFirst({
        where: { emailNormalized, NOT: { id } },
      });
      if (dup)
        throw new ConflictException('A user with this email already exists');
      data.email = dto.email.trim();
      data.emailNormalized = emailNormalized;
    }
    if (typeof dto.isActive === 'boolean') data.isActive = dto.isActive;
    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password, {
        type: argon2.argon2id,
      });
      data.passwordChangedAt = new Date();
    }

    const updated = await this.prisma.user.update({ where: { id }, data });
    this.permCache.invalidate(id);

    await this.audit.record({
      action: 'user.update',
      module: 'users',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: id,
      resourceType: 'user',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
      metadata: {
        changedKeys: Object.keys(data).filter((k) => k !== 'passwordHash'),
        passwordReset: Boolean(dto.password),
      },
    });

    return this.findOne(updated.id);
  }

  async remove(id: string, actor: ActorContext) {
    if (id === actor.actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    // Free up unique email constraints for future re-use by "tombstoning" the
    // deleted user's email/emailNormalized. This also prevents accidentally
    // logging in with a deleted account email.
    const tombstone = `${user.emailNormalized}__deleted__${user.id}`;
    await this.prisma.$transaction([
      // Remove role links so roles aren't blocked from deletion later.
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: now,
          isActive: false,
          email: tombstone,
          emailNormalized: tombstone,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    this.permCache.invalidate(id);

    await this.audit.record({
      action: 'user.delete',
      module: 'users',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: id,
      resourceType: 'user',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });
    return { id };
  }

  async setActive(id: string, isActive: boolean, actor: ActorContext) {
    if (!isActive && id === actor.actorId) {
      throw new BadRequestException('You cannot disable your own account');
    }
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id }, data: { isActive } });
    if (!isActive) {
      const now = new Date();
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      });
    }
    this.permCache.invalidate(id);

    await this.audit.record({
      action: isActive ? 'user.enable' : 'user.disable',
      module: 'users',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: id,
      resourceType: 'user',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });
    return this.findOne(id);
  }

  async assignRoles(id: string, dto: AssignRolesDto, actor: ActorContext) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (dto.roles.length > 0) {
        await this.assignRoleSlugs(tx, id, dto.roles, actor.actorId);
      }
    });
    this.permCache.invalidate(id);

    await this.audit.record({
      action: 'user.role.assign',
      module: 'users',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: id,
      resourceType: 'user',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
      metadata: { roles: dto.roles },
    });
    return this.findOne(id);
  }

  async forceLogout(id: string, actor: ActorContext) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    this.permCache.invalidate(id);

    await this.audit.record({
      action: 'user.force_logout',
      module: 'users',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: id,
      resourceType: 'user',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });
  }

  async listSessions(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      device: s.device,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      isActive: !s.revokedAt && s.expiresAt > new Date(),
      createdAt: s.createdAt,
    }));
  }

  // ---------------------------------------------------------------------------
  private async assignRoleSlugs(
    tx: Prisma.TransactionClient,
    userId: string,
    slugs: string[],
    assignedBy: string,
  ) {
    const roles = await tx.role.findMany({ where: { slug: { in: slugs } } });
    if (roles.length !== slugs.length) {
      const found = new Set(roles.map((r) => r.slug));
      const missing = slugs.filter((s) => !found.has(s));
      throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
    }
    // Privilege-escalation guard: only an admin can grant the admin role.
    // This service is already gated by users.create / users.update permissions
    // at the controller level; here we just ensure non-admins can never
    // sneak in the admin slug.
    if (slugs.includes(SYSTEM_ROLES.ADMIN)) {
      const actorIsAdmin = await tx.userRole.findFirst({
        where: { userId: assignedBy, role: { slug: SYSTEM_ROLES.ADMIN } },
      });
      if (!actorIsAdmin) {
        throw new ForbiddenException('Only admins can grant the admin role');
      }
    }
    await tx.userRole.createMany({
      data: roles.map((r) => ({ userId, roleId: r.id, assignedBy })),
      skipDuplicates: true,
    });
  }

  private serialize(
    user: Prisma.UserGetPayload<{
      include: { roles: { include: { role: true } } };
    }>,
  ) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      isLocked: user.isLocked,
      lockedUntil: user.lockedUntil,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        slug: ur.role.slug,
        name: ur.role.name,
        isSystem: ur.role.isSystem,
      })),
    };
  }
}
