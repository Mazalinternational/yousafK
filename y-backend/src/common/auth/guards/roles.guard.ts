import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth-types.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new ForbiddenException('Not authenticated');
    if (user.isAdmin) return true;

    const ok = required.some((slug) => user.roles.includes(slug));
    if (!ok) {
      throw new ForbiddenException(
        `Requires one of roles: ${required.join(', ')}`,
      );
    }
    return true;
  }
}
