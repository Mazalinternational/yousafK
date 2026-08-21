import { Controller, Get, HttpStatus, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../common/auth/auth-types.js';
import { RequirePermissions } from '../../common/auth/decorators/permissions.decorator.js';
import { FindReportsQueryDto } from './dto/find-reports-query.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @RequirePermissions(['reports.read', 'reports.view', 'reports.manage'])
  async summary(
    @Req() req: AuthenticatedRequest,
    @Query() query: FindReportsQueryDto,
  ) {
    const data = await this.reportsService.getSummary(req.user, query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Report summary retrieved successfully',
      data,
    };
  }
}
