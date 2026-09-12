import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import {
  compareShamsiMonthKeys,
  currentShamsiMonthKey,
  shamsiMonthStartGregorian,
  todayGregorianDate,
} from '../../common/shamsi-calendar.js';
import { SeasonService } from '../season/season.service.js';
import {
  calculateOutstandingPayable,
  calculatePayableForShamsiMonth,
  resolveAccrualEndMonthKey,
  resolveEmploymentEndDate,
  resolvePaymentStatus,
} from './employee-salary.util.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { EmployeeDashboardDto } from './dto/employee-dashboard.dto.js';
import { FindEmployeesQueryDto } from './dto/find-employees-query.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const employeeNo = await this.generateEmployeeNo(
      activeSeason.id,
      activeSeason.code,
    );
    const name = this.requireText(createEmployeeDto.name, 'name');
    const position = this.requireText(createEmployeeDto.position, 'position');
    const phoneNo = this.requireText(createEmployeeDto.phoneNo, 'phoneNo');
    const address = this.requireText(createEmployeeDto.address, 'address');
    const joinDate = this.requireDate(createEmployeeDto.joinDate, 'joinDate');
    const monthlySalary = this.parsePositiveDecimal(
      createEmployeeDto.monthlySalary,
      'monthlySalary',
    );
    const status = this.normalizeStatus(createEmployeeDto.status);
    const notes = this.normalizeOptionalText(createEmployeeDto.notes);
    const inactiveDate =
      status === 'inactive' ? todayGregorianDate() : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO "employees" (
          "employee_no",
          "name",
          "position",
          "phone_no",
          "address",
          "join_date",
          "monthly_salary",
          "status",
          "inactive_date",
          "notes",
          "season_id",
          "season_name",
          "updated_at"
        )
        VALUES (
          ${employeeNo},
          ${name},
          ${position},
          ${phoneNo},
          ${address},
          ${joinDate},
          ${monthlySalary},
          ${status},
          ${inactiveDate},
          ${notes},
          ${activeSeason.id},
          ${activeSeason.name},
          NOW()
        )
        RETURNING "id"
      `);

      const employeeId = inserted[0].id;

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "employee_ledgers" (
          "employee_id",
          "updated_at"
        )
        VALUES (
          ${employeeId},
          NOW()
        )
      `);

      return String(employeeId);
    });

    return this.findOne(created);
  }

  async findAll(filters: FindEmployeesQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'employeeNo',
      'name',
      'position',
      'phoneNo',
      'monthlySalary',
      'status',
      'joinDate',
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';
    const status = filters.status
      ? this.normalizeStatus(filters.status)
      : undefined;

    const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];

    if (filters.seasonId) {
      conditions.push(Prisma.sql`e."season_id" = ${filters.seasonId}`);
    }

    if (status) {
      conditions.push(Prisma.sql`e."status" = ${status}`);
    }

    if (query) {
      const likeValue = `%${query}%`;
      conditions.push(Prisma.sql`
        (
          e."employee_no" ILIKE ${likeValue}
          OR e."name" ILIKE ${likeValue}
          OR e."position" ILIKE ${likeValue}
          OR e."phone_no" ILIKE ${likeValue}
          OR e."address" ILIKE ${likeValue}
          OR COALESCE(e."notes", '') ILIKE ${likeValue}
          OR e."season_name" ILIKE ${likeValue}
        )
      `);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const orderByMap: Record<(typeof allowedSortFields)[number], string> = {
      employeeNo: 'e."employee_no"',
      name: 'e."name"',
      position: 'e."position"',
      phoneNo: 'e."phone_no"',
      monthlySalary: 'e."monthly_salary"',
      status: 'e."status"',
      joinDate: 'e."join_date"',
      seasonName: 'e."season_name"',
      createdAt: 'e."created_at"',
      updatedAt: 'e."updated_at"',
    };
    const orderBySql = Prisma.raw(orderByMap[sortBy]);
    const orderDirectionSql = Prisma.raw(
      sortDirection === 'asc' ? ' ASC' : ' DESC',
    );

    const items = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        e."employee_no" AS "employeeNo",
        e."name" AS "name",
        e."position" AS "position",
        e."phone_no" AS "phoneNo",
        e."address" AS "address",
        e."join_date" AS "joinDate",
        e."monthly_salary"::text AS "monthlySalary",
        e."status" AS "status",
        e."inactive_date" AS "inactiveDate",
        e."notes" AS "notes",
        e."season_id" AS "seasonId",
        e."season_name" AS "seasonName",
        e."created_at" AS "createdAt",
        e."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus"
      FROM "employees" e
      INNER JOIN "seasons" s ON s."id" = e."season_id"
      ${whereSql}
      ORDER BY ${orderBySql}${orderDirectionSql}
      LIMIT ${pageSize}
      OFFSET ${(pageNumber - 1) * pageSize}
    `);

    const totalRows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "employees" e
      ${whereSql}
    `);
    const totalCount = Number(totalRows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item) => this.serializeRow(item)),
      totalCount,
      pageNumber,
      pageSize,
      totalPages,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < totalPages,
      isFirstPage: pageNumber === 1,
      isLastPage: pageNumber >= totalPages,
      firstPageNumber: 1,
      lastPageNumber: totalPages,
    };
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        e."employee_no" AS "employeeNo",
        e."name" AS "name",
        e."position" AS "position",
        e."phone_no" AS "phoneNo",
        e."address" AS "address",
        e."join_date" AS "joinDate",
        e."monthly_salary"::text AS "monthlySalary",
        e."status" AS "status",
        e."inactive_date" AS "inactiveDate",
        e."notes" AS "notes",
        e."season_id" AS "seasonId",
        e."season_name" AS "seasonName",
        e."created_at" AS "createdAt",
        e."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus"
      FROM "employees" e
      INNER JOIN "seasons" s ON s."id" = e."season_id"
      WHERE e."id" = ${this.parseId(id)}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException(`Employee with id "${id}" not found`);
    }

    return this.serializeRow(rows[0]);
  }

  async getDashboard(seasonId?: string): Promise<EmployeeDashboardDto> {
    let season: Awaited<
      ReturnType<SeasonService['getActiveSeasonOrThrow']>
    > | null = null;

    try {
      season = await this.seasonService.resolveSeasonForRead(seasonId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          season: null,
          overview: [],
          paidEmployees: [],
          remainingEmployees: [],
        };
      }

      throw error;
    }

    const currentMonthKey = currentShamsiMonthKey();
    const monthStart = shamsiMonthStartGregorian(currentMonthKey);

    const employeeRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        e."employee_no" AS "employeeNo",
        e."name" AS "name",
        e."position" AS "position",
        e."status" AS "status",
        e."inactive_date" AS "inactiveDate",
        e."updated_at" AS "updatedAt",
        e."phone_no" AS "phoneNo",
        e."join_date" AS "joinDate",
        e."monthly_salary"::text AS "monthlySalary",
        COALESCE(monthly_entries."paidThisMonth", 0)::text AS "paidThisMonth",
        COALESCE(monthly_entries."deductionsThisMonth", 0)::text AS "deductionsThisMonth",
        monthly_entries."lastPaymentDate" AS "lastPaymentDate"
      FROM "employees" e
      LEFT JOIN (
        SELECT
          "employee_id" AS "employeeId",
          COALESCE(SUM(CASE WHEN "entry_type" = 'salary_payment' THEN "amount" ELSE 0 END), 0)::decimal AS "paidThisMonth",
          COALESCE(SUM(CASE WHEN "entry_type" = 'salary_deduction' THEN "amount" ELSE 0 END), 0)::decimal AS "deductionsThisMonth",
          MAX(CASE WHEN "entry_type" = 'salary_payment' THEN "occurred_at" ELSE NULL END) AS "lastPaymentDate"
        FROM "employee_ledger_entries"
        WHERE "salary_month" = ${monthStart}
        GROUP BY "employee_id"
      ) AS monthly_entries ON monthly_entries."employeeId" = e."id"
      WHERE e."season_id" = ${season.id}
      ORDER BY e."name" ASC, e."employee_no" ASC
    `);

    const employees = employeeRows.map((row) => {
      const monthlySalary = new Prisma.Decimal(row.monthlySalary ?? 0);
      const paidThisMonth = new Prisma.Decimal(row.paidThisMonth ?? 0);
      const deductionsThisMonth = new Prisma.Decimal(
        row.deductionsThisMonth ?? 0,
      );
      const employmentEndDate = resolveEmploymentEndDate(
        row.status,
        row.inactiveDate,
        row.updatedAt,
      );
      const accrualEndMonthKey = resolveAccrualEndMonthKey(
        row.status,
        row.inactiveDate,
        undefined,
        row.updatedAt,
      );
      const isPastEmployment =
        compareShamsiMonthKeys(currentMonthKey, accrualEndMonthKey) > 0;
      const grossPayableThisMonth = isPastEmployment
        ? new Prisma.Decimal(0)
        : calculatePayableForShamsiMonth(
            monthlySalary,
            row.joinDate,
            monthStart,
            deductionsThisMonth,
            todayGregorianDate(),
            employmentEndDate,
          ).payableAmount;
      const rawRemainingAmount = grossPayableThisMonth.minus(paidThisMonth);
      const remainingAmount = rawRemainingAmount.greaterThan(0)
        ? rawRemainingAmount
        : new Prisma.Decimal(0);
      const payableThisMonth = calculateOutstandingPayable(
        grossPayableThisMonth,
        paidThisMonth,
      );
      const weOweEmployeeAmount = rawRemainingAmount.lessThan(0)
        ? rawRemainingAmount.negated()
        : new Prisma.Decimal(0);
      const paymentStatus = resolvePaymentStatus(
        grossPayableThisMonth,
        paidThisMonth,
      );

      return {
        id: String(row.id),
        employeeNo: row.employeeNo,
        name: row.name,
        position: row.position,
        status: row.status,
        paymentStatus,
        phoneNo: row.phoneNo,
        monthlySalary: monthlySalary.toFixed(2),
        payableThisMonth: payableThisMonth.toFixed(2),
        paidThisMonth: paidThisMonth.toFixed(2),
        deductionsThisMonth: deductionsThisMonth.toFixed(2),
        remainingAmount: remainingAmount.toFixed(2),
        weOweEmployeeAmount: weOweEmployeeAmount.toFixed(2),
        lastPaymentDate: row.lastPaymentDate,
      };
    });

    const totals = employees.reduce(
      (accumulator, employee) => {
        const monthlySalary = new Prisma.Decimal(employee.monthlySalary);
        const payableThisMonth = new Prisma.Decimal(employee.payableThisMonth);
        const paidThisMonth = new Prisma.Decimal(employee.paidThisMonth);
        const deductionsThisMonth = new Prisma.Decimal(
          employee.deductionsThisMonth,
        );
        const remainingAmount = new Prisma.Decimal(employee.remainingAmount);

        return {
          totalEmployees: accumulator.totalEmployees + 1,
          paidEmployees:
            employee.paymentStatus === 'paid'
              ? accumulator.paidEmployees + 1
              : accumulator.paidEmployees,
          remainingEmployees:
            employee.paymentStatus !== 'paid'
              ? accumulator.remainingEmployees + 1
              : accumulator.remainingEmployees,
          totalMonthlySalary:
            accumulator.totalMonthlySalary.plus(monthlySalary),
          totalPayableThisMonth:
            accumulator.totalPayableThisMonth.plus(payableThisMonth),
          totalPaidThisMonth:
            accumulator.totalPaidThisMonth.plus(paidThisMonth),
          totalDeductionsThisMonth:
            accumulator.totalDeductionsThisMonth.plus(deductionsThisMonth),
          totalRemainingAmount:
            accumulator.totalRemainingAmount.plus(remainingAmount),
        };
      },
      {
        totalEmployees: 0,
        paidEmployees: 0,
        remainingEmployees: 0,
        totalMonthlySalary: new Prisma.Decimal(0),
        totalPayableThisMonth: new Prisma.Decimal(0),
        totalPaidThisMonth: new Prisma.Decimal(0),
        totalDeductionsThisMonth: new Prisma.Decimal(0),
        totalRemainingAmount: new Prisma.Decimal(0),
      },
    );

    return {
      season: {
        id: season.id,
        name: season.name,
        status: season.status as 'ACTIVE' | 'CLOSED',
        startDate: season.startDate,
        endDate: season.endDate,
      },
      overview: [
        {
          label: 'total_employees',
          value: String(totals.totalEmployees),
          unit: 'count',
        },
        {
          label: 'paid_employees',
          value: String(totals.paidEmployees),
          unit: 'count',
        },
        {
          label: 'remaining_employees',
          value: String(totals.remainingEmployees),
          unit: 'count',
        },
        {
          label: 'total_monthly_salary',
          value: totals.totalMonthlySalary.toFixed(2),
          unit: 'amount',
        },
        {
          label: 'payable_this_month',
          value: totals.totalPayableThisMonth.toFixed(2),
          unit: 'amount',
        },
        {
          label: 'paid_salary_this_month',
          value: totals.totalPaidThisMonth.toFixed(2),
          unit: 'amount',
        },
        {
          label: 'deductions_this_month',
          value: totals.totalDeductionsThisMonth.toFixed(2),
          unit: 'amount',
        },
        {
          label: 'salary_amount_remaining',
          value: totals.totalRemainingAmount.toFixed(2),
          unit: 'amount',
        },
      ],
      paidEmployees: employees.filter(
        (employee) => employee.paymentStatus === 'paid',
      ),
      remainingEmployees: employees.filter(
        (employee) => employee.paymentStatus !== 'paid',
      ),
    };
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const name =
      updateEmployeeDto.name !== undefined
        ? this.requireText(updateEmployeeDto.name, 'name')
        : current.name;
    const position =
      updateEmployeeDto.position !== undefined
        ? this.requireText(updateEmployeeDto.position, 'position')
        : current.position;
    const phoneNo =
      updateEmployeeDto.phoneNo !== undefined
        ? this.requireText(updateEmployeeDto.phoneNo, 'phoneNo')
        : current.phoneNo;
    const address =
      updateEmployeeDto.address !== undefined
        ? this.requireText(updateEmployeeDto.address, 'address')
        : current.address;
    const joinDate =
      updateEmployeeDto.joinDate !== undefined
        ? this.requireDate(updateEmployeeDto.joinDate, 'joinDate')
        : current.joinDate;
    const monthlySalary =
      updateEmployeeDto.monthlySalary !== undefined
        ? this.parsePositiveDecimal(
            updateEmployeeDto.monthlySalary,
            'monthlySalary',
          )
        : new Prisma.Decimal(current.monthlySalary);
    const status =
      updateEmployeeDto.status !== undefined
        ? this.normalizeStatus(updateEmployeeDto.status)
        : current.status;
    const notes =
      updateEmployeeDto.notes !== undefined
        ? this.normalizeOptionalText(updateEmployeeDto.notes)
        : current.notes;
    const wasInactive = current.status === 'inactive';
    const becomingInactive = status === 'inactive' && !wasInactive;
    const becomingActive = status === 'active' && wasInactive;
    let inactiveDate: string | Date | null =
      current.inactiveDate != null ? current.inactiveDate : null;

    if (becomingInactive) {
      inactiveDate = todayGregorianDate();
    } else if (becomingActive) {
      inactiveDate = null;
    } else if (status === 'inactive' && inactiveDate == null) {
      inactiveDate = todayGregorianDate();
    }

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "employees"
      SET
        "name" = ${name},
        "position" = ${position},
        "phone_no" = ${phoneNo},
        "address" = ${address},
        "join_date" = ${joinDate},
        "monthly_salary" = ${monthlySalary},
        "status" = ${status},
        "inactive_date" = ${inactiveDate},
        "notes" = ${notes},
        "updated_at" = NOW()
      WHERE "id" = ${this.parseId(id)}
    `);

    return this.findOne(id);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM "employees"
      WHERE "id" = ${this.parseId(id)}
    `);

    return current;
  }

  private async generateEmployeeNo(
    seasonId: string,
    seasonCode: string | null | undefined,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before employees can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-EMP-`;
    const lastEntry = await this.prisma.$queryRaw<
      Array<{ employeeNo: string }>
    >(Prisma.sql`
      SELECT "employee_no" AS "employeeNo"
      FROM "employees"
      WHERE "season_id" = ${seasonId}
        AND "employee_no" LIKE ${`${prefix}%`}
      ORDER BY "created_at" DESC
      LIMIT 1
    `);

    const nextNumber = lastEntry[0]?.employeeNo?.startsWith(prefix)
      ? Number(lastEntry[0].employeeNo.slice(prefix.length)) + 1
      : 1;

    return `${prefix}${nextNumber}`;
  }

  private serializeRow(row: any) {
    return {
      id: String(row.id),
      employeeNo: row.employeeNo,
      name: row.name,
      position: row.position,
      phoneNo: row.phoneNo,
      address: row.address,
      joinDate: row.joinDate,
      monthlySalary: new Prisma.Decimal(row.monthlySalary).toFixed(2),
      status: row.status,
      inactiveDate: row.inactiveDate ?? null,
      notes: row.notes,
      seasonId: row.seasonId,
      seasonName: row.seasonName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      season: row.seasonRefId
        ? {
            id: row.seasonRefId,
            name: row.seasonRefName,
            status: row.seasonRefStatus,
          }
        : null,
    };
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private requireText(value: string, fieldName: string) {
    const normalized = value?.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private requireDate(value: string, fieldName: string) {
    const normalized = value?.trim();

    if (!normalized || Number.isNaN(Date.parse(normalized))) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return normalized.slice(0, 10);
  }

  private parsePositiveDecimal(
    value: string | number | Prisma.Decimal,
    fieldName: string,
  ) {
    try {
      const decimal = new Prisma.Decimal(value as Prisma.Decimal.Value);
      if (decimal.lessThanOrEqualTo(0)) {
        throw new BadRequestException(`${fieldName} must be greater than 0`);
      }
      return decimal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
  }

  private normalizeStatus(value?: string) {
    const normalized = value?.trim().toLowerCase() || 'active';

    if (!['active', 'inactive'].includes(normalized)) {
      throw new BadRequestException('status must be active or inactive');
    }

    return normalized as 'active' | 'inactive';
  }
}
