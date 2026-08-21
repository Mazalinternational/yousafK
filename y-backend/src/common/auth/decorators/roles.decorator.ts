import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'auth:roles';

/**
 * Require one or more role slugs (any-of). Use sparingly — prefer permissions.
 *
 * @example
 *   @RequireRoles('admin')
 *   @RequireRoles('admin', 'manager')
 */
export const RequireRoles = (...slugs: string[]) =>
  SetMetadata(ROLES_KEY, slugs);
