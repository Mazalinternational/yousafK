/**
 * Canonical action verbs that any module can grant.
 *
 * `manage` is treated as a per-module super-permission (i.e. holding
 * `<module>.manage` implicitly satisfies any other `<module>.<action>` check).
 * `view` is a softer alternative to `read` for menu/UI-level visibility checks.
 */
export const APP_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'manage',
  'approve',
  'export',
  'import',
  'assign',
  'view',
  'print',
  'download',
  'share',
  'add_payment',
  'add_deduction',
  'add_entry',
] as const;

export type AppAction = (typeof APP_ACTIONS)[number];
