/**
 * Centralised auth tunables. Every value is overridable via env so the same
 * binary runs in dev, staging and prod without code changes.
 */

function readMs(envName: string, fallbackMs: number): number {
  const raw = process.env[envName];
  if (!raw) return fallbackMs;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
}

function readInt(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const authConfig = {
  /** ms — short-lived JWT in cookie. Default 15 minutes. */
  accessTokenTtlMs: readMs('AUTH_ACCESS_TTL_MS', 15 * 60 * 1000),
  /** ms — long-lived refresh token. Default 14 days. */
  refreshTokenTtlMs: readMs('AUTH_REFRESH_TTL_MS', 14 * 24 * 60 * 60 * 1000),
  /** ms — how long the CSRF cookie lives (matches refresh). */
  csrfTtlMs: readMs('AUTH_CSRF_TTL_MS', 14 * 24 * 60 * 60 * 1000),
  /** ms — password-reset link validity. Default 1 hour. */
  passwordResetTtlMs: readMs('AUTH_RESET_TTL_MS', 60 * 60 * 1000),

  /** Brute-force protection: lock after N failed logins within the window. */
  maxFailedLogins: readInt('AUTH_MAX_FAILED_LOGINS', 5),
  /** ms — how long an account stays locked after exceeding the threshold. */
  lockoutDurationMs: readMs('AUTH_LOCKOUT_MS', 15 * 60 * 1000),

  /** Throttler defaults applied globally; auth endpoints get their own caps. */
  throttle: {
    ttlMs: readMs('THROTTLE_TTL_MS', 60_000),
    limit: readInt('THROTTLE_LIMIT', 120),
    loginLimit: readInt('THROTTLE_LOGIN_LIMIT', 10),
  },

  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    issuer: process.env.JWT_ISSUER || 'yousuf-keyhan-mis',
    audience: process.env.JWT_AUDIENCE || 'yousuf-keyhan-mis-clients',
  },

  permissionCacheTtlMs: readMs('AUTH_PERM_CACHE_TTL_MS', 60_000),

  /** Frontend origin for CORS + reset-password links. */
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

/**
 * Convert ms to a string the @nestjs/jwt library understands ("15m", "14d").
 * Falls back to seconds when the value isn't a clean unit.
 */
export function msToJwtExpiry(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${seconds}s`;
}
