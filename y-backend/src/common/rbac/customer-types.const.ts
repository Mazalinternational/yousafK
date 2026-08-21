/**
 * Customer kinds that can be granted independently via RBAC.
 * Permission keys are `customers.type_<slug>` (e.g. `customers.type_buyer`).
 *
 * Keep in sync with the Prisma `CustomerType` values that are still creatable
 * (excludes legacy `process_production_buyer`, which maps to `buyer`).
 */
export const CUSTOMER_TYPE_SLUGS = [
  'paddy_farmer',
  'paddy_seller',
  'rice_seller',
  'buyer',
  'vendor',
  'debtor',
] as const;

export type CustomerTypeSlug = (typeof CUSTOMER_TYPE_SLUGS)[number];

export const CUSTOMER_TYPE_PERMISSION_ACTIONS = CUSTOMER_TYPE_SLUGS.map(
  (slug) => `type_${slug}` as const,
);

export type CustomerTypePermissionAction =
  (typeof CUSTOMER_TYPE_PERMISSION_ACTIONS)[number];

export function customerTypePermissionKey(
  type: CustomerTypeSlug | string,
): string {
  return `customers.type_${type}`;
}

export function isCustomerTypeSlug(value: string): value is CustomerTypeSlug {
  return (CUSTOMER_TYPE_SLUGS as readonly string[]).includes(value);
}
