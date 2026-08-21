import { useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  CUSTOMER_TYPE_OPTIONS,
  type Customer,
} from "../schemas/customer";

export type CustomerTypeOption = (typeof CUSTOMER_TYPE_OPTIONS)[number];

export function customerTypePermissionKey(type: CustomerTypeOption | string) {
  return `customers.type_${type}`;
}

/**
 * Customer types the current user is allowed to view/create under RBAC.
 * Admins and `customers.manage` see every type.
 */
export function useAllowedCustomerTypes() {
  const { can } = useAuth();

  return useMemo(() => {
    const allowed = CUSTOMER_TYPE_OPTIONS.filter((type) =>
      can(customerTypePermissionKey(type)),
    );
    return {
      allowedTypes: allowed,
      canAccessType: (type: Customer["type"] | string) =>
        can(customerTypePermissionKey(type)),
      hasAnyTypeAccess: allowed.length > 0,
      defaultType: (allowed[0] ?? "paddy_seller") as CustomerTypeOption,
    };
  }, [can]);
}
