import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth-types.js';
import {
  CUSTOMER_TYPE_SLUGS,
  customerTypePermissionKey,
  isCustomerTypeSlug,
  type CustomerTypeSlug,
} from './customer-types.const.js';

/**
 * Returns the customer types the user may see/manage, or `'all'` for admin /
 * `customers.manage` (and the wildcard permission).
 */
export function getAllowedCustomerTypes(
  user: AuthenticatedUser,
): CustomerTypeSlug[] | 'all' {
  if (user.isAdmin || user.permissions.includes('*')) {
    return 'all';
  }

  if (user.permissions.includes('customers.manage')) {
    return 'all';
  }

  return CUSTOMER_TYPE_SLUGS.filter((type) =>
    user.permissions.includes(customerTypePermissionKey(type)),
  );
}

export function canAccessCustomerType(
  user: AuthenticatedUser,
  type: string,
): boolean {
  const allowed = getAllowedCustomerTypes(user);
  if (allowed === 'all') return true;

  const normalized = type === 'process_production_buyer' ? 'buyer' : type;

  return isCustomerTypeSlug(normalized) && allowed.includes(normalized);
}

export function assertCanAccessCustomerType(
  user: AuthenticatedUser,
  type: string,
): void {
  if (canAccessCustomerType(user, type)) {
    return;
  }

  throw new ForbiddenException(
    `You do not have permission to access "${type}" customers`,
  );
}

/**
 * Builds a Prisma `type` filter for list queries.
 * Returns `null` when the user may see every type (no extra filter).
 * Returns an empty `in: []` when the user may see none (forces empty result).
 */
export function customerTypeWhereFilter(
  user: AuthenticatedUser,
  requestedType?: string,
): { type: CustomerTypeSlug } | { type: { in: CustomerTypeSlug[] } } | null {
  const allowed = getAllowedCustomerTypes(user);

  if (allowed === 'all') {
    if (!requestedType) return null;
    const normalized =
      requestedType === 'process_production_buyer' ? 'buyer' : requestedType;
    if (!isCustomerTypeSlug(normalized)) {
      return { type: { in: [] } };
    }
    return { type: normalized };
  }

  if (allowed.length === 0) {
    return { type: { in: [] } };
  }

  if (!requestedType) {
    return { type: { in: allowed } };
  }

  const normalized =
    requestedType === 'process_production_buyer' ? 'buyer' : requestedType;

  if (!isCustomerTypeSlug(normalized) || !allowed.includes(normalized)) {
    return { type: { in: [] } };
  }

  return { type: normalized };
}
