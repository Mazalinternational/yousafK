import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SYSTEM_ROLES } from '../rbac/roles.const.js';
import { authConfig } from './auth.config.js';

interface CacheEntry {
  roles: string[];
  permissions: Set<string>;
  isAdmin: boolean;
  expiresAt: number;
}

/**
 * Per-user roles+permissions cache. We DON'T encode permissions inside the JWT
 * because:
 *   1. Permissions can change (e.g. admin revokes role) and the access token
 *      should reflect that within ~1 cache TTL without forcing a new login.
 *   2. JWT size grows with permission count.
 *
 * Cache is invalidated on:
 *   - role/permission assignment changes (RolesService / UsersService)
 *   - logout / forced logout
 */
@Injectable()
export class PermissionCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the user's effective roles + permissions.
   * Returns `isAdmin: true` if the user holds the system "admin" role; in that
   * case `permissions` is left small (it doesn't matter — guards short-circuit).
   */
  async getForUser(userId: string): Promise<{
    roles: string[];
    permissions: Set<string>;
    isAdmin: boolean;
  }> {
    const cached = this.cache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached;

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const roles: string[] = [];
    const perms = new Set<string>();
    let isAdmin = false;

    for (const ur of userRoles) {
      roles.push(ur.role.slug);
      if (ur.role.slug === SYSTEM_ROLES.ADMIN) isAdmin = true;
      for (const rp of ur.role.permissions) {
        perms.add(rp.permission.key);
      }
    }

    const entry: CacheEntry = {
      roles,
      permissions: perms,
      isAdmin,
      expiresAt: now + authConfig.permissionCacheTtlMs,
    };
    this.cache.set(userId, entry);
    return entry;
  }

  invalidate(userId: string) {
    this.cache.delete(userId);
  }

  invalidateAll() {
    this.cache.clear();
  }
}
