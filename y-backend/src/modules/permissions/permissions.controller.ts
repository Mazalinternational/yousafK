import { Controller, Get, HttpStatus } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Flat list of all permissions. */
  @Get()
  @RequirePermissions(['permissions.read', 'roles.read'], 'any')
  async findAll() {
    const items = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    return {
      statusCode: HttpStatus.OK,
      message: 'Permissions retrieved successfully',
      data: items,
    };
  }

  /**
   * Same data as findAll, grouped by module — exactly the shape the frontend
   * permissions matrix screen wants.
   */
  @Get('grouped')
  @RequirePermissions(['permissions.read', 'roles.read'], 'any')
  async grouped() {
    const items = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    const groups = new Map<
      string,
      {
        module: string;
        permissions: { id: string; key: string; action: string }[];
      }
    >();
    for (const p of items) {
      let group = groups.get(p.module);
      if (!group) {
        group = { module: p.module, permissions: [] };
        groups.set(p.module, group);
      }
      group.permissions.push({ id: p.id, key: p.key, action: p.action });
    }
    return {
      statusCode: HttpStatus.OK,
      message: 'Permissions grouped by module',
      data: Array.from(groups.values()),
    };
  }
}
