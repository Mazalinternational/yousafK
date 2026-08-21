import { SetMetadata } from '@nestjs/common';

/**
 * Opt a state-changing handler out of CSRF validation.
 * Used for endpoints that establish the CSRF token in the first place
 * (login, refresh) or that don't rely on cookies (none currently).
 */
export const SKIP_CSRF_KEY = 'auth:skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
