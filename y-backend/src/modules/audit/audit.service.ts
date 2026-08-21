import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

export interface AuditEvent {
  /** "auth.login", "user.create", "role.permission.assign", ... */
  action: string;
  /** "users", "roles", "auth", ... — used for filtering. */
  module?: string | null;
  status: 'success' | 'failure';
  resourceId?: string | null;
  resourceType?: string | null;
  userId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Centralised audit logger. Failures here NEVER break the request path —
 * audit_logs is best-effort. We log to stdout if the DB write fails.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: event.userId ?? null,
          actorEmail: event.actorEmail ?? null,
          action: event.action,
          module: event.module ?? null,
          resourceId: event.resourceId ?? null,
          resourceType: event.resourceType ?? null,
          status: event.status,
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent ?? null,
          metadata: event.metadata
            ? (event.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    } catch (err) {
      this.logger.error(
        `Audit write failed for ${event.action}`,
        (err as Error)?.stack,
      );
    }
  }

  /** Pull network metadata off an Express request without parsing the body. */
  static extractRequestContext(req: Request): {
    ipAddress: string;
    userAgent: string;
  } {
    const fwd = req.headers['x-forwarded-for'];
    const ipFromHeader = Array.isArray(fwd)
      ? fwd[0]
      : fwd?.split(',')[0]?.trim();
    return {
      ipAddress: ipFromHeader || req.ip || req.socket?.remoteAddress || '',
      userAgent: (req.headers['user-agent'] as string) || '',
    };
  }
}
