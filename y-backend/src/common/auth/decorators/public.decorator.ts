import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route handler as anonymous-accessible. The global JwtAuthGuard
 * skips token validation for handlers (or controllers) carrying this metadata.
 *
 * @example
 *   @Public()
 *   @Post('login')
 *   login(...) {}
 */
export const IS_PUBLIC_KEY = 'auth:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
