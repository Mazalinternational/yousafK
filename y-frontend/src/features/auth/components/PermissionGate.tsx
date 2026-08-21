import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

interface PermissionGateProps {
  /** Single permission key, OR an array (any-of). Admin always passes. */
  permission?: string | string[];
  /** Require ALL listed permissions. Admin always passes. */
  allOf?: string[];
  /** Role slug(s); admin always passes. */
  role?: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * <PermissionGate permission="users.create">...</PermissionGate>
 * <PermissionGate permission={["users.read","users.view"]}>...</PermissionGate>
 * <PermissionGate role="admin" fallback={<NotAuthorized />}>...</PermissionGate>
 *
 * If multiple props are passed, ALL of them must succeed.
 */
export function PermissionGate({
  permission,
  allOf,
  role,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, hasRole } = useAuth();

  if (permission !== undefined) {
    const list = Array.isArray(permission) ? permission : [permission];
    if (!list.some(can)) return <>{fallback}</>;
  }
  if (allOf && allOf.length > 0) {
    if (!allOf.every(can)) return <>{fallback}</>;
  }
  if (role !== undefined) {
    const list = Array.isArray(role) ? role : [role];
    if (!list.some(hasRole)) return <>{fallback}</>;
  }
  return <>{children}</>;
}
