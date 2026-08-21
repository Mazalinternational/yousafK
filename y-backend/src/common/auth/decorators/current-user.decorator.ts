import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser } from '../auth-types.js';

/**
 * @example
 *   @Get('me')
 *   me(@CurrentUser() user: AuthenticatedUser) { ... }
 *   @Get('me')
 *   meId(@CurrentUser('id') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
