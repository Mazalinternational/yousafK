import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * Auth uses HttpOnly access/refresh cookies plus a CSRF double-submit token.
 * On split subdomains (frontend.* vs backend.*), document.cookie can disagree
 * with cookies the browser sends to the API — we cache CSRF from auth response
 * headers (X-CSRF-Token) and prefer that over document.cookie.
 */

export const baseURL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:3005";

const CSRF_COOKIE = "yk_csrf_token";
const CSRF_HEADER = "X-CSRF-Token";
const VIEW_SEASON_HEADER = "X-View-Season-Id";

let selectedViewSeasonId: string | null = null;
/** Latest CSRF from login/refresh response header (cross-subdomain safe). */
let csrfTokenCache: string | null = null;

export function setViewSeasonScope(seasonId: string | null) {
  selectedViewSeasonId = seasonId?.trim() || null;
}

export function getViewSeasonScope(): string | null {
  return selectedViewSeasonId;
}

export function clearCsrfTokenCache() {
  csrfTokenCache = null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = `${name}=`;
  let value: string | null = null;
  const parts = document.cookie.split(";");
  for (const raw of parts) {
    const trimmed = raw.trim();
    if (trimmed.startsWith(target)) {
      value = decodeURIComponent(trimmed.substring(target.length));
    }
  }
  return value;
}

function captureCsrfFromResponse(response: AxiosResponse) {
  const headers = response.headers as Record<string, string | string[] | undefined>;
  const raw = headers["x-csrf-token"] ?? headers[CSRF_HEADER.toLowerCase()];
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (typeof token === "string" && token.length > 0) {
    csrfTokenCache = token;
  }
}

function getCsrfToken(): string | null {
  return csrfTokenCache ?? readCookie(CSRF_COOKIE);
}

export function getCachedCsrfToken(): string | null {
  return getCsrfToken();
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  xsrfCookieName: undefined,
  xsrfHeaderName: undefined,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? "get").toLowerCase();
  const headers = AxiosHeaders.from(config.headers ?? {});

  const url = String(config.url ?? "");
  const isSeasonOrAuthRequest =
    url.startsWith("seasons") ||
    url.includes("/seasons") ||
    url.startsWith("auth") ||
    url.includes("/auth");

  if (selectedViewSeasonId && !isSeasonOrAuthRequest) {
    headers.set(VIEW_SEASON_HEADER, selectedViewSeasonId);

    if (method === "get" || method === "head" || method === "options") {
      const params = (config.params ?? {}) as Record<string, unknown>;
      const currentSeasonId =
        typeof params.seasonId === "string" ? params.seasonId.trim() : "";
      if (!currentSeasonId) {
        config.params = {
          ...params,
          seasonId: selectedViewSeasonId,
        };
      }
    }
  }

  if (method !== "get" && method !== "head" && method !== "options") {
    const token = getCsrfToken();
    if (token) {
      headers.set(CSRF_HEADER, token);
    }
  }
  config.headers = headers;
  return config;
});

type Resolver = () => void;
let refreshInFlight: Promise<boolean> | null = null;
const waiters: Resolver[] = [];

let onUnauthorized: (() => void) | null = null;
let onSessionRefreshed: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** Called after a silent /auth/refresh succeeds so UI permissions stay in sync. */
export function setOnSessionRefreshed(handler: (() => void) | null) {
  onSessionRefreshed = handler;
}

async function performRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await axios.post(`${baseURL}/auth/refresh`, undefined, {
        withCredentials: true,
      });
      captureCsrfFromResponse(res);
      onSessionRefreshed?.();
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
      while (waiters.length) waiters.shift()?.();
    }
  })();
  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    captureCsrfFromResponse(response);
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean; url?: string })
      | undefined;
    const status = error.response?.status;

    const url = original?.url ?? "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");
    if (status !== 401 || !original || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retry = true;
    const ok = await performRefresh();
    if (!ok) {
      clearCsrfTokenCache();
      onUnauthorized?.();
      return Promise.reject(error);
    }
    return apiClient.request(original);
  },
);
