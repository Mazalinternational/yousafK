import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  APP_WEIGHT_UNIT,
  normalizeWeightUnit,
  resolveFromStockWeightKg,
  toKilograms,
} from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CashService } from '../cash/cash.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { CustomerLedgerService } from '../customer/customer-ledger.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { StockSyncService } from '../stock/stock-sync.service.js';
import { VarietyService } from '../variety/variety.service.js';
import { CreateRiceWarehouseDto } from './dto/create-rice-warehouse.dto.js';
import { FindRiceWarehousesQueryDto } from './dto/find-rice-warehouses-query.dto.js';
import { RiceDashboardDto } from './dto/rice-dashboard.dto.js';
import { UpdateRiceWarehouseDto } from './dto/update-rice-warehouse.dto.js';

const riceWarehouseSelect = {
  id: true,
  billNo: true,
  stockType: true,
  customerId: true,
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
export class RiceWarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly customerLedgerService: CustomerLedgerService,
    private readonly varietyService: VarietyService,
    private readonly currencyService: CurrencyService,
    private readonly sarafLedgerService: SarafLedgerService,
    private readonly cashService: CashService,
    private readonly stockSyncService: StockSyncService,
  ) {}

  private get riceWarehouseModel() {
    return (this.prisma as any).riceWarehouse;
  }

  private get riceSaleModel() {
    return (this.prisma as any).riceSale;
  }

  private get riceCharityModel() {
    return (this.prisma as any).riceCharity;
  }

  private get processRiceEntryModel() {
    return (this.prisma as any).processRiceEntry;
  }

  async create(createRiceWarehouseDto: CreateRiceWarehouseDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const customer = await this.requireSellerCustomer(
      createRiceWarehouseDto.customerId,
      activeSeason.id,
    );
    const receivedDate = this.parseDate(
      createRiceWarehouseDto.receivedDate,
      'receivedDate',
    );
    const variety = createRiceWarehouseDto.variety?.trim();
    const ownerName = customer.name;
    const unit = normalizeWeightUnit(createRiceWarehouseDto.unit);
    const paymentType = this.normalizePaymentType(
      createRiceWarehouseDto.paymentType,
    );

    if (!variety) {
      throw new BadRequestException('variety is required');
    }

    const varietyResolved = await this.varietyService.resolveActiveVarietyName(
      'RICE',
      variety,
    );

    if (!ownerName) {
      throw new BadRequestException('ownerName is required');
    }

    const billNo = await this.generateRiceWarehouseBillNo(
      activeSeason.id,
      activeSeason.code,
    );

    const amounts = this.resolveAmounts({
      quantity: createRiceWarehouseDto.quantity,
      rate: createRiceWarehouseDto.rate,
      paymentType,
      paidAmount: createRiceWarehouseDto.paidAmount,
    });

    const paymentChannel = this.normalizePaymentChannel(
      createRiceWarehouseDto.paymentChannel,
    );
    const sarafIdTrimmed = createRiceWarehouseDto.sarafId?.trim() ?? '';
    const currencyIdTrimmed =
      createRiceWarehouseDto.sarafLedgerCurrencyId?.trim() ?? '';
    const sellerPayNow = this.resolveSellerPaymentNow({
      paymentType: amounts.paymentType,
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
      const row = await tx.riceWarehouse.create({
        data: {
          billNo,
          stockType: 'company',
          customerId: customer.id,
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
          notes: createRiceWarehouseDto.notes?.trim() || null,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
        },
        select: riceWarehouseSelect,
      });

      if (
        paymentChannel === 'saraf' &&
        sellerPayNow &&
        settlement.sarafId &&
        settlement.currencyId
      ) {
        await this.sarafLedgerService.createLinkedRiceWarehousePurchaseEntry(
          tx,
          {
            sarafId: settlement.sarafId,
            currencyId: settlement.currencyId,
            amount: sellerPayNow.negated(),
            occurredAt: receivedDate,
            notes: `Rice warehouse purchase ${row.billNo}`,
            riceWarehouseId: row.id,
          },
        );
      }

      if (paymentChannel === 'cash' && sellerPayNow && settlement.currencyId) {
        await this.cashService.createLinkedRiceWarehousePurchaseOutEntry(tx, {
          currencyId: settlement.currencyId,
          amount: sellerPayNow,
          occurredAt: receivedDate,
          notes: `Rice warehouse purchase ${row.billNo}`,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
          riceWarehouseId: row.id,
        });
      }

      return row;
    });

    await this.syncRiceWarehouseLedger(created);
    await this.syncSeasonPurchaseTotals(activeSeason.id);

    return this.serializeRiceWarehouse(created);
  }

  async findAll(filters: FindRiceWarehousesQueryDto = {}) {
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
      'seasonName',
      'billNo',
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
              { variety: { contains: query, mode: 'insensitive' } },
              { ownerName: { contains: query, mode: 'insensitive' } },
              { customer: { name: { contains: query, mode: 'insensitive' } } },
              { unit: { contains: query, mode: 'insensitive' } },
              { paymentType: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.riceWarehouseModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: riceWarehouseSelect,
      }),
      this.riceWarehouseModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item: any) => this.serializeRiceWarehouse(item)),
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
    const riceWarehouse = await this.riceWarehouseModel.findUnique({
      where: { id: this.parseId(id) },
      select: riceWarehouseSelect,
    });

    if (!riceWarehouse) {
      throw new NotFoundException(
        `Rice warehouse record with id "${id}" not found`,
      );
    }

    return this.serializeRiceWarehouse(riceWarehouse);
  }

  async getDashboard(seasonId?: string): Promise<RiceDashboardDto> {
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
          { label: 'currentRiceStockKg', value: '0.00', unit: APP_WEIGHT_UNIT },
          { label: 'riceMovementCount', value: '0', unit: 'count' },
          { label: 'outstandingAmount', value: '0.00', unit: 'amount' },
        ],
        summary: {
          totalInKg: '0.00',
          totalInTon: '0.00',
          totalOutKg: '0.00',
          totalOutTon: '0.00',
          currentStockKg: '0.00',
          currentStockTon: '0.00',
          entryCount: 0,
          totalAmount: '0.00',
          paidAmount: '0.00',
          remainingAmount: '0.00',
          unpaidEntryCount: 0,
          buyerSalesTotalAmount: '0.00',
          buyerSalesPaidAmount: '0.00',
          buyerSalesRemainingAmount: '0.00',
          combinedRemainingAmount: '0.00',
          charityOutKg: '0.00',
          totalFarmerRiceObligationKg: '0.00',
          totalFarmerRiceReturnedKg: '0.00',
          totalFarmerRiceToIssueKg: '0.00',
        },
        movementSeries: [],
        varietyBreakdown: [],
        recentMovements: [],
      };
    }

    const [
      riceEntries,
      processRiceEntries,
      riceSales,
      riceCharities,
      farmerReturnIssues,
      farmerRiceSummary,
      activeRiceVarieties,
    ] = await Promise.all([
      this.riceWarehouseModel.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { receivedDate: 'desc' },
        select: {
          id: true,
          billNo: true,
          variety: true,
          quantity: true,
          unit: true,
          ownerName: true,
          totalAmount: true,
          paidAmount: true,
          remainingAmount: true,
          paymentType: true,
          receivedDate: true,
        },
      }),
      this.processRiceEntryModel.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          billNo: true,
          processedBillNo: true,
          variety: true,
          weight: true,
          unit: true,
          processedWeightKg: true,
          date: true,
        },
      }),
      this.riceSaleModel.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { saleDate: 'desc' },
        select: {
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
          riceBagsAmount: true,
          paidAmount: true,
          remainingAmount: true,
          paymentType: true,
          paidInCash: true,
          paymentChannel: true,
          saraf: { select: { name: true } },
          buyerCustomer: {
            select: { name: true },
          },
        },
      }),
      this.riceCharityModel.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { charityDate: 'desc' },
        select: {
          id: true,
          billNo: true,
          recipientName: true,
          riceVariety: true,
          quantity: true,
          unit: true,
          charityDate: true,
        },
      }),
      this.customerLedgerService.listFulfilledFarmerRiceReturnsForSeason(
        activeSeason.id,
      ),
      this.customerLedgerService.getFarmerRiceObligationByVarietyForSeason(
        activeSeason.id,
      ),
      this.varietyService.listActiveVarietyNames('RICE'),
    ]);

    const processRiceTotals = processRiceEntries.reduce(
      (acc: any, entry: any) => {
        const quantityKg = new Prisma.Decimal(entry.processedWeightKg);

        return {
          totalInKg: acc.totalInKg.plus(quantityKg),
          entryCount: acc.entryCount + 1,
        };
      },
      {
        totalInKg: new Prisma.Decimal(0),
        entryCount: 0,
      },
    );

    const riceTotals = riceEntries.reduce(
      (acc: any, entry: any) => {
        const quantityKg = toKilograms(
          new Prisma.Decimal(entry.quantity),
          entry.unit,
        );

        return {
          totalInKg: acc.totalInKg.plus(quantityKg),
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
        totalInKg: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(0),
        paidAmount: new Prisma.Decimal(0),
        remainingAmount: new Prisma.Decimal(0),
        entryCount: 0,
        unpaidEntryCount: 0,
      },
    );

    const riceOutTotalsSales = riceSales.reduce(
      (sum: Prisma.Decimal, entry: any) =>
        sum.plus(toKilograms(new Prisma.Decimal(entry.quantity), entry.unit)),
      new Prisma.Decimal(0),
    );

    const riceOutTotalsCharity = riceCharities.reduce(
      (sum: Prisma.Decimal, entry: any) =>
        sum.plus(toKilograms(new Prisma.Decimal(entry.quantity), entry.unit)),
      new Prisma.Decimal(0),
    );

    const riceOutTotalsFarmerReturns = farmerReturnIssues.reduce(
      (sum: Prisma.Decimal, entry: { quantityKg: Prisma.Decimal }) =>
        sum.plus(entry.quantityKg),
      new Prisma.Decimal(0),
    );

    const buyerSaleMoneyTotals =
      await this.computeBuyerSaleMoneyTotals(riceSales);

    const riceOutTotals = riceOutTotalsSales
      .plus(riceOutTotalsCharity)
      .plus(riceOutTotalsFarmerReturns);

    const combinedRiceInKg = riceTotals.totalInKg.plus(
      processRiceTotals.totalInKg,
    );

    const currentStockKg = combinedRiceInKg.minus(riceOutTotals);

    const movementSeriesMap = new Map<
      string,
      { date: string; riceInKg: Prisma.Decimal; riceOutKg: Prisma.Decimal }
    >();

    for (const entry of riceEntries) {
      const date = this.toDateKey(entry.receivedDate);
      const current = movementSeriesMap.get(date) ?? {
        date,
        riceInKg: new Prisma.Decimal(0),
        riceOutKg: new Prisma.Decimal(0),
      };

      current.riceInKg = current.riceInKg.plus(
        toKilograms(new Prisma.Decimal(entry.quantity), entry.unit),
      );

      movementSeriesMap.set(date, current);
    }

    for (const entry of processRiceEntries) {
      const date = this.toDateKey(entry.date);
      const current = movementSeriesMap.get(date) ?? {
        date,
        riceInKg: new Prisma.Decimal(0),
        riceOutKg: new Prisma.Decimal(0),
      };

      current.riceInKg = current.riceInKg.plus(
        new Prisma.Decimal(entry.processedWeightKg),
      );

      movementSeriesMap.set(date, current);
    }

    for (const entry of riceSales) {
      const date = this.toDateKey(entry.saleDate);
      const current = movementSeriesMap.get(date) ?? {
        date,
        riceInKg: new Prisma.Decimal(0),
        riceOutKg: new Prisma.Decimal(0),
      };

      current.riceOutKg = current.riceOutKg.plus(
        toKilograms(new Prisma.Decimal(entry.quantity), entry.unit),
      );

      movementSeriesMap.set(date, current);
    }

    for (const entry of riceCharities) {
      const date = this.toDateKey(entry.charityDate);
      const current = movementSeriesMap.get(date) ?? {
        date,
        riceInKg: new Prisma.Decimal(0),
        riceOutKg: new Prisma.Decimal(0),
      };

      current.riceOutKg = current.riceOutKg.plus(
        toKilograms(new Prisma.Decimal(entry.quantity), entry.unit),
      );

      movementSeriesMap.set(date, current);
    }

    for (const entry of farmerReturnIssues) {
      const date = this.toDateKey(entry.fulfilledAt);
      const current = movementSeriesMap.get(date) ?? {
        date,
        riceInKg: new Prisma.Decimal(0),
        riceOutKg: new Prisma.Decimal(0),
      };

      current.riceOutKg = current.riceOutKg.plus(entry.quantityKg);

      movementSeriesMap.set(date, current);
    }

    const movementSeries = Array.from(movementSeriesMap.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((item) => ({
        date: item.date,
        riceInKg: item.riceInKg.toFixed(2),
        riceOutKg: item.riceOutKg.toFixed(2),
        netStockKg: item.riceInKg.minus(item.riceOutKg).toFixed(2),
      }));

    type VarietyTotals = {
      warehouseInKg: Prisma.Decimal;
      processInKg: Prisma.Decimal;
      totalOutKg: Prisma.Decimal;
      physicalOutKg: Prisma.Decimal;
      warehouseEntryCount: number;
      processEntryCount: number;
    };

    const emptyVarietyTotals = (): VarietyTotals => ({
      warehouseInKg: new Prisma.Decimal(0),
      processInKg: new Prisma.Decimal(0),
      totalOutKg: new Prisma.Decimal(0),
      physicalOutKg: new Prisma.Decimal(0),
      warehouseEntryCount: 0,
      processEntryCount: 0,
    });

    const varietyMap = new Map<string, VarietyTotals>();

    const touchVariety = (variety: string) => {
      const key = variety.trim();
      if (!varietyMap.has(key)) {
        varietyMap.set(key, emptyVarietyTotals());
      }
      return varietyMap.get(key)!;
    };

    for (const entry of riceEntries) {
      const current = touchVariety(entry.variety);
      current.warehouseInKg = current.warehouseInKg.plus(
        toKilograms(new Prisma.Decimal(entry.quantity), entry.unit),
      );
      current.warehouseEntryCount += 1;
    }

    for (const entry of processRiceEntries) {
      const current = touchVariety(entry.variety);
      current.processInKg = current.processInKg.plus(
        new Prisma.Decimal(entry.processedWeightKg),
      );
      current.processEntryCount += 1;
    }

    for (const entry of riceSales) {
      const current = touchVariety(entry.riceVariety);
      const billedKg = toKilograms(
        new Prisma.Decimal(entry.quantity),
        entry.unit,
      );
      const fromStockKg = resolveFromStockWeightKg({
        fromStockWeightKg: entry.fromStockWeightKg,
        fallbackQuantity: entry.quantity,
        fallbackUnit: entry.unit,
      });
      current.totalOutKg = current.totalOutKg.plus(billedKg);
      current.physicalOutKg = current.physicalOutKg.plus(fromStockKg);
    }

    for (const entry of riceCharities) {
      const current = touchVariety(entry.riceVariety);
      const quantityKg = toKilograms(
        new Prisma.Decimal(entry.quantity),
        entry.unit,
      );
      current.totalOutKg = current.totalOutKg.plus(quantityKg);
      current.physicalOutKg = current.physicalOutKg.plus(quantityKg);
    }

    for (const entry of farmerReturnIssues) {
      const current = touchVariety(entry.variety);
      current.totalOutKg = current.totalOutKg.plus(entry.quantityKg);
      current.physicalOutKg = current.physicalOutKg.plus(entry.quantityKg);
    }

    const riceVarietyStockRows =
      await this.stockSyncService.getRiceVarietyStockRows(activeSeason.id);

    for (const row of riceVarietyStockRows) {
      touchVariety(row.variety);
    }

    const farmerRiceByVariety = new Map(
      farmerRiceSummary.byVariety.map((row) => [row.variety, row]),
    );

    for (const row of farmerRiceSummary.byVariety) {
      touchVariety(row.variety);
    }

    for (const variety of activeRiceVarieties) {
      touchVariety(variety);
    }

    const varietyBreakdown = Array.from(varietyMap.entries())
      .map(([variety, totals]) => {
        const totalInKg = totals.warehouseInKg.plus(totals.processInKg);
        // Book remaining (same figure as the dashboard tile) — billed sales,
        // charity, and fulfilled farmer returns. Can be negative after oversell.
        const currentStockKg = totalInKg.minus(totals.totalOutKg);
        // Physical remaining for new sales: never above book, never below zero.
        // Do not use sum(fromStockWeightKg) here — legacy rows default that
        // column to 0 and would leave sellable stuck at total-in.
        const sellableStockKg = Prisma.Decimal.max(currentStockKg, 0);
        const farmerRice = farmerRiceByVariety.get(variety);

        return {
          variety,
          stockFromProcessKg: totals.processInKg.toFixed(2),
          warehouseInKg: totals.warehouseInKg.toFixed(2),
          totalInKg: totalInKg.toFixed(2),
          totalOutKg: totals.totalOutKg.toFixed(2),
          currentStockKg: currentStockKg.toFixed(2),
          currentStockTon: currentStockKg.dividedBy(1000).toFixed(2),
          sellableStockKg: sellableStockKg.toFixed(2),
          entryCount: totals.warehouseEntryCount + totals.processEntryCount,
          farmerRiceObligationKg: (
            farmerRice?.obligationKg ?? new Prisma.Decimal(0)
          ).toFixed(2),
          farmerRiceReturnedKg: (
            farmerRice?.returnedKg ?? new Prisma.Decimal(0)
          ).toFixed(2),
          farmerRiceToIssueKg: (
            farmerRice?.toIssueKg ?? new Prisma.Decimal(0)
          ).toFixed(2),
        };
      })
      .sort((left, right) => {
        const leftCatalogIndex = activeRiceVarieties.indexOf(left.variety);
        const rightCatalogIndex = activeRiceVarieties.indexOf(right.variety);

        if (leftCatalogIndex !== -1 || rightCatalogIndex !== -1) {
          if (leftCatalogIndex === -1) {
            return 1;
          }
          if (rightCatalogIndex === -1) {
            return -1;
          }
          return leftCatalogIndex - rightCatalogIndex;
        }

        return left.variety.localeCompare(right.variety);
      });

    const recentMovements = [
      ...riceEntries.map((entry: any) => {
        const quantityKg = toKilograms(
          new Prisma.Decimal(entry.quantity),
          entry.unit,
        );

        return {
          id: `rice-${String(entry.id)}`,
          type: 'rice_entry' as const,
          ownerName: entry.ownerName,
          date: entry.receivedDate,
          variety: entry.variety,
          quantityKg: quantityKg.toFixed(2),
          quantityTon: quantityKg.dividedBy(1000).toFixed(2),
          totalAmount: new Prisma.Decimal(entry.totalAmount).toFixed(2),
          paidAmount: new Prisma.Decimal(entry.paidAmount).toFixed(2),
          remainingAmount: new Prisma.Decimal(entry.remainingAmount).toFixed(2),
          paymentType: entry.paymentType,
          paidInCash: null,
          billNo: entry.billNo,
        };
      }),
      ...processRiceEntries.map((entry: any) => {
        const quantityKg = new Prisma.Decimal(entry.processedWeightKg);

        return {
          id: `process-rice-${String(entry.id)}`,
          type: 'process_rice_in' as const,
          ownerName: 'Process',
          date: entry.date,
          variety: entry.variety,
          quantityKg: quantityKg.toFixed(2),
          quantityTon: quantityKg.dividedBy(1000).toFixed(2),
          totalAmount: null,
          paidAmount: null,
          remainingAmount: null,
          paymentType: null,
          paidInCash: null,
          billNo: entry.billNo,
        };
      }),
      ...riceSales.map((entry: any) => {
        const quantityKg = toKilograms(
          new Prisma.Decimal(entry.quantity),
          entry.unit,
        );

        return {
          id: `sale-${String(entry.id)}`,
          type: 'buyer_sale' as const,
          ownerName: entry.buyerCustomer?.name ?? 'Buyer',
          date: entry.saleDate,
          variety: entry.riceVariety,
          quantityKg: quantityKg.toFixed(2),
          quantityTon: quantityKg.dividedBy(1000).toFixed(2),
          totalAmount: new Prisma.Decimal(entry.totalAmount).toFixed(2),
          paidAmount: new Prisma.Decimal(entry.paidAmount).toFixed(2),
          remainingAmount: new Prisma.Decimal(entry.remainingAmount).toFixed(2),
          paymentType: entry.paymentType,
          paidInCash: entry.paidInCash,
          paymentChannel: entry.paymentChannel,
          sarafName: entry.saraf?.name ?? null,
          billNo: entry.billNo,
        };
      }),
      ...riceCharities.map((entry: any) => {
        const quantityKg = toKilograms(
          new Prisma.Decimal(entry.quantity),
          entry.unit,
        );

        return {
          id: `charity-${String(entry.id)}`,
          type: 'rice_charity' as const,
          ownerName: entry.recipientName,
          date: entry.charityDate,
          variety: entry.riceVariety,
          quantityKg: quantityKg.toFixed(2),
          quantityTon: quantityKg.dividedBy(1000).toFixed(2),
          totalAmount: null,
          paidAmount: null,
          remainingAmount: null,
          paymentType: null,
          paidInCash: null,
          billNo: entry.billNo,
        };
      }),
      ...farmerReturnIssues.map((entry) => ({
        id: `farmer-return-${entry.id}`,
        type: 'farmer_exchange_issue' as const,
        ownerName: entry.ownerName,
        date: entry.fulfilledAt,
        variety: entry.variety,
        quantityKg: entry.quantityKg.toFixed(2),
        quantityTon: entry.quantityKg.dividedBy(1000).toFixed(2),
        totalAmount: null,
        paidAmount: null,
        remainingAmount: null,
        paymentType: null,
        paidInCash: null,
        billNo: `FR-${entry.id}`,
      })),
    ]
      .sort((left, right) => right.date.getTime() - left.date.getTime())
      .slice(0, 10);

    const combinedRemainingAmount = riceTotals.remainingAmount.plus(
      buyerSaleMoneyTotals.remaining,
    );

    return {
      season: activeSeason,
      overview: [
        {
          label: 'currentRiceStockKg',
          value: currentStockKg.toFixed(2),
          unit: APP_WEIGHT_UNIT,
        },
        {
          label: 'riceMovementCount',
          value: String(
            riceEntries.length +
              processRiceEntries.length +
              riceSales.length +
              riceCharities.length +
              farmerReturnIssues.length,
          ),
          unit: 'count',
        },
        {
          label: 'outstandingAmount',
          value: combinedRemainingAmount.toFixed(2),
          unit: 'amount',
        },
        {
          label: 'farmerRiceToIssueKg',
          value: farmerRiceSummary.totals.toIssueKg.toFixed(2),
          unit: APP_WEIGHT_UNIT,
        },
      ],
      summary: {
        totalInKg: combinedRiceInKg.toFixed(2),
        totalInTon: combinedRiceInKg.dividedBy(1000).toFixed(2),
        totalOutKg: riceOutTotals.toFixed(2),
        totalOutTon: riceOutTotals.dividedBy(1000).toFixed(2),
        currentStockKg: currentStockKg.toFixed(2),
        currentStockTon: currentStockKg.dividedBy(1000).toFixed(2),
        entryCount: riceTotals.entryCount + processRiceTotals.entryCount,
        totalAmount: riceTotals.totalAmount.toFixed(2),
        paidAmount: riceTotals.paidAmount.toFixed(2),
        remainingAmount: riceTotals.remainingAmount.toFixed(2),
        unpaidEntryCount: riceTotals.unpaidEntryCount,
        buyerSalesTotalAmount: buyerSaleMoneyTotals.total.toFixed(2),
        buyerSalesPaidAmount: buyerSaleMoneyTotals.paid.toFixed(2),
        buyerSalesRemainingAmount: buyerSaleMoneyTotals.remaining.toFixed(2),
        combinedRemainingAmount: combinedRemainingAmount.toFixed(2),
        charityOutKg: riceOutTotalsCharity.toFixed(2),
        totalFarmerRiceObligationKg:
          farmerRiceSummary.totals.obligationKg.toFixed(2),
        totalFarmerRiceReturnedKg:
          farmerRiceSummary.totals.returnedKg.toFixed(2),
        totalFarmerRiceToIssueKg: farmerRiceSummary.totals.toIssueKg.toFixed(2),
      },
      movementSeries,
      varietyBreakdown,
      recentMovements,
    };
  }

  async update(id: string, updateRiceWarehouseDto: UpdateRiceWarehouseDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const variety =
      updateRiceWarehouseDto.variety !== undefined
        ? updateRiceWarehouseDto.variety.trim()
        : current.variety;
    const customerId =
      updateRiceWarehouseDto.customerId !== undefined
        ? this.parseId(updateRiceWarehouseDto.customerId)
        : current.customerId
          ? this.parseId(current.customerId)
          : null;
    const customer = customerId
      ? await this.requireSellerCustomer(String(customerId), current.seasonId)
      : null;
    const ownerName = customer?.name ?? current.ownerName;

    if (!variety) {
      throw new BadRequestException('variety is required');
    }

    const varietyResolved = await this.varietyService.resolveActiveVarietyName(
      'RICE',
      variety,
    );

    if (!ownerName) {
      throw new BadRequestException('ownerName is required');
    }

    const receivedDate =
      updateRiceWarehouseDto.receivedDate !== undefined
        ? this.parseDate(updateRiceWarehouseDto.receivedDate, 'receivedDate')
        : current.receivedDate;

    const amounts = this.resolveAmounts({
      quantity:
        updateRiceWarehouseDto.quantity !== undefined
          ? updateRiceWarehouseDto.quantity
          : current.quantity,
      rate:
        updateRiceWarehouseDto.rate !== undefined
          ? updateRiceWarehouseDto.rate
          : current.rate,
      paymentType:
        updateRiceWarehouseDto.paymentType !== undefined
          ? this.normalizePaymentType(updateRiceWarehouseDto.paymentType)
          : current.paymentType,
      paidAmount:
        updateRiceWarehouseDto.paidAmount !== undefined
          ? updateRiceWarehouseDto.paidAmount
          : current.paidAmount,
    });

    const paymentChannel = this.normalizePaymentChannel(
      updateRiceWarehouseDto.paymentChannel ?? current.paymentChannel,
    );
    const sarafIdFromDto = updateRiceWarehouseDto.sarafId?.trim() ?? '';
    const currencyIdFromDto =
      updateRiceWarehouseDto.sarafLedgerCurrencyId?.trim() ?? '';
    const sellerPayNow = this.resolveSellerPaymentNow({
      paymentType: amounts.paymentType,
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
      await tx.sarafLedgerEntry.deleteMany({
        where: { riceWarehouseId: warehouseId },
      });
      await tx.cashTransaction.deleteMany({
        where: { riceWarehouseId: warehouseId },
      });

      const row = await tx.riceWarehouse.update({
        where: { id: warehouseId },
        data: {
          customerId: customer?.id ?? null,
          variety: varietyResolved,
          quantity: amounts.quantity,
          unit:
            updateRiceWarehouseDto.unit !== undefined
              ? normalizeWeightUnit(updateRiceWarehouseDto.unit)
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
          ...(updateRiceWarehouseDto.notes !== undefined
            ? { notes: updateRiceWarehouseDto.notes?.trim() || null }
            : {}),
        },
        select: riceWarehouseSelect,
      });

      if (
        paymentChannel === 'saraf' &&
        sellerPayNow &&
        settlement.sarafId &&
        settlement.currencyId
      ) {
        await this.sarafLedgerService.createLinkedRiceWarehousePurchaseEntry(
          tx,
          {
            sarafId: settlement.sarafId,
            currencyId: settlement.currencyId,
            amount: sellerPayNow.negated(),
            occurredAt: row.receivedDate,
            notes: `Rice warehouse purchase ${row.billNo}`,
            riceWarehouseId: row.id,
          },
        );
      }

      if (paymentChannel === 'cash' && sellerPayNow && settlement.currencyId) {
        await this.cashService.createLinkedRiceWarehousePurchaseOutEntry(tx, {
          currencyId: settlement.currencyId,
          amount: sellerPayNow,
          occurredAt: row.receivedDate,
          notes: `Rice warehouse purchase ${row.billNo}`,
          seasonId: row.seasonId,
          seasonName: row.seasonName,
          riceWarehouseId: row.id,
        });
      }

      return row;
    });

    await this.syncRiceWarehouseLedger(updated);
    await this.syncSeasonPurchaseTotals(current.seasonId);

    return this.serializeRiceWarehouse(updated);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const deleted = await this.riceWarehouseModel.delete({
      where: { id: this.parseId(id) },
      select: riceWarehouseSelect,
    });

    await this.customerLedgerService.removeRiceWarehouseActivity(id);
    await this.syncSeasonPurchaseTotals(current.seasonId);

    return this.serializeRiceWarehouse(deleted);
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

  private toDateKey(value: Date) {
    return value.toISOString().slice(0, 10);
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

  private async syncRiceWarehouseLedger(row: {
    id: bigint;
    customerId: bigint | null;
    variety: string;
    quantity: Prisma.Decimal;
    unit: string;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    remainingAmount: Prisma.Decimal;
    paymentType: string;
    paymentChannel: 'cash' | 'saraf';
    sarafId: bigint | null;
    sarafLedgerCurrencyId: string | null;
    receivedDate: Date;
    notes: string | null;
  }) {
    if (!row.customerId) {
      await this.customerLedgerService.removeRiceWarehouseActivity(row.id);
      return;
    }

    await this.customerLedgerService.syncRiceWarehouseActivity({
      customerId: row.customerId,
      riceWarehouseId: row.id,
      totalAmount: new Prisma.Decimal(row.totalAmount),
      paidAmount: new Prisma.Decimal(row.paidAmount),
      remainingAmount: new Prisma.Decimal(row.remainingAmount),
      paymentType: row.paymentType,
      paymentChannel: row.paymentChannel,
      sarafId: row.sarafId,
      currencyId: row.sarafLedgerCurrencyId,
      receivedDate: row.receivedDate,
      variety: row.variety,
      quantity: new Prisma.Decimal(row.quantity),
      unit: row.unit,
      notes: row.notes,
    });
  }

  private async requireSellerCustomer(customerId: string, seasonId: string) {
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

    if (customer.type !== 'rice_seller') {
      throw new BadRequestException(
        'Rice warehouse owner must be a rice_seller customer',
      );
    }

    if (customer.seasonId !== seasonId) {
      throw new BadRequestException(
        'Selected customer must belong to the same season',
      );
    }

    return customer;
  }

  private async generateRiceWarehouseBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before rice warehouse stock can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-RWH-`;
    const lastEntry = await this.riceWarehouseModel.findFirst({
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

  /**
   * Buyer sales money cards must include later collections from the buyer
   * ledger (cash or Saraf), not only amounts paid at sale time on rice_sales.
   * Later payments are applied to each buyer's rice remaining (capped), so
   * store-sale collections for the same buyer are not over-attributed to rice.
   */
  private async computeBuyerSaleMoneyTotals(
    riceSales: Array<{
      buyerCustomerId: bigint;
      totalAmount: Prisma.Decimal | string | number;
      loadingAmount?: Prisma.Decimal | string | number | null;
      riceBagsAmount?: Prisma.Decimal | string | number | null;
      paidAmount: Prisma.Decimal | string | number;
      remainingAmount: Prisma.Decimal | string | number;
    }>,
  ) {
    let total = new Prisma.Decimal(0);
    let paidAtSale = new Prisma.Decimal(0);
    const remainingByBuyer = new Map<string, Prisma.Decimal>();

    for (const entry of riceSales) {
      const invoice = new Prisma.Decimal(entry.totalAmount)
        .plus(entry.loadingAmount ?? 0)
        .plus(entry.riceBagsAmount ?? 0);
      total = total.plus(invoice);
      paidAtSale = paidAtSale.plus(new Prisma.Decimal(entry.paidAmount));

      const buyerKey = String(entry.buyerCustomerId);
      remainingByBuyer.set(
        buyerKey,
        (remainingByBuyer.get(buyerKey) ?? new Prisma.Decimal(0)).plus(
          new Prisma.Decimal(entry.remainingAmount),
        ),
      );
    }

    const buyerIds = [...remainingByBuyer.keys()].map((id) => BigInt(id));
    let laterApplied = new Prisma.Decimal(0);

    if (buyerIds.length > 0) {
      const laterEntries = await this.prisma.customerLedgerEntry.findMany({
        where: {
          customerId: { in: buyerIds },
          entryType: {
            in: [
              'buyer_payment',
              'buyer_credit',
              'buyer_payment_on_behalf',
              'buyer_payment_received_on_behalf',
            ],
          },
        },
        select: {
          customerId: true,
          entryType: true,
          amount: true,
          counterpartyCustomerId: true,
          paymentChannel: true,
        },
      });

      const laterByBuyer = new Map<string, Prisma.Decimal>();

      for (const entry of laterEntries) {
        const amount = new Prisma.Decimal(entry.amount ?? 0);
        if (!amount.greaterThan(0) && !amount.lessThan(0)) {
          continue;
        }

        const buyerKey = String(entry.customerId);
        let delta = new Prisma.Decimal(0);

        if (entry.entryType === 'buyer_credit') {
          delta = amount;
        } else if (entry.entryType === 'buyer_payment_on_behalf') {
          delta = amount;
        } else if (entry.entryType === 'buyer_payment_received_on_behalf') {
          delta = amount.negated();
        } else if (
          entry.entryType === 'buyer_payment' &&
          !entry.counterpartyCustomerId &&
          (entry.paymentChannel === 'cash' || entry.paymentChannel === 'saraf')
        ) {
          delta = amount;
        } else if (
          entry.entryType === 'buyer_payment' &&
          entry.counterpartyCustomerId
        ) {
          // Payment received on behalf (legacy shape): increases what this buyer owes.
          delta = amount.negated();
        }

        if (delta.equals(0)) {
          continue;
        }

        laterByBuyer.set(
          buyerKey,
          (laterByBuyer.get(buyerKey) ?? new Prisma.Decimal(0)).plus(delta),
        );
      }

      for (const [buyerKey, riceRemaining] of remainingByBuyer.entries()) {
        const later = laterByBuyer.get(buyerKey) ?? new Prisma.Decimal(0);
        if (later.greaterThan(0)) {
          laterApplied = laterApplied.plus(
            Prisma.Decimal.min(later, riceRemaining),
          );
        } else if (later.lessThan(0)) {
          // Extra debt from received-on-behalf increases still-to-collect.
          laterApplied = laterApplied.plus(later);
        }
      }
    }

    const paid = paidAtSale.plus(Prisma.Decimal.max(laterApplied, 0));
    const remaining = Prisma.Decimal.max(
      total.minus(paidAtSale).minus(laterApplied),
      0,
    );

    return { total, paid, remaining };
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

  private resolveSellerPaymentNow(params: {
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

  private serializeRiceWarehouse(riceWarehouse: any) {
    const { saraf, sarafLedgerCurrency, ...rest } = riceWarehouse;

    return {
      ...rest,
      id: String(riceWarehouse.id),
      customerId:
        riceWarehouse.customerId !== null &&
        riceWarehouse.customerId !== undefined
          ? String(riceWarehouse.customerId)
          : null,
      paymentChannel: riceWarehouse.paymentChannel ?? 'cash',
      sarafId:
        riceWarehouse.sarafId !== null && riceWarehouse.sarafId !== undefined
          ? String(riceWarehouse.sarafId)
          : null,
      sarafLedgerCurrencyId: riceWarehouse.sarafLedgerCurrencyId ?? null,
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
    };
  }

  private async syncSeasonPurchaseTotals(seasonId: string) {
    await this.prisma.$transaction(async (tx) => {
      const [paddyAggregate, riceAggregate] = await Promise.all([
        tx.companyOwnedPaddyWarehouse.aggregate({
          where: { seasonId },
          _sum: { totalAmount: true },
        }),
        tx.riceWarehouse.aggregate({
          where: { seasonId },
          _sum: { totalAmount: true },
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
