import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'auth:permissions';
export const PERMISSIONS_MODE_KEY = 'auth:permissionsMode';

export type PermissionsMode = 'any' | 'all';

/**
 * Require one or more permissions to access a handler.
 *
 * @example
 *   @RequirePermissions('users.create')
 *   @RequirePermissions(['users.read', 'users.view'])             // any-of
 *   @RequirePermissions(['orders.read', 'orders.export'], 'all')  // all-of
 */
export function RequirePermissions(
  permissions: string | string[],
  mode: PermissionsMode = 'any',
) {
  const arr = Array.isArray(permissions) ? permissions : [permissions];
  return (target: any, propertyKey?: any, descriptor?: any) => {
    SetMetadata(PERMISSIONS_KEY, arr)(target, propertyKey, descriptor);
    SetMetadata(PERMISSIONS_MODE_KEY, mode)(target, propertyKey, descriptor);
  };
}
