import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto.js';
import { FindCashTransactionsQueryDto } from './dto/find-cash-transactions-query.dto.js';
import { UpdateCashTransactionDto } from './dto/update-cash-transaction.dto.js';

const cashTransactionSelect = {
  id: true,
  currencyId: true,
  direction: true,
  amount: true,
  occurredAt: true,
  notes: true,
  seasonId: true,
  seasonName: true,
  createdAt: true,
  updatedAt: true,
  currency: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly currencyService: CurrencyService,
  ) {}

  private get cashTransactionModel() {
    return (this.prisma as any).cashTransaction;
  }

  async getDashboard(seasonId?: string) {
    let season: Awaited<
      ReturnType<SeasonService['getActiveSeasonOrThrow']>
    > | null = null;

    try {
      season = await this.seasonService.resolveSeasonForRead(seasonId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          season: null,
          currencyBalances: [],
          recentTransactions: [],
          overview: [{ label: 'transactionCount', value: '0', unit: 'count' }],
        };
      }
      throw error;
    }

    const where = season ? { seasonId: season.id } : {};

    const [transactions, activeCurrencies] = await Promise.all([
      this.cashTransactionModel.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        select: cashTransactionSelect,
      }),
      this.prisma.currency.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true },
      }),
    ]);

    const balanceByCurrency = new Map<
      string,
      {
        currencyId: string;
        currencyCode: string;
        currencyName: string;
        cashIn: Prisma.Decimal;
        cashOut: Prisma.Decimal;
        balance: Prisma.Decimal;
        transactionCount: number;
      }
    >();

    for (const currency of activeCurrencies) {
      balanceByCurrency.set(currency.id, {
        currencyId: currency.id,
        currencyCode: currency.code,
        currencyName: currency.name,
        cashIn: new Prisma.Decimal(0),
        cashOut: new Prisma.Decimal(0),
        balance: new Prisma.Decimal(0),
        transactionCount: 0,
      });
    }

    for (const row of transactions) {
      const amount = new Prisma.Decimal(row.amount ?? 0);
      const entry =
        balanceByCurrency.get(row.currencyId) ??
        ({
          currencyId: row.currency.id,
          currencyCode: row.currency.code,
          currencyName: row.currency.name,
          cashIn: new Prisma.Decimal(0),
          cashOut: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(0),
          transactionCount: 0,
        } as const);

      if (!balanceByCurrency.has(row.currencyId)) {
        balanceByCurrency.set(row.currencyId, { ...entry });
      }

      const bucket = balanceByCurrency.get(row.currencyId)!;
      bucket.transactionCount += 1;

      if (row.direction === 'in') {
        bucket.cashIn = bucket.cashIn.plus(amount);
        bucket.balance = bucket.balance.plus(amount);
      } else {
        bucket.cashOut = bucket.cashOut.plus(amount);
        bucket.balance = bucket.balance.minus(amount);
      }
    }

    const currencyBalances = [...balanceByCurrency.values()]
      .map((item) => ({
        currencyId: item.currencyId,
        currencyCode: item.currencyCode,
        currencyName: item.currencyName,
        cashIn: item.cashIn.toFixed(2),
        cashOut: item.cashOut.toFixed(2),
        availableCash: item.balance.toFixed(2),
        balance: item.balance.toFixed(2),
        transactionCount: item.transactionCount,
      }))
      .sort((left, right) => {
        const leftActive = Number(left.transactionCount) > 0 ? 0 : 1;
        const rightActive = Number(right.transactionCount) > 0 ? 0 : 1;
        if (leftActive !== rightActive) {
          return leftActive - rightActive;
        }
        return left.currencyCode.localeCompare(right.currencyCode);
      });

    return {
      season: season
        ? {
            id: season.id,
            name: season.name,
            status: season.status,
            startDate: season.startDate,
            endDate: season.endDate,
          }
        : null,
      overview: [
        {
          label: 'transactionCount',
          value: String(transactions.length),
          unit: 'count',
        },
      ],
      currencyBalances,
      recentTransactions: transactions
        .slice(0, 10)
        .map((row: any) => this.serialize(row)),
    };
  }

  async findAll(filters: FindCashTransactionsQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'occurredAt',
      'amount',
      'direction',
      'createdAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'occurredAt';

    const where = {
      ...(filters.currencyId ? { currencyId: filters.currencyId } : {}),
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(filters.direction === 'in' || filters.direction === 'out'
        ? { direction: filters.direction }
        : {}),
      ...(query
        ? {
            OR: [
              { notes: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
              {
                currency: {
                  OR: [
                    { code: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.cashTransactionModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: cashTransactionSelect,
      }),
      this.cashTransactionModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((row: any) => this.serialize(row)),
      totalCount,
      pageNumber,
      pageSize,
      totalPages,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < totalPages,
    };
  }

  async findOne(id: string) {
    const row = await this.cashTransactionModel.findUnique({
      where: { id },
      select: cashTransactionSelect,
    });

    if (!row) {
      throw new NotFoundException(`Cash transaction with id "${id}" not found`);
    }

    return this.serialize(row);
  }

  async createLinkedCustomerPaymentInEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      customerLedgerEntryId: bigint;
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash buyer payment must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'in',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        customerLedgerEntryId: params.customerLedgerEntryId,
      },
    });
  }

  async createLinkedCustomerPaymentOutEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      customerLedgerEntryId: bigint;
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash customer payment must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'out',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        customerLedgerEntryId: params.customerLedgerEntryId,
      },
    });
  }

  async createLinkedEmployeeSalaryPaymentOutEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      employeeLedgerEntryId: bigint;
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash employee salary payment must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'out',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        employeeLedgerEntryId: params.employeeLedgerEntryId,
      },
    });
  }

  /** Employee pays back overpaid credit in cash: increases cash balance. */
  async createLinkedEmployeeCreditRepaymentInEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      employeeLedgerEntryId: bigint;
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash employee credit repayment must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'in',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        employeeLedgerEntryId: params.employeeLedgerEntryId,
      },
    });
  }

  async createLinkedRiceWarehousePurchaseOutEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      riceWarehouseId: bigint;
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash rice warehouse purchase must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'out',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        riceWarehouseId: params.riceWarehouseId,
      },
    });
  }

  async createLinkedCompanyPaddyPurchaseOutEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      companyOwnedPaddyWarehouseId: bigint;
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash company paddy purchase must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'out',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        companyOwnedPaddyWarehouseId: params.companyOwnedPaddyWarehouseId,
      },
    });
  }

  async createLinkedExpenseOutEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      expenseId: bigint;
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash expense settlement must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'out',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        expenseId: params.expenseId,
      },
    });
  }

  async createLinkedRiceSaleInEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      riceSaleId: bigint;
      chargeType: 'rice' | 'loading' | 'bags';
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash rice sale collection must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'in',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        riceSaleId: params.riceSaleId,
        riceSaleChargeType: params.chargeType,
      },
    });
  }

  async createLinkedJwaliPaymentOutEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash Jwali payment must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'out',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
      },
    });
  }

  async createLinkedStoreVarietySaleInEntry(
    tx: Prisma.TransactionClient,
    params: {
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
      storeVarietySaleId: bigint;
      chargeType: 'sale' | 'loading' | 'bags';
    },
  ) {
    if (params.amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Cash store variety sale collection must use a positive amount',
      );
    }

    await (tx as any).cashTransaction.create({
      data: {
        currencyId: params.currencyId,
        direction: 'in',
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        storeVarietySaleId: params.storeVarietySaleId,
        storeVarietySaleChargeType: params.chargeType,
      },
    });
  }

  async create(createDto: CreateCashTransactionDto) {
    const season = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(season);

    const payload = await this.normalizePayload(
      createDto,
      season.id,
      season.name,
    );

    const created = await this.cashTransactionModel.create({
      data: payload,
      select: cashTransactionSelect,
    });

    return this.serialize(created);
  }

  async update(id: string, updateDto: UpdateCashTransactionDto) {
    const current = await this.findOne(id);

    if (current.seasonId) {
      await this.seasonService.assertSeasonIsEditableById(current.seasonId);
    }

    let seasonId = current.seasonId;
    let seasonName = current.seasonName;

    if (updateDto.seasonId !== undefined) {
      if (updateDto.seasonId === null || updateDto.seasonId === '') {
        seasonId = null;
        seasonName = null;
      } else {
        const season = await this.seasonService.resolveSeasonForRead(
          updateDto.seasonId,
        );
        await this.seasonService.assertSeasonIsEditableById(season.id);
        seasonId = season.id;
        seasonName = season.name;
      }
    }

    const currencyId =
      updateDto.currencyId !== undefined
        ? await this.currencyService.requireActiveCurrencyId(
            updateDto.currencyId,
          )
        : current.currencyId;

    const direction =
      updateDto.direction !== undefined
        ? this.normalizeDirection(updateDto.direction)
        : current.direction;

    const amount =
      updateDto.amount !== undefined
        ? this.parseDecimal(updateDto.amount, 'amount')
        : new Prisma.Decimal(current.amount);

    const occurredAt =
      updateDto.occurredAt !== undefined
        ? this.parseDate(updateDto.occurredAt, 'occurredAt')
        : new Date(current.occurredAt);

    const updated = await this.cashTransactionModel.update({
      where: { id },
      data: {
        currencyId,
        direction,
        amount,
        occurredAt,
        notes:
          updateDto.notes !== undefined
            ? updateDto.notes?.trim() || null
            : current.notes,
        seasonId,
        seasonName,
      },
      select: cashTransactionSelect,
    });

    return this.serialize(updated);
  }

  async remove(id: string) {
    const current = await this.findOne(id);

    if (current.seasonId) {
      await this.seasonService.assertSeasonIsEditableById(current.seasonId);
    }

    await this.cashTransactionModel.delete({ where: { id } });

    return { id };
  }

  private async normalizePayload(
    dto: CreateCashTransactionDto,
    seasonId: string,
    seasonName: string,
  ) {
    const currencyId = await this.currencyService.requireActiveCurrencyId(
      dto.currencyId,
    );
    const direction = this.normalizeDirection(dto.direction);
    const amount = this.parseDecimal(dto.amount, 'amount');
    const occurredAt = this.parseDate(dto.occurredAt, 'occurredAt');

    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('amount must be greater than 0');
    }

    return {
      currencyId,
      direction,
      amount,
      occurredAt,
      notes: dto.notes?.trim() || null,
      seasonId: dto.seasonId?.trim() || seasonId,
      seasonName: seasonName,
    };
  }

  private normalizeDirection(direction?: string) {
    const normalized = direction?.trim().toLowerCase();

    if (normalized !== 'in' && normalized !== 'out') {
      throw new BadRequestException('direction must be in or out');
    }

    return normalized;
  }

  private parseDecimal(value: string | number, fieldName: string) {
    try {
      const decimal = new Prisma.Decimal(value);

      if (decimal.isNaN()) {
        throw new Error('invalid');
      }

      return decimal;
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
  }

  private parseDate(value: string | Date, fieldName: string) {
    const parsed = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return parsed;
  }

  private serialize(row: any) {
    return {
      id: row.id,
      currencyId: row.currencyId,
      currencyCode: row.currency.code,
      currencyName: row.currency.name,
      direction: row.direction,
      amount: new Prisma.Decimal(row.amount ?? 0).toFixed(2),
      occurredAt: row.occurredAt,
      notes: row.notes,
      seasonId: row.seasonId,
      seasonName: row.seasonName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
