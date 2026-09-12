import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  fromKilograms,
  normalizeWeightUnit,
  resolveFromStockWeightKg,
  splitQuantityAgainstStock,
  toKilograms,
} from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CashService } from '../cash/cash.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { VarietyService } from '../variety/variety.service.js';
import { CreateRiceSaleDto } from './dto/create-rice-sale.dto.js';
import { FindRiceSalesQueryDto } from './dto/find-rice-sales-query.dto.js';
import { UpdateRiceSaleDto } from './dto/update-rice-sale.dto.js';

const riceSaleSelect = {
  id: true,
  billNo: true,
  buyerCustomerId: true,
  riceVariety: true,
  quantity: true,
  unit: true,
  fromStockWeightKg: true,
  oversoldWeightKg: true,
  saleDate: true,
  totalAmount: true,
  loadingAmount: true,
  loadingPaymentChannel: true,
  loadingSarafId: true,
  loadingCurrencyId: true,
  riceBagsAmount: true,
  bagsPaymentChannel: true,
  bagsSarafId: true,
  bagsCurrencyId: true,
  paymentType: true,
  paidAmount: true,
  remainingAmount: true,
  paidInCash: true,
  paymentChannel: true,
  sarafId: true,
  sarafLedgerCurrencyId: true,
  notes: true,
  seasonId: true,
  seasonName: true,
  createdAt: true,
  updatedAt: true,
  buyerCustomer: {
    select: {
      id: true,
      name: true,
      type: true,
      phoneNo: true,
    },
  },
  season: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  saraf: {
    select: {
      id: true,
      name: true,
    },
  },
  loadingSaraf: {
    select: {
      id: true,
      name: true,
    },
  },
  bagsSaraf: {
    select: {
      id: true,
      name: true,
    },
  },
  sarafLedgerCurrency: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  loadingCurrency: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  bagsCurrency: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class RiceSaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly varietyService: VarietyService,
    private readonly currencyService: CurrencyService,
    private readonly sarafLedgerService: SarafLedgerService,
    private readonly cashService: CashService,
  ) {}

  private get riceSaleModel() {
    return (this.prisma as any).riceSale;
  }

  private get riceWarehouseModel() {
    return (this.prisma as any).riceWarehouse;
  }

  private get processRiceEntryModel() {
    return (this.prisma as any).processRiceEntry;
  }

  async create(createDto: CreateRiceSaleDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const prepared = await this.prepareSaleWrite({
      dto: createDto,
      seasonId: activeSeason.id,
    });

    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.riceSale.create({
        data: {
          billNo,
          buyerCustomerId: prepared.buyer.id,
          riceVariety: prepared.riceVariety,
          quantity: prepared.quantity,
          unit: prepared.unit,
          fromStockWeightKg: prepared.fromStockWeightKg,
          oversoldWeightKg: prepared.oversoldWeightKg,
          saleDate: prepared.saleDate,
          totalAmount: prepared.riceAmount,
          loadingAmount: prepared.loadingAmount,
          loadingPaymentChannel: prepared.loadingPaymentChannel,
          loadingSarafId: prepared.loadingSettlement?.sarafId ?? null,
          loadingCurrencyId: prepared.loadingSettlement?.currencyId ?? null,
          riceBagsAmount: prepared.riceBagsAmount,
          bagsPaymentChannel: prepared.bagsPaymentChannel,
          bagsSarafId: prepared.bagsSettlement?.sarafId ?? null,
          bagsCurrencyId: prepared.bagsSettlement?.currencyId ?? null,
          paymentType: prepared.payment.paymentType,
          paidAmount: prepared.payment.paidAmount,
          remainingAmount: prepared.payment.remainingAmount,
          paidInCash: prepared.paidInCash,
          paymentChannel: prepared.paymentChannel,
          sarafId: prepared.riceSettlement.sarafId,
          sarafLedgerCurrencyId: prepared.riceSettlement.currencyId,
          notes: createDto.notes?.trim() || null,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
        },
        select: riceSaleSelect,
      });

      await this.applySaleSettlements(tx, {
        sale,
        saleDate: prepared.saleDate,
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        prepared,
      });

      return sale;
    });

    return this.serializeRiceSale(created);
  }

  async findOne(id: string) {
    const sale = await this.riceSaleModel.findUnique({
      where: { id: this.parseId(id) },
      select: riceSaleSelect,
    });

    if (!sale) {
      throw new NotFoundException(`Rice sale with id "${id}" not found`);
    }

    return this.serializeRiceSale(sale);
  }

  async update(id: string, updateDto: UpdateRiceSaleDto) {
    const saleId = this.parseId(id);
    const current = await this.riceSaleModel.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        billNo: true,
        seasonId: true,
        seasonName: true,
      },
    });

    if (!current) {
      throw new NotFoundException(`Rice sale with id "${id}" not found`);
    }

    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const prepared = await this.prepareSaleWrite({
      dto: updateDto,
      seasonId: current.seasonId,
      excludeRiceSaleId: id,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.clearLinkedSettlements(tx, saleId);

      const sale = await tx.riceSale.update({
        where: { id: saleId },
        data: {
          buyerCustomerId: prepared.buyer.id,
          riceVariety: prepared.riceVariety,
          quantity: prepared.quantity,
          unit: prepared.unit,
          fromStockWeightKg: prepared.fromStockWeightKg,
          oversoldWeightKg: prepared.oversoldWeightKg,
          saleDate: prepared.saleDate,
          totalAmount: prepared.riceAmount,
          loadingAmount: prepared.loadingAmount,
          loadingPaymentChannel: prepared.loadingPaymentChannel,
          loadingSarafId: prepared.loadingSettlement?.sarafId ?? null,
          loadingCurrencyId: prepared.loadingSettlement?.currencyId ?? null,
          riceBagsAmount: prepared.riceBagsAmount,
          bagsPaymentChannel: prepared.bagsPaymentChannel,
          bagsSarafId: prepared.bagsSettlement?.sarafId ?? null,
          bagsCurrencyId: prepared.bagsSettlement?.currencyId ?? null,
          paymentType: prepared.payment.paymentType,
          paidAmount: prepared.payment.paidAmount,
          remainingAmount: prepared.payment.remainingAmount,
          paidInCash: prepared.paidInCash,
          paymentChannel: prepared.paymentChannel,
          sarafId: prepared.riceSettlement.sarafId,
          sarafLedgerCurrencyId: prepared.riceSettlement.currencyId,
          notes: updateDto.notes?.trim() || null,
        },
        select: riceSaleSelect,
      });

      await this.applySaleSettlements(tx, {
        sale,
        saleDate: prepared.saleDate,
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        prepared,
      });

      return sale;
    });

    return this.serializeRiceSale(updated);
  }

  async remove(id: string) {
    const saleId = this.parseId(id);
    const current = await this.riceSaleModel.findUnique({
      where: { id: saleId },
      select: riceSaleSelect,
    });

    if (!current) {
      throw new NotFoundException(`Rice sale with id "${id}" not found`);
    }

    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    await this.prisma.$transaction(async (tx) => {
      await this.clearLinkedSettlements(tx, saleId);
      await tx.riceSale.delete({ where: { id: saleId } });
    });

    return this.serializeRiceSale(current);
  }

  async getCashSalesSummary(seasonId?: string) {
    const season = await this.seasonService.resolveSeasonForRead(seasonId);
    const resolvedSeasonId = season.id;

    const transactions = await this.prisma.cashTransaction.findMany({
      where: {
        seasonId: resolvedSeasonId,
        direction: 'in',
        riceSaleId: { not: null },
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

    const byCurrency = [...buckets.values()]
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      )
      .map((bucket) => ({
        currencyCode: bucket.currencyCode,
        currencyName: bucket.currencyName,
        cashPaidAmount: bucket.total.toFixed(2),
      }));

    const cashPaidAmount = byCurrency
      .reduce(
        (sum, row) => sum.plus(new Prisma.Decimal(row.cashPaidAmount)),
        new Prisma.Decimal(0),
      )
      .toFixed(2);

    return {
      seasonId: resolvedSeasonId,
      cashPaidAmount,
      byCurrency,
    };
  }

  async findAll(filters: FindRiceSalesQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'saleDate',
      'billNo',
      'riceVariety',
      'quantity',
      'totalAmount',
      'paymentType',
      'paidAmount',
      'remainingAmount',
      'paymentChannel',
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const where = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(query
        ? {
            OR: [
              { billNo: { contains: query, mode: 'insensitive' } },
              { riceVariety: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
              {
                buyerCustomer: {
                  name: { contains: query, mode: 'insensitive' },
                },
              },
              {
                buyerCustomer: {
                  phoneNo: { contains: query, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.riceSaleModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: riceSaleSelect,
      }),
      this.riceSaleModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item: any) => this.serializeRiceSale(item)),
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

  /**
   * Physical rice stock available for a variety (kg): warehouse in + process rice in − sales − charity − fulfilled farmer rice returns.
   * Unfulfilled farmer rice return ledger entries do not reduce stock until issued via the customer ledger.
   */
  async getAvailableRiceVarietyKg(params: {
    seasonId: string;
    riceVariety: string;
    excludeRiceSaleId?: string;
    excludeRiceCharityId?: string;
  }) {
    const variety = params.riceVariety;

    const [
      warehouseEntries,
      processEntries,
      saleEntries,
      charityEntries,
      farmerReturnOutKg,
    ] = await Promise.all([
      this.riceWarehouseModel.findMany({
        where: {
          seasonId: params.seasonId,
          variety,
        },
        select: {
          quantity: true,
          unit: true,
        },
      }),
      this.processRiceEntryModel.findMany({
        where: {
          seasonId: params.seasonId,
          variety,
        },
        select: {
          processedWeightKg: true,
        },
      }),
      this.riceSaleModel.findMany({
        where: {
          seasonId: params.seasonId,
          riceVariety: variety,
          ...(params.excludeRiceSaleId
            ? { NOT: { id: this.parseId(params.excludeRiceSaleId) } }
            : {}),
        },
        select: {
          quantity: true,
          unit: true,
          fromStockWeightKg: true,
          oversoldWeightKg: true,
        },
      }),
      (this.prisma as any).riceCharity.findMany({
        where: {
          seasonId: params.seasonId,
          riceVariety: variety,
          ...(params.excludeRiceCharityId
            ? { NOT: { id: this.parseId(params.excludeRiceCharityId) } }
            : {}),
        },
        select: {
          quantity: true,
          unit: true,
        },
      }),
      this.sumFulfilledFarmerRiceReturnOutKg({
        seasonId: params.seasonId,
        riceVariety: variety,
      }),
    ]);

    const warehouseInKg = warehouseEntries.reduce(
      (
        sum: Prisma.Decimal,
        entry: { quantity: Prisma.Decimal; unit: string },
      ) =>
        sum.plus(toKilograms(new Prisma.Decimal(entry.quantity), entry.unit)),
      new Prisma.Decimal(0),
    );

    const processInKg = processEntries.reduce(
      (sum: Prisma.Decimal, entry: { processedWeightKg: Prisma.Decimal }) =>
        sum.plus(new Prisma.Decimal(entry.processedWeightKg)),
      new Prisma.Decimal(0),
    );

    const totalSalesOutKg = saleEntries.reduce(
      (
        sum: Prisma.Decimal,
        entry: {
          quantity: Prisma.Decimal;
          unit: string;
          fromStockWeightKg?: Prisma.Decimal | null;
        },
      ) =>
        sum.plus(
          resolveFromStockWeightKg({
            fromStockWeightKg: entry.fromStockWeightKg,
            fallbackQuantity: entry.quantity,
            fallbackUnit: entry.unit,
          }),
        ),
      new Prisma.Decimal(0),
    );

    const totalCharityOutKg = charityEntries.reduce(
      (
        sum: Prisma.Decimal,
        entry: { quantity: Prisma.Decimal; unit: string },
      ) =>
        sum.plus(toKilograms(new Prisma.Decimal(entry.quantity), entry.unit)),
      new Prisma.Decimal(0),
    );

    return Prisma.Decimal.max(
      warehouseInKg
        .plus(processInKg)
        .minus(totalSalesOutKg)
        .minus(totalCharityOutKg)
        .minus(farmerReturnOutKg),
      0,
    );
  }

  private async sumFulfilledFarmerRiceReturnOutKg(params: {
    seasonId: string;
    riceVariety: string;
    excludeLedgerEntryId?: string;
  }): Promise<Prisma.Decimal> {
    const entries = await (this.prisma as any).customerLedgerEntry.findMany({
      where: {
        entryType: 'farmer_rice_return',
        riceStockFulfilledAt: { not: null },
        riceVariety: params.riceVariety,
        customer: { seasonId: params.seasonId },
        ...(params.excludeLedgerEntryId
          ? { NOT: { id: this.parseId(params.excludeLedgerEntryId) } }
          : {}),
      },
      select: {
        riceQuantity: true,
        unit: true,
      },
    });

    return entries.reduce(
      (
        sum: Prisma.Decimal,
        entry: { riceQuantity: Prisma.Decimal; unit: string | null },
      ) =>
        sum.plus(
          toKilograms(
            new Prisma.Decimal(entry.riceQuantity ?? 0),
            normalizeWeightUnit(entry.unit ?? undefined),
          ),
        ),
      new Prisma.Decimal(0),
    );
  }

  private async resolveRiceVarietyName(raw: string): Promise<string> {
    const trimmed = raw?.trim();

    if (!trimmed) {
      throw new BadRequestException('riceVariety is required');
    }

    for (const kind of ['RICE', 'PADDY'] as const) {
      try {
        return await this.varietyService.resolveActiveVarietyName(
          kind,
          trimmed,
        );
      } catch (error) {
        if (!(error instanceof BadRequestException)) {
          throw error;
        }
      }
    }

    throw new BadRequestException(
      `Unknown or inactive rice variety "${trimmed}". Register it under Veriety as RICE (preferred) or PADDY.`,
    );
  }

  private async requireBuyerCustomer(customerId: string, seasonId: string) {
    const customer = await (this.prisma as any).customer.findUnique({
      where: { id: this.parseId(customerId) },
      select: {
        id: true,
        name: true,
        type: true,
        seasonId: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${customerId}" not found`);
    }

    if (customer.type !== 'buyer') {
      throw new BadRequestException('Rice sale buyer must be a buyer customer');
    }

    if (customer.seasonId !== seasonId) {
      throw new BadRequestException(
        'Selected buyer must belong to the same season',
      );
    }

    return customer;
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private parseDate(value: string, fieldName: string) {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return parsedDate;
  }

  private async prepareSaleWrite(params: {
    dto: CreateRiceSaleDto | UpdateRiceSaleDto;
    seasonId: string;
    excludeRiceSaleId?: string;
  }) {
    const buyer = await this.requireBuyerCustomer(
      params.dto.buyerCustomerId,
      params.seasonId,
    );
    const riceVariety = await this.resolveRiceVarietyName(
      params.dto.riceVariety ?? '',
    );

    const unit = normalizeWeightUnit(params.dto.unit);
    const quantity = this.parsePositiveDecimal(params.dto.quantity, 'quantity');
    const saleDate = this.parseDate(params.dto.saleDate, 'saleDate');
    const riceAmount = this.parsePositiveDecimal(
      params.dto.totalAmount,
      'totalAmount',
    );
    const loadingAmount = this.parseDecimalNonNegative(
      params.dto.loadingAmount ?? 0,
      'loadingAmount',
    );
    const riceBagsAmount = this.parseDecimalNonNegative(
      params.dto.riceBagsAmount ?? 0,
      'riceBagsAmount',
    );
    const invoiceTotal = riceAmount.plus(loadingAmount).plus(riceBagsAmount);

    const paymentType = this.normalizePaymentType(params.dto.paymentType);
    const paymentChannel = this.normalizePaymentChannel(
      params.dto.paymentChannel,
    );
    const loadingPaymentChannel = loadingAmount.greaterThan(0)
      ? paymentChannel
      : null;
    const bagsPaymentChannel = riceBagsAmount.greaterThan(0)
      ? paymentChannel
      : null;

    const payment = this.resolveSalePaymentFromTotal({
      totalAmount: invoiceTotal,
      paymentType,
      paidAmount: params.dto.paidAmount,
    });
    const chargePayments = this.allocateChargePayments({
      paidAmount: payment.paidAmount,
      riceAmount,
      loadingAmount,
      riceBagsAmount,
    });
    const paidInCash =
      paymentChannel === 'cash' &&
      (chargePayments.ricePaid.greaterThan(0) ||
        chargePayments.loadingPaid.greaterThan(0) ||
        chargePayments.bagsPaid.greaterThan(0));

    const riceSettlement = await this.resolveChargeSettlement({
      chargeLabel: 'rice',
      chargeAmount: riceAmount,
      payNow: chargePayments.ricePaid,
      paymentChannel,
      sarafIdTrimmed: params.dto.sarafId?.trim() ?? '',
      currencyIdTrimmed: params.dto.sarafLedgerCurrencyId?.trim() ?? '',
      seasonId: params.seasonId,
    });
    const loadingSettlement = loadingAmount.greaterThan(0)
      ? await this.resolveChargeSettlement({
          chargeLabel: 'loading',
          chargeAmount: loadingAmount,
          payNow: chargePayments.loadingPaid,
          paymentChannel,
          sarafIdTrimmed: params.dto.sarafId?.trim() ?? '',
          currencyIdTrimmed: params.dto.sarafLedgerCurrencyId?.trim() ?? '',
          seasonId: params.seasonId,
        })
      : null;
    const bagsSettlement = riceBagsAmount.greaterThan(0)
      ? await this.resolveChargeSettlement({
          chargeLabel: 'bags',
          chargeAmount: riceBagsAmount,
          payNow: chargePayments.bagsPaid,
          paymentChannel,
          sarafIdTrimmed: params.dto.sarafId?.trim() ?? '',
          currencyIdTrimmed: params.dto.sarafLedgerCurrencyId?.trim() ?? '',
          seasonId: params.seasonId,
        })
      : null;

    const availableKg = await this.getAvailableRiceVarietyKg({
      seasonId: params.seasonId,
      riceVariety,
      excludeRiceSaleId: params.excludeRiceSaleId,
    });
    const requestedKg = toKilograms(quantity, unit);
    const { fromStockWeightKg, oversoldWeightKg } = splitQuantityAgainstStock(
      requestedKg,
      availableKg,
    );

    return {
      buyer,
      riceVariety,
      unit,
      quantity,
      fromStockWeightKg,
      oversoldWeightKg,
      saleDate,
      riceAmount,
      loadingAmount,
      riceBagsAmount,
      payment,
      paymentChannel,
      loadingPaymentChannel,
      bagsPaymentChannel,
      chargePayments,
      paidInCash,
      riceSettlement,
      loadingSettlement,
      bagsSettlement,
    };
  }

  private async clearLinkedSettlements(
    tx: Prisma.TransactionClient,
    riceSaleId: bigint,
  ) {
    await tx.sarafLedgerEntry.deleteMany({
      where: { riceSaleId },
    });
    await tx.cashTransaction.deleteMany({
      where: { riceSaleId },
    });
  }

  private async applySaleSettlements(
    tx: Prisma.TransactionClient,
    params: {
      sale: { id: bigint; billNo: string };
      saleDate: Date;
      seasonId: string;
      seasonName: string;
      prepared: Awaited<ReturnType<RiceSaleService['prepareSaleWrite']>>;
    },
  ) {
    const { prepared } = params;

    await this.settleRiceSaleCharge(tx, {
      sale: params.sale,
      saleDate: params.saleDate,
      seasonId: params.seasonId,
      seasonName: params.seasonName,
      chargeType: 'rice',
      payNow: prepared.chargePayments.ricePaid,
      paymentChannel: prepared.paymentChannel,
      sarafId: prepared.riceSettlement.sarafId,
      currencyId: prepared.riceSettlement.currencyId,
    });

    if (prepared.loadingSettlement && prepared.loadingPaymentChannel) {
      await this.settleRiceSaleCharge(tx, {
        sale: params.sale,
        saleDate: params.saleDate,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        chargeType: 'loading',
        payNow: prepared.chargePayments.loadingPaid,
        paymentChannel: prepared.loadingPaymentChannel,
        sarafId: prepared.loadingSettlement.sarafId,
        currencyId: prepared.loadingSettlement.currencyId,
      });
    }

    if (prepared.bagsSettlement && prepared.bagsPaymentChannel) {
      await this.settleRiceSaleCharge(tx, {
        sale: params.sale,
        saleDate: params.saleDate,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        chargeType: 'bags',
        payNow: prepared.chargePayments.bagsPaid,
        paymentChannel: prepared.bagsPaymentChannel,
        sarafId: prepared.bagsSettlement.sarafId,
        currencyId: prepared.bagsSettlement.currencyId,
      });
    }
  }

  private allocateChargePayments(params: {
    paidAmount: Prisma.Decimal;
    riceAmount: Prisma.Decimal;
    loadingAmount: Prisma.Decimal;
    riceBagsAmount: Prisma.Decimal;
  }) {
    let pool = params.paidAmount;

    const take = (charge: Prisma.Decimal) => {
      if (pool.lessThanOrEqualTo(0) || charge.lessThanOrEqualTo(0)) {
        return new Prisma.Decimal(0);
      }

      const paid = Prisma.Decimal.min(pool, charge);
      pool = pool.minus(paid);
      return paid;
    };

    return {
      ricePaid: take(params.riceAmount),
      loadingPaid: take(params.loadingAmount),
      bagsPaid: take(params.riceBagsAmount),
    };
  }

  private async resolveChargeSettlement(params: {
    chargeLabel: 'rice' | 'loading' | 'bags';
    chargeAmount: Prisma.Decimal;
    payNow: Prisma.Decimal;
    paymentChannel: 'cash' | 'saraf';
    sarafIdTrimmed: string;
    currencyIdTrimmed: string;
    seasonId: string;
  }): Promise<{
    sarafId: bigint | null;
    currencyId: string | null;
  }> {
    if (params.chargeAmount.lessThanOrEqualTo(0)) {
      return { sarafId: null, currencyId: null };
    }

    if (!params.currencyIdTrimmed) {
      if (params.payNow.greaterThan(0) || params.chargeAmount.greaterThan(0)) {
        throw new BadRequestException(
          `Currency is required for the ${params.chargeLabel} charge`,
        );
      }

      return { sarafId: null, currencyId: null };
    }

    const currencyId = await this.currencyService.requireActiveCurrencyId(
      params.currencyIdTrimmed,
    );

    if (params.paymentChannel === 'cash') {
      if (params.sarafIdTrimmed) {
        throw new BadRequestException(
          `sarafId must be omitted when ${params.chargeLabel} is paid in cash`,
        );
      }

      return { sarafId: null, currencyId };
    }

    if (!params.sarafIdTrimmed) {
      if (params.payNow.greaterThan(0)) {
        throw new BadRequestException(
          `sarafId is required when ${params.chargeLabel} is paid to Saraf`,
        );
      }

      return { sarafId: null, currencyId };
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

    return { sarafId: sarafIdBig, currencyId };
  }

  private async settleRiceSaleCharge(
    tx: Prisma.TransactionClient,
    params: {
      sale: { id: bigint; billNo: string };
      saleDate: Date;
      seasonId: string;
      seasonName: string;
      chargeType: 'rice' | 'loading' | 'bags';
      payNow: Prisma.Decimal;
      paymentChannel: 'cash' | 'saraf';
      sarafId: bigint | null;
      currencyId: string | null;
    },
  ) {
    if (!params.payNow.greaterThan(0) || !params.currencyId) {
      return;
    }

    const label =
      params.chargeType === 'rice'
        ? 'Rice'
        : params.chargeType === 'loading'
          ? 'Loading'
          : 'Bags';

    if (params.paymentChannel === 'saraf' && params.sarafId) {
      await this.sarafLedgerService.createLinkedRiceSaleEntry(tx, {
        sarafId: params.sarafId,
        currencyId: params.currencyId,
        amount: params.payNow,
        occurredAt: params.saleDate,
        notes: `${label} — Rice sale ${params.sale.billNo}`,
        riceSaleId: params.sale.id,
        chargeType: params.chargeType,
      });
      return;
    }

    if (params.paymentChannel === 'cash') {
      await this.cashService.createLinkedRiceSaleInEntry(tx, {
        currencyId: params.currencyId,
        amount: params.payNow,
        occurredAt: params.saleDate,
        notes: `${label} — Rice sale ${params.sale.billNo}`,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        riceSaleId: params.sale.id,
        chargeType: params.chargeType,
      });
    }
  }

  private resolveSalePaymentFromTotal(params: {
    totalAmount: Prisma.Decimal;
    paymentType: string;
    paidAmount?: string | number | Prisma.Decimal | null;
  }) {
    if (params.paymentType === 'paid') {
      return {
        paymentType: 'paid' as const,
        paidAmount: params.totalAmount,
        remainingAmount: new Prisma.Decimal(0),
      };
    }

    if (params.paymentType === 'remaining') {
      return {
        paymentType: 'remaining' as const,
        paidAmount: new Prisma.Decimal(0),
        remainingAmount: params.totalAmount,
      };
    }

    const normalizedPaid = this.parseDecimalNonNegative(
      params.paidAmount ?? 0,
      'paidAmount',
    );

    if (
      normalizedPaid.lessThanOrEqualTo(0) ||
      normalizedPaid.greaterThanOrEqualTo(params.totalAmount)
    ) {
      throw new BadRequestException(
        'paidAmount must be greater than 0 and less than the invoice total for partial_paid',
      );
    }

    return {
      paymentType: 'partial_paid' as const,
      paidAmount: normalizedPaid,
      remainingAmount: params.totalAmount.minus(normalizedPaid),
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

  private normalizePaymentType(paymentType?: string) {
    const normalized = paymentType?.trim().toLowerCase();

    if (!normalized) {
      throw new BadRequestException('paymentType is required');
    }

    if (!['paid', 'partial_paid', 'remaining'].includes(normalized)) {
      throw new BadRequestException(
        'paymentType must be one of paid, partial_paid, or remaining',
      );
    }

    return normalized;
  }

  private parseDecimalNonNegative(
    value: string | number | Prisma.Decimal,
    fieldName: string,
  ) {
    try {
      const decimal = new Prisma.Decimal(value as Prisma.Decimal.Value);

      if (decimal.lessThan(0)) {
        throw new BadRequestException(`${fieldName} cannot be negative`);
      }

      return decimal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
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

  private async generateBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before rice sales can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-RS-`;
    const lastEntry = await this.riceSaleModel.findFirst({
      where: {
        seasonId,
        billNo: {
          startsWith: prefix,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { billNo: true },
    });

    const nextNumber = lastEntry?.billNo?.startsWith(prefix)
      ? Number(lastEntry.billNo.slice(prefix.length)) + 1
      : 1;

    return `${prefix}${nextNumber}`;
  }

  private serializeRiceSale(sale: any) {
    const {
      saraf: sarafRaw,
      loadingSaraf: loadingSarafRaw,
      bagsSaraf: bagsSarafRaw,
      sarafLedgerCurrency: sarafLedgerCurrencyRaw,
      loadingCurrency: loadingCurrencyRaw,
      bagsCurrency: bagsCurrencyRaw,
      buyerCustomer,
      ...rest
    } = sale;

    const riceAmount = new Prisma.Decimal(sale.totalAmount);
    const loadingAmount = new Prisma.Decimal(sale.loadingAmount ?? 0);
    const riceBagsAmount = new Prisma.Decimal(sale.riceBagsAmount ?? 0);

    return {
      ...rest,
      id: String(sale.id),
      buyerCustomerId: String(sale.buyerCustomerId),
      quantity: new Prisma.Decimal(sale.quantity).toFixed(2),
      fromStockWeight: fromKilograms(
        sale.fromStockWeightKg ?? 0,
        sale.unit,
      ).toFixed(2),
      oversoldWeight: fromKilograms(
        sale.oversoldWeightKg ?? 0,
        sale.unit,
      ).toFixed(2),
      fromStockWeightKg: new Prisma.Decimal(
        sale.fromStockWeightKg ?? 0,
      ).toFixed(2),
      oversoldWeightKg: new Prisma.Decimal(sale.oversoldWeightKg ?? 0).toFixed(
        2,
      ),
      totalAmount: riceAmount.toFixed(2),
      loadingAmount: loadingAmount.toFixed(2),
      riceBagsAmount: riceBagsAmount.toFixed(2),
      invoiceTotal: riceAmount
        .plus(loadingAmount)
        .plus(riceBagsAmount)
        .toFixed(2),
      paidAmount: new Prisma.Decimal(sale.paidAmount).toFixed(2),
      remainingAmount: new Prisma.Decimal(sale.remainingAmount).toFixed(2),
      sarafId: sale.sarafId != null ? String(sale.sarafId) : null,
      loadingSarafId:
        sale.loadingSarafId != null ? String(sale.loadingSarafId) : null,
      bagsSarafId: sale.bagsSarafId != null ? String(sale.bagsSarafId) : null,
      saraf: sarafRaw
        ? {
            id: String(sarafRaw.id),
            name: sarafRaw.name,
          }
        : null,
      loadingSaraf: loadingSarafRaw
        ? {
            id: String(loadingSarafRaw.id),
            name: loadingSarafRaw.name,
          }
        : null,
      bagsSaraf: bagsSarafRaw
        ? {
            id: String(bagsSarafRaw.id),
            name: bagsSarafRaw.name,
          }
        : null,
      sarafLedgerCurrency: sarafLedgerCurrencyRaw
        ? {
            id: sarafLedgerCurrencyRaw.id,
            code: sarafLedgerCurrencyRaw.code,
            name: sarafLedgerCurrencyRaw.name,
          }
        : null,
      loadingCurrency: loadingCurrencyRaw
        ? {
            id: loadingCurrencyRaw.id,
            code: loadingCurrencyRaw.code,
            name: loadingCurrencyRaw.name,
          }
        : null,
      bagsCurrency: bagsCurrencyRaw
        ? {
            id: bagsCurrencyRaw.id,
            code: bagsCurrencyRaw.code,
            name: bagsCurrencyRaw.name,
          }
        : null,
      buyerCustomer: buyerCustomer
        ? {
            ...buyerCustomer,
            id: String(buyerCustomer.id),
          }
        : null,
    };
  }
}
