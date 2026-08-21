import { APP_ACTIONS } from './actions.const.js';
import { APP_MODULES } from './modules.const.js';
import {
  CUSTOMER_TYPE_PERMISSION_ACTIONS,
  CUSTOMER_TYPE_SLUGS,
} from './customer-types.const.js';

/**
 * The full cartesian product of (module, action) pairs, plus customer-type
 * scoped keys under the `customers` module.
 * Used by the seed / sync services to populate the `permissions` table.
 */
export type PermissionKey =
  | `${(typeof APP_MODULES)[number]}.${(typeof APP_ACTIONS)[number]}`
  | `customers.type_${(typeof CUSTOMER_TYPE_SLUGS)[number]}`;

export interface PermissionDefinition {
  key: string;
  module: string;
  action: string;
  description: string;
}

const MODULE_PERMISSIONS: PermissionDefinition[] = APP_MODULES.flatMap((mod) =>
  APP_ACTIONS.map((action) => ({
    key: `${mod}.${action}`,
    module: mod,
    action,
    description: `Allows ${action} on ${mod.replace(/_/g, ' ')}`,
  })),
);

/** Per-customer-type visibility under the Customers module (RBAC matrix). */
const CUSTOMER_TYPE_PERMISSIONS: PermissionDefinition[] =
  CUSTOMER_TYPE_PERMISSION_ACTIONS.map((action, index) => {
    const typeSlug = CUSTOMER_TYPE_SLUGS[index];
    const label = typeSlug.replace(/_/g, ' ');
    return {
      key: `customers.${action}`,
      module: 'customers',
      action,
      description: `Allows access to ${label} customer records`,
    };
  });

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  ...MODULE_PERMISSIONS,
  ...CUSTOMER_TYPE_PERMISSIONS,
];
