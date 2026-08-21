import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth-types.js';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
  type PermissionsMode,
} from '../decorators/permissions.decorator.js';

/**
 * Verifies the authenticated user holds the permissions declared by
 * @RequirePermissions on the handler/controller.
 *
 * Two short-circuits:
 *   1. No metadata declared -> allow (controller chose not to gate).
 *   2. User is admin -> allow (wildcard).
 *
 * `module.manage` implicitly satisfies any `module.<other>` check — this lets
 * a single "manage" permission stand in for granular CRUD.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const mode =
      this.reflector.getAllAndOverride<PermissionsMode>(PERMISSIONS_MODE_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) || 'any';

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    if (user.isAdmin) return true;

    const owned = new Set(user.permissions);
    const has = (perm: string) => {
      if (owned.has(perm)) return true;
      const [mod] = perm.split('.');
      return mod ? owned.has(`${mod}.manage`) : false;
    };

    const ok = mode === 'all' ? required.every(has) : required.some(has);
    if (!ok) {
      throw new ForbiddenException(
        `Missing required permission${required.length > 1 ? 's' : ''}: ${required.join(', ')}`,
      );
    }
    return true;
  }
}
