import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { consumeSkipLoginReturn } from "../post-login-redirect";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  /** Permission key(s) required to render the nested route. Admin always passes. */
  permission?: string | string[];
  allOf?: string[];
  role?: string | string[];
  /** Where to send unauthenticated users. */
  loginPath?: string;
  /** Where to send authenticated-but-forbidden users. */
  forbiddenPath?: string;
}

/**
 * Use as a wrapper route element:
 *
 *   {
 *     element: <ProtectedRoute permission="users.read" />,
 *     children: [{ path: "/admin/users", element: <UsersPage /> }],
 *   }
 */
export function ProtectedRoute({
  permission,
  allOf,
  role,
  loginPath = "/login",
  forbiddenPath = "/forbidden",
}: ProtectedRouteProps) {
  const { user, status, can, hasRole } = useAuth();
  const location = useLocation();

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    const skipReturnTo = consumeSkipLoginReturn();
    return (
      <Navigate
        to={loginPath}
        state={skipReturnTo ? undefined : { from: location.pathname }}
        replace
      />
    );
  }

  if (permission !== undefined) {
    const list = Array.isArray(permission) ? permission : [permission];
    if (!list.some(can)) return <Navigate to={forbiddenPath} replace />;
  }
  if (allOf && allOf.length > 0 && !allOf.every(can)) {
    return <Navigate to={forbiddenPath} replace />;
  }
  if (role !== undefined) {
    const list = Array.isArray(role) ? role : [role];
    if (!list.some(hasRole)) return <Navigate to={forbiddenPath} replace />;
  }
  return <Outlet />;
}
