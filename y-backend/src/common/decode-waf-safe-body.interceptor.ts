import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { decodeWafSafeValue } from './waf-safe-body.util.js';

/**
 * Nest `app.use()` middleware can run before the JSON body parser, so `req.body`
 * is often empty there. This interceptor runs after parsing and unwraps `yk1:`
 * Pashto/Dari payloads from the frontend.
 */
@Injectable()
export class DecodeWafSafeBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context.switchToHttp().getRequest<Request>();
      if (req?.body && typeof req.body === 'object') {
        req.body = decodeWafSafeValue(req.body);
      }
    }
    return next.handle();
  }
}
