import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  fromKilograms,
  normalizeWeightUnit,
  splitQuantityAgainstStock,
  toKilograms,
} from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CashService } from '../cash/cash.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateStoreVarietySaleDto } from './dto/create-store-variety-sale.dto.js';
import { FindStoreVarietySalesQueryDto } from './dto/find-store-variety-sales-query.dto.js';
import { UpdateStoreVarietySaleDto } from './dto/update-store-variety-sale.dto.js';
import { StoreService } from './store.service.js';
import {
  isPooledStoreType,
  POOLED_SALE_VARIETY,
  type StoreTypeValue,
} from './store.constants.js';

const storeVarietySaleSelect = {
  id: true,
  storeType: true,
  variety: true,
  billNo: true,
  saleDate: true,
  soldWeight: true,
  unit: true,
  soldWeightKg: true,
  fromStockWeightKg: true,
  oversoldWeightKg: true,
  saleAmount: true,
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
  buyerCustomerId: true,
  createdAt: true,
  updatedAt: true,
  buyerCustomer: {
    select: {
      id: true,
      name: true,
      type: true,
      phoneNo: true,
      address: true,
    },
  },
  saraf: {
    select: {
      id: true,
      name: true,
      phoneNo: true,
    },
  },
  loadingSaraf: {
    select: {
      id: true,
      name: true,
      phoneNo: true,
    },
  },
  bagsSaraf: {
    select: {
      id: true,
      name: true,
      phoneNo: true,
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
export class StoreVarietySaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly currencyService: CurrencyService,
    private readonly sarafLedgerService: SarafLedgerService,
    private readonly cashService: CashService,
    private readonly storeService: StoreService,
  ) {}

  private get storeVarietySaleModel() {
    return (this.prisma as any).storeVarietySale;
  }

  async create(createDto: CreateStoreVarietySaleDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const storeType = this.normalizeStoreType(createDto.storeType);
    const pooled = isPooledStoreType(storeType);
    const variety = pooled ? POOLED_SALE_VARIETY : createDto.variety?.trim();

    if (!variety) {
      throw new BadRequestException('variety is required');
    }

    const prepared = await this.resolveSaleWriteFromDto(createDto, {
      seasonId: activeSeason.id,
      storeType,
      variety,
      pooled,
    });

    const billNo = await this.generateVarietySaleBillNo(
      activeSeason.id,
      activeSeason.code,
      storeType,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.storeVarietySale.create({
        data: {
          storeType,
          variety,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
          buyerCustomerId: prepared.buyer.id,
          billNo,
          saleDate: prepared.saleDate,
          soldWeight: prepared.soldWeight,
          unit: prepared.unit,
          soldWeightKg: prepared.soldWeightKg,
          fromStockWeightKg: prepared.fromStockWeightKg,
          oversoldWeightKg: prepared.oversoldWeightKg,
          saleAmount: prepared.productAmount,
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
          sarafId: prepared.productSettlement.sarafId,
          sarafLedgerCurrencyId: prepared.productSettlement.currencyId,
          notes: createDto.notes?.trim() || null,
        },
        select: storeVarietySaleSelect,
      });

      await this.applySaleStockDelta(tx, {
        pooled,
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        storeType,
        variety,
        fromStockWeightKg: prepared.fromStockWeightKg,
      });

      await this.applyAllSettlements(tx, {
        sale,
        saleDate: prepared.saleDate,
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        variety,
        pooled,
        prepared,
      });

      return sale;
    });

    return this.serializeSale(created);
  }

  async findAll(filters: FindStoreVarietySalesQueryDto = {}) {
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
      'variety',
      'soldWeight',
      'saleAmount',
      'paymentType',
      'paidAmount',
      'paymentChannel',
      'seasonName',
      'createdAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const storeType = filters.storeType?.trim()
      ? this.normalizeStoreType(filters.storeType)
      : undefined;

    const where = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(storeType ? { storeType } : {}),
      ...(filters.variety?.trim()
        ? {
            variety: {
              equals: filters.variety.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(query
        ? {
            OR: [
              { billNo: { contains: query, mode: 'insensitive' as const } },
              { variety: { contains: query, mode: 'insensitive' as const } },
              { seasonName: { contains: query, mode: 'insensitive' as const } },
              { notes: { contains: query, mode: 'insensitive' as const } },
              {
                buyerCustomer: {
                  name: { contains: query, mode: 'insensitive' as const },
                },
              },
              {
                buyerCustomer: {
                  phoneNo: { contains: query, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.storeVarietySaleModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: storeVarietySaleSelect,
      }),
      this.storeVarietySaleModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item: any) => this.serializeSale(item)),
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
    const saleId = this.parseId(id);
    const sale = await this.storeVarietySaleModel.findUnique({
      where: { id: saleId },
      select: storeVarietySaleSelect,
    });

    if (!sale) {
      throw new NotFoundException(
        `Store variety sale with id "${id}" not found`,
      );
    }

    return this.serializeSale(sale);
  }

  async update(id: string, updateDto: UpdateStoreVarietySaleDto) {
    const saleId = this.parseId(id);
    const current = await this.storeVarietySaleModel.findUnique({
      where: { id: saleId },
      select: storeVarietySaleSelect,
    });

    if (!current) {
      throw new NotFoundException(
        `Store variety sale with id "${id}" not found`,
      );
    }

    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const storeType = current.storeType as StoreTypeValue;
    const pooled = isPooledStoreType(storeType);
    const variety = current.variety;
    const prepared = await this.resolveSaleWriteFromDto(updateDto, {
      seasonId: current.seasonId,
      storeType,
      variety,
      pooled,
      extraAvailableKg: new Prisma.Decimal(current.fromStockWeightKg ?? 0),
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.applySaleStockDelta(tx, {
        pooled,
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        storeType,
        variety,
        fromStockWeightKg: new Prisma.Decimal(current.fromStockWeightKg ?? 0),
        reverse: true,
      });

      await this.clearLinkedSettlements(tx, saleId);

      const sale = await tx.storeVarietySale.update({
        where: { id: saleId },
        data: {
          buyerCustomerId: prepared.buyer.id,
          saleDate: prepared.saleDate,
          soldWeight: prepared.soldWeight,
          unit: prepared.unit,
          soldWeightKg: prepared.soldWeightKg,
          fromStockWeightKg: prepared.fromStockWeightKg,
          oversoldWeightKg: prepared.oversoldWeightKg,
          saleAmount: prepared.productAmount,
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
          sarafId: prepared.productSettlement.sarafId,
          sarafLedgerCurrencyId: prepared.productSettlement.currencyId,
          notes: updateDto.notes?.trim() || null,
        },
        select: storeVarietySaleSelect,
      });

      await this.applySaleStockDelta(tx, {
        pooled,
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        storeType,
        variety,
        fromStockWeightKg: prepared.fromStockWeightKg,
      });

      await this.applyAllSettlements(tx, {
        sale,
        saleDate: prepared.saleDate,
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        variety,
        pooled,
        prepared,
      });

      return sale;
    });

    return this.serializeSale(updated);
  }

  async remove(id: string) {
    const saleId = this.parseId(id);
    const current = await this.storeVarietySaleModel.findUnique({
      where: { id: saleId },
      select: storeVarietySaleSelect,
    });

    if (!current) {
      throw new NotFoundException(
        `Store variety sale with id "${id}" not found`,
      );
    }

    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const storeType = current.storeType as StoreTypeValue;
    const pooled = isPooledStoreType(storeType);
    const fromStockWeightKg = new Prisma.Decimal(current.fromStockWeightKg ?? 0);

    await this.prisma.$transaction(async (tx) => {
      if (fromStockWeightKg.greaterThan(0)) {
        await this.applySaleStockDelta(tx, {
          pooled,
          seasonId: current.seasonId,
          seasonName: current.seasonName,
          storeType,
          variety: current.variety,
          fromStockWeightKg,
          reverse: true,
        });
      }

      await this.clearLinkedSettlements(tx, saleId);
      await tx.storeVarietySale.delete({ where: { id: saleId } });
    });

    return this.serializeSale(current);
  }

  async getCashSalesSummary(seasonId?: string) {
    const season = await this.seasonService.resolveSeasonForRead(seasonId);
    const resolvedSeasonId = season.id;

    const transactions = await this.prisma.cashTransaction.findMany({
      where: {
        seasonId: resolvedSeasonId,
        direction: 'in',
        storeVarietySaleId: { not: null },
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

  private async getAvailableVarietyKg(
    seasonId: string,
    storeType: StoreTypeValue,
    variety: string,
  ) {
    const stock = await this.storeService.getVarietyStock(storeType, seasonId);
    const row = stock.varieties.find(
      (v) => v.variety.toLowerCase() === variety.toLowerCase(),
    );

    return new Prisma.Decimal(row?.availableWeightKg ?? 0);
  }

  private async requireProcessProductionBuyerCustomer(
    customerId: string,
    seasonId: string,
  ) {
    const id = this.parseId(customerId);
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, type: true, seasonId: true, name: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${customerId}" not found`);
    }

    if (customer.seasonId !== seasonId) {
      throw new BadRequestException('Buyer must belong to the active season');
    }

    if (
      customer.type !== 'buyer' &&
      customer.type !== 'process_production_buyer'
    ) {
      throw new BadRequestException('Selected customer must be a Buyer');
    }

    return customer;
  }

  private async generateVarietySaleBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
    storeType: StoreTypeValue,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before store sales can be recorded',
      );
    }

    const storePrefix = this.getStoreBillPrefix(storeType);
    const prefix = `${normalizedSeasonCode.toUpperCase()}-${storePrefix}-VS-`;

    const lastSale = await this.prisma.$queryRaw<Array<{ billNo: string }>>(
      Prisma.sql`
        SELECT "bill_no" AS "billNo"
        FROM "store_variety_sales"
        WHERE "season_id" = ${seasonId}
          AND "bill_no" LIKE ${`${prefix}%`}
        ORDER BY "created_at" DESC
        LIMIT 1
      `,
    );

    const nextNumber = lastSale[0]?.billNo?.startsWith(prefix)
      ? Number(lastSale[0].billNo.slice(prefix.length)) + 1
      : 1;

    return `${prefix}${nextNumber}`;
  }

  private getStoreBillPrefix(storeType: StoreTypeValue) {
    switch (storeType) {
      case 'short_green':
        return 'SG';
      case 'regection':
        return 'RG';
      case 'broken_rice':
        return 'BR';
      case 'waste':
        return 'WS';
      default:
        return 'ST';
    }
  }

  private serializeSale(sale: any) {
    const productAmount = new Prisma.Decimal(sale.saleAmount);
    const loadingAmount = new Prisma.Decimal(sale.loadingAmount ?? 0);
    const riceBagsAmount = new Prisma.Decimal(sale.riceBagsAmount ?? 0);

    return {
      id: sale.id.toString(),
      storeType: sale.storeType,
      variety: sale.variety,
      billNo: sale.billNo,
      saleDate: sale.saleDate.toISOString(),
      soldWeight: new Prisma.Decimal(sale.soldWeight).toFixed(2),
      unit: sale.unit,
      soldWeightKg: new Prisma.Decimal(sale.soldWeightKg).toFixed(2),
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
      saleAmount: productAmount.toFixed(2),
      loadingAmount: loadingAmount.toFixed(2),
      riceBagsAmount: riceBagsAmount.toFixed(2),
      invoiceTotal: productAmount
        .plus(loadingAmount)
        .plus(riceBagsAmount)
        .toFixed(2),
      loadingPaymentChannel: sale.loadingPaymentChannel ?? null,
      loadingSarafId: sale.loadingSarafId?.toString() ?? null,
      loadingSaraf: sale.loadingSaraf
        ? {
            id: sale.loadingSaraf.id.toString(),
            name: sale.loadingSaraf.name,
            phoneNo: sale.loadingSaraf.phoneNo,
          }
        : null,
      loadingCurrencyId: sale.loadingCurrencyId ?? null,
      loadingCurrency: sale.loadingCurrency
        ? {
            id: sale.loadingCurrency.id,
            code: sale.loadingCurrency.code,
            name: sale.loadingCurrency.name,
          }
        : null,
      bagsPaymentChannel: sale.bagsPaymentChannel ?? null,
      bagsSarafId: sale.bagsSarafId?.toString() ?? null,
      bagsSaraf: sale.bagsSaraf
        ? {
            id: sale.bagsSaraf.id.toString(),
            name: sale.bagsSaraf.name,
            phoneNo: sale.bagsSaraf.phoneNo,
          }
        : null,
      bagsCurrencyId: sale.bagsCurrencyId ?? null,
      bagsCurrency: sale.bagsCurrency
        ? {
            id: sale.bagsCurrency.id,
            code: sale.bagsCurrency.code,
            name: sale.bagsCurrency.name,
          }
        : null,
      paymentType: sale.paymentType,
      paidAmount: new Prisma.Decimal(sale.paidAmount).toFixed(2),
      remainingAmount: new Prisma.Decimal(sale.remainingAmount).toFixed(2),
      paidInCash: sale.paidInCash,
      paymentChannel: sale.paymentChannel,
      sarafId: sale.sarafId?.toString() ?? null,
      sarafLedgerCurrencyId: sale.sarafLedgerCurrencyId ?? null,
      notes: sale.notes,
      seasonId: sale.seasonId,
      seasonName: sale.seasonName,
      buyerCustomerId: sale.buyerCustomerId.toString(),
      createdAt: sale.createdAt.toISOString(),
      updatedAt: sale.updatedAt.toISOString(),
      buyerCustomer: sale.buyerCustomer
        ? {
            id: sale.buyerCustomer.id.toString(),
            name: sale.buyerCustomer.name,
            type: sale.buyerCustomer.type,
            phoneNo: sale.buyerCustomer.phoneNo,
            address: sale.buyerCustomer.address,
          }
        : null,
      saraf: sale.saraf
        ? {
            id: sale.saraf.id.toString(),
            name: sale.saraf.name,
            phoneNo: sale.saraf.phoneNo,
          }
        : null,
      sarafLedgerCurrency: sale.sarafLedgerCurrency
        ? {
            id: sale.sarafLedgerCurrency.id,
            code: sale.sarafLedgerCurrency.code,
            name: sale.sarafLedgerCurrency.name,
          }
        : null,
    };
  }

  private allocateChargePayments(params: {
    paidAmount: Prisma.Decimal;
    productAmount: Prisma.Decimal;
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
      productPaid: take(params.productAmount),
      loadingPaid: take(params.loadingAmount),
      bagsPaid: take(params.riceBagsAmount),
    };
  }

  private async resolveChargeSettlement(params: {
    chargeLabel: 'sale' | 'loading' | 'bags';
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

  private async applySaleStockDelta(
    tx: Prisma.TransactionClient,
    params: {
      pooled: boolean;
      seasonId: string;
      seasonName: string;
      storeType: StoreTypeValue;
      variety: string;
      fromStockWeightKg: Prisma.Decimal;
      reverse?: boolean;
    },
  ) {
    if (!params.fromStockWeightKg.greaterThan(0)) {
      return;
    }

    if (params.pooled) {
      if (params.reverse) {
        await this.storeService.reversePooledSoldDeltaInTransaction(tx, {
          seasonId: params.seasonId,
          seasonName: params.seasonName,
          storeType: params.storeType,
          soldWeightKg: params.fromStockWeightKg,
        });
        return;
      }

      await this.storeService.applyPooledSoldDeltaInTransaction(tx, {
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        storeType: params.storeType,
        soldWeightKg: params.fromStockWeightKg,
      });
      return;
    }

    if (params.reverse) {
      await this.storeService.reverseVarietySoldDeltaInTransaction(tx, {
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        storeType: params.storeType,
        variety: params.variety,
        soldWeightKg: params.fromStockWeightKg,
      });
      return;
    }

    await this.storeService.applyVarietySoldDeltaInTransaction(tx, {
      seasonId: params.seasonId,
      seasonName: params.seasonName,
      storeType: params.storeType,
      variety: params.variety,
      soldWeightKg: params.fromStockWeightKg,
    });
  }

  private async resolveSaleWriteFromDto(
    dto: CreateStoreVarietySaleDto | UpdateStoreVarietySaleDto,
    params: {
      seasonId: string;
      storeType: StoreTypeValue;
      variety: string;
      pooled: boolean;
      extraAvailableKg?: Prisma.Decimal;
    },
  ) {
    const buyer = await this.requireProcessProductionBuyerCustomer(
      dto.buyerCustomerId,
      params.seasonId,
    );

    const unit = normalizeWeightUnit(dto.unit);
    const soldWeight = this.parsePositiveDecimal(dto.soldWeight, 'soldWeight');
    const soldWeightKg = toKilograms(soldWeight, unit);
    const saleDate = this.parseDate(dto.saleDate, 'saleDate');
    const productAmount = this.parsePositiveDecimal(
      dto.totalAmount,
      'totalAmount',
    );
    const loadingAmount = params.pooled
      ? this.parseDecimalNonNegative(dto.loadingAmount ?? 0, 'loadingAmount')
      : new Prisma.Decimal(0);
    const riceBagsAmount = params.pooled
      ? this.parseDecimalNonNegative(dto.riceBagsAmount ?? 0, 'riceBagsAmount')
      : new Prisma.Decimal(0);
    const invoiceTotal = productAmount.plus(loadingAmount).plus(riceBagsAmount);

    const paymentType = this.normalizePaymentType(dto.paymentType);
    const paymentChannel = this.normalizePaymentChannel(dto.paymentChannel);
    const loadingPaymentChannel = loadingAmount.greaterThan(0)
      ? paymentChannel
      : null;
    const bagsPaymentChannel = riceBagsAmount.greaterThan(0)
      ? paymentChannel
      : null;

    const payment = this.resolveSalePaymentFromTotal({
      totalAmount: invoiceTotal,
      paymentType,
      paidAmount: dto.paidAmount,
    });
    const chargePayments = this.allocateChargePayments({
      paidAmount: payment.paidAmount,
      productAmount,
      loadingAmount,
      riceBagsAmount,
    });
    const paidInCash =
      paymentChannel === 'cash' &&
      (chargePayments.productPaid.greaterThan(0) ||
        chargePayments.loadingPaid.greaterThan(0) ||
        chargePayments.bagsPaid.greaterThan(0));

    const baseAvailableKg = params.pooled
      ? await this.storeService.getPooledAvailableKg(
          params.seasonId,
          params.storeType,
        )
      : await this.getAvailableVarietyKg(
          params.seasonId,
          params.storeType,
          params.variety,
        );
    const availableKg = baseAvailableKg.plus(params.extraAvailableKg ?? 0);
    const { fromStockWeightKg, oversoldWeightKg } = splitQuantityAgainstStock(
      soldWeightKg,
      availableKg,
    );

    const sarafIdTrimmed = dto.sarafId?.trim() ?? '';
    const currencyIdTrimmed = dto.sarafLedgerCurrencyId?.trim() ?? '';

    if (paymentChannel === 'cash') {
      if (sarafIdTrimmed) {
        throw new BadRequestException(
          'Saraf must be omitted when Pay in Cash is selected',
        );
      }
    } else if (payment.paymentType === 'remaining') {
      throw new BadRequestException(
        'Pay to Saraf cannot be used when the full invoice is still unpaid',
      );
    }

    const productSettlement = await this.resolveChargeSettlement({
      chargeLabel: 'sale',
      chargeAmount: productAmount,
      payNow: chargePayments.productPaid,
      paymentChannel,
      sarafIdTrimmed,
      currencyIdTrimmed,
      seasonId: params.seasonId,
    });
    const loadingSettlement = loadingAmount.greaterThan(0)
      ? await this.resolveChargeSettlement({
          chargeLabel: 'loading',
          chargeAmount: loadingAmount,
          payNow: chargePayments.loadingPaid,
          paymentChannel,
          sarafIdTrimmed,
          currencyIdTrimmed,
          seasonId: params.seasonId,
        })
      : null;
    const bagsSettlement = riceBagsAmount.greaterThan(0)
      ? await this.resolveChargeSettlement({
          chargeLabel: 'bags',
          chargeAmount: riceBagsAmount,
          payNow: chargePayments.bagsPaid,
          paymentChannel,
          sarafIdTrimmed,
          currencyIdTrimmed,
          seasonId: params.seasonId,
        })
      : null;

    return {
      buyer,
      unit,
      soldWeight,
      soldWeightKg,
      fromStockWeightKg,
      oversoldWeightKg,
      saleDate,
      productAmount,
      loadingAmount,
      riceBagsAmount,
      loadingPaymentChannel,
      bagsPaymentChannel,
      payment,
      chargePayments,
      paidInCash,
      paymentChannel,
      productSettlement,
      loadingSettlement,
      bagsSettlement,
    };
  }

  private async clearLinkedSettlements(
    tx: Prisma.TransactionClient,
    storeVarietySaleId: bigint,
  ) {
    await tx.sarafLedgerEntry.deleteMany({
      where: { storeVarietySaleId },
    });
    await tx.cashTransaction.deleteMany({
      where: { storeVarietySaleId },
    });
  }

  private async applyAllSettlements(
    tx: Prisma.TransactionClient,
    params: {
      sale: { id: bigint; billNo: string };
      saleDate: Date;
      seasonId: string;
      seasonName: string;
      variety: string;
      pooled: boolean;
      prepared: Awaited<
        ReturnType<StoreVarietySaleService['resolveSaleWriteFromDto']>
      >;
    },
  ) {
    const { prepared } = params;

    await this.settleStoreVarietySaleCharge(tx, {
      sale: params.sale,
      saleDate: params.saleDate,
      seasonId: params.seasonId,
      seasonName: params.seasonName,
      variety: params.variety,
      pooled: params.pooled,
      chargeType: 'sale',
      payNow: prepared.chargePayments.productPaid,
      paymentChannel: prepared.paymentChannel,
      sarafId: prepared.productSettlement.sarafId,
      currencyId: prepared.productSettlement.currencyId,
    });

    if (prepared.loadingSettlement && prepared.loadingPaymentChannel) {
      await this.settleStoreVarietySaleCharge(tx, {
        sale: params.sale,
        saleDate: params.saleDate,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        variety: params.variety,
        pooled: params.pooled,
        chargeType: 'loading',
        payNow: prepared.chargePayments.loadingPaid,
        paymentChannel: prepared.loadingPaymentChannel,
        sarafId: prepared.loadingSettlement.sarafId,
        currencyId: prepared.loadingSettlement.currencyId,
      });
    }

    if (prepared.bagsSettlement && prepared.bagsPaymentChannel) {
      await this.settleStoreVarietySaleCharge(tx, {
        sale: params.sale,
        saleDate: params.saleDate,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        variety: params.variety,
        pooled: params.pooled,
        chargeType: 'bags',
        payNow: prepared.chargePayments.bagsPaid,
        paymentChannel: prepared.bagsPaymentChannel,
        sarafId: prepared.bagsSettlement.sarafId,
        currencyId: prepared.bagsSettlement.currencyId,
      });
    }
  }

  private async settleStoreVarietySaleCharge(
    tx: Prisma.TransactionClient,
    params: {
      sale: { id: bigint; billNo: string };
      saleDate: Date;
      seasonId: string;
      seasonName: string;
      variety: string;
      pooled: boolean;
      chargeType: 'sale' | 'loading' | 'bags';
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
      params.chargeType === 'sale'
        ? 'Sale'
        : params.chargeType === 'loading'
          ? 'Loading'
          : 'Bags';
    const varietySuffix =
      !params.pooled && params.variety ? ` (${params.variety})` : '';

    if (params.paymentChannel === 'saraf' && params.sarafId) {
      await this.sarafLedgerService.createLinkedStoreVarietySaleEntry(tx, {
        sarafId: params.sarafId,
        currencyId: params.currencyId,
        amount: params.payNow,
        occurredAt: params.saleDate,
        notes: `${label} — Store sale ${params.sale.billNo}${varietySuffix}`,
        storeVarietySaleId: params.sale.id,
        chargeType: params.chargeType,
      });
      return;
    }

    if (params.paymentChannel === 'cash') {
      await this.cashService.createLinkedStoreVarietySaleInEntry(tx, {
        currencyId: params.currencyId,
        amount: params.payNow,
        occurredAt: params.saleDate,
        notes: `${label} — Store sale ${params.sale.billNo}${varietySuffix}`,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        storeVarietySaleId: params.sale.id,
        chargeType: params.chargeType,
      });
    }
  }

  private normalizeStoreType(value: string): StoreTypeValue {
    const storeTypes = [
      'short_green',
      'regection',
      'broken_rice',
      'waste',
    ] as const;

    if (!storeTypes.includes(value as StoreTypeValue)) {
      throw new BadRequestException('storeType is invalid');
    }

    return value as StoreTypeValue;
  }

  private normalizePaymentType(value?: string) {
    const paymentType = value?.trim() || 'paid';

    if (!['paid', 'partial_paid', 'remaining'].includes(paymentType)) {
      throw new BadRequestException('paymentType is invalid');
    }

    return paymentType as 'paid' | 'partial_paid' | 'remaining';
  }

  private normalizePaymentChannel(value?: string): 'cash' | 'saraf' {
    const channel = value?.trim() || 'cash';

    if (channel !== 'cash' && channel !== 'saraf') {
      throw new BadRequestException('paymentChannel must be cash or saraf');
    }

    return channel;
  }

  private resolveSalePaymentFromTotal(params: {
    totalAmount: Prisma.Decimal;
    paymentType: 'paid' | 'partial_paid' | 'remaining';
    paidAmount?: string | number | null;
  }) {
    if (params.paymentType === 'paid') {
      return {
        paymentType: params.paymentType,
        paidAmount: params.totalAmount,
        remainingAmount: new Prisma.Decimal(0),
      };
    }

    if (params.paymentType === 'remaining') {
      return {
        paymentType: params.paymentType,
        paidAmount: new Prisma.Decimal(0),
        remainingAmount: params.totalAmount,
      };
    }

    const paid = this.parseDecimalNonNegative(params.paidAmount, 'paidAmount');

    if (
      paid.lessThanOrEqualTo(0) ||
      paid.greaterThanOrEqualTo(params.totalAmount)
    ) {
      throw new BadRequestException(
        'paidAmount must be greater than 0 and less than the invoice total for partial payment',
      );
    }

    return {
      paymentType: params.paymentType,
      paidAmount: paid,
      remainingAmount: params.totalAmount.minus(paid),
    };
  }

  private parsePositiveDecimal(value: unknown, field: string) {
    const parsed = this.parseDecimal(value, field);

    if (!parsed.greaterThan(0)) {
      throw new BadRequestException(`${field} must be greater than zero`);
    }

    return parsed;
  }

  private parseDecimalNonNegative(
    value: string | number | Prisma.Decimal | null | undefined,
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

  private parseDecimal(value: unknown, field: string) {
    if (value === null || value === undefined || value === '') {
      throw new BadRequestException(`${field} is required`);
    }

    const parsed = new Prisma.Decimal(String(value));

    if (parsed.isNaN()) {
      throw new BadRequestException(`${field} must be a valid number`);
    }

    return parsed;
  }

  private parseDate(value: string, field: string) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }

    return parsed;
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid integer');
    }
  }
}
