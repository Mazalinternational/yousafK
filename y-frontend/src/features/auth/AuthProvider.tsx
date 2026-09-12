import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "@/api/auth.api";
import { clearCsrfTokenCache, setOnSessionRefreshed, setOnUnauthorized } from "@/api/client";
import { AuthContext } from "./AuthContext";
import { markSkipLoginReturn } from "./post-login-redirect";
import type { AuthState, AuthUser } from "./types";

/**
 * Top-level auth state holder.
 *
 *  - On mount, attempts a silent /auth/me. If that 401s, the axios
 *    interceptor will try /auth/refresh once; if THAT also fails we land in
 *    the unauthenticated branch (no redirect — that's the route guard's job).
 *  - Exposes `can(permKey)` which:
 *      - returns true for admin (wildcard "*")
 *      - returns true for an exact permission match
 *      - returns true for a `<module>.manage` super-permission match
 *  - Reacts to `setOnUnauthorized`: when ANY API call fails refresh, the
 *    user object is cleared and the route guard kicks them to /login.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("idle");

  const handleUnauthenticated = useCallback(() => {
    clearCsrfTokenCache();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    setOnUnauthorized(handleUnauthenticated);
    return () => setOnUnauthorized(null);
  }, [handleUnauthenticated]);

  // Silent restore on mount.
  // so we rely on a local `cancelled` flag instead of a global "run once" ref.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const fetched = await authApi.me();
        if (!cancelled) {
          setUser(fetched);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) handleUnauthenticated();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handleUnauthenticated]);

  const login = useCallback(async (email: string, password: string) => {
    setStatus("loading");
    try {
      const fetched = await authApi.login(email, password);
      setUser(fetched);
      setStatus("authenticated");
      return fetched;
    } catch (err) {
      handleUnauthenticated();
      throw err;
    }
  }, [handleUnauthenticated]);

  const logout = useCallback(async () => {
    markSkipLoginReturn();
    try {
      await authApi.logout();
    } catch {
      // Even if the call fails (e.g. cookie already expired), force-clear.
    }
    handleUnauthenticated();
  }, [handleUnauthenticated]);

  const refresh = useCallback(async () => {
    try {
      const fetched = await authApi.me();
      setUser(fetched);
      setStatus("authenticated");
    } catch {
      handleUnauthenticated();
    }
  }, [handleUnauthenticated]);

  useEffect(() => {
    setOnSessionRefreshed(refresh);
    return () => setOnSessionRefreshed(null);
  }, [refresh]);

  const value = useMemo<AuthState>(() => {
    const permSet = new Set(user?.permissions ?? []);
    const wildcard = permSet.has("*");
    const can = (perm: string) => {
      if (wildcard) return true;
      if (permSet.has(perm)) return true;
      const dot = perm.indexOf(".");
      if (dot > 0) {
        const moduleKey = perm.slice(0, dot);
        if (permSet.has(`${moduleKey}.manage`)) return true;
      }
      return false;
    };
    const hasRole = (slug: string) => Boolean(user?.roles.includes(slug));
    return {
      user,
      status,
      can,
      hasRole,
      login,
      logout,
      refresh,
    };
  }, [user, status, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
