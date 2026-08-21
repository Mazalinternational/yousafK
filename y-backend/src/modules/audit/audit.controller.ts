import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit.read')
  async list(
    @Query('pageNumber') pageNumber?: string,
    @Query('pageSize') pageSize?: string,
    @Query('action') action?: string,
    @Query('module') moduleName?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    const page = Math.max(1, Number.parseInt(pageNumber || '1', 10) || 1);
    const size = Math.min(
      200,
      Math.max(1, Number.parseInt(pageSize || '25', 10) || 25),
    );

    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (moduleName) where.module = moduleName;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [items, totalCount] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalCount / size));

    return {
      statusCode: HttpStatus.OK,
      message: 'Audit logs retrieved successfully',
      data: {
        items,
        totalCount,
        pageNumber: page,
        pageSize: size,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
        isFirstPage: page === 1,
        isLastPage: page >= totalPages,
        firstPageNumber: 1,
        lastPageNumber: totalPages,
      },
    };
  }
}
