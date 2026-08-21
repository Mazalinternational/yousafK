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
  formatShamsiMonthLabel,
  isFutureShamsiMonth,
  normalizeSalaryMonthDate,
  salaryMonthToShamsiKey,
  salaryPaymentIsAdvance,
  shamsiMonthKey,
  shamsiMonthKeysInclusive,
  shamsiMonthStartGregorian,
} from '../../common/shamsi-calendar.js';
import { CashService } from '../cash/cash.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateCreditRepaymentDto } from './dto/create-credit-repayment.dto.js';
import { CreateSalaryPaymentDto } from './dto/create-salary-payment.dto.js';
import { UpdateSalaryLedgerEntryDto } from './dto/update-salary-ledger-entry.dto.js';
import {
  calculateOutstandingPayable,
  calculatePayableForShamsiMonth,
  resolvePaymentStatus,
} from './employee-salary.util.js';

@Injectable()
export class EmployeeLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly currencyService: CurrencyService,
    private readonly sarafLedgerService: SarafLedgerService,
    private readonly cashService: CashService,
  ) {}

  async getEmployeeAccount(employeeId: string) {
    const employeeRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
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
        e."notes" AS "notes",
        e."season_id" AS "seasonId",
        e."season_name" AS "seasonName",
        e."created_at" AS "createdAt",
        e."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus",
        l."id"::text AS "ledgerId",
        l."created_at" AS "ledgerCreatedAt",
        l."updated_at" AS "ledgerUpdatedAt"
      FROM "employees" e
      INNER JOIN "seasons" s ON s."id" = e."season_id"
      LEFT JOIN "employee_ledgers" l ON l."employee_id" = e."id"
      WHERE e."id" = ${this.parseId(employeeId)}
      LIMIT 1
    `);

    const employee = employeeRows[0];

    if (!employee) {
      throw new NotFoundException(`Employee with id "${employeeId}" not found`);
    }

    if (!employee.ledgerId) {
      throw new NotFoundException(
        `Ledger for employee "${employeeId}" not found`,
      );
    }

    const entries = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        e."entry_type" AS "entryType",
        e."amount"::text AS "amount",
        e."salary_month"::text AS "salaryMonth",
        e."occurred_at"::text AS "occurredAt",
        COALESCE(e."is_advance", false) AS "isAdvance",
        e."payment_channel"::text AS "paymentChannel",
        e."saraf_id"::text AS "sarafId",
        e."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
        e."notes" AS "notes",
        e."created_at" AS "createdAt",
        e."updated_at" AS "updatedAt",
        s."id"::text AS "sarafRefId",
        s."name" AS "sarafName",
        c."id" AS "currencyRefId",
        c."code" AS "currencyCode",
        c."name" AS "currencyName"
      FROM "employee_ledger_entries" e
      LEFT JOIN "sarafs" s ON s."id" = e."saraf_id"
      LEFT JOIN "currencies" c ON c."id" = e."saraf_ledger_currency_id"
      WHERE e."employee_id" = ${this.parseId(employeeId)}
      ORDER BY e."occurred_at" DESC, e."created_at" DESC
    `);

    const serializedEntries = entries.map((entry) =>
      this.serializeLedgerEntryRow(entry),
    );

    return {
      employee: {
        id: employee.id,
        employeeNo: employee.employeeNo,
        name: employee.name,
        position: employee.position,
        phoneNo: employee.phoneNo,
        address: employee.address,
        joinDate: employee.joinDate,
        monthlySalary: new Prisma.Decimal(employee.monthlySalary).toFixed(2),
        status: employee.status,
        notes: employee.notes,
        seasonId: employee.seasonId,
        seasonName: employee.seasonName,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        season: employee.seasonRefId
          ? {
              id: employee.seasonRefId,
              name: employee.seasonRefName,
              status: employee.seasonRefStatus,
            }
          : null,
      },
      ledger: {
        id: employee.ledgerId,
        createdAt: employee.ledgerCreatedAt,
        updatedAt: employee.ledgerUpdatedAt,
        summary: this.buildSummary(
          new Prisma.Decimal(employee.monthlySalary),
          employee.joinDate,
          serializedEntries,
        ),
        entries: serializedEntries,
      },
    };
  }

  async addSalaryPayment(employeeId: string, dto: CreateSalaryPaymentDto) {
    return this.createLedgerEntry(employeeId, dto, 'salary_payment');
  }

  async addSalaryDeduction(employeeId: string, dto: CreateSalaryPaymentDto) {
    return this.createLedgerEntry(employeeId, dto, 'salary_deduction');
  }

  async addCreditRepayment(employeeId: string, dto: CreateCreditRepaymentDto) {
    const employee = await this.requireEmployee(employeeId);
    await this.seasonService.assertSeasonIsEditableById(employee.seasonId);
    const ledger = await this.requireLedger(employee.id);

    const amount = this.parsePositiveDecimal(dto.amount, 'amount');
    const paymentDate = this.requireDate(dto.paymentDate, 'paymentDate');
    const salaryMonth = normalizeSalaryMonthDate(paymentDate);
    const notes = dto.notes?.trim() || null;
    const paymentChannel = this.normalizePaymentChannel(dto.paymentChannel);
    const sarafIdTrimmed = dto.sarafId?.trim() ?? '';
    const currencyIdTrimmed = dto.sarafLedgerCurrencyId?.trim() ?? '';

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId must be omitted when collecting employee credit repayment in cash',
      );
    }

    if (!currencyIdTrimmed) {
      throw new BadRequestException(
        'sarafLedgerCurrencyId is required when collecting employee credit repayment in cash or to Saraf',
      );
    }

    const resolvedCurrencyId =
      await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);

    let sarafIdBig: bigint | null = null;
    if (paymentChannel === 'saraf') {
      if (!sarafIdTrimmed) {
        throw new BadRequestException(
          'sarafId is required when collecting employee credit repayment to Saraf',
        );
      }
      sarafIdBig = await this.resolveSarafForEmployeeSeason(
        sarafIdTrimmed,
        employee.seasonId,
      );
    }

    const creditBalance = await this.getEmployeeCreditBalance(employeeId);
    if (creditBalance.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'This employee has no credit balance to collect',
      );
    }
    if (amount.greaterThan(creditBalance)) {
      throw new BadRequestException(
        `Credit repayment amount cannot exceed the employee credit balance (${creditBalance.toFixed(2)})`,
      );
    }

    const settlementNotes = `Employee credit repayment ${employee.name} (${employee.employeeNo})${
      notes ? ` — ${notes}` : ''
    }`;

    const inserted = await this.prisma.$transaction(async (tx) => {
      const createdRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO "employee_ledger_entries" (
          "ledger_id",
          "employee_id",
          "entry_type",
          "amount",
          "salary_month",
          "occurred_at",
          "is_advance",
          "payment_channel",
          "saraf_id",
          "saraf_ledger_currency_id",
          "notes",
          "updated_at"
        )
        VALUES (
          ${ledger.id},
          ${employee.id},
          ${'credit_repayment'},
          ${amount},
          ${salaryMonth},
          ${paymentDate},
          ${false},
          ${paymentChannel}::"RiceSalePaymentChannel",
          ${paymentChannel === 'saraf' ? sarafIdBig : null},
          ${resolvedCurrencyId},
          ${notes},
          NOW()
        )
        RETURNING "id"
      `);

      const entryId = BigInt(createdRows[0].id);

      if (paymentChannel === 'cash') {
        await this.cashService.createLinkedEmployeeCreditRepaymentInEntry(tx, {
          currencyId: resolvedCurrencyId,
          amount,
          occurredAt: new Date(paymentDate),
          notes: settlementNotes,
          seasonId: employee.seasonId,
          seasonName: employee.seasonName,
          employeeLedgerEntryId: entryId,
        });
      } else if (sarafIdBig) {
        await this.sarafLedgerService.createLinkedEmployeeCreditRepaymentSarafEntry(
          tx,
          {
            sarafId: sarafIdBig,
            currencyId: resolvedCurrencyId,
            amount,
            occurredAt: new Date(paymentDate),
            notes: settlementNotes,
            employeeLedgerEntryId: entryId,
          },
        );
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "employee_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${ledger.id}
      `);

      return this.fetchEntryDetail(tx, entryId);
    });

    return this.serializeLedgerEntryRow(inserted);
  }

  async updateLedgerEntry(
    employeeId: string,
    entryId: string,
    dto: UpdateSalaryLedgerEntryDto,
  ) {
    const employee = await this.requireEmployee(employeeId);
    await this.seasonService.assertSeasonIsEditableById(employee.seasonId);
    const existing = await this.requireLedgerEntry(employeeId, entryId);
    const entryTypeRaw = existing.entryType;

    if (
      entryTypeRaw !== 'salary_payment' &&
      entryTypeRaw !== 'salary_deduction' &&
      entryTypeRaw !== 'credit_repayment'
    ) {
      throw new BadRequestException(
        `Unsupported employee ledger entry type "${entryTypeRaw}"`,
      );
    }

    const entryType = entryTypeRaw;

    const amount =
      dto.amount !== undefined
        ? this.parsePositiveDecimal(dto.amount, 'amount')
        : new Prisma.Decimal(existing.amount);
    const paymentDate = dto.paymentDate
      ? this.requireDate(dto.paymentDate, 'paymentDate')
      : String(existing.occurredAt).slice(0, 10);
    const salaryMonth = normalizeSalaryMonthDate(
      entryType === 'credit_repayment'
        ? paymentDate
        : dto.salaryMonth
          ? this.requireDate(dto.salaryMonth, 'salaryMonth')
          : String(existing.salaryMonth).slice(0, 10),
    );
    const notes =
      dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes;
    const monthKey = salaryMonthToShamsiKey(salaryMonth);

    const isAdvance =
      entryType === 'salary_payment' &&
      salaryPaymentIsAdvance(paymentDate, salaryMonth);

    const paymentChannel =
      entryType === 'salary_payment' || entryType === 'credit_repayment'
        ? this.normalizePaymentChannel(
            dto.paymentChannel ?? existing.paymentChannel ?? 'cash',
          )
        : ('cash' as const);

    const sarafIdTrimmed =
      dto.sarafId?.trim() ??
      (existing.sarafId != null ? String(existing.sarafId) : '');
    const currencyIdTrimmed =
      dto.sarafLedgerCurrencyId?.trim() ?? existing.sarafLedgerCurrencyId ?? '';

    if (entryType === 'salary_deduction') {
      if (paymentChannel === 'saraf' || sarafIdTrimmed) {
        throw new BadRequestException(
          'Saraf must be omitted for salary deductions',
        );
      }
    }

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        entryType === 'credit_repayment'
          ? 'sarafId must be omitted when collecting employee credit repayment in cash'
          : 'sarafId must be omitted when paying salary in cash',
      );
    }

    let sarafIdBig: bigint | null = null;
    let resolvedCurrencyId: string | null = null;

    if (entryType === 'salary_payment' || entryType === 'credit_repayment') {
      if (!currencyIdTrimmed) {
        throw new BadRequestException(
          entryType === 'credit_repayment'
            ? 'sarafLedgerCurrencyId is required when collecting employee credit repayment in cash or to Saraf'
            : 'sarafLedgerCurrencyId is required when paying salary in cash or from Saraf',
        );
      }

      resolvedCurrencyId =
        await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);
    }

    if (
      (entryType === 'salary_payment' || entryType === 'credit_repayment') &&
      paymentChannel === 'saraf'
    ) {
      if (!sarafIdTrimmed) {
        throw new BadRequestException(
          entryType === 'credit_repayment'
            ? 'sarafId is required when collecting employee credit repayment to Saraf'
            : 'sarafId is required when paying salary from Saraf',
        );
      }

      sarafIdBig = await this.resolveSarafForEmployeeSeason(
        sarafIdTrimmed,
        employee.seasonId,
      );
    }

    if (entryType === 'credit_repayment') {
      const creditBalance = await this.getEmployeeCreditBalance(employeeId, {
        excludeEntryId: entryId,
      });
      if (amount.greaterThan(creditBalance)) {
        throw new BadRequestException(
          `Credit repayment amount cannot exceed the employee credit balance (${creditBalance.toFixed(2)})`,
        );
      }
    }

    const entryIdBig = this.parseId(entryId);
    const settlementNotes =
      entryType === 'credit_repayment'
        ? `Employee credit repayment ${employee.name} (${employee.employeeNo})${
            notes ? ` — ${notes}` : ''
          }`
        : `Employee salary ${employee.name} (${employee.employeeNo}) — ${monthKey}${
            notes ? ` — ${notes}` : ''
          }`;

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.deleteLinkedSettlements(tx, entryIdBig);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "employee_ledger_entries"
        SET
          "amount" = ${amount},
          "salary_month" = ${salaryMonth},
          "occurred_at" = ${paymentDate},
          "is_advance" = ${isAdvance},
          "payment_channel" = ${paymentChannel}::"RiceSalePaymentChannel",
          "saraf_id" = ${paymentChannel === 'saraf' ? sarafIdBig : null},
          "saraf_ledger_currency_id" = ${
            entryType === 'salary_payment' || entryType === 'credit_repayment'
              ? resolvedCurrencyId
              : null
          },
          "notes" = ${notes},
          "updated_at" = NOW()
        WHERE "id" = ${entryIdBig}
      `);

      if (
        entryType === 'salary_payment' &&
        paymentChannel === 'cash' &&
        resolvedCurrencyId
      ) {
        await this.cashService.createLinkedEmployeeSalaryPaymentOutEntry(tx, {
          currencyId: resolvedCurrencyId,
          amount,
          occurredAt: new Date(paymentDate),
          notes: settlementNotes,
          seasonId: employee.seasonId,
          seasonName: employee.seasonName,
          employeeLedgerEntryId: entryIdBig,
        });
      } else if (
        entryType === 'salary_payment' &&
        paymentChannel === 'saraf' &&
        sarafIdBig &&
        resolvedCurrencyId
      ) {
        await this.sarafLedgerService.createLinkedEmployeeSalaryPaymentEntry(
          tx,
          {
            sarafId: sarafIdBig,
            currencyId: resolvedCurrencyId,
            amount,
            occurredAt: new Date(paymentDate),
            notes: settlementNotes,
            employeeLedgerEntryId: entryIdBig,
          },
        );
      } else if (
        entryType === 'credit_repayment' &&
        paymentChannel === 'cash' &&
        resolvedCurrencyId
      ) {
        await this.cashService.createLinkedEmployeeCreditRepaymentInEntry(tx, {
          currencyId: resolvedCurrencyId,
          amount,
          occurredAt: new Date(paymentDate),
          notes: settlementNotes,
          seasonId: employee.seasonId,
          seasonName: employee.seasonName,
          employeeLedgerEntryId: entryIdBig,
        });
      } else if (
        entryType === 'credit_repayment' &&
        paymentChannel === 'saraf' &&
        sarafIdBig &&
        resolvedCurrencyId
      ) {
        await this.sarafLedgerService.createLinkedEmployeeCreditRepaymentSarafEntry(
          tx,
          {
            sarafId: sarafIdBig,
            currencyId: resolvedCurrencyId,
            amount,
            occurredAt: new Date(paymentDate),
            notes: settlementNotes,
            employeeLedgerEntryId: entryIdBig,
          },
        );
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "employee_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${existing.ledgerId}
      `);

      return this.fetchEntryDetail(tx, entryIdBig);
    });

    return this.serializeLedgerEntryRow(updated);
  }

  async deleteLedgerEntry(employeeId: string, entryId: string) {
    const employee = await this.requireEmployee(employeeId);
    await this.seasonService.assertSeasonIsEditableById(employee.seasonId);
    const existing = await this.requireLedgerEntry(employeeId, entryId);
    const entryIdBig = this.parseId(entryId);

    await this.prisma.$transaction(async (tx) => {
      await this.deleteLinkedSettlements(tx, entryIdBig);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM "employee_ledger_entries"
        WHERE "id" = ${entryIdBig}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "employee_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${existing.ledgerId}
      `);
    });

    return { id: entryId };
  }

  async getSalaryMonthPreview(employeeId: string, salaryMonthInput: string) {
    const employee = await this.requireEmployee(employeeId);
    const salaryMonth = normalizeSalaryMonthDate(salaryMonthInput);
    const monthKey = salaryMonthToShamsiKey(salaryMonth);

    const entries = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."entry_type" AS "entryType",
        e."amount"::text AS "amount",
        e."salary_month"::text AS "salaryMonth"
      FROM "employee_ledger_entries" e
      WHERE e."employee_id" = ${employee.id}
    `);

    const monthEntries = entries.filter(
      (entry) => salaryMonthToShamsiKey(String(entry.salaryMonth)) === monthKey,
    );

    const paidAmount = monthEntries.reduce((sum, entry) => {
      if (entry.entryType !== 'salary_payment') {
        return sum;
      }
      return sum.plus(new Prisma.Decimal(entry.amount));
    }, new Prisma.Decimal(0));

    const deductionsAmount = monthEntries.reduce((sum, entry) => {
      if (entry.entryType !== 'salary_deduction') {
        return sum;
      }
      return sum.plus(new Prisma.Decimal(entry.amount));
    }, new Prisma.Decimal(0));

    const calculation = calculatePayableForShamsiMonth(
      new Prisma.Decimal(employee.monthlySalary),
      employee.joinDate,
      salaryMonth,
      deductionsAmount,
    );

    const remainingAmount = Prisma.Decimal.max(
      calculation.payableAmount.minus(paidAmount),
      0,
    );
    const isPrepaid =
      remainingAmount.lessThanOrEqualTo(0) && paidAmount.greaterThan(0);

    return {
      salaryMonth,
      shamsiMonthKey: monthKey,
      shamsiMonthLabel: formatShamsiMonthLabel(salaryMonth),
      monthlySalary: new Prisma.Decimal(employee.monthlySalary).toFixed(2),
      payableAmount: calculation.payableAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      deductionsAmount: deductionsAmount.toFixed(2),
      remainingAmount: remainingAmount.toFixed(2),
      payableDays: calculation.payableDays,
      daysInMonth: calculation.daysInMonth,
      isHireMonth: calculation.isHireMonth,
      isPartialMonth: calculation.isPartialMonth,
      isFutureMonth: isFutureShamsiMonth(monthKey),
      isPrepaid,
    };
  }

  private async createLedgerEntry(
    employeeId: string,
    dto: CreateSalaryPaymentDto,
    entryType: 'salary_payment' | 'salary_deduction',
  ) {
    const employee = await this.requireEmployee(employeeId);
    await this.seasonService.assertSeasonIsEditableById(employee.seasonId);
    const ledger = await this.requireLedger(employee.id);

    const amount = this.parsePositiveDecimal(dto.amount, 'amount');
    const paymentDate = this.requireDate(dto.paymentDate, 'paymentDate');
    const salaryMonth = normalizeSalaryMonthDate(
      this.requireDate(dto.salaryMonth, 'salaryMonth'),
    );
    const notes = dto.notes?.trim() || null;
    const monthKey = salaryMonthToShamsiKey(salaryMonth);

    const isAdvance =
      entryType === 'salary_payment' &&
      salaryPaymentIsAdvance(paymentDate, salaryMonth);

    const paymentChannel =
      entryType === 'salary_payment'
        ? this.normalizePaymentChannel(dto.paymentChannel)
        : ('cash' as const);

    const sarafIdTrimmed = dto.sarafId?.trim() ?? '';
    const currencyIdTrimmed = dto.sarafLedgerCurrencyId?.trim() ?? '';

    if (entryType === 'salary_deduction') {
      if (paymentChannel === 'saraf' || sarafIdTrimmed) {
        throw new BadRequestException(
          'Saraf must be omitted for salary deductions',
        );
      }
    }

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId must be omitted when paying salary in cash',
      );
    }

    let sarafIdBig: bigint | null = null;
    let resolvedCurrencyId: string | null = null;

    if (entryType === 'salary_payment') {
      if (!currencyIdTrimmed) {
        throw new BadRequestException(
          'sarafLedgerCurrencyId is required when paying salary in cash or from Saraf',
        );
      }

      resolvedCurrencyId =
        await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);
    }

    if (entryType === 'salary_payment' && paymentChannel === 'saraf') {
      if (!sarafIdTrimmed) {
        throw new BadRequestException(
          'sarafId is required when paying salary from Saraf',
        );
      }

      sarafIdBig = this.parseId(sarafIdTrimmed);

      const saraf = await this.prisma.saraf.findUnique({
        where: { id: sarafIdBig },
        select: {
          id: true,
          seasonId: true,
          ledger: { select: { id: true } },
        },
      });

      if (!saraf) {
        throw new NotFoundException(
          `Saraf with id "${sarafIdTrimmed}" not found`,
        );
      }

      if (saraf.seasonId !== employee.seasonId) {
        throw new BadRequestException(
          'Selected Saraf must belong to the same season as the employee',
        );
      }

      if (!saraf.ledger) {
        throw new BadRequestException(
          'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
        );
      }
    }

    const inserted = await this.prisma.$transaction(async (tx) => {
      const createdRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO "employee_ledger_entries" (
          "ledger_id",
          "employee_id",
          "entry_type",
          "amount",
          "salary_month",
          "occurred_at",
          "is_advance",
          "payment_channel",
          "saraf_id",
          "saraf_ledger_currency_id",
          "notes",
          "updated_at"
        )
        VALUES (
          ${ledger.id},
          ${employee.id},
          ${entryType},
          ${amount},
          ${salaryMonth},
          ${paymentDate},
          ${isAdvance},
          ${paymentChannel}::"RiceSalePaymentChannel",
          ${paymentChannel === 'saraf' ? sarafIdBig : null},
          ${entryType === 'salary_payment' ? resolvedCurrencyId : null},
          ${notes},
          NOW()
        )
        RETURNING
          "id"
      `);

      const entryId = BigInt(createdRows[0].id);

      const monthLabel = monthKey;
      const settlementNotes = `Employee salary ${employee.name} (${employee.employeeNo}) — ${monthLabel}${
        notes ? ` — ${notes}` : ''
      }`;

      if (
        entryType === 'salary_payment' &&
        paymentChannel === 'cash' &&
        resolvedCurrencyId
      ) {
        await this.cashService.createLinkedEmployeeSalaryPaymentOutEntry(tx, {
          currencyId: resolvedCurrencyId,
          amount,
          occurredAt: new Date(paymentDate),
          notes: settlementNotes,
          seasonId: employee.seasonId,
          seasonName: employee.seasonName,
          employeeLedgerEntryId: entryId,
        });
      } else if (
        entryType === 'salary_payment' &&
        paymentChannel === 'saraf' &&
        sarafIdBig &&
        resolvedCurrencyId
      ) {
        await this.sarafLedgerService.createLinkedEmployeeSalaryPaymentEntry(
          tx,
          {
            sarafId: sarafIdBig,
            currencyId: resolvedCurrencyId,
            amount,
            occurredAt: new Date(paymentDate),
            notes: settlementNotes,
            employeeLedgerEntryId: entryId,
          },
        );
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "employee_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${ledger.id}
      `);

      const detailRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT
          ele."id"::text AS "id",
          ele."entry_type" AS "entryType",
          ele."amount"::text AS "amount",
          ele."salary_month"::text AS "salaryMonth",
          ele."occurred_at"::text AS "occurredAt",
          COALESCE(ele."is_advance", false) AS "isAdvance",
          ele."payment_channel"::text AS "paymentChannel",
          ele."saraf_id"::text AS "sarafId",
          ele."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
          s."name" AS "sarafName",
          c."id" AS "currencyRefId",
          c."code" AS "currencyCode",
          c."name" AS "currencyName",
          ele."notes" AS "notes",
          ele."created_at" AS "createdAt",
          ele."updated_at" AS "updatedAt"
        FROM "employee_ledger_entries" ele
        LEFT JOIN "sarafs" s ON s."id" = ele."saraf_id"
        LEFT JOIN "currencies" c ON c."id" = ele."saraf_ledger_currency_id"
        WHERE ele."id" = ${entryId}
        LIMIT 1
      `);

      return detailRows;
    });

    return this.serializeLedgerEntryRow(inserted[0]);
  }

  private serializeLedgerEntryRow(entry: any) {
    return {
      id: entry.id,
      entryType: entry.entryType,
      amount: new Prisma.Decimal(entry.amount).toFixed(2),
      salaryMonth: entry.salaryMonth,
      occurredAt: entry.occurredAt,
      isAdvance: Boolean(entry.isAdvance),
      paymentChannel: entry.paymentChannel ?? 'cash',
      sarafId: entry.sarafId ?? null,
      sarafLedgerCurrencyId: entry.sarafLedgerCurrencyId ?? null,
      saraf:
        entry.sarafId && entry.sarafName
          ? { id: entry.sarafId, name: entry.sarafName }
          : null,
      sarafLedgerCurrency:
        entry.sarafLedgerCurrencyId && entry.currencyRefId
          ? {
              id: entry.currencyRefId,
              code: entry.currencyCode,
              name: entry.currencyName,
            }
          : null,
      notes: entry.notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private normalizePaymentChannel(paymentChannel?: string | null) {
    const normalized = paymentChannel?.trim().toLowerCase();

    if (!normalized || normalized === 'cash') {
      return 'cash' as const;
    }

    if (normalized === 'saraf') {
      return 'saraf' as const;
    }

    throw new BadRequestException(
      'paymentChannel must be either cash or saraf',
    );
  }

  private buildSummary(
    currentMonthlySalary: Prisma.Decimal,
    joinDate: string | Date,
    entries: Array<{
      entryType: string;
      amount: string;
      occurredAt: string;
      salaryMonth: string;
      isAdvance?: boolean;
    }>,
  ) {
    const currentMonthKey = currentShamsiMonthKey();
    const monthKeys = this.collectSalaryMonthKeys(
      entries,
      currentMonthKey,
      joinDate,
    );

    const joinMonthKey = shamsiMonthKey(joinDate);
    let totalPayableAllMonths = new Prisma.Decimal(0);
    let totalPaidAllMonths = new Prisma.Decimal(0);
    let totalPayableFromHire = new Prisma.Decimal(0);
    let totalPaidFromHire = new Prisma.Decimal(0);
    let deductionsFromHire = new Prisma.Decimal(0);
    let weOweEmployeeThisMonth = new Prisma.Decimal(0);
    let grossPayableThisMonth = new Prisma.Decimal(0);
    let paidThisMonth = new Prisma.Decimal(0);
    let deductionsThisMonth = new Prisma.Decimal(0);

    for (const monthKey of monthKeys) {
      const monthEntries = entries.filter(
        (entry) => salaryMonthToShamsiKey(entry.salaryMonth) === monthKey,
      );
      const paidForMonth = monthEntries.reduce((sum, entry) => {
        if (entry.entryType !== 'salary_payment') {
          return sum;
        }

        return sum.plus(new Prisma.Decimal(entry.amount));
      }, new Prisma.Decimal(0));
      const deductionsForMonth = monthEntries.reduce((sum, entry) => {
        if (entry.entryType !== 'salary_deduction') {
          return sum;
        }

        return sum.plus(new Prisma.Decimal(entry.amount));
      }, new Prisma.Decimal(0));
      const payableForMonth = calculatePayableForShamsiMonth(
        currentMonthlySalary,
        joinDate,
        shamsiMonthStartGregorian(monthKey),
        deductionsForMonth,
      ).payableAmount;

      totalPayableAllMonths = totalPayableAllMonths.plus(payableForMonth);
      totalPaidAllMonths = totalPaidAllMonths.plus(paidForMonth);

      const isHireThroughNow =
        compareShamsiMonthKeys(monthKey, joinMonthKey) >= 0 &&
        compareShamsiMonthKeys(monthKey, currentMonthKey) <= 0;

      if (isHireThroughNow) {
        totalPayableFromHire = totalPayableFromHire.plus(payableForMonth);
        totalPaidFromHire = totalPaidFromHire.plus(paidForMonth);
        deductionsFromHire = deductionsFromHire.plus(deductionsForMonth);
      }

      if (monthKey === currentMonthKey) {
        grossPayableThisMonth = payableForMonth;
        paidThisMonth = paidForMonth;
        deductionsThisMonth = deductionsForMonth;
        weOweEmployeeThisMonth = Prisma.Decimal.max(
          paidForMonth.minus(payableForMonth),
          0,
        );
      }
    }

    const totalPaid = entries.reduce((sum, entry) => {
      if (entry.entryType !== 'salary_payment') {
        return sum;
      }

      return sum.plus(new Prisma.Decimal(entry.amount));
    }, new Prisma.Decimal(0));

    const totalCreditRepaid = entries.reduce((sum, entry) => {
      if (entry.entryType !== 'credit_repayment') {
        return sum;
      }

      return sum.plus(new Prisma.Decimal(entry.amount));
    }, new Prisma.Decimal(0));

    const payableThisMonth = calculateOutstandingPayable(
      grossPayableThisMonth,
      paidThisMonth,
    );
    const remainingThisMonth = payableThisMonth;
    const remainingFromHire = calculateOutstandingPayable(
      totalPayableFromHire,
      totalPaidFromHire,
    );
    const employeeCreditBalance = Prisma.Decimal.max(
      totalPaidAllMonths.minus(totalPayableAllMonths).minus(totalCreditRepaid),
      0,
    );

    return {
      currentMonthlySalary: currentMonthlySalary.toFixed(2),
      currentShamsiMonthKey: currentMonthKey,
      currentShamsiMonthLabel: formatShamsiMonthLabel(currentMonthKey),
      grossPayableThisMonth: grossPayableThisMonth.toFixed(2),
      payableThisMonth: payableThisMonth.toFixed(2),
      deductionsThisMonth: deductionsThisMonth.toFixed(2),
      totalPayableFromHire: totalPayableFromHire.toFixed(2),
      remainingFromHire: remainingFromHire.toFixed(2),
      deductionsFromHire: deductionsFromHire.toFixed(2),
      paidFromHire: totalPaidFromHire.toFixed(2),
      totalPaidAmount: totalPaid.toFixed(2),
      paidThisMonth: paidThisMonth.toFixed(2),
      remainingThisMonth: remainingThisMonth.toFixed(2),
      weOweEmployeeThisMonth: weOweEmployeeThisMonth.toFixed(2),
      employeeCreditBalance: employeeCreditBalance.toFixed(2),
      totalCreditRepaid: totalCreditRepaid.toFixed(2),
      paymentStatus: resolvePaymentStatus(grossPayableThisMonth, paidThisMonth),
      paymentCount: entries.filter(
        (entry) => entry.entryType === 'salary_payment',
      ).length,
      lastPaymentDate:
        entries.find((entry) => entry.entryType === 'salary_payment')
          ?.occurredAt ?? null,
    };
  }

  private collectSalaryMonthKeys(
    entries: Array<{ salaryMonth: string }>,
    currentMonthKey: string,
    joinDate: string | Date,
  ) {
    const joinMonthKey = shamsiMonthKey(joinDate);
    const monthKeys = new Set<string>(
      shamsiMonthKeysInclusive(joinMonthKey, currentMonthKey),
    );

    // Keep any payment months outside the hire→now range (e.g. advance months).
    for (const entry of entries) {
      monthKeys.add(salaryMonthToShamsiKey(entry.salaryMonth));
    }

    if (monthKeys.size === 0) {
      monthKeys.add(currentMonthKey);
    }

    return monthKeys;
  }

  private async resolveSarafForEmployeeSeason(
    sarafIdTrimmed: string,
    employeeSeasonId: string,
  ) {
    const sarafIdBig = this.parseId(sarafIdTrimmed);

    const saraf = await this.prisma.saraf.findUnique({
      where: { id: sarafIdBig },
      select: {
        id: true,
        seasonId: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf) {
      throw new NotFoundException(
        `Saraf with id "${sarafIdTrimmed}" not found`,
      );
    }

    if (saraf.seasonId !== employeeSeasonId) {
      throw new BadRequestException(
        'Selected Saraf must belong to the same season as the employee',
      );
    }

    if (!saraf.ledger) {
      throw new BadRequestException(
        'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
      );
    }

    return sarafIdBig;
  }

  private async getEmployeeCreditBalance(
    employeeId: string,
    options?: { excludeEntryId?: string },
  ) {
    const employee = await this.requireEmployee(employeeId);
    const entries = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        e."entry_type" AS "entryType",
        e."amount"::text AS "amount",
        e."salary_month"::text AS "salaryMonth",
        e."occurred_at"::text AS "occurredAt"
      FROM "employee_ledger_entries" e
      WHERE e."employee_id" = ${employee.id}
    `);

    const filtered = options?.excludeEntryId
      ? entries.filter((entry) => entry.id !== options.excludeEntryId)
      : entries;

    const summary = this.buildSummary(
      new Prisma.Decimal(employee.monthlySalary),
      employee.joinDate,
      filtered.map((entry) => ({
        entryType: entry.entryType,
        amount: new Prisma.Decimal(entry.amount).toFixed(2),
        salaryMonth: entry.salaryMonth,
        occurredAt: entry.occurredAt,
      })),
    );

    return new Prisma.Decimal(summary.employeeCreditBalance);
  }

  private async requireEmployee(employeeId: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        "id",
        "employee_no" AS "employeeNo",
        "name" AS "name",
        "season_id" AS "seasonId",
        "season_name" AS "seasonName",
        "join_date" AS "joinDate",
        "monthly_salary"::text AS "monthlySalary"
      FROM "employees"
      WHERE "id" = ${this.parseId(employeeId)}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException(`Employee with id "${employeeId}" not found`);
    }

    return {
      id: BigInt(rows[0].id),
      employeeNo: rows[0].employeeNo as string,
      name: rows[0].name as string,
      seasonId: rows[0].seasonId,
      seasonName: rows[0].seasonName as string,
      joinDate: rows[0].joinDate,
      monthlySalary: rows[0].monthlySalary as string,
    };
  }

  private async requireLedger(employeeId: bigint) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT "id", "employee_id" AS "employeeId"
      FROM "employee_ledgers"
      WHERE "employee_id" = ${employeeId}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException(
        `Ledger for employee "${String(employeeId)}" not found`,
      );
    }

    return {
      id: BigInt(rows[0].id),
      employeeId: BigInt(rows[0].employeeId),
    };
  }

  private async requireLedgerEntry(employeeId: string, entryId: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id",
        e."ledger_id" AS "ledgerId",
        e."entry_type" AS "entryType",
        e."amount"::text AS "amount",
        e."salary_month"::text AS "salaryMonth",
        e."occurred_at"::text AS "occurredAt",
        e."payment_channel"::text AS "paymentChannel",
        e."saraf_id"::text AS "sarafId",
        e."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
        e."notes" AS "notes"
      FROM "employee_ledger_entries" e
      WHERE e."employee_id" = ${this.parseId(employeeId)}
        AND e."id" = ${this.parseId(entryId)}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException(
        `Ledger entry with id "${entryId}" not found for this employee`,
      );
    }

    return {
      id: BigInt(rows[0].id),
      ledgerId: BigInt(rows[0].ledgerId),
      entryType: rows[0].entryType as string,
      amount: rows[0].amount as string,
      salaryMonth: rows[0].salaryMonth as string,
      occurredAt: rows[0].occurredAt as string,
      paymentChannel: rows[0].paymentChannel as string | null,
      sarafId: rows[0].sarafId as string | null,
      sarafLedgerCurrencyId: rows[0].sarafLedgerCurrencyId as string | null,
      notes: rows[0].notes as string | null,
    };
  }

  private async deleteLinkedSettlements(
    tx: Prisma.TransactionClient,
    entryId: bigint,
  ) {
    await tx.sarafLedgerEntry.deleteMany({
      where: { employeeLedgerEntryId: entryId },
    });
    await tx.cashTransaction.deleteMany({
      where: { employeeLedgerEntryId: entryId },
    });
  }

  private async fetchEntryDetail(
    tx: Prisma.TransactionClient,
    entryId: bigint,
  ) {
    const detailRows = await tx.$queryRaw<any[]>(Prisma.sql`
      SELECT
        ele."id"::text AS "id",
        ele."entry_type" AS "entryType",
        ele."amount"::text AS "amount",
        ele."salary_month"::text AS "salaryMonth",
        ele."occurred_at"::text AS "occurredAt",
        COALESCE(ele."is_advance", false) AS "isAdvance",
        ele."payment_channel"::text AS "paymentChannel",
        ele."saraf_id"::text AS "sarafId",
        ele."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
        s."name" AS "sarafName",
        c."id" AS "currencyRefId",
        c."code" AS "currencyCode",
        c."name" AS "currencyName",
        ele."notes" AS "notes",
        ele."created_at" AS "createdAt",
        ele."updated_at" AS "updatedAt"
      FROM "employee_ledger_entries" ele
      LEFT JOIN "sarafs" s ON s."id" = ele."saraf_id"
      LEFT JOIN "currencies" c ON c."id" = ele."saraf_ledger_currency_id"
      WHERE ele."id" = ${entryId}
      LIMIT 1
    `);

    return detailRows[0];
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
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
}
