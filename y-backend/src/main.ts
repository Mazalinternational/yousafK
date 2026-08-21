import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PROFILE_UPLOAD_DIR } from './modules/auth/profile-picture.util.js';
import { AppModule } from './app.module.js';
import { authConfig } from './common/auth/auth.config.js';
import { resolveCookieConfig } from './common/auth/cookie.util.js';
import { isOriginAllowed, parseAllowedOrigins } from './common/cors.util.js';
import { PrismaService } from './infrastructure/prisma/prisma.service.js';
import { runDatabaseMigrationsOnBoot } from './infrastructure/prisma/run-migrations.js';

if (!(BigInt.prototype as any).toJSON) {
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    value() {
      return this.toString();
    },
    configurable: true,
    writable: true,
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  // Required behind Coolify/Traefik/nginx so secure cookies and req.ip work.
  app.set('trust proxy', 1);

  if (!existsSync(PROFILE_UPLOAD_DIR)) {
    mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
  }
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Security headers — keep CSP off because the API isn't an HTML server.
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }),
  );

  // Required for httpOnly cookies (auth) and the CSRF cookie.
  app.use(cookieParser());
  const prisma = app.get(PrismaService);

  const GLOBAL_ROUTE_PREFIXES = [
    '/currencies',
    '/expense-categories',
    '/varieties',
    '/users',
    '/roles',
    '/permissions',
    '/health',
    '/audit',
  ] as const;

  function getRequestPath(url: string): string {
    return (url.split('?')[0] ?? url).replace(/\/+$/, '') || '/';
  }

  function isSeasonScopedRoute(url: string): boolean {
    const path = getRequestPath(url);
    return !GLOBAL_ROUTE_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  async function resolveActiveSeasonId(): Promise<string | null> {
    const activeSeason = await (prisma as any).season.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });
    return activeSeason?.id ?? null;
  }

  /**
   * Read-scope middleware:
   * - Admin UI sets `X-View-Season-Id` to browse historical seasons.
   * - Most list/report endpoints already support `seasonId` query filtering.
   *   We normalize the header into `req.query.seasonId` for safe GET requests.
   * - When no view season is sent, GETs on season-scoped routes default to the
   *   active season so lists never leak cross-season data.
   * - Season management routes are excluded so admins can always see all seasons.
   */
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const method = req.method.toUpperCase();

      const url = req.originalUrl ?? req.url;
      if (
        url.startsWith('/seasons') ||
        url.includes('/seasons') ||
        url.startsWith('/auth') ||
        url.includes('/auth')
      ) {
        return next();
      }

      const selectedSeasonHeader = req.headers['x-view-season-id'];
      const selectedSeasonId =
        typeof selectedSeasonHeader === 'string'
          ? selectedSeasonHeader.trim()
          : null;

      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        if (!selectedSeasonId) {
          return next();
        }

        const activeSeasonId = await resolveActiveSeasonId();

        if (!activeSeasonId) {
          return res.status(409).json({
            statusCode: 409,
            message: 'No active season found. Writes are blocked.',
          });
        }

        if (selectedSeasonId !== activeSeasonId) {
          return res.status(409).json({
            statusCode: 409,
            message:
              'Writes are allowed only when the selected season is the active season.',
          });
        }

        return next();
      }

      if (!isSeasonScopedRoute(url)) {
        return next();
      }

      const queryBag = req.query as Record<string, unknown> | undefined;
      if (!queryBag) {
        return next();
      }

      const currentSeasonId =
        typeof queryBag.seasonId === 'string' ? queryBag.seasonId.trim() : null;

      if (!currentSeasonId) {
        const fallbackSeasonId =
          selectedSeasonId ?? (await resolveActiveSeasonId());
        if (fallbackSeasonId) {
          queryBag.seasonId = fallbackSeasonId;
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Global validation. NOT using `whitelist: true` because legacy DTOs in this
   * project are plain TS classes without class-validator decorators — turning
   * whitelist on would silently strip every property of those DTOs. Setting
   * just `transform: true` validates classes that DO have decorators while
   * passing untouched classes through.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      forbidUnknownValues: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  /**
   * CORS: cookie-based auth requires `credentials: true` and an exact origin echo.
   * FRONTEND_URL supports comma-separated origins and `*` wildcards, e.g.
   * `http://*.sslip.io` for Coolify/sslip.io staging hosts.
   */
  const allowedOrigins = parseAllowedOrigins(authConfig.frontendUrl);
  const cookieConfig = resolveCookieConfig();
  const bootstrapLog = new Logger('Bootstrap');
  bootstrapLog.log(
    `CORS origins: ${allowedOrigins.join(', ') || '(allow all with Origin header)'}`,
  );
  bootstrapLog.log(
    `Cookies: SameSite=${cookieConfig.sameSite}, Secure=${cookieConfig.secure}, Domain=${cookieConfig.domain ?? '(host only)'}`,
  );

  app.enableCors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (isOriginAllowed(origin, allowedOrigins)) return cb(null, true);
      bootstrapLog.warn(
        `CORS rejected origin: ${origin} (allowed: ${allowedOrigins.join(', ')})`,
      );
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-View-Season-Id',
    ],
    exposedHeaders: ['X-CSRF-Token'],
  });

  const config = new DocumentBuilder()
    .setTitle('Yousuf Keyhan MIS API')
    .setDescription('API documentation for current and future backend modules')
    .setVersion('1.0')
    .addCookieAuth('yk_access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT) || 3005;
  await app.listen(port, '0.0.0.0');
}

runDatabaseMigrationsOnBoot();
bootstrap();
