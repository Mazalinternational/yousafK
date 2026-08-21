export interface AuthUser {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string | null;
  isActive: boolean;
  /** Role slugs (e.g. ["admin"]). */
  roles: string[];
  /**
   * Flat permission keys ("users.read", "jwali.create"). For admins this is
   * `["*"]` and the frontend should treat it as a wildcard.
   */
  permissions: string[];
  isAdmin: boolean;
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  /**
   * True iff the user holds the permission key (or admin wildcard, or
   * a `<module>.manage` super-permission for the same module).
   */
  can: (permission: string) => boolean;
  hasRole: (slug: string) => boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
