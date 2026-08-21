import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ALL_PERMISSIONS } from '../../common/rbac/permissions.const.js';
import {
  CUSTOMER_TYPE_SLUGS,
  customerTypePermissionKey,
} from '../../common/rbac/customer-types.const.js';
import { SYSTEM_ROLES } from '../../common/rbac/roles.const.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class PermissionsSyncService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncPermissions();
    await this.ensureCustomerTypeAccessForExistingRoles();
  }

  private async syncPermissions() {
    for (const permission of ALL_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: {
          module: permission.module,
          action: permission.action,
          description: permission.description,
        },
        create: {
          key: permission.key,
          module: permission.module,
          action: permission.action,
          description: permission.description,
        },
      });
    }

    this.logger.log(
      `Permission catalog synced (${ALL_PERMISSIONS.length} permissions).`,
    );
  }

  /**
   * Additive grant so roles that already have customer access keep seeing every
   * kind after type-scoped permissions are introduced. Admins can then tighten
   * access per type in the Role Permissions UI.
   */
  private async ensureCustomerTypeAccessForExistingRoles() {
    const typeKeys = CUSTOMER_TYPE_SLUGS.map((type) =>
      customerTypePermissionKey(type),
    );
    const typePermissions = await this.prisma.permission.findMany({
      where: { key: { in: typeKeys } },
      select: { id: true },
    });

    if (typePermissions.length === 0) {
      return;
    }

    const rolesWithCustomerAccess = await this.prisma.rolePermission.findMany({
      where: {
        permission: {
          key: {
            in: [
              'customers.read',
              'customers.view',
              'customers.manage',
              'customers.create',
              'customers.update',
            ],
          },
        },
        role: {
          slug: { not: SYSTEM_ROLES.ADMIN },
        },
      },
      select: { roleId: true },
      distinct: ['roleId'],
    });

    // Also ensure manager/staff even if they somehow lack customers.* yet.
    const systemRoles = await this.prisma.role.findMany({
      where: {
        slug: { in: [SYSTEM_ROLES.MANAGER, SYSTEM_ROLES.STAFF] },
      },
      select: { id: true },
    });

    const roleIds = new Set<string>([
      ...rolesWithCustomerAccess.map((row) => row.roleId),
      ...systemRoles.map((role) => role.id),
    ]);

    for (const roleId of roleIds) {
      await this.prisma.rolePermission.createMany({
        data: typePermissions.map((permission) => ({
          roleId,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }

    this.logger.log(
      `Ensured customer type permissions on ${roleIds.size} role(s) (${typeKeys.length} keys).`,
    );
  }
}
