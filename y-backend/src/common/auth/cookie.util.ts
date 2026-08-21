import { CookieOptions, Response } from 'express';

/**
 * Cookie names the auth system controls. Centralised so the frontend
 * (which reads `csrf` to echo as `X-CSRF-Token`) and middleware never drift.
 */
export const ACCESS_COOKIE = 'yk_access_token';
export const REFRESH_COOKIE = 'yk_refresh_token';
export const CSRF_COOKIE = 'yk_csrf_token';

/** Header used for the double-submit CSRF check. */
export const CSRF_HEADER = 'x-csrf-token';

export interface CookieConfig {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
}

/**
 * Resolve cookie options from environment.
 *
 * Defaults are deliberately conservative:
 *   - production -> SameSite=strict, Secure=true
 *   - development -> SameSite=lax,    Secure=false
 *
 * Override for cross-origin SaaS deploys (frontend/backend on different
 * domains) by setting `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`.
 */
export function resolveCookieConfig(): CookieConfig {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSiteRaw = (
    process.env.COOKIE_SAMESITE || (isProd ? 'strict' : 'lax')
  ).toLowerCase();
  const sameSite: CookieConfig['sameSite'] =
    sameSiteRaw === 'none' ? 'none' : sameSiteRaw === 'lax' ? 'lax' : 'strict';
  const secureFlag = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : sameSite === 'none' || isProd;

  return {
    httpOnly: true,
    secure: secureFlag,
    sameSite,
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
  };
}

function baseOptions(): CookieOptions {
  const cfg = resolveCookieConfig();
  return {
    httpOnly: cfg.httpOnly,
    secure: cfg.secure,
    sameSite: cfg.sameSite,
    domain: cfg.domain,
    path: cfg.path,
  };
}

export function setAccessCookie(res: Response, token: string, ttlMs: number) {
  res.cookie(ACCESS_COOKIE, token, { ...baseOptions(), maxAge: ttlMs });
}

export function setRefreshCookie(res: Response, token: string, ttlMs: number) {
  // Restrict refresh cookie to /auth path so it isn't sent to every endpoint.
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(),
    maxAge: ttlMs,
    path: '/auth',
  });
}

/**
 * CSRF cookie is intentionally NOT httpOnly: the frontend reads it and echoes
 * it back as an X-CSRF-Token header. The CsrfGuard then compares the cookie to
 * the header (double-submit pattern).
 */
export function setCsrfCookie(res: Response, token: string, ttlMs: number) {
  const cfg = resolveCookieConfig();
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: cfg.secure,
    sameSite: cfg.sameSite,
    domain: cfg.domain,
    path: '/',
    maxAge: ttlMs,
  });
  // Lets cross-subdomain frontends read the latest token from auth responses
  // (document.cookie can disagree when legacy host-only cookies still exist).
  res.setHeader(CSRF_HEADER, token);
}

export function clearAuthCookies(res: Response) {
  const cfg = resolveCookieConfig();
  const entries: Array<{
    name: string;
    path: string;
    httpOnly: boolean;
  }> = [
    { name: ACCESS_COOKIE, path: '/', httpOnly: true },
    { name: REFRESH_COOKIE, path: '/auth', httpOnly: true },
    { name: CSRF_COOKIE, path: '/', httpOnly: false },
  ];

  for (const { name, path, httpOnly } of entries) {
    const shared = {
      path,
      httpOnly,
      secure: cfg.secure,
      sameSite: cfg.sameSite,
    };
    // Current domain-scoped cookies (COOKIE_DOMAIN=.49.13.62.120.sslip.io).
    if (cfg.domain) {
      res.clearCookie(name, { ...shared, domain: cfg.domain });
    }
    // Legacy host-only cookies (set before COOKIE_DOMAIN) — must clear both or
    // the browser sends two yk_csrf_token values and CSRF checks fail.
    res.clearCookie(name, { ...shared });
  }
}
