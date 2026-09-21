import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CashService } from '../cash/cash.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { CustomerLedgerService } from '../customer/customer-ledger.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { StockSyncService } from '../stock/stock-sync.service.js';
import { VarietyService } from '../variety/variety.service.js';
import { CreatePaddyWarehouseDto } from './dto/create-paddy-warehouse.dto.js';
import { FindPaddyWarehousesQueryDto } from './dto/find-paddy-warehouses-query.dto.js';
import { PaddyDashboardDto } from './dto/paddy-dashboard.dto.js';
import { UpdatePaddyWarehouseDto } from './dto/update-paddy-warehouse.dto.js';
import {
  APP_WEIGHT_UNIT,
  normalizeWeightUnit,
  toKilograms,
} from '../../common/weight/weight-unit.util.js';
import { resolvePaddyProcessWarehouseBucket } from '../paddy-process/paddy-process.constants.js';

const paddyWarehouseSelect = {
  id: true,
  enteringPaddyId: true,
  billNo: true,
  enteringBillNo: true,
  stockType: true,
  variety: true,
  quantity: true,
  unit: true,
  ownerName: true,
  rate: true,
  totalAmount: true,
  paymentType: true,
  paidAmount: true,
  remainingAmount: true,
  paymentChannel: true,
  sarafId: true,
  sarafLedgerCurrencyId: true,
  receivedDate: true,
  notes: true,
  seasonId: true,
  seasonName: true,
  createdAt: true,
  updatedAt: true,
  season: {
    select: {
      id: true,
      name: true,
      status: true,
    },
  },
  enteringPaddy: {
    select: {
      id: true,
      customerId: true,
      billNo: true,
      paddyOwner: true,
      receivedFrom: true,
      trackedInWarehouse: true,
      trackedStockType: true,
    },
  },
  paddyProcesses: {
    select: {
      id: true,
      processedWeightKg: true,
    },
  },
  saraf: {
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
} as const;

@Injectable()
export class PaddyWarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly customerLedgerService: CustomerLedgerService,
    private readonly varietyService: VarietyService,
    private readonly currencyService: CurrencyService,
    private readonly cashService: CashService,
    private readonly sarafLedgerService: SarafLedgerService,
    private readonly stockSyncService: StockSyncService,
  ) {}

  private get companyOwnedPaddyWarehouseModel() {
    return (this.prisma as any).companyOwnedPaddyWarehouse;
  }

  private get farmerOwnedPaddyWarehouseModel() {
    return (this.prisma as any).farmerOwnedPaddyWarehouse;
  }

  private get enteringPaddyModel() {
    return (this.prisma as any).enteringPaddy;
  }

  private get paddyProcessModel() {
    return (this.prisma as any).paddyProcess;
  }

  async create(createPaddyWarehouseDto: CreatePaddyWarehouseDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const linkedEnteringPaddy = await this.resolveEnteringPaddyForCompany({
      seasonId: activeSeason.id,
      enteringPaddyId: createPaddyWarehouseDto.enteringPaddyId,
    });
    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
    );
    const receivedDate = linkedEnteringPaddy
      ? linkedEnteringPaddy.date
      : this.parseDate(createPaddyWarehouseDto.receivedDate, 'receivedDate');
    const variety = linkedEnteringPaddy
      ? linkedEnteringPaddy.variety
      : createPaddyWarehouseDto.variety?.trim();
    const ownerName = linkedEnteringPaddy
      ? linkedEnteringPaddy.paddyOwner
      : createPaddyWarehouseDto.ownerName?.trim();
    const unit = linkedEnteringPaddy
      ? APP_WEIGHT_UNIT
      : normalizeWeightUnit(createPaddyWarehouseDto.unit);
    const paymentType = this.normalizePaymentType(
      createPaddyWarehouseDto.paymentType,
    );
    const paymentChannel = this.normalizePaymentChannel(
      createPaddyWarehouseDto.paymentChannel,
    );

    if (!variety) {
      throw new BadRequestException('variety is required');
    }

    const varietyResolved = await this.varietyService.resolveActiveVarietyName(
      'PADDY',
      variety,
    );

    if (!ownerName) {
      throw new BadRequestException('ownerName is required');
    }

    const amounts = this.resolveAmounts({
      quantity: linkedEnteringPaddy
        ? new Prisma.Decimal(linkedEnteringPaddy.weight)
        : createPaddyWarehouseDto.quantity,
      rate: createPaddyWarehouseDto.rate,
      paymentType,
      paidAmount: createPaddyWarehouseDto.paidAmount,
    });

    const sarafIdTrimmed = createPaddyWarehouseDto.sarafId?.trim() ?? '';
    const currencyIdTrimmed =
      createPaddyWarehouseDto.sarafLedgerCurrencyId?.trim() ?? '';

    const sellerPayNow = this.resolveSellerPaymentToSarafAmount({
      paymentType: amounts.paymentType as 'paid' | 'partial_paid' | 'remaining',
      totalAmount: amounts.totalAmount,
      paidAmount: amounts.paidAmount,
    });

    const settlement = await this.resolveSettlementTargets({
      paymentChannel,
      sellerPayNow,
      purchaseTotalAmount: amounts.totalAmount,
      sarafIdTrimmed,
      currencyIdTrimmed,
      seasonId: activeSeason.id,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.companyOwnedPaddyWarehouse.create({
        data: {
          stockType: 'company',
          enteringPaddyId: linkedEnteringPaddy?.id ?? null,
          billNo,
          enteringBillNo: linkedEnteringPaddy?.billNo ?? null,
          variety: varietyResolved,
          quantity: amounts.quantity,
          unit,
          ownerName,
          rate: amounts.rate,
          totalAmount: amounts.totalAmount,
          paymentType: amounts.paymentType as
            | 'paid'
            | 'partial_paid'
            | 'remaining',
          paidAmount: amounts.paidAmount,
          remainingAmount: amounts.remainingAmount,
          paymentChannel,
          sarafId: settlement.sarafId,
          sarafLedgerCurrencyId: settlement.currencyId,
          receivedDate,
          notes: createPaddyWarehouseDto.notes?.trim() || null,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
        },
        select: paddyWarehouseSelect,
      });

      await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        variety: row.variety,
        companyWeightKgDelta: toKilograms(
          new Prisma.Decimal(row.quantity),
          row.unit,
        ),
        farmerWeightKgDelta: new Prisma.Decimal(0),
        entryCountDelta: 1,
      });

      if (
        paymentChannel === 'saraf' &&
        sellerPayNow &&
        settlement.sarafId &&
        settlement.currencyId
      ) {
        await this.sarafLedgerService.createLinkedCompanyPaddyPurchaseEntry(
          tx,
          {
            sarafId: settlement.sarafId,
            currencyId: settlement.currencyId,
            amount: sellerPayNow.negated(),
            occurredAt: receivedDate,
            notes: `Company paddy purchase ${row.billNo}`,
            companyOwnedPaddyWarehouseId: row.id,
          },
        );
      }

      if (paymentChannel === 'cash' && sellerPayNow && settlement.currencyId) {
        await this.cashService.createLinkedCompanyPaddyPurchaseOutEntry(tx, {
          currencyId: settlement.currencyId,
          amount: sellerPayNow,
          occurredAt: receivedDate,
          notes: `Company paddy purchase ${row.billNo}`,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
          companyOwnedPaddyWarehouseId: row.id,
        });
      }

      return row;
    });

    if (linkedEnteringPaddy) {
      await this.markEnteringPaddyAsTracked(linkedEnteringPaddy.id, 'company');
      await this.customerLedgerService.syncCompanyReceivableEntry({
        customerId: linkedEnteringPaddy.customerId,
        companyPaddyWarehouseId: created.id,
        totalAmount: amounts.totalAmount,
        receivedDate,
        notes: createPaddyWarehouseDto.notes,
        currencyId: settlement.currencyId,
      });
    }

    await this.syncSeasonPurchaseTotals(activeSeason.id);
    await this.stockSyncService.ensurePaddyVarietyStocksSynced(activeSeason.id);

    return (await this.serializePaddyWarehouses([created]))[0];
  }

  async findAll(filters: FindPaddyWarehousesQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'receivedDate',
      'variety',
      'ownerName',
      'quantity',
      'rate',
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

    const matchingPaymentTypes = (
      ['paid', 'partial_paid', 'remaining'] as const
    ).filter((value) => (query ? value.includes(query.toLowerCase()) : false));

    const where = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(query
        ? {
            OR: [
              { variety: { contains: query, mode: 'insensitive' } },
              { ownerName: { contains: query, mode: 'insensitive' } },
              { billNo: { contains: query, mode: 'insensitive' } },
              { enteringBillNo: { contains: query, mode: 'insensitive' } },
              { unit: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
              ...(matchingPaymentTypes.length > 0
                ? [{ paymentType: { in: [...matchingPaymentTypes] } }]
                : []),
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.companyOwnedPaddyWarehouseModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: paddyWarehouseSelect,
      }),
      this.companyOwnedPaddyWarehouseModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: await this.serializePaddyWarehouses(items),
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
    const paddyWarehouse =
      await this.companyOwnedPaddyWarehouseModel.findUnique({
        where: { id: this.parseId(id) },
        select: paddyWarehouseSelect,
      });

    if (!paddyWarehouse) {
      throw new NotFoundException(
        `Company owned paddy record with id "${id}" not found`,
      );
    }

    return (await this.serializePaddyWarehouses([paddyWarehouse]))[0];
  }

  async getDashboard(seasonId?: string): Promise<PaddyDashboardDto> {
    let activeSeason: Awaited<
      ReturnType<SeasonService['getActiveSeasonOrThrow']>
    > | null = null;
    try {
      activeSeason = await this.seasonService.resolveSeasonForRead(seasonId);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    if (!activeSeason) {
      return {
        season: null,
        overview: [
          { label: 'totalStockKg', value: '0.00', unit: APP_WEIGHT_UNIT },
          { label: 'movementCount', value: '0', unit: 'count' },
          { label: 'outstandingAmount', value: '0.00', unit: 'amount' },
        ],
        companyOwned: {
          totalQuantityKg: '0.00',
          totalQuantityTon: '0.00',
          entryCount: 0,
          totalAmount: '0.00',
          paidAmount: '0.00',
          remainingAmount: '0.00',
          unpaidEntryCount: 0,
          processedQuantityKg: '0.00',
          processedQuantityTon: '0.00',
          availableQuantityKg: '0.00',
          availableQuantityTon: '0.00',
          processEntryCount: 0,
        },
        farmerOwned: {
          totalQuantityKg: '0.00',
          totalQuantityTon: '0.00',
          entryCount: 0,
          totalRiceOutKg: '0.00',
          totalRiceOutTon: '0.00',
          processedQuantityKg: '0.00',
          processedQuantityTon: '0.00',
          availableQuantityKg: '0.00',
          availableQuantityTon: '0.00',
          exchangeBalanceKg: '0.00',
          exchangeBalanceTon: '0.00',
        },
        varietyBreakdown: [],
        movementSeries: [],
        recentMovements: [],
      };
    }

    const [companyEntries, farmerEntries, processEntries] = await Promise.all([
      this.companyOwnedPaddyWarehouseModel.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { receivedDate: 'desc' },
        select: {
          id: true,
          variety: true,
          quantity: true,
          unit: true,
          ownerName: true,
          totalAmount: true,
          paidAmount: true,
          remainingAmount: true,
          paymentType: true,
          paymentChannel: true,
          receivedDate: true,
          saraf: { select: { name: true } },
        },
      }),
      this.farmerOwnedPaddyWarehouseModel.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { receivedDate: 'desc' },
        select: {
          id: true,
          paddyVariety: true,
          paddyQuantity: true,
          riceVariety: true,
          riceQuantity: true,
          unit: true,
          ownerName: true,
          receivedDate: true,
        },
      }),
      this.paddyProcessModel.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          billNo: true,
          variety: true,
          date: true,
          processedWeightKg: true,
          stockSourceType: true,
          sourceCompanyPaddyWarehouseId: true,
          sourceFarmerPaddyWarehouseId: true,
          sourceCompanyPaddyWarehouse: {
            select: {
              ownerName: true,
            },
          },
          sourceFarmerPaddyWarehouse: {
            select: {
              ownerName: true,
            },
          },
        },
      }),
    ]);

    const companyTotals = companyEntries.reduce(
      (acc: any, entry: any) => {
        const quantityKg = toKilograms(
          new Prisma.Decimal(entry.quantity),
          entry.unit,
        );

        return {
          totalQuantityKg: acc.totalQuantityKg.plus(quantityKg),
          totalAmount: acc.totalAmount.plus(
            new Prisma.Decimal(entry.totalAmount),
          ),
          paidAmount: acc.paidAmount.plus(new Prisma.Decimal(entry.paidAmount)),
          remainingAmount: acc.remainingAmount.plus(
            new Prisma.Decimal(entry.remainingAmount),
          ),
          entryCount: acc.entryCount + 1,
          unpaidEntryCount:
            acc.unpaidEntryCount +
            (new Prisma.Decimal(entry.remainingAmount).greaterThan(0) ? 1 : 0),
        };
      },
      {
        totalQuantityKg: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
        paidAmount: new Prisma.Decimal(0),
        remainingAmount: new Prisma.Decimal(0),
        entryCount: 0,
        unpaidEntryCount: 0,
      },
    );

    const farmerTotals = farmerEntries.reduce(
      (acc: any, entry: any) => {
        const paddyQuantityKg = toKilograms(
          new Prisma.Decimal(entry.paddyQuantity),
          entry.unit,
        );
        const riceQuantityKg = toKilograms(
          new Prisma.Decimal(entry.riceQuantity),
          entry.unit,
        );

        return {
          totalPaddyQuantityKg: acc.totalPaddyQuantityKg.plus(paddyQuantityKg),
          totalRiceOutKg: acc.totalRiceOutKg.plus(riceQuantityKg),
          entryCount: acc.entryCount + 1,
        };
      },
      {
        totalPaddyQuantityKg: new Prisma.Decimal(0),
        totalRiceOutKg: new Prisma.Decimal(0),
        entryCount: 0,
      },
    );

    let companyProcessTotals = new Prisma.Decimal(0);
    let farmerProcessTotals = new Prisma.Decimal(0);

    for (const entry of processEntries) {
      const processedWeightKg = new Prisma.Decimal(entry.processedWeightKg);
      const warehouseBucket = resolvePaddyProcessWarehouseBucket(entry);

      if (warehouseBucket === 'store') {
        continue;
      }

      if (warehouseBucket === 'farmer') {
        farmerProcessTotals = farmerProcessTotals.plus(processedWeightKg);
      } else {
        companyProcessTotals = companyProcessTotals.plus(processedWeightKg);
      }
    }

    const movementSeriesMap = new Map<
      string,
      {
        date: string;
        companyPaddyInKg: Prisma.Decimal;
        processOutKg: Prisma.Decimal;
        farmerPaddyInKg: Prisma.Decimal;
        riceOutKg: Prisma.Decimal;
      }
    >();

    for (const entry of companyEntries) {
      const date = this.toDateKey(entry.receivedDate);
      const current = movementSeriesMap.get(date) ?? {
        date,
        companyPaddyInKg: new Prisma.Decimal(0),
        processOutKg: new Prisma.Decimal(0),
        farmerPaddyInKg: new Prisma.Decimal(0),
        riceOutKg: new Prisma.Decimal(0),
      };

      current.companyPaddyInKg = current.companyPaddyInKg.plus(
        toKilograms(new Prisma.Decimal(entry.quantity), entry.unit),
      );

      movementSeriesMap.set(date, current);
    }

    for (const entry of farmerEntries) {
      const date = this.toDateKey(entry.receivedDate);
      const current = movementSeriesMap.get(date) ?? {
        date,
        companyPaddyInKg: new Prisma.Decimal(0),
        processOutKg: new Prisma.Decimal(0),
        farmerPaddyInKg: new Prisma.Decimal(0),
        riceOutKg: new Prisma.Decimal(0),
      };

      current.farmerPaddyInKg = current.farmerPaddyInKg.plus(
        toKilograms(new Prisma.Decimal(entry.paddyQuantity), entry.unit),
      );
      current.riceOutKg = current.riceOutKg.plus(
        toKilograms(new Prisma.Decimal(entry.riceQuantity), entry.unit),
      );

      movementSeriesMap.set(date, current);
    }

    for (const entry of processEntries) {
      const warehouseBucket = resolvePaddyProcessWarehouseBucket(entry);

      if (warehouseBucket === 'store') {
        continue;
      }

      const date = this.toDateKey(entry.date);
      const current = movementSeriesMap.get(date) ?? {
        date,
        companyPaddyInKg: new Prisma.Decimal(0),
        processOutKg: new Prisma.Decimal(0),
        farmerPaddyInKg: new Prisma.Decimal(0),
        riceOutKg: new Prisma.Decimal(0),
      };

      current.processOutKg = current.processOutKg.plus(
        new Prisma.Decimal(entry.processedWeightKg),
      );

      movementSeriesMap.set(date, current);
    }

    const movementSeries = Array.from(movementSeriesMap.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((item) => ({
        date: item.date,
        companyPaddyInKg: item.companyPaddyInKg.toFixed(2),
        processOutKg: item.processOutKg.toFixed(2),
        farmerPaddyInKg: item.farmerPaddyInKg.toFixed(2),
        riceOutKg: item.riceOutKg.toFixed(2),
      }));

    const recentMovements = [
      ...companyEntries.map((entry: any) => {
        const quantityKg = toKilograms(
          new Prisma.Decimal(entry.quantity),
          entry.unit,
        );

        return {
          id: `company-${String(entry.id)}`,
          type: 'company_purchase' as const,
          ownerName: entry.ownerName,
          date: entry.receivedDate,
          paddyVariety: entry.variety,
          paddyQuantityKg: quantityKg.toFixed(2),
          paddyQuantityTon: quantityKg.dividedBy(1000).toFixed(2),
          riceVariety: null,
          riceQuantityKg: null,
          riceQuantityTon: null,
          totalAmount: new Prisma.Decimal(entry.totalAmount).toFixed(2),
          paymentType: entry.paymentType,
          paymentChannel: entry.paymentChannel,
          sarafName: entry.saraf?.name ?? null,
        };
      }),
      ...farmerEntries.map((entry: any) => {
        const paddyQuantityKg = toKilograms(
          new Prisma.Decimal(entry.paddyQuantity),
          entry.unit,
        );
        const riceQuantityKg = toKilograms(
          new Prisma.Decimal(entry.riceQuantity),
          entry.unit,
        );

        return {
          id: `farmer-${String(entry.id)}`,
          type: 'farmer_exchange' as const,
          ownerName: entry.ownerName,
          date: entry.receivedDate,
          paddyVariety: entry.paddyVariety,
          paddyQuantityKg: paddyQuantityKg.toFixed(2),
          paddyQuantityTon: paddyQuantityKg.dividedBy(1000).toFixed(2),
          riceVariety: entry.riceVariety,
          riceQuantityKg: riceQuantityKg.toFixed(2),
          riceQuantityTon: riceQuantityKg.dividedBy(1000).toFixed(2),
          totalAmount: null,
          paymentType: null,
        };
      }),
      ...processEntries.map((entry: any) => ({
        id: `process-${String(entry.id)}`,
        type: 'process' as const,
        ownerName:
          entry.sourceCompanyPaddyWarehouse?.ownerName ??
          entry.sourceFarmerPaddyWarehouse?.ownerName ??
          entry.variety,
        date: entry.date,
        paddyVariety: entry.variety,
        paddyQuantityKg: new Prisma.Decimal(entry.processedWeightKg).toFixed(2),
        paddyQuantityTon: new Prisma.Decimal(entry.processedWeightKg)
          .dividedBy(1000)
          .toFixed(2),
        riceVariety: null,
        riceQuantityKg: null,
        riceQuantityTon: null,
        totalAmount: null,
        paymentType: null,
      })),
    ]
      // Full season history — UI paginates; do not hard-limit to a few rows.
      .sort((left, right) => right.date.getTime() - left.date.getTime());

    const availableCompanyStockKg = Prisma.Decimal.max(
      companyTotals.totalQuantityKg.minus(companyProcessTotals),
      0,
    );
    const availableFarmerPaddyStockKg = Prisma.Decimal.max(
      farmerTotals.totalPaddyQuantityKg.minus(farmerProcessTotals),
      0,
    );
    const totalPaddyStockKg = availableCompanyStockKg.plus(
      availableFarmerPaddyStockKg,
    );
    const exchangeBalanceKg = farmerTotals.totalPaddyQuantityKg.minus(
      farmerTotals.totalRiceOutKg,
    );

    await this.stockSyncService.ensurePaddyVarietyStocksSynced(activeSeason.id);

    const varietyBreakdown = this.buildVarietyBreakdown(
      companyEntries,
      farmerEntries,
      processEntries,
    );

    return {
      season: activeSeason,
      overview: [
        {
          label: 'totalStockKg',
          value: totalPaddyStockKg.toFixed(2),
          unit: APP_WEIGHT_UNIT,
        },
        {
          label: 'movementCount',
          value: String(
            companyTotals.entryCount +
              farmerTotals.entryCount +
              processEntries.length,
          ),
          unit: 'count',
        },
        {
          label: 'outstandingAmount',
          value: companyTotals.remainingAmount.toFixed(2),
          unit: 'amount',
        },
      ],
      companyOwned: {
        totalQuantityKg: companyTotals.totalQuantityKg.toFixed(2),
        totalQuantityTon: companyTotals.totalQuantityKg
          .dividedBy(1000)
          .toFixed(2),
        entryCount: companyTotals.entryCount,
        totalAmount: companyTotals.totalAmount.toFixed(2),
        paidAmount: companyTotals.paidAmount.toFixed(2),
        remainingAmount: companyTotals.remainingAmount.toFixed(2),
        unpaidEntryCount: companyTotals.unpaidEntryCount,
        processedQuantityKg: companyProcessTotals.toFixed(2),
        processedQuantityTon: companyProcessTotals.dividedBy(1000).toFixed(2),
        availableQuantityKg: availableCompanyStockKg.toFixed(2),
        availableQuantityTon: availableCompanyStockKg
          .dividedBy(1000)
          .toFixed(2),
        processEntryCount: processEntries.length,
      },
      farmerOwned: {
        totalQuantityKg: farmerTotals.totalPaddyQuantityKg.toFixed(2),
        totalQuantityTon: farmerTotals.totalPaddyQuantityKg
          .dividedBy(1000)
          .toFixed(2),
        entryCount: farmerTotals.entryCount,
        totalRiceOutKg: farmerTotals.totalRiceOutKg.toFixed(2),
        totalRiceOutTon: farmerTotals.totalRiceOutKg.dividedBy(1000).toFixed(2),
        processedQuantityKg: farmerProcessTotals.toFixed(2),
        processedQuantityTon: farmerProcessTotals.dividedBy(1000).toFixed(2),
        availableQuantityKg: availableFarmerPaddyStockKg.toFixed(2),
        availableQuantityTon: availableFarmerPaddyStockKg
          .dividedBy(1000)
          .toFixed(2),
        exchangeBalanceKg: exchangeBalanceKg.toFixed(2),
        exchangeBalanceTon: exchangeBalanceKg.dividedBy(1000).toFixed(2),
      },
      varietyBreakdown,
      movementSeries,
      recentMovements,
    };
  }

  async getCashPaymentsSummary(seasonId?: string) {
    const season = await this.seasonService.resolveSeasonForRead(seasonId);
    const resolvedSeasonId = season.id;

    const transactions = await this.prisma.cashTransaction.findMany({
      where: {
        seasonId: resolvedSeasonId,
        direction: 'out',
        companyOwnedPaddyWarehouseId: { not: null },
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

  async update(id: string, updatePaddyWarehouseDto: UpdatePaddyWarehouseDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const variety = current.enteringPaddyId
      ? current.variety
      : updatePaddyWarehouseDto.variety !== undefined
        ? updatePaddyWarehouseDto.variety.trim()
        : current.variety;
    const ownerName = current.enteringPaddyId
      ? current.ownerName
      : updatePaddyWarehouseDto.ownerName !== undefined
        ? updatePaddyWarehouseDto.ownerName.trim()
        : current.ownerName;

    if (!variety) {
      throw new BadRequestException('variety is required');
    }

    const varietyResolved = await this.varietyService.resolveActiveVarietyName(
      'PADDY',
      variety,
    );

    if (!ownerName) {
      throw new BadRequestException('ownerName is required');
    }

    const receivedDate = current.enteringPaddyId
      ? current.receivedDate
      : updatePaddyWarehouseDto.receivedDate !== undefined
        ? this.parseDate(updatePaddyWarehouseDto.receivedDate, 'receivedDate')
        : current.receivedDate;

    const amounts = this.resolveAmounts({
      quantity: current.enteringPaddyId
        ? current.quantity
        : updatePaddyWarehouseDto.quantity !== undefined
          ? updatePaddyWarehouseDto.quantity
          : current.quantity,
      rate:
        updatePaddyWarehouseDto.rate !== undefined
          ? updatePaddyWarehouseDto.rate
          : current.rate,
      paymentType:
        updatePaddyWarehouseDto.paymentType !== undefined
          ? this.normalizePaymentType(updatePaddyWarehouseDto.paymentType)
          : current.paymentType,
      paidAmount:
        updatePaddyWarehouseDto.paidAmount !== undefined
          ? updatePaddyWarehouseDto.paidAmount
          : current.paidAmount,
    });

    const paymentChannel = this.normalizePaymentChannel(
      updatePaddyWarehouseDto.paymentChannel ?? current.paymentChannel,
    );

    const sarafIdFromDto = updatePaddyWarehouseDto.sarafId?.trim() ?? '';
    const currencyIdFromDto =
      updatePaddyWarehouseDto.sarafLedgerCurrencyId?.trim() ?? '';

    const sellerPayNow = this.resolveSellerPaymentToSarafAmount({
      paymentType: amounts.paymentType as 'paid' | 'partial_paid' | 'remaining',
      totalAmount: amounts.totalAmount,
      paidAmount: amounts.paidAmount,
    });

    const settlement = await this.resolveSettlementTargets({
      paymentChannel,
      sellerPayNow,
      purchaseTotalAmount: amounts.totalAmount,
      sarafIdTrimmed:
        sarafIdFromDto || (current.sarafId ? String(current.sarafId) : ''),
      currencyIdTrimmed:
        currencyIdFromDto ||
        (current.sarafLedgerCurrencyId
          ? String(current.sarafLedgerCurrencyId)
          : ''),
      seasonId: current.seasonId,
    });

    const warehouseId = this.parseId(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const previousRow = await tx.companyOwnedPaddyWarehouse.findUnique({
        where: { id: warehouseId },
        select: {
          variety: true,
          quantity: true,
          unit: true,
          seasonId: true,
          seasonName: true,
        },
      });

      if (!previousRow) {
        throw new NotFoundException(
          `Company owned paddy record with id "${id}" not found`,
        );
      }

      await tx.sarafLedgerEntry.deleteMany({
        where: { companyOwnedPaddyWarehouseId: warehouseId },
      });
      await tx.cashTransaction.deleteMany({
        where: { companyOwnedPaddyWarehouseId: warehouseId },
      });

      const row = await tx.companyOwnedPaddyWarehouse.update({
        where: { id: warehouseId },
        data: {
          variety: varietyResolved,
          billNo: current.billNo,
          quantity: amounts.quantity,
          unit: current.enteringPaddyId
            ? current.unit
            : updatePaddyWarehouseDto.unit !== undefined
              ? normalizeWeightUnit(updatePaddyWarehouseDto.unit)
              : current.unit,
          ownerName,
          rate: amounts.rate,
          totalAmount: amounts.totalAmount,
          paymentType: amounts.paymentType as
            | 'paid'
            | 'partial_paid'
            | 'remaining',
          paidAmount: amounts.paidAmount,
          remainingAmount: amounts.remainingAmount,
          paymentChannel,
          sarafId: settlement.sarafId,
          sarafLedgerCurrencyId: settlement.currencyId,
          receivedDate,
          ...(updatePaddyWarehouseDto.notes !== undefined
            ? { notes: updatePaddyWarehouseDto.notes?.trim() || null }
            : {}),
        },
        select: paddyWarehouseSelect,
      });

      await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
        seasonId: previousRow.seasonId,
        seasonName: previousRow.seasonName,
        variety: previousRow.variety,
        companyWeightKgDelta: toKilograms(
          new Prisma.Decimal(previousRow.quantity),
          previousRow.unit,
        ).negated(),
        farmerWeightKgDelta: new Prisma.Decimal(0),
        entryCountDelta: -1,
      });

      await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
        seasonId: row.seasonId,
        seasonName: row.seasonName,
        variety: row.variety,
        companyWeightKgDelta: toKilograms(
          new Prisma.Decimal(row.quantity),
          row.unit,
        ),
        farmerWeightKgDelta: new Prisma.Decimal(0),
        entryCountDelta: 1,
      });

      if (
        paymentChannel === 'saraf' &&
        sellerPayNow &&
        settlement.sarafId &&
        settlement.currencyId
      ) {
        await this.sarafLedgerService.createLinkedCompanyPaddyPurchaseEntry(
          tx,
          {
            sarafId: settlement.sarafId,
            currencyId: settlement.currencyId,
            amount: sellerPayNow.negated(),
            occurredAt: row.receivedDate,
            notes: `Company paddy purchase ${row.billNo}`,
            companyOwnedPaddyWarehouseId: row.id,
          },
        );
      }

      if (paymentChannel === 'cash' && sellerPayNow && settlement.currencyId) {
        await this.cashService.createLinkedCompanyPaddyPurchaseOutEntry(tx, {
          currencyId: settlement.currencyId,
          amount: sellerPayNow,
          occurredAt: row.receivedDate,
          notes: `Company paddy purchase ${row.billNo}`,
          seasonId: row.seasonId,
          seasonName: row.seasonName,
          companyOwnedPaddyWarehouseId: row.id,
        });
      }

      return row;
    });

    if (current.enteringPaddy?.customerId) {
      await this.customerLedgerService.syncCompanyReceivableEntry({
        customerId: BigInt(current.enteringPaddy.customerId),
        companyPaddyWarehouseId: this.parseId(id),
        totalAmount: new Prisma.Decimal(updated.totalAmount),
        receivedDate: updated.receivedDate,
        notes: updated.notes,
        currencyId: settlement.currencyId,
      });
    }

    await this.syncSeasonPurchaseTotals(current.seasonId);
    await this.stockSyncService.ensurePaddyVarietyStocksSynced(
      current.seasonId,
    );

    return (await this.serializePaddyWarehouses([updated]))[0];
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const deleted = await this.prisma.$transaction(async (tx) => {
      const row = await tx.companyOwnedPaddyWarehouse.delete({
        where: { id: this.parseId(id) },
        select: paddyWarehouseSelect,
      });

      await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
        seasonId: row.seasonId,
        seasonName: row.seasonName,
        variety: row.variety,
        companyWeightKgDelta: toKilograms(
          new Prisma.Decimal(row.quantity),
          row.unit,
        ).negated(),
        farmerWeightKgDelta: new Prisma.Decimal(0),
        entryCountDelta: -1,
      });

      return row;
    });

    if (current.enteringPaddyId) {
      await this.untrackEnteringPaddy(current.enteringPaddyId);
      await this.customerLedgerService.removeCompanyReceivableEntry(id);
    }

    await this.syncSeasonPurchaseTotals(current.seasonId);
    await this.stockSyncService.ensurePaddyVarietyStocksSynced(
      current.seasonId,
    );

    return (await this.serializePaddyWarehouses([deleted]))[0];
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

  private async resolveSettlementTargets(params: {
    paymentChannel: 'cash' | 'saraf';
    sellerPayNow: Prisma.Decimal | null;
    purchaseTotalAmount: Prisma.Decimal;
    sarafIdTrimmed: string;
    currencyIdTrimmed: string;
    seasonId: string;
  }): Promise<{
    sarafId: bigint | null;
    currencyId: string | null;
  }> {
    if (params.paymentChannel === 'cash') {
      if (params.sarafIdTrimmed) {
        throw new BadRequestException(
          'sarafId must be omitted when paying the seller in cash',
        );
      }

      const tracksPurchaseBalance = params.purchaseTotalAmount.greaterThan(0);
      const paysNow =
        params.sellerPayNow != null && params.sellerPayNow.greaterThan(0);

      if (!tracksPurchaseBalance && !paysNow) {
        return { sarafId: null, currencyId: null };
      }

      if (!params.currencyIdTrimmed) {
        throw new BadRequestException(
          'sarafLedgerCurrencyId is required for this purchase',
        );
      }

      const currencyId = await this.currencyService.requireActiveCurrencyId(
        params.currencyIdTrimmed,
      );

      return { sarafId: null, currencyId };
    }

    if (!params.sellerPayNow || params.sellerPayNow.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'Pay from Saraf requires an amount paid now (payment type paid or partial_paid with paid amount)',
      );
    }

    if (!params.sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId is required when paying the seller from Saraf',
      );
    }

    if (!params.currencyIdTrimmed) {
      throw new BadRequestException(
        'sarafLedgerCurrencyId is required when paying the seller from Saraf',
      );
    }

    const sarafId = this.parseId(params.sarafIdTrimmed);
    const currencyId = await this.currencyService.requireActiveCurrencyId(
      params.currencyIdTrimmed,
    );

    const saraf = await this.prisma.saraf.findUnique({
      where: { id: sarafId },
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
        'Selected Saraf must belong to the record season',
      );
    }

    if (!saraf.ledger) {
      throw new BadRequestException(
        'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
      );
    }

    return { sarafId, currencyId };
  }

  private resolveSellerPaymentToSarafAmount(params: {
    paymentType: string;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
  }): Prisma.Decimal | null {
    if (params.paymentType === 'remaining') {
      return null;
    }

    if (params.paymentType === 'paid') {
      return params.totalAmount;
    }

    return params.paidAmount;
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

  private parseDecimal(
    value: string | number | Prisma.Decimal,
    fieldName: string,
  ) {
    try {
      const decimal = new Prisma.Decimal(value as Prisma.Decimal.Value);

      if (decimal.lessThan(0)) {
        throw new BadRequestException(`${fieldName} cannot be negative`);
      }

      return decimal;
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
  }

  private resolveAmounts({
    quantity,
    rate,
    paymentType,
    paidAmount,
  }: {
    quantity: string | number | Prisma.Decimal;
    rate: string | number | Prisma.Decimal;
    paymentType: string;
    paidAmount?: string | number | Prisma.Decimal | null;
  }) {
    const normalizedQuantity = this.parseDecimal(quantity, 'quantity');
    const normalizedRate = this.parseDecimal(rate, 'rate');
    const totalAmount = normalizedQuantity.times(normalizedRate);
    const normalizedPaidAmount = this.resolvePaidAmountByPaymentType({
      paymentType,
      paidAmount,
      totalAmount,
    });
    const remainingAmount = totalAmount.minus(normalizedPaidAmount);

    return {
      quantity: normalizedQuantity,
      rate: normalizedRate,
      totalAmount,
      paymentType,
      paidAmount: normalizedPaidAmount,
      remainingAmount,
    };
  }

  private async generateBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before company-owned paddy can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-CPW-`;
    const lastEntry = await this.companyOwnedPaddyWarehouseModel.findFirst({
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

  private toDateKey(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private normalizePaymentType(paymentType?: string) {
    const normalizedPaymentType = paymentType?.trim().toLowerCase();

    if (!normalizedPaymentType) {
      throw new BadRequestException('paymentType is required');
    }

    if (
      !['paid', 'partial_paid', 'remaining'].includes(normalizedPaymentType)
    ) {
      throw new BadRequestException(
        'paymentType must be one of paid, partial_paid, or remaining',
      );
    }

    return normalizedPaymentType;
  }

  private resolvePaidAmountByPaymentType({
    paymentType,
    paidAmount,
    totalAmount,
  }: {
    paymentType: string;
    paidAmount?: string | number | Prisma.Decimal | null;
    totalAmount: Prisma.Decimal;
  }) {
    if (paymentType === 'paid') {
      return totalAmount;
    }

    if (paymentType === 'remaining') {
      return new Prisma.Decimal(0);
    }

    const normalizedPaidAmount = this.parseDecimal(
      paidAmount ?? 0,
      'paidAmount',
    );

    if (
      normalizedPaidAmount.lessThanOrEqualTo(0) ||
      normalizedPaidAmount.greaterThanOrEqualTo(totalAmount)
    ) {
      throw new BadRequestException(
        'paidAmount must be greater than 0 and less than totalAmount for partial_paid',
      );
    }

    return normalizedPaidAmount;
  }

  private async serializePaddyWarehouses(paddyWarehouses: any[]) {
    const sourceIds = paddyWarehouses.map((item) => item.id as bigint);
    const lifecycleRows =
      sourceIds.length > 0
        ? await this.prisma.$queryRaw<
            Array<{
              sourceId: string;
              totalCount: string;
              completedCount: string;
            }>
          >(Prisma.sql`
            SELECT
              "source_company_paddy_warehouse_id"::text AS "sourceId",
              COUNT(*)::text AS "totalCount",
              COUNT(*) FILTER (WHERE "status" = 'process_completed')::text AS "completedCount"
            FROM "paddy_processes"
            WHERE "source_company_paddy_warehouse_id" IN (${Prisma.join(sourceIds)})
            GROUP BY "source_company_paddy_warehouse_id"
          `)
        : [];
    const lifecycleMap = new Map(
      lifecycleRows.map((row) => [row.sourceId, row]),
    );

    return paddyWarehouses.map((paddyWarehouse) =>
      this.serializePaddyWarehouse(
        paddyWarehouse,
        lifecycleMap.get(String(paddyWarehouse.id)),
      ),
    );
  }

  private serializePaddyWarehouse(
    paddyWarehouse: any,
    lifecycle?: { totalCount: string; completedCount: string },
  ) {
    const { saraf, sarafLedgerCurrency, enteringPaddy, ...rest } =
      paddyWarehouse;
    const totalQuantityKg = toKilograms(
      new Prisma.Decimal(paddyWarehouse.quantity),
      paddyWarehouse.unit,
    );
    const processedQuantityKg = (paddyWarehouse.paddyProcesses ?? []).reduce(
      (sum: Prisma.Decimal, item: any) =>
        sum.plus(new Prisma.Decimal(item.processedWeightKg)),
      new Prisma.Decimal(0),
    );
    const availableForProcessKg = Prisma.Decimal.max(
      totalQuantityKg.minus(processedQuantityKg),
      0,
    );
    const totalProcesses = Number(lifecycle?.totalCount ?? 0);
    const completedProcesses = Number(lifecycle?.completedCount ?? 0);
    const processingStatus = processedQuantityKg.lessThanOrEqualTo(0)
      ? 'not_started'
      : availableForProcessKg.greaterThan(0)
        ? 'under_process'
        : totalProcesses > 0 && completedProcesses === totalProcesses
          ? 'process_completed'
          : 'under_process';

    return {
      ...rest,
      id: String(paddyWarehouse.id),
      paymentChannel: paddyWarehouse.paymentChannel ?? 'cash',
      sarafId:
        paddyWarehouse.sarafId !== null && paddyWarehouse.sarafId !== undefined
          ? String(paddyWarehouse.sarafId)
          : null,
      sarafLedgerCurrencyId: paddyWarehouse.sarafLedgerCurrencyId ?? null,
      saraf: saraf
        ? {
            id: String(saraf.id),
            name: saraf.name,
          }
        : null,
      sarafLedgerCurrency: sarafLedgerCurrency
        ? {
            id: sarafLedgerCurrency.id,
            code: sarafLedgerCurrency.code,
            name: sarafLedgerCurrency.name,
          }
        : null,
      processingStatus,
      processedQuantityKg: processedQuantityKg.toFixed(2),
      availableForProcessKg: availableForProcessKg.toFixed(2),
      enteringPaddyId:
        paddyWarehouse.enteringPaddyId !== null &&
        paddyWarehouse.enteringPaddyId !== undefined
          ? String(paddyWarehouse.enteringPaddyId)
          : null,
      enteringPaddy: enteringPaddy
        ? {
            ...enteringPaddy,
            id: String(enteringPaddy.id),
            customerId:
              enteringPaddy.customerId !== null &&
              enteringPaddy.customerId !== undefined
                ? String(enteringPaddy.customerId)
                : null,
          }
        : null,
      paddyProcesses: undefined,
    };
  }

  private async resolveEnteringPaddyForCompany({
    seasonId,
    enteringPaddyId,
  }: {
    seasonId: string;
    enteringPaddyId?: string;
  }) {
    if (!enteringPaddyId) {
      return null;
    }

    const entry = await this.enteringPaddyModel.findUnique({
      where: { id: this.parseId(enteringPaddyId) },
      select: {
        id: true,
        customerId: true,
        seasonId: true,
        paddyOwner: true,
        billNo: true,
        variety: true,
        date: true,
        weight: true,
        totalWeightKg: true,
        receivedFrom: true,
        trackedInWarehouse: true,
      },
    });

    if (!entry) {
      throw new NotFoundException(
        `Entering paddy record with id "${enteringPaddyId}" not found`,
      );
    }

    if (entry.seasonId !== seasonId) {
      throw new BadRequestException(
        'Selected entering paddy must belong to the current active season',
      );
    }

    if (entry.receivedFrom !== 'seller') {
      throw new BadRequestException(
        'Company-owned paddy can only be created from seller entering paddy',
      );
    }

    if (entry.trackedInWarehouse) {
      throw new BadRequestException(
        'This entering paddy record is already tracked in warehouse',
      );
    }

    return entry;
  }

  private async markEnteringPaddyAsTracked(
    enteringPaddyId: bigint,
    stockType: 'company' | 'farmer',
  ) {
    await this.enteringPaddyModel.update({
      where: { id: enteringPaddyId },
      data: {
        trackedInWarehouse: true,
        trackedStockType: stockType,
        trackedAt: new Date(),
      },
    });
  }

  private async untrackEnteringPaddy(enteringPaddyId: string) {
    await this.enteringPaddyModel.update({
      where: { id: this.parseId(enteringPaddyId) },
      data: {
        trackedInWarehouse: false,
        trackedStockType: null,
        trackedAt: null,
      },
    });
  }

  private buildVarietyBreakdown(
    companyEntries: Array<{
      variety: string;
      quantity: Prisma.Decimal;
      unit: string;
    }>,
    farmerEntries: Array<{
      paddyVariety: string;
      paddyQuantity: Prisma.Decimal;
      riceVariety: string;
      riceQuantity: Prisma.Decimal;
      unit: string;
    }>,
    processEntries: Array<{
      variety: string;
      processedWeightKg: Prisma.Decimal;
      stockSourceType?: string | null;
      sourceCompanyPaddyWarehouseId: bigint | null;
      sourceFarmerPaddyWarehouseId: bigint | null;
    }>,
  ) {
    type VarietyTotals = {
      companyWeightKg: Prisma.Decimal;
      farmerWeightKg: Prisma.Decimal;
      farmerRiceOutKg: Prisma.Decimal;
      processedQuantityKg: Prisma.Decimal;
      companyProcessedKg: Prisma.Decimal;
      farmerProcessedKg: Prisma.Decimal;
      entryCount: number;
    };

    const emptyTotals = (): VarietyTotals => ({
      companyWeightKg: new Prisma.Decimal(0),
      farmerWeightKg: new Prisma.Decimal(0),
      farmerRiceOutKg: new Prisma.Decimal(0),
      processedQuantityKg: new Prisma.Decimal(0),
      companyProcessedKg: new Prisma.Decimal(0),
      farmerProcessedKg: new Prisma.Decimal(0),
      entryCount: 0,
    });

    const varietyMap = new Map<string, VarietyTotals>();

    const touch = (variety: string) => {
      const key = variety.trim();

      if (!key) {
        return null;
      }

      if (!varietyMap.has(key)) {
        varietyMap.set(key, emptyTotals());
      }

      return varietyMap.get(key)!;
    };

    for (const entry of companyEntries) {
      const bucket = touch(entry.variety);

      if (!bucket) {
        continue;
      }

      bucket.companyWeightKg = bucket.companyWeightKg.plus(
        toKilograms(new Prisma.Decimal(entry.quantity), entry.unit),
      );
      bucket.entryCount += 1;
    }

    for (const entry of farmerEntries) {
      const paddyBucket = touch(entry.paddyVariety);

      if (paddyBucket) {
        paddyBucket.farmerWeightKg = paddyBucket.farmerWeightKg.plus(
          toKilograms(new Prisma.Decimal(entry.paddyQuantity), entry.unit),
        );
        paddyBucket.entryCount += 1;
      }

      const riceBucket = touch(entry.riceVariety);

      if (riceBucket) {
        riceBucket.farmerRiceOutKg = riceBucket.farmerRiceOutKg.plus(
          toKilograms(new Prisma.Decimal(entry.riceQuantity), entry.unit),
        );
      }
    }

    for (const process of processEntries) {
      const bucket = touch(process.variety);

      if (!bucket) {
        continue;
      }

      const processedWeightKg = new Prisma.Decimal(process.processedWeightKg);
      const warehouseBucket = resolvePaddyProcessWarehouseBucket(process);

      if (warehouseBucket === 'store') {
        continue;
      }

      bucket.processedQuantityKg =
        bucket.processedQuantityKg.plus(processedWeightKg);

      if (warehouseBucket === 'farmer') {
        bucket.farmerProcessedKg =
          bucket.farmerProcessedKg.plus(processedWeightKg);
      } else {
        bucket.companyProcessedKg =
          bucket.companyProcessedKg.plus(processedWeightKg);
      }
    }

    return Array.from(varietyMap.entries())
      .map(([variety, totals]) => {
        const companyAvailableKg = Prisma.Decimal.max(
          totals.companyWeightKg.minus(totals.companyProcessedKg),
          0,
        );
        const farmerPaddyAvailableKg = Prisma.Decimal.max(
          totals.farmerWeightKg.minus(totals.farmerProcessedKg),
          0,
        );
        const farmerExchangeBalanceKg = Prisma.Decimal.max(
          totals.farmerWeightKg.minus(totals.farmerRiceOutKg),
          0,
        );
        const currentStockKg = companyAvailableKg.plus(farmerPaddyAvailableKg);
        const totalWeightKg = totals.companyWeightKg.plus(
          totals.farmerWeightKg,
        );

        return {
          variety,
          companyWeightKg: totals.companyWeightKg.toFixed(2),
          processedQuantityKg: totals.processedQuantityKg.toFixed(2),
          companyAvailableKg: companyAvailableKg.toFixed(2),
          farmerWeightKg: totals.farmerWeightKg.toFixed(2),
          farmerRiceOutKg: totals.farmerRiceOutKg.toFixed(2),
          farmerExchangeBalanceKg: farmerExchangeBalanceKg.toFixed(2),
          currentStockKg: currentStockKg.toFixed(2),
          totalWeightKg: totalWeightKg.toFixed(2),
          totalWeightTon: totalWeightKg.dividedBy(1000).toFixed(2),
          entryCount: totals.entryCount,
        };
      })
      .filter(
        (row) =>
          Number(row.companyWeightKg) > 0 ||
          Number(row.farmerWeightKg) > 0 ||
          Number(row.processedQuantityKg) > 0 ||
          Number(row.farmerRiceOutKg) > 0,
      )
      .sort(
        (left, right) =>
          Number(right.currentStockKg) - Number(left.currentStockKg),
      );
  }

  private async syncSeasonPurchaseTotals(seasonId: string) {
    await this.prisma.$transaction(async (tx) => {
      const [paddyAggregate, riceAggregate] = await Promise.all([
        tx.companyOwnedPaddyWarehouse.aggregate({
          where: { seasonId },
          _sum: {
            totalAmount: true,
          },
        }),
        tx.riceWarehouse.aggregate({
          where: { seasonId },
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

      const totalPurchases = new Prisma.Decimal(
        paddyAggregate._sum.totalAmount ?? 0,
      ).plus(new Prisma.Decimal(riceAggregate._sum.totalAmount ?? 0));

      await tx.season.update({
        where: { id: seasonId },
        data: {
          totalPurchases,
        },
      });
    });
  }
}
