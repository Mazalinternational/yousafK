/**
 * Slugs of system (built-in) roles. They cannot be deleted via the API.
 * `ADMIN` is the wildcard role: holding it bypasses every permission check.
 */
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;

export type SystemRoleSlug = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
