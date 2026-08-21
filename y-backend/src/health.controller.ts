import { Controller, Get } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Public } from './common/auth/decorators/public.decorator.js';
import { PrismaService } from './infrastructure/prisma/prisma.service.js';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /** Verifies critical schema columns exist (migration deploy succeeded). */
  @Public()
  @Get('health/db')
  async databaseHealth() {
    const columnRows = await this.prisma.$queryRaw<
      Array<{ column_name: string }>
    >(
      Prisma.sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cash_transactions'
          AND column_name = 'employee_ledger_entry_id'
      `,
    );

    const employeeSalaryCashLinkReady = columnRows.length > 0;

    let salaryCapQueryOk = false;
    try {
      await this.prisma.$queryRaw(
        Prisma.sql`
          SELECT 1
          FROM "employee_ledger_entries"
          WHERE "employee_id" = ${1n}
            AND to_char("salary_month", 'YYYY-MM') = ${'2026-06'}
          LIMIT 1
        `,
      );
      salaryCapQueryOk = true;
    } catch {
      salaryCapQueryOk = false;
    }

    const ready = employeeSalaryCashLinkReady && salaryCapQueryOk;

    return {
      status: ready ? 'ok' : 'degraded',
      checks: {
        employeeSalaryCashLinkReady,
        salaryCapQueryOk,
      },
    };
  }
}
