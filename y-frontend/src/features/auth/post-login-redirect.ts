/** Set before logout so ProtectedRoute does not stash the current URL as login return target. */
export const SKIP_LOGIN_RETURN_KEY = "yk_skip_login_return";

export function markSkipLoginReturn() {
  try {
    sessionStorage.setItem(SKIP_LOGIN_RETURN_KEY, "1");
  } catch {
    // ignore (private mode, etc.)
  }
}

export function consumeSkipLoginReturn(): boolean {
  try {
    if (sessionStorage.getItem(SKIP_LOGIN_RETURN_KEY) !== "1") {
      return false;
    }
    sessionStorage.removeItem(SKIP_LOGIN_RETURN_KEY);
    return true;
  } catch {
    return false;
  }
}

export function userCan(permissions: string[], permission: string): boolean {
  const permSet = new Set(permissions);
  if (permSet.has("*")) return true;
  if (permSet.has(permission)) return true;
  const dot = permission.indexOf(".");
  if (dot > 0) {
    const moduleKey = permission.slice(0, dot);
    if (permSet.has(`${moduleKey}.manage`)) return true;
  }
  return false;
}

/**
 * After sign-in, only return to `from` when the new user can access that route.
 * Prevents a prior admin session URL from sending a limited user to /forbidden.
 */
export function resolvePostLoginPath(
  from: string | undefined,
  can: (permission: string) => boolean,
): string {
  const normalized = from?.trim() || "/";

  if (
    normalized === "/login" ||
    normalized === "/forbidden" ||
    normalized.startsWith("/login?") ||
    normalized.startsWith("/forgot-password") ||
    normalized.startsWith("/reset-password")
  ) {
    return "/";
  }

  if (normalized.startsWith("/yk/admin/users")) {
    return can("users.read") || can("users.manage") ? normalized : "/";
  }

  if (normalized.startsWith("/yk/admin/roles")) {
    if (normalized.includes("/permissions")) {
      return can("roles.update") || can("roles.manage") ? normalized : "/";
    }
    return can("roles.read") || can("roles.manage") ? normalized : "/";
  }

  return normalized;
}

export function resolvePostLoginPathForUser(
  from: string | undefined,
  permissions: string[],
): string {
  return resolvePostLoginPath(from, (permission) => userCan(permissions, permission));
}
