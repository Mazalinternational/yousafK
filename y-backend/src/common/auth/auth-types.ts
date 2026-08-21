import type { Request } from 'express';

/**
 * Shape attached to `req.user` by the JwtAuthGuard / refresh strategy.
 * Kept intentionally small — heavy data (full role/permission rows) lives
 * in the cache layer keyed by userId, not on the token.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  /** Role slugs (e.g. ["admin", "manager"]). */
  roles: string[];
  /** Flat list of permission keys, e.g. ["users.read", "jwali.create"]. */
  permissions: string[];
  /** Session this token was minted for; required for forced logout. */
  sessionId: string;
  /** True iff the user holds the wildcard `admin` system role. */
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  /** Populated by the refresh strategy only. */
  refreshTokenJti?: string;
  refreshTokenRaw?: string;
}

/** Payload encoded inside the access JWT. */
export interface AccessTokenPayload {
  sub: string;
  sid: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

/** Payload encoded inside the refresh JWT. */
export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  family: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
