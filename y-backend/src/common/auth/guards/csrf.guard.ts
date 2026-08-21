import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator.js';
import { CSRF_COOKIE, CSRF_HEADER } from '../cookie.util.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Collect every yk_csrf_token value (handles duplicate host + domain cookies). */
function allCsrfCookieValues(
  req: Request & { cookies?: Record<string, string> },
): string[] {
  const values: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined) => {
    if (!raw) return;
    try {
      const decoded = decodeURIComponent(raw);
      if (!seen.has(decoded)) {
        seen.add(decoded);
        values.push(decoded);
      }
    } catch {
      if (!seen.has(raw)) {
        seen.add(raw);
        values.push(raw);
      }
    }
  };

  push(req.cookies?.[CSRF_COOKIE]);

  const header = req.headers.cookie;
  if (header) {
    const prefix = `${CSRF_COOKIE}=`;
    for (const part of header.split(';')) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        push(trimmed.slice(prefix.length));
      }
    }
  }

  return values;
}

/**
 * Double-submit cookie CSRF protection.
 *
 * Skipped for safe methods, @Public(), and @SkipCsrf() (login/refresh).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { cookies?: Record<string, string> }>();
    if (SAFE_METHODS.has(req.method.toUpperCase())) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return true;

    const headerTokenRaw = req.headers[CSRF_HEADER];
    const headerToken = Array.isArray(headerTokenRaw)
      ? headerTokenRaw[0]
      : headerTokenRaw;

    const cookieValues = allCsrfCookieValues(req);

    if (!headerToken || cookieValues.length === 0) {
      throw new ForbiddenException('CSRF token missing');
    }

    const matched = cookieValues.some((cookie) =>
      tokensMatch(cookie, headerToken),
    );
    if (!matched) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    return true;
  }
}
