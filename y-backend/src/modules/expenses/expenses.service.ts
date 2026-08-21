import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { ExpenseCategoryService } from '../expense-category/expense-category.service.js';
import { CashService } from '../cash/cash.service.js';
import { CustomerLedgerService } from '../customer/customer-ledger.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { ExpenseDashboardDto } from './dto/expense-dashboard.dto.js';
import { FindExpensesQueryDto } from './dto/find-expenses-query.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly currencyService: CurrencyService,
    private readonly expenseCategoryService: ExpenseCategoryService,
    private readonly sarafLedgerService: SarafLedgerService,
    private readonly cashService: CashService,
    private readonly customerLedgerService: CustomerLedgerService,
  ) {}

  async create(createExpenseDto: CreateExpenseDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const categoryId =
      await this.expenseCategoryService.requireActiveCategoryId(
        createExpenseDto.categoryId,
      );
    const title = this.requireText(createExpenseDto.title, 'title');
    const amount = this.parseDecimal(createExpenseDto.amount, 'amount');
    const date = this.requireDate(createExpenseDto.date, 'date');
    const currencyId = await this.currencyService.requireActiveCurrencyId(
      createExpenseDto.currencyId,
    );
    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
    );
    const settlement = await this.resolveExpenseSettlement({
      settlementMode: createExpenseDto.settlementMode,
      vendorId: createExpenseDto.vendorId,
      paymentType: createExpenseDto.paymentType,
      paidAmount: createExpenseDto.paidAmount,
      totalAmount: amount,
      paymentChannel: createExpenseDto.paymentChannel,
      sarafIdTrimmed: createExpenseDto.sarafId?.trim() ?? '',
      seasonId: activeSeason.id,
    });

    const expenseDate = this.parseExpenseDate(date);
    const notes = this.normalizeOptionalText(createExpenseDto.notes);

    const expenseId = await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO "expenses" (
          "bill_no",
          "date",
          "category_id",
          "title",
          "amount",
          "notes",
          "season_id",
          "season_name",
          "currency_id",
          "settlement_mode",
          "vendor_id",
          "payment_type",
          "paid_amount",
          "remaining_amount",
          "payment_channel",
          "saraf_id",
          "updated_at"
        )
        VALUES (
          ${billNo},
          ${date},
          ${categoryId},
          ${title},
          ${amount},
          ${notes},
          ${activeSeason.id},
          ${activeSeason.name},
          ${currencyId},
          ${settlement.settlementMode}::"ExpenseSettlementMode",
          ${settlement.vendorIdBig},
          ${settlement.paymentType},
          ${settlement.paidAmount},
          ${settlement.remainingAmount},
          ${settlement.paymentChannel}::"RiceSalePaymentChannel",
          ${settlement.paymentChannel === 'saraf' ? settlement.sarafIdBig : null},
          NOW()
        )
        RETURNING "id"
      `);

      const id = inserted[0].id;

      if (settlement.settlementMode === 'vendor' && settlement.vendorIdBig) {
        await this.customerLedgerService.syncVendorExpenseFromExpense(tx, {
          expenseId: id,
          vendorCustomerId: settlement.vendorIdBig,
          billNo,
          title,
          totalAmount: amount,
          currencyId,
          paymentType: settlement.paymentType,
          paidAmount: settlement.paidAmount,
          remainingAmount: settlement.remainingAmount,
          settlementAmount: settlement.settlementAmount,
          paymentChannel: settlement.paymentChannel,
          sarafId: settlement.sarafIdBig,
          occurredAt: expenseDate,
          notes,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
        });
      } else if (settlement.settlementAmount.greaterThan(0)) {
        if (settlement.paymentChannel === 'cash') {
          await this.cashService.createLinkedExpenseOutEntry(tx, {
            currencyId,
            amount: settlement.settlementAmount,
            occurredAt: expenseDate,
            notes: notes ? `Expense ${billNo} — ${notes}` : `Expense ${billNo}`,
            seasonId: activeSeason.id,
            seasonName: activeSeason.name,
            expenseId: id,
          });
        } else if (
          settlement.paymentChannel === 'saraf' &&
          settlement.sarafIdBig
        ) {
          await this.sarafLedgerService.createLinkedExpenseEntry(tx, {
            sarafId: settlement.sarafIdBig,
            currencyId,
            amount: settlement.settlementAmount.negated(),
            occurredAt: expenseDate,
            notes: notes ? `Expense ${billNo} — ${notes}` : `Expense ${billNo}`,
            expenseId: id,
          });
        }
      }

      return id;
    });

    return this.findOne(String(expenseId));
  }

  async findAll(filters: FindExpensesQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'date',
      'billNo',
      'categoryCode',
      'categoryName',
      'title',
      'amount',
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';
    const categoryId = filters.categoryId?.trim() || undefined;

    const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];

    if (filters.seasonId) {
      conditions.push(Prisma.sql`e."season_id" = ${filters.seasonId}`);
    }

    if (categoryId) {
      conditions.push(Prisma.sql`e."category_id" = ${categoryId}`);
    }

    if (query) {
      const likeValue = `%${query}%`;
      conditions.push(Prisma.sql`
        (
          e."bill_no" ILIKE ${likeValue}
          OR           ec."code" ILIKE ${likeValue}
          OR ec."name" ILIKE ${likeValue}
          OR e."title" ILIKE ${likeValue}
          OR COALESCE(e."notes", '') ILIKE ${likeValue}
          OR e."season_name" ILIKE ${likeValue}
        )
      `);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const orderByMap: Record<(typeof allowedSortFields)[number], string> = {
      date: 'e."date"',
      billNo: 'e."bill_no"',
      categoryCode: 'ec."code"',
      categoryName: 'ec."name"',
      title: 'e."title"',
      amount: 'e."amount"',
      seasonName: 'e."season_name"',
      createdAt: 'e."created_at"',
      updatedAt: 'e."updated_at"',
    };
    const orderBySql = Prisma.raw(orderByMap[sortBy]);
    // Leading space required: adjacent Prisma.sql fragments do not insert whitespace,
    // so `... "col"DESC` is invalid SQL without a separator.
    const orderDirectionSql = Prisma.raw(
      sortDirection === 'asc' ? ' ASC' : ' DESC',
    );

    const items = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        e."bill_no" AS "billNo",
        e."date" AS "date",
        e."category_id" AS "categoryId",
        ec."code" AS "categoryCode",
        ec."name" AS "categoryName",
        e."title" AS "title",
        e."amount"::text AS "amount",
        e."notes" AS "notes",
        e."season_id" AS "seasonId",
        e."season_name" AS "seasonName",
        e."currency_id" AS "currencyId",
        c."code"::text AS "currencyCode",
        c."name" AS "currencyName",
        e."settlement_mode"::text AS "settlementMode",
        e."vendor_id"::text AS "vendorId",
        v."name" AS "vendorName",
        e."payment_type" AS "paymentType",
        e."paid_amount"::text AS "paidAmount",
        e."remaining_amount"::text AS "remainingAmount",
        e."payment_channel"::text AS "paymentChannel",
        e."saraf_id"::text AS "sarafId",
        sr."name" AS "sarafName",
        e."created_at" AS "createdAt",
        e."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus"
      FROM "expenses" e
      INNER JOIN "seasons" s ON s."id" = e."season_id"
      INNER JOIN "currencies" c ON c."id" = e."currency_id"
      INNER JOIN "expense_categories" ec ON ec."id" = e."category_id"
      LEFT JOIN "sarafs" sr ON sr."id" = e."saraf_id"
      LEFT JOIN "customers" v ON v."id" = e."vendor_id"
      ${whereSql}
      ORDER BY ${orderBySql}${orderDirectionSql}
      LIMIT ${pageSize}
      OFFSET ${(pageNumber - 1) * pageSize}
    `);

    const totalRows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "expenses" e
      INNER JOIN "expense_categories" ec ON ec."id" = e."category_id"
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
        e."bill_no" AS "billNo",
        e."date" AS "date",
        e."category_id" AS "categoryId",
        ec."code" AS "categoryCode",
        ec."name" AS "categoryName",
        e."title" AS "title",
        e."amount"::text AS "amount",
        e."notes" AS "notes",
        e."season_id" AS "seasonId",
        e."season_name" AS "seasonName",
        e."currency_id" AS "currencyId",
        c."code"::text AS "currencyCode",
        c."name" AS "currencyName",
        e."settlement_mode"::text AS "settlementMode",
        e."vendor_id"::text AS "vendorId",
        v."name" AS "vendorName",
        e."payment_type" AS "paymentType",
        e."paid_amount"::text AS "paidAmount",
        e."remaining_amount"::text AS "remainingAmount",
        e."payment_channel"::text AS "paymentChannel",
        e."saraf_id"::text AS "sarafId",
        sr."name" AS "sarafName",
        e."created_at" AS "createdAt",
        e."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus"
      FROM "expenses" e
      INNER JOIN "seasons" s ON s."id" = e."season_id"
      INNER JOIN "currencies" c ON c."id" = e."currency_id"
      INNER JOIN "expense_categories" ec ON ec."id" = e."category_id"
      LEFT JOIN "sarafs" sr ON sr."id" = e."saraf_id"
      LEFT JOIN "customers" v ON v."id" = e."vendor_id"
      WHERE e."id" = ${this.parseId(id)}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException(`Expense with id "${id}" not found`);
    }

    return this.serializeRow(rows[0]);
  }

  async getDashboard(seasonId?: string): Promise<ExpenseDashboardDto> {
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
          categoryBreakdown: [],
          currencyBreakdown: [],
          recentExpenses: [],
        };
      }

      throw error;
    }

    const [summaryRows, categoryRows, currencyRows, recentRows] =
      await Promise.all([
        this.prisma.$queryRaw<
          Array<{
            entryCount: bigint;
            categoryCount: bigint;
          }>
        >(Prisma.sql`
        SELECT
          COUNT(*)::bigint AS "entryCount",
          COUNT(DISTINCT "category_id")::bigint AS "categoryCount"
        FROM "expenses"
        WHERE "season_id" = ${season.id}
      `),
        this.prisma.$queryRaw<
          Array<{
            categoryId: string;
            categoryCode: string;
            categoryName: string;
            currencyCode: string;
            currencyName: string;
            totalAmount: Prisma.Decimal;
            entryCount: bigint;
          }>
        >(Prisma.sql`
        SELECT
          ec."id" AS "categoryId",
          ec."code" AS "categoryCode",
          ec."name" AS "categoryName",
          c."code"::text AS "currencyCode",
          c."name" AS "currencyName",
          COALESCE(SUM(e."amount"), 0)::decimal AS "totalAmount",
          COUNT(*)::bigint AS "entryCount"
        FROM "expenses" e
        INNER JOIN "expense_categories" ec ON ec."id" = e."category_id"
        INNER JOIN "currencies" c ON c."id" = e."currency_id"
        WHERE e."season_id" = ${season.id}
        GROUP BY ec."id", ec."code", ec."name", c."id", c."code", c."name"
        ORDER BY c."code" ASC, COALESCE(SUM(e."amount"), 0) DESC, ec."name" ASC
      `),
        this.prisma.$queryRaw<
          Array<{
            currencyCode: string;
            currencyName: string;
            totalAmount: Prisma.Decimal;
            entryCount: bigint;
          }>
        >(Prisma.sql`
        SELECT
          c."code"::text AS "currencyCode",
          c."name" AS "currencyName",
          COALESCE(SUM(e."amount"), 0)::decimal AS "totalAmount",
          COUNT(*)::bigint AS "entryCount"
        FROM "expenses" e
        INNER JOIN "currencies" c ON c."id" = e."currency_id"
        WHERE e."season_id" = ${season.id}
        GROUP BY c."id", c."code", c."name"
        ORDER BY c."code" ASC
      `),
        this.prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          e."id"::text AS "id",
          e."bill_no" AS "billNo",
          e."date" AS "date",
          e."category_id" AS "categoryId",
          ec."code" AS "categoryCode",
          ec."name" AS "categoryName",
          e."title" AS "title",
          e."amount"::text AS "amount",
          e."notes" AS "notes",
          e."currency_id" AS "currencyId",
          c."code"::text AS "currencyCode",
          c."name" AS "currencyName"
        FROM "expenses" e
        INNER JOIN "currencies" c ON c."id" = e."currency_id"
        INNER JOIN "expense_categories" ec ON ec."id" = e."category_id"
        WHERE e."season_id" = ${season.id}
        ORDER BY e."date" DESC, e."created_at" DESC
        LIMIT 8
      `),
      ]);

    const summary = summaryRows[0] ?? {
      entryCount: BigInt(0),
      categoryCount: BigInt(0),
    };

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
          label: 'total_entries',
          value: String(Number(summary.entryCount ?? 0)),
          unit: 'count',
        },
        {
          label: 'total_categories',
          value: String(Number(summary.categoryCount ?? 0)),
          unit: 'count',
        },
      ],
      categoryBreakdown: categoryRows.map((row) => ({
        categoryId: row.categoryId,
        categoryCode: row.categoryCode,
        categoryName: row.categoryName,
        currencyCode: row.currencyCode,
        currencyName: row.currencyName,
        totalAmount: new Prisma.Decimal(row.totalAmount ?? 0).toFixed(2),
        entryCount: Number(row.entryCount ?? 0),
      })),
      currencyBreakdown: currencyRows.map((row) => ({
        currencyCode: row.currencyCode,
        currencyName: row.currencyName,
        totalAmount: new Prisma.Decimal(row.totalAmount ?? 0).toFixed(2),
        entryCount: Number(row.entryCount ?? 0),
      })),
      recentExpenses: recentRows.map((row) => ({
        id: String(row.id),
        billNo: row.billNo,
        date: row.date,
        categoryId: row.categoryId,
        categoryCode: row.categoryCode,
        categoryName: row.categoryName,
        title: row.title,
        amount: new Prisma.Decimal(row.amount ?? 0).toFixed(2),
        currencyId: String(row.currencyId),
        currencyCode: row.currencyCode,
        currencyName: row.currencyName,
        notes: row.notes,
      })),
    };
  }

  async getCashPaymentsSummary(seasonId?: string) {
    const season = await this.seasonService.resolveSeasonForRead(seasonId);
    const resolvedSeasonId = season.id;

    const transactions = await this.prisma.cashTransaction.findMany({
      where: {
        seasonId: resolvedSeasonId,
        direction: 'out',
        expenseId: { not: null },
      },
      select: {
        amount: true,
        currency: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    type CurrencyBucket = {
      currencyCode: string;
      currencyName: string;
      total: Prisma.Decimal;
    };

    const buckets = new Map<string, CurrencyBucket>();

    for (const transaction of transactions) {
      const currencyCode = transaction.currency.code;
      const amount = new Prisma.Decimal(transaction.amount ?? 0);
      const existing = buckets.get(currencyCode);

      if (!existing) {
        buckets.set(currencyCode, {
          currencyCode,
          currencyName: transaction.currency.name,
          total: amount,
        });
        continue;
      }

      existing.total = existing.total.plus(amount);
    }

    return {
      seasonId: resolvedSeasonId,
      byCurrency: [...buckets.values()]
        .sort((left, right) =>
          left.currencyCode.localeCompare(right.currencyCode),
        )
        .map((bucket) => ({
          currencyCode: bucket.currencyCode,
          currencyName: bucket.currencyName,
          cashPaidAmount: bucket.total.toFixed(2),
        })),
    };
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const categoryId =
      updateExpenseDto.categoryId !== undefined
        ? await this.expenseCategoryService.requireActiveCategoryId(
            updateExpenseDto.categoryId,
          )
        : current.categoryId;
    const title =
      updateExpenseDto.title !== undefined
        ? this.requireText(updateExpenseDto.title, 'title')
        : current.title;
    const amount =
      updateExpenseDto.amount !== undefined
        ? this.parseDecimal(updateExpenseDto.amount, 'amount')
        : new Prisma.Decimal(current.amount);
    const date =
      updateExpenseDto.date !== undefined
        ? this.requireDate(updateExpenseDto.date, 'date')
        : current.date;
    const notes =
      updateExpenseDto.notes !== undefined
        ? this.normalizeOptionalText(updateExpenseDto.notes)
        : current.notes;
    const currencyId =
      updateExpenseDto.currencyId !== undefined
        ? await this.currencyService.requireActiveCurrencyId(
            updateExpenseDto.currencyId,
          )
        : current.currencyId;
    const settlement = await this.resolveExpenseSettlement({
      settlementMode: updateExpenseDto.settlementMode ?? current.settlementMode,
      vendorId:
        updateExpenseDto.vendorId !== undefined
          ? updateExpenseDto.vendorId
          : (current.vendorId ?? undefined),
      paymentType:
        updateExpenseDto.paymentType !== undefined
          ? updateExpenseDto.paymentType
          : (current.paymentType ?? undefined),
      paidAmount:
        updateExpenseDto.paidAmount !== undefined
          ? updateExpenseDto.paidAmount
          : (current.paidAmount ?? undefined),
      totalAmount: amount,
      paymentChannel: updateExpenseDto.paymentChannel ?? current.paymentChannel,
      sarafIdTrimmed:
        updateExpenseDto.sarafId !== undefined
          ? updateExpenseDto.sarafId.trim()
          : (current.sarafId ?? ''),
      seasonId: current.seasonId,
    });
    const expenseDate = this.parseExpenseDate(date);
    const expenseId = this.parseId(id);
    const settlementNotes = notes
      ? `Expense ${current.billNo} — ${notes}`
      : `Expense ${current.billNo}`;

    await this.prisma.$transaction(async (tx) => {
      await this.customerLedgerService.removeVendorExpenseEntries(
        tx,
        expenseId,
      );
      await tx.sarafLedgerEntry.deleteMany({
        where: { expenseId },
      });
      await tx.cashTransaction.deleteMany({
        where: { expenseId },
      });

      await tx.$executeRaw(Prisma.sql`
        UPDATE "expenses"
        SET
          "date" = ${date},
          "category_id" = ${categoryId},
          "title" = ${title},
          "amount" = ${amount},
          "notes" = ${notes},
          "currency_id" = ${currencyId},
          "settlement_mode" = ${settlement.settlementMode}::"ExpenseSettlementMode",
          "vendor_id" = ${settlement.vendorIdBig},
          "payment_type" = ${settlement.paymentType},
          "paid_amount" = ${settlement.paidAmount},
          "remaining_amount" = ${settlement.remainingAmount},
          "payment_channel" = ${settlement.paymentChannel}::"RiceSalePaymentChannel",
          "saraf_id" = ${settlement.paymentChannel === 'saraf' ? settlement.sarafIdBig : null},
          "updated_at" = NOW()
        WHERE "id" = ${expenseId}
      `);

      if (settlement.settlementMode === 'vendor' && settlement.vendorIdBig) {
        await this.customerLedgerService.syncVendorExpenseFromExpense(tx, {
          expenseId,
          vendorCustomerId: settlement.vendorIdBig,
          billNo: current.billNo,
          title,
          totalAmount: amount,
          currencyId,
          paymentType: settlement.paymentType,
          paidAmount: settlement.paidAmount,
          remainingAmount: settlement.remainingAmount,
          settlementAmount: settlement.settlementAmount,
          paymentChannel: settlement.paymentChannel,
          sarafId: settlement.sarafIdBig,
          occurredAt: expenseDate,
          notes,
          seasonId: current.seasonId,
          seasonName: current.seasonName,
        });
      } else if (settlement.settlementAmount.greaterThan(0)) {
        if (settlement.paymentChannel === 'cash') {
          await this.cashService.createLinkedExpenseOutEntry(tx, {
            currencyId,
            amount: settlement.settlementAmount,
            occurredAt: expenseDate,
            notes: settlementNotes,
            seasonId: current.seasonId,
            seasonName: current.seasonName,
            expenseId,
          });
        } else if (
          settlement.paymentChannel === 'saraf' &&
          settlement.sarafIdBig
        ) {
          await this.sarafLedgerService.createLinkedExpenseEntry(tx, {
            sarafId: settlement.sarafIdBig,
            currencyId,
            amount: settlement.settlementAmount.negated(),
            occurredAt: expenseDate,
            notes: settlementNotes,
            expenseId,
          });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const expenseId = this.parseId(id);

    await this.prisma.$transaction(async (tx) => {
      await this.customerLedgerService.removeVendorExpenseEntries(
        tx,
        expenseId,
      );
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM "expenses"
        WHERE "id" = ${expenseId}
      `);
    });

    return current;
  }

  private async generateBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before expenses can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-EX-`;
    const lastEntry = await this.prisma.$queryRaw<
      Array<{ billNo: string }>
    >(Prisma.sql`
      SELECT "bill_no" AS "billNo"
      FROM "expenses"
      WHERE "season_id" = ${seasonId}
        AND "bill_no" LIKE ${`${prefix}%`}
      ORDER BY "created_at" DESC
      LIMIT 1
    `);

    const nextNumber = lastEntry[0]?.billNo?.startsWith(prefix)
      ? Number(lastEntry[0].billNo.slice(prefix.length)) + 1
      : 1;

    return `${prefix}${nextNumber}`;
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private parseDecimal(
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

  private serializeRow(row: any) {
    return {
      id: String(row.id),
      billNo: row.billNo,
      date: row.date,
      categoryId: String(row.categoryId),
      categoryCode: row.categoryCode,
      categoryName: row.categoryName,
      title: row.title,
      amount: new Prisma.Decimal(row.amount).toFixed(2),
      notes: row.notes,
      currencyId: String(row.currencyId),
      currencyCode: row.currencyCode,
      currencyName: row.currencyName,
      settlementMode: row.settlementMode ?? 'direct',
      vendorId: row.vendorId ? String(row.vendorId) : null,
      vendorName: row.vendorName ?? null,
      paymentType: row.paymentType ?? null,
      paidAmount:
        row.paidAmount != null
          ? new Prisma.Decimal(row.paidAmount).toFixed(2)
          : null,
      remainingAmount:
        row.remainingAmount != null
          ? new Prisma.Decimal(row.remainingAmount).toFixed(2)
          : null,
      paymentChannel: row.paymentChannel ?? 'cash',
      sarafId: row.sarafId ? String(row.sarafId) : null,
      sarafName: row.sarafName ?? null,
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

  private normalizeSettlementMode(settlementMode?: string | null) {
    const normalized = settlementMode?.trim().toLowerCase();

    if (!normalized || normalized === 'direct') {
      return 'direct' as const;
    }

    if (normalized === 'vendor') {
      return 'vendor' as const;
    }

    throw new BadRequestException(
      'settlementMode must be either direct or vendor',
    );
  }

  private normalizeExpensePaymentType(paymentType?: string | null) {
    const normalized = paymentType?.trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException(
        'paymentType is required for vendor expenses',
      );
    }

    if (!['paid', 'partial_paid', 'remaining'].includes(normalized)) {
      throw new BadRequestException(
        'paymentType must be one of paid, partial_paid, or remaining',
      );
    }

    return normalized;
  }

  private resolveExpensePaidAmounts(params: {
    paymentType: string;
    paidAmountInput?: string | number | Prisma.Decimal | null;
    totalAmount: Prisma.Decimal;
  }) {
    if (params.paymentType === 'paid') {
      return {
        paidAmount: params.totalAmount,
        remainingAmount: new Prisma.Decimal(0),
        settlementAmount: params.totalAmount,
      };
    }

    if (params.paymentType === 'remaining') {
      return {
        paidAmount: new Prisma.Decimal(0),
        remainingAmount: params.totalAmount,
        settlementAmount: new Prisma.Decimal(0),
      };
    }

    const paidAmount = this.parseDecimal(
      params.paidAmountInput ?? '',
      'paidAmount',
    );

    if (paidAmount.greaterThanOrEqualTo(params.totalAmount)) {
      throw new BadRequestException(
        'paidAmount must be greater than 0 and less than amount for partial payment',
      );
    }

    return {
      paidAmount,
      remainingAmount: params.totalAmount.minus(paidAmount),
      settlementAmount: paidAmount,
    };
  }

  private async resolveExpenseSettlement(params: {
    settlementMode?: string | null;
    vendorId?: string | null;
    paymentType?: string | null;
    paidAmount?: string | number | null;
    totalAmount: Prisma.Decimal;
    paymentChannel?: string | null;
    sarafIdTrimmed: string;
    seasonId: string;
  }) {
    const settlementMode = this.normalizeSettlementMode(params.settlementMode);
    const paymentChannel = this.normalizePaymentChannel(params.paymentChannel);

    if (settlementMode === 'direct') {
      if (params.vendorId?.trim()) {
        throw new BadRequestException(
          'vendorId must be omitted for direct expense payment',
        );
      }

      if (params.paymentType?.trim()) {
        throw new BadRequestException(
          'paymentType must be omitted for direct expense payment',
        );
      }

      const { sarafIdBig } = await this.resolveSarafForExpense({
        paymentChannel,
        sarafIdTrimmed: params.sarafIdTrimmed,
        seasonId: params.seasonId,
      });

      return {
        settlementMode,
        vendorIdBig: null as bigint | null,
        paymentType: null as string | null,
        paidAmount: null as Prisma.Decimal | null,
        remainingAmount: null as Prisma.Decimal | null,
        settlementAmount: params.totalAmount,
        paymentChannel,
        sarafIdBig,
      };
    }

    const vendorIdTrimmed = params.vendorId?.trim() ?? '';

    if (!vendorIdTrimmed) {
      throw new BadRequestException(
        'vendorId is required when dealing with a vendor',
      );
    }

    const vendorIdBig = this.parseId(vendorIdTrimmed);
    const vendor = await this.prisma.customer.findUnique({
      where: { id: vendorIdBig },
      select: {
        id: true,
        type: true,
        seasonId: true,
        ledger: { select: { id: true } },
      },
    });

    if (!vendor) {
      throw new NotFoundException(
        `Vendor with id "${vendorIdTrimmed}" not found`,
      );
    }

    if (vendor.type !== 'vendor') {
      throw new BadRequestException('Selected customer must be a vendor');
    }

    if (vendor.seasonId !== params.seasonId) {
      throw new BadRequestException(
        'Selected vendor must belong to the active season',
      );
    }

    if (!vendor.ledger) {
      throw new BadRequestException(
        'This vendor has no ledger yet; open the vendor account once or recreate the vendor',
      );
    }

    const paymentType = this.normalizeExpensePaymentType(params.paymentType);
    const { paidAmount, remainingAmount, settlementAmount } =
      this.resolveExpensePaidAmounts({
        paymentType,
        paidAmountInput: params.paidAmount,
        totalAmount: params.totalAmount,
      });

    if (paymentChannel === 'saraf' && paymentType === 'remaining') {
      throw new BadRequestException(
        'Pay from Saraf is not available when nothing has been paid yet',
      );
    }

    const { sarafIdBig } = await this.resolveSarafForExpense({
      paymentChannel,
      sarafIdTrimmed: settlementAmount.greaterThan(0)
        ? params.sarafIdTrimmed
        : '',
      seasonId: params.seasonId,
      requireSaraf: settlementAmount.greaterThan(0),
    });

    if (paymentChannel === 'cash' && settlementAmount.greaterThan(0)) {
      if (params.sarafIdTrimmed) {
        throw new BadRequestException(
          'sarafId must be omitted when paying the expense in cash',
        );
      }
    }

    return {
      settlementMode,
      vendorIdBig,
      paymentType,
      paidAmount,
      remainingAmount,
      settlementAmount,
      paymentChannel,
      sarafIdBig,
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

  private async resolveSarafForExpense(params: {
    paymentChannel: 'cash' | 'saraf';
    sarafIdTrimmed: string;
    seasonId: string;
    requireSaraf?: boolean;
  }) {
    const requireSaraf =
      params.requireSaraf ?? params.paymentChannel === 'saraf';

    if (params.paymentChannel === 'cash') {
      if (params.sarafIdTrimmed) {
        throw new BadRequestException(
          'sarafId must be omitted when paying the expense in cash',
        );
      }

      return { sarafIdBig: null as bigint | null };
    }

    if (!params.sarafIdTrimmed) {
      if (!requireSaraf) {
        return { sarafIdBig: null as bigint | null };
      }

      throw new BadRequestException(
        'sarafId is required when paying the expense from Saraf',
      );
    }

    const sarafIdBig = this.parseId(params.sarafIdTrimmed);
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
        `Saraf with id "${params.sarafIdTrimmed}" not found`,
      );
    }

    if (saraf.seasonId !== params.seasonId) {
      throw new BadRequestException(
        'Selected Saraf must belong to the active season',
      );
    }

    if (!saraf.ledger) {
      throw new BadRequestException(
        'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
      );
    }

    return { sarafIdBig };
  }

  private parseExpenseDate(value: string) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('date must be a valid date');
    }

    return parsed;
  }
}
