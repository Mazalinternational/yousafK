import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { RefreshTokenPayload } from '../auth-types.js';
import { authConfig } from '../auth.config.js';
import { REFRESH_COOKIE } from '../cookie.util.js';

function refreshCookieExtractor(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.[REFRESH_COOKIE] ?? null;
}

/**
 * Validates the refresh JWT signature/expiry only. The DB lookup
 * (and rotation/reuse-detection logic) lives in AuthService.refresh — keeping
 * the strategy thin makes the rotation code linear and easier to audit.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: refreshCookieExtractor,
      ignoreExpiration: false,
      secretOrKey: authConfig.jwt.refreshSecret,
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload) {
    if (payload.type !== 'refresh')
      throw new UnauthorizedException('Invalid token type');
    const raw = refreshCookieExtractor(req);
    if (!raw) throw new UnauthorizedException('Missing refresh token');
    return { payload, raw };
  }
}
