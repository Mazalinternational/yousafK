import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PermissionCacheService } from '../../common/auth/permission-cache.service.js';
import { SYSTEM_ROLES } from '../../common/rbac/roles.const.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { SetPermissionsDto } from './dto/set-permissions.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

interface ActorContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly permCache: PermissionCacheService,
  ) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    return roles.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return this.serialize(role);
  }

  async create(dto: CreateRoleDto, actor: ActorContext) {
    const slug = dto.slug.toLowerCase();
    if ((SYSTEM_ROLES as Record<string, string>)[slug.toUpperCase()] === slug) {
      throw new ConflictException(`'${slug}' is a reserved system role slug`);
    }
    const dup = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (dup)
      throw new ConflictException(
        'A role with that name or slug already exists',
      );

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description ?? null,
        },
      });
      if (dto.permissions?.length) {
        await this.assignPermissionsByKey(tx, created.id, dto.permissions);
      }
      return created;
    });

    await this.audit.record({
      action: 'role.create',
      module: 'roles',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: role.id,
      resourceType: 'role',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
      metadata: { slug, name: role.name, permissions: dto.permissions ?? [] },
    });

    this.permCache.invalidateAll();
    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto, actor: ActorContext) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    const data: Prisma.RoleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description;

    await this.prisma.role.update({ where: { id }, data });
    await this.audit.record({
      action: 'role.update',
      module: 'roles',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: id,
      resourceType: 'role',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    });
    this.permCache.invalidateAll();
    return this.findOne(id);
  }

  async remove(id: string, actor: ActorContext) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem)
      throw new ForbiddenException('System roles cannot be deleted');

    // Only count active (non-soft-deleted) users. Soft-deleted users should not
    // block role deletion.
    const userCount = await this.prisma.userRole.count({
      where: { roleId: id, user: { deletedAt: null } },
    });
    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${userCount} user(s) still have this role`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    await this.audit.record({
      action: 'role.delete',
      module: 'roles',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: id,
      resourceType: 'role',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
      metadata: { slug: role.slug },
    });
    this.permCache.invalidateAll();
    return { id };
  }

  async setPermissions(
    id: string,
    dto: SetPermissionsDto,
    actor: ActorContext,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.slug === SYSTEM_ROLES.ADMIN) {
      // Admin's permissions are computed implicitly via wildcard short-circuit;
      // we don't allow editing them through this endpoint to avoid confusion.
      throw new ForbiddenException(
        'The admin role has implicit access to all permissions and cannot be edited',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissions.length > 0) {
        await this.assignPermissionsByKey(tx, id, dto.permissions);
      }
      await tx.role.update({
        where: { id },
        data: { permissionsCustomizedAt: new Date() },
      });
    });

    const saved = await this.findOne(id);
    const savedKeys = new Set(saved.permissions.map((p) => p.key));
    const missing = [...new Set(dto.permissions)].filter((key) => !savedKeys.has(key));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Failed to persist permission(s): ${missing.join(', ')}`,
      );
    }

    await this.audit.record({
      action: 'role.permission.assign',
      module: 'roles',
      status: 'success',
      userId: actor.actorId,
      actorEmail: actor.actorEmail,
      resourceId: id,
      resourceType: 'role',
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
      metadata: { permissions: dto.permissions },
    });
    this.permCache.invalidateAll();
    return saved;
  }

  // ---------------------------------------------------------------------------
  private async assignPermissionsByKey(
    tx: Prisma.TransactionClient,
    roleId: string,
    keys: string[],
  ) {
    if (keys.length === 0) return;
    const perms = await tx.permission.findMany({
      where: { key: { in: keys } },
    });
    if (perms.length !== new Set(keys).size) {
      const found = new Set(perms.map((p) => p.key));
      const missing = keys.filter((k) => !found.has(k));
      throw new BadRequestException(
        `Unknown permission(s): ${missing.join(', ')}`,
      );
    }
    await tx.rolePermission.createMany({
      data: perms.map((p) => ({ roleId, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  private serialize(
    role: Prisma.RoleGetPayload<{
      include: {
        permissions: { include: { permission: true } };
        _count: { select: { users: true } };
      };
    }>,
  ) {
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      permissionsCustomizedAt: role.permissionsCustomizedAt,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        key: rp.permission.key,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
