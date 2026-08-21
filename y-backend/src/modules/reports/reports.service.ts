import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/auth/auth-types.js';
import { SeasonService } from '../season/season.service.js';
import type {
  FindReportsQueryDto,
  ReportPreset,
} from './dto/find-reports-query.dto.js';
import { ReportSnapshotsService } from './report-snapshots.service.js';

const REPORT_ENTRY_LIMIT = 5000;

const ALL_STORE_TYPES = [
  'short_green',
  'regection',
  'broken_rice',
  'waste',
] as const;

function decStr(v: Prisma.Decimal | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v.toString();
}

function serializeReportValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((x) => serializeReportValue(x));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        serializeReportValue(v),
      ]),
    );
  }
  return value;
}

function parseAnchorUtc(dateStr?: string): { y: number; m: number; d: number } {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { y, m: m - 1, d };
    }
  }
  const now = new Date();
  return {
    y: now.getUTCFullYear(),
    m: now.getUTCMonth(),
    d: now.getUTCDate(),
  };
}

function computeRange(
  preset: ReportPreset,
  anchor: { y: number; m: number; d: number },
): { start: Date; end: Date } {
  const { y, m, d } = anchor;
  if (preset === 'day') {
    return {
      start: new Date(Date.UTC(y, m, d, 0, 0, 0, 0)),
      end: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)),
    };
  }
  if (preset === 'week') {
    const anchorMid = new Date(Date.UTC(y, m, d, 12, 0, 0, 0));
    const dow = anchorMid.getUTCDay();
    const offsetToMonday = dow === 0 ? -6 : 1 - dow;
    const start = new Date(Date.UTC(y, m, d + offsetToMonday, 0, 0, 0, 0));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function canSeeModule(user: AuthenticatedUser, module: string): boolean {
  if (user.isAdmin) return true;
  return (
    user.permissions.includes(`${module}.read`) ||
    user.permissions.includes(`${module}.view`) ||
    user.permissions.includes(`${module}.manage`)
  );
}

/** True if the user may see any of the given RBAC modules (e.g. jwali vs jwali_ledgers). */
function canSeeAnyModule(user: AuthenticatedUser, modules: string[]): boolean {
  return modules.some((m) => canSeeModule(user, m));
}

function deriveSarafLedgerEntrySource(row: {
  riceSaleId?: unknown;
  companyOwnedPaddyWarehouseId?: unknown;
  employeeLedgerEntryId?: unknown;
  jwaliPaymentId?: unknown;
  storeEntryId?: unknown;
  storeVarietySaleId?: unknown;
  expenseId?: unknown;
  customerLedgerEntryId?: unknown;
}): string {
  if (row.riceSaleId != null) return 'rice_sale';
  if (row.companyOwnedPaddyWarehouseId != null) return 'company_paddy';
  if (row.employeeLedgerEntryId != null) return 'employee';
  if (row.jwaliPaymentId != null) return 'jwali_payment';
  if (row.storeVarietySaleId != null) return 'store_variety_sale';
  if (row.storeEntryId != null) return 'store_sale';
  if (row.expenseId != null) return 'expense';
  if (row.customerLedgerEntryId != null) return 'customer_ledger';
  return 'other';
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly reportSnapshots: ReportSnapshotsService,
  ) {}

  async getSummary(user: AuthenticatedUser, query: FindReportsQueryDto) {
    const preset: ReportPreset = query.preset ?? 'day';
    const anchor = parseAnchorUtc(query.date);
    const { start, end } = computeRange(preset, anchor);

    let season: Awaited<
      ReturnType<SeasonService['getActiveSeasonOrThrow']>
    > | null = null;
    try {
      season = await this.seasonService.resolveSeasonForRead(query.seasonId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        season = null;
      } else {
        throw e;
      }
    }

    const prisma = this.prisma as unknown as {
      enteringPaddy: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      companyOwnedPaddyWarehouse: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      farmerOwnedPaddyWarehouse: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      paddyProcess: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      riceWarehouse: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      processRiceEntry: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      riceSale: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      riceCharity: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      storeEntry: {
        groupBy: (a: object) => Promise<any[]>;
        findMany: (a: object) => Promise<any[]>;
      };
      storeVarietySale: {
        aggregate: (a: object) => Promise<any>;
        groupBy: (a: object) => Promise<any[]>;
        findMany: (a: object) => Promise<any[]>;
      };
      jwaliLedgerEntry: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
      sarafLedgerEntry: {
        findMany: (a: object) => Promise<any[]>;
      };
      cashTransaction: {
        aggregate: (a: object) => Promise<any>;
        findMany: (a: object) => Promise<any[]>;
      };
    };

    const seasonId = season?.id;
    const dateWhere = { gte: start, lte: end };
    const baseSeason = seasonId ? { seasonId } : { seasonId: '__none__' };

    const [
      enteringPaddyAgg,
      companyPaddyAgg,
      farmerPaddyAgg,
      paddyProcessAgg,
      riceWarehouseAgg,
      processRiceAgg,
      riceSalesAgg,
      riceCharitiesAgg,
      storeGroups,
      storeVarietySalesAgg,
      storeVarietySaleGroups,
      expenseRows,
      jwaliAgg,
      sarafiCurrencyRows,
      cashCurrencyRows,
      cashAgg,
      enteringPaddyEntries,
      companyPaddyEntries,
      farmerPaddyEntries,
      paddyProcessEntries,
      riceWarehouseEntries,
      processRiceEntries,
      riceSaleEntries,
      riceCharityEntries,
      storeEntries,
      storeVarietySaleEntries,
      expenseDetailRows,
      jwaliLedgerEntries,
      sarafiLedgerEntries,
      cashEntries,
    ] = await Promise.all([
      canSeeModule(user, 'entering_paddy') && season
        ? prisma.enteringPaddy.aggregate({
            where: { ...baseSeason, date: dateWhere },
            _count: { id: true },
            _sum: { totalWeightKg: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'paddy_warehouses') && season
        ? prisma.companyOwnedPaddyWarehouse.aggregate({
            where: { ...baseSeason, receivedDate: dateWhere },
            _count: { id: true },
            _sum: { quantity: true, totalAmount: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'paddy_warehouses') && season
        ? prisma.farmerOwnedPaddyWarehouse.aggregate({
            where: { ...baseSeason, receivedDate: dateWhere },
            _count: { id: true },
            _sum: { paddyQuantity: true, riceQuantity: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'paddy_processes') && season
        ? prisma.paddyProcess.aggregate({
            where: { ...baseSeason, date: dateWhere },
            _count: { id: true },
            _sum: { weight: true, processedWeightKg: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'rice_warehouses') && season
        ? prisma.riceWarehouse.aggregate({
            where: { ...baseSeason, receivedDate: dateWhere },
            _count: { id: true },
            _sum: { quantity: true, totalAmount: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'process_rice') && season
        ? prisma.processRiceEntry.aggregate({
            where: { ...baseSeason, date: dateWhere },
            _count: { id: true },
            _sum: { weight: true, processedWeightKg: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'rice_sales') && season
        ? prisma.riceSale.aggregate({
            where: { ...baseSeason, saleDate: dateWhere },
            _count: { id: true },
            _sum: { quantity: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'rice_charities') && season
        ? prisma.riceCharity.aggregate({
            where: { ...baseSeason, charityDate: dateWhere },
            _count: { id: true },
            _sum: { quantity: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'stores') && season
        ? prisma.storeEntry.groupBy({
            by: ['storeType'],
            where: { ...baseSeason, date: dateWhere },
            _count: { id: true },
            _sum: { weight: true, processedWeightKg: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'stores') && season
        ? prisma.storeVarietySale.aggregate({
            where: { ...baseSeason, saleDate: dateWhere },
            _count: { id: true },
            _sum: { soldWeightKg: true, saleAmount: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'stores') && season
        ? prisma.storeVarietySale.groupBy({
            by: ['storeType'],
            where: { ...baseSeason, saleDate: dateWhere },
            _count: { id: true },
            _sum: { soldWeight: true, soldWeightKg: true, saleAmount: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'expenses') && season && seasonId
        ? this.prisma.$queryRaw<
            Array<{
              currencyCode: string;
              currencyName: string;
              entryCount: bigint;
              totalAmount: Prisma.Decimal | null;
            }>
          >(Prisma.sql`
            SELECT
              c."code"::text AS "currencyCode",
              c."name" AS "currencyName",
              COUNT(*)::bigint AS "entryCount",
              COALESCE(SUM(e."amount"), 0)::decimal AS "totalAmount"
            FROM "expenses" e
            INNER JOIN "currencies" c ON c."id" = e."currency_id"
            WHERE e."season_id" = ${seasonId}
              AND e."date" >= ${start}
              AND e."date" <= ${end}
            GROUP BY c."id", c."code", c."name"
            ORDER BY c."code" ASC
          `)
        : Promise.resolve(null),
      canSeeAnyModule(user, ['jwali', 'jwali_ledgers']) && season && seasonId
        ? prisma.jwaliLedgerEntry.aggregate({
            where: {
              jwali: { seasonId },
              occurredAt: dateWhere,
            },
            _count: { id: true },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
      canSeeAnyModule(user, ['sarafi', 'sarafi_ledgers']) && season && seasonId
        ? this.prisma.$queryRaw<
            Array<{
              currencyCode: string;
              currencyName: string;
              entryCount: bigint;
              totalAmount: Prisma.Decimal | null;
            }>
          >(Prisma.sql`
            SELECT
              c."code"::text AS "currencyCode",
              c."name" AS "currencyName",
              COUNT(*)::bigint AS "entryCount",
              COALESCE(SUM(e."amount"), 0)::decimal AS "totalAmount"
            FROM "saraf_ledger_entries" e
            INNER JOIN "sarafs" s ON s."id" = e."saraf_id"
            INNER JOIN "currencies" c ON c."id" = e."currency_id"
            WHERE s."season_id" = ${seasonId}
              AND e."occurred_at" >= ${start}
              AND e."occurred_at" <= ${end}
            GROUP BY c."id", c."code", c."name"
            ORDER BY c."code" ASC
          `)
        : Promise.resolve(null),
      canSeeModule(user, 'cash') && season && seasonId
        ? this.prisma.$queryRaw<
            Array<{
              currencyCode: string;
              currencyName: string;
              entryCount: bigint;
              cashIn: Prisma.Decimal | null;
              cashOut: Prisma.Decimal | null;
            }>
          >(Prisma.sql`
            SELECT
              c."code"::text AS "currencyCode",
              c."name" AS "currencyName",
              COUNT(*)::bigint AS "entryCount",
              COALESCE(SUM(CASE WHEN ct."direction" = 'in' THEN ct."amount" ELSE 0 END), 0)::decimal AS "cashIn",
              COALESCE(SUM(CASE WHEN ct."direction" = 'out' THEN ct."amount" ELSE 0 END), 0)::decimal AS "cashOut"
            FROM "cash_transactions" ct
            INNER JOIN "currencies" c ON c."id" = ct."currency_id"
            WHERE ct."season_id" = ${seasonId}
              AND ct."occurred_at" >= ${start}
              AND ct."occurred_at" <= ${end}
            GROUP BY c."id", c."code", c."name"
            ORDER BY c."code" ASC
          `)
        : Promise.resolve(null),
      canSeeModule(user, 'cash') && season && seasonId
        ? prisma.cashTransaction.aggregate({
            where: { seasonId, occurredAt: dateWhere },
            _count: { id: true },
          })
        : Promise.resolve(null),
      canSeeModule(user, 'entering_paddy') && season
        ? prisma.enteringPaddy.findMany({
            where: { ...baseSeason, date: dateWhere },
            select: {
              id: true,
              billNo: true,
              date: true,
              paddyOwner: true,
              variety: true,
              totalWeightKg: true,
              weightUnit: true,
              receivedFrom: true,
              driverName: true,
              carPlate: true,
              phoneNo: true,
              address: true,
            },
            orderBy: { date: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'paddy_warehouses') && season
        ? prisma.companyOwnedPaddyWarehouse.findMany({
            where: { ...baseSeason, receivedDate: dateWhere },
            select: {
              id: true,
              billNo: true,
              enteringBillNo: true,
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
              receivedDate: true,
              notes: true,
              saraf: { select: { name: true } },
              sarafLedgerCurrency: { select: { code: true } },
            },
            orderBy: { receivedDate: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'paddy_warehouses') && season
        ? prisma.farmerOwnedPaddyWarehouse.findMany({
            where: { ...baseSeason, receivedDate: dateWhere },
            select: {
              id: true,
              billNo: true,
              enteringBillNo: true,
              paddyVariety: true,
              paddyQuantity: true,
              riceVariety: true,
              riceQuantity: true,
              unit: true,
              ownerName: true,
              receivedDate: true,
              notes: true,
            },
            orderBy: { receivedDate: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'paddy_processes') && season
        ? prisma.paddyProcess.findMany({
            where: { ...baseSeason, date: dateWhere },
            select: {
              id: true,
              billNo: true,
              date: true,
              variety: true,
              weight: true,
              unit: true,
              processedWeightKg: true,
              status: true,
            },
            orderBy: { date: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'rice_warehouses') && season
        ? prisma.riceWarehouse.findMany({
            where: { ...baseSeason, receivedDate: dateWhere },
            select: {
              id: true,
              variety: true,
              quantity: true,
              unit: true,
              ownerName: true,
              rate: true,
              totalAmount: true,
              paymentType: true,
              paidAmount: true,
              remainingAmount: true,
              receivedDate: true,
              stockType: true,
              notes: true,
            },
            orderBy: { receivedDate: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'process_rice') && season
        ? prisma.processRiceEntry.findMany({
            where: { ...baseSeason, date: dateWhere },
            select: {
              id: true,
              billNo: true,
              processedBillNo: true,
              date: true,
              variety: true,
              weight: true,
              unit: true,
              processedWeightKg: true,
            },
            orderBy: { date: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'rice_sales') && season
        ? prisma.riceSale.findMany({
            where: { ...baseSeason, saleDate: dateWhere },
            select: {
              id: true,
              billNo: true,
              saleDate: true,
              riceVariety: true,
              quantity: true,
              unit: true,
              totalAmount: true,
              paymentType: true,
              paidAmount: true,
              remainingAmount: true,
              paidInCash: true,
              paymentChannel: true,
              notes: true,
              buyerCustomer: { select: { name: true } },
              saraf: { select: { name: true } },
              sarafLedgerCurrency: { select: { code: true, name: true } },
            },
            orderBy: { saleDate: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'rice_charities') && season
        ? prisma.riceCharity.findMany({
            where: { ...baseSeason, charityDate: dateWhere },
            select: {
              id: true,
              billNo: true,
              charityDate: true,
              riceVariety: true,
              quantity: true,
              unit: true,
              recipientName: true,
              notes: true,
            },
            orderBy: { charityDate: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'stores') && season
        ? prisma.storeEntry.findMany({
            where: { ...baseSeason, date: dateWhere },
            select: {
              id: true,
              storeType: true,
              billNo: true,
              processedBillNo: true,
              date: true,
              variety: true,
              weight: true,
              unit: true,
              processedWeightKg: true,
              ownerName: true,
            },
            orderBy: { date: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'stores') && season
        ? prisma.storeVarietySale.findMany({
            where: { ...baseSeason, saleDate: dateWhere },
            select: {
              id: true,
              storeType: true,
              billNo: true,
              saleDate: true,
              variety: true,
              soldWeight: true,
              unit: true,
              soldWeightKg: true,
              saleAmount: true,
              paymentType: true,
              paidAmount: true,
              remainingAmount: true,
              paidInCash: true,
              paymentChannel: true,
              notes: true,
              buyerCustomer: { select: { name: true } },
              saraf: { select: { name: true } },
              sarafLedgerCurrency: { select: { code: true, name: true } },
            },
            orderBy: { saleDate: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'expenses') && season && seasonId
        ? this.prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT
            e."id"::text AS "id",
            e."bill_no" AS "billNo",
            e."date" AS "date",
            ec."code" AS "categoryCode",
            ec."name" AS "categoryName",
            e."title" AS "title",
            e."amount"::text AS "amount",
            e."notes" AS "notes",
            c."code"::text AS "currencyCode",
            c."name" AS "currencyName"
          FROM "expenses" e
          INNER JOIN "currencies" c ON c."id" = e."currency_id"
          INNER JOIN "expense_categories" ec ON ec."id" = e."category_id"
          WHERE e."season_id" = ${seasonId}
            AND e."date" >= ${start}
            AND e."date" <= ${end}
          ORDER BY e."date" DESC, e."bill_no" DESC
          LIMIT ${REPORT_ENTRY_LIMIT}
        `)
        : Promise.resolve([]),
      canSeeAnyModule(user, ['jwali', 'jwali_ledgers']) && season && seasonId
        ? prisma.jwaliLedgerEntry.findMany({
            where: {
              jwali: { seasonId },
              occurredAt: dateWhere,
            },
            select: {
              id: true,
              bagCount: true,
              ratePerBag: true,
              amount: true,
              occurredAt: true,
              notes: true,
              jwali: { select: { id: true, name: true, phoneNo: true } },
            },
            orderBy: { occurredAt: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeAnyModule(user, ['sarafi', 'sarafi_ledgers']) && season && seasonId
        ? prisma.sarafLedgerEntry.findMany({
            where: {
              occurredAt: dateWhere,
              saraf: { seasonId },
            },
            select: {
              id: true,
              occurredAt: true,
              amount: true,
              notes: true,
              riceSaleId: true,
              companyOwnedPaddyWarehouseId: true,
              employeeLedgerEntryId: true,
              jwaliPaymentId: true,
              storeEntryId: true,
              storeVarietySaleId: true,
              expenseId: true,
              customerLedgerEntryId: true,
              currency: { select: { code: true, name: true } },
              saraf: { select: { id: true, name: true, phoneNo: true } },
            },
            orderBy: { occurredAt: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
      canSeeModule(user, 'cash') && season && seasonId
        ? prisma.cashTransaction.findMany({
            where: { seasonId, occurredAt: dateWhere },
            select: {
              id: true,
              direction: true,
              amount: true,
              occurredAt: true,
              notes: true,
              currency: { select: { code: true, name: true } },
            },
            orderBy: { occurredAt: 'desc' },
            take: REPORT_ENTRY_LIMIT,
          })
        : Promise.resolve([]),
    ]);

    const stock =
      seasonId && season
        ? await this.reportSnapshots.buildStockAndBalances(user, seasonId)
        : null;

    const storeByType: Record<
      string,
      {
        recordCount: number;
        totalWeight: string | null;
        totalProcessedWeightKg: string | null;
      }
    > = {};
    for (const storeType of ALL_STORE_TYPES) {
      storeByType[storeType] = {
        recordCount: 0,
        totalWeight: '0.00',
        totalProcessedWeightKg: '0.00',
      };
    }
    if (storeGroups) {
      for (const row of storeGroups) {
        storeByType[row.storeType] = {
          recordCount: row._count.id,
          totalWeight: decStr(row._sum.weight),
          totalProcessedWeightKg: decStr(row._sum.processedWeightKg),
        };
      }
    }

    const salesByStoreType: Record<
      string,
      {
        saleCount: number;
        totalSoldWeight: string | null;
        totalSoldWeightKg: string | null;
        totalSaleAmount: string | null;
      }
    > = {};
    for (const storeType of ALL_STORE_TYPES) {
      salesByStoreType[storeType] = {
        saleCount: 0,
        totalSoldWeight: '0.00',
        totalSoldWeightKg: '0.00',
        totalSaleAmount: '0.00',
      };
    }
    if (storeVarietySaleGroups) {
      for (const row of storeVarietySaleGroups) {
        salesByStoreType[row.storeType] = {
          saleCount: row._count.id,
          totalSoldWeight: decStr(row._sum.soldWeight),
          totalSoldWeightKg: decStr(row._sum.soldWeightKg),
          totalSaleAmount: decStr(row._sum.saleAmount),
        };
      }
    }

    const storeStockByType = ALL_STORE_TYPES.map((storeType) => {
      const fromSnapshot = stock?.store?.byStoreType.find(
        (row) => row.storeType === storeType,
      );
      return (
        fromSnapshot ?? {
          storeType,
          totalWeightKg: '0.00',
          soldWeightKg: '0.00',
          availableWeightKg: '0.00',
        }
      );
    });

    const mapRows = (rows: any[]) =>
      rows.map((r) => serializeReportValue(r) as Record<string, unknown>);

    const riceSaleRows = riceSaleEntries.map((r) => {
      const { buyerCustomer, saraf, sarafLedgerCurrency, ...rest } = r;
      return serializeReportValue({
        ...rest,
        buyerName: buyerCustomer?.name ?? null,
        sarafName: saraf?.name ?? null,
        sarafCurrencyCode: sarafLedgerCurrency?.code ?? null,
      }) as Record<string, unknown>;
    });

    const riceCharityRows = riceCharityEntries.map(
      (r) => serializeReportValue(r) as Record<string, unknown>,
    );

    const storeVarietySaleRows = storeVarietySaleEntries.map((r) => {
      const { buyerCustomer, saraf, sarafLedgerCurrency, ...rest } = r;
      return serializeReportValue({
        ...rest,
        buyerName: buyerCustomer?.name ?? null,
        sarafName: saraf?.name ?? null,
        sarafCurrencyCode: sarafLedgerCurrency?.code ?? null,
      }) as Record<string, unknown>;
    });

    const jwaliRows = jwaliLedgerEntries.map((r) => {
      const { jwali, ...rest } = r;
      return serializeReportValue({
        ...rest,
        jwaliName: jwali?.name ?? null,
        jwaliPhone: jwali?.phoneNo ?? null,
      }) as Record<string, unknown>;
    });

    const sarafiRows = sarafiLedgerEntries.map((r: any) => {
      const { currency, saraf, ...rest } = r;
      const entrySource = deriveSarafLedgerEntrySource(rest);
      return serializeReportValue({
        id: rest.id,
        occurredAt: rest.occurredAt,
        amount: rest.amount,
        notes: rest.notes ?? null,
        sarafName: saraf?.name ?? null,
        sarafPhone: saraf?.phoneNo ?? null,
        currencyCode: currency?.code ?? null,
        currencyName: currency?.name ?? null,
        entrySource,
      }) as Record<string, unknown>;
    });

    const companyPaddyRows = companyPaddyEntries.map((r) => {
      const { saraf, sarafLedgerCurrency, ...rest } = r;
      return serializeReportValue({
        ...rest,
        sarafName: saraf?.name ?? null,
        sarafCurrencyCode: sarafLedgerCurrency?.code ?? null,
      }) as Record<string, unknown>;
    });

    const cashRows = cashEntries.map((r: any) => {
      const { currency, ...rest } = r;
      return serializeReportValue({
        ...rest,
        currencyCode: currency?.code ?? null,
        currencyName: currency?.name ?? null,
      }) as Record<string, unknown>;
    });

    return {
      range: {
        preset,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      entryLimit: REPORT_ENTRY_LIMIT,
      season: season
        ? {
            id: season.id,
            name: season.name,
            code: season.code,
            status: season.status,
            startDate: season.startDate,
            endDate: season.endDate,
          }
        : null,
      stock,
      sections: {
        entering_paddy:
          enteringPaddyAgg && season
            ? {
                recordCount: enteringPaddyAgg._count.id,
                totalWeightKg: decStr(enteringPaddyAgg._sum.totalWeightKg),
                stock: stock?.entering_paddy ?? null,
                entries: mapRows(enteringPaddyEntries),
              }
            : null,
        paddy_warehouse:
          companyPaddyAgg !== null || farmerPaddyAgg !== null
            ? {
                stock: stock?.paddy_warehouse ?? null,
                companyOwned:
                  companyPaddyAgg && season
                    ? {
                        recordCount: companyPaddyAgg._count.id,
                        totalQuantity: decStr(companyPaddyAgg._sum.quantity),
                        totalAmount: decStr(companyPaddyAgg._sum.totalAmount),
                        entries: companyPaddyRows,
                      }
                    : null,
                farmerOwned:
                  farmerPaddyAgg && season
                    ? {
                        recordCount: farmerPaddyAgg._count.id,
                        totalPaddyQuantity: decStr(
                          farmerPaddyAgg._sum.paddyQuantity,
                        ),
                        totalRiceQuantity: decStr(
                          farmerPaddyAgg._sum.riceQuantity,
                        ),
                        entries: mapRows(farmerPaddyEntries),
                      }
                    : null,
              }
            : null,
        paddy_process:
          paddyProcessAgg && season
            ? {
                recordCount: paddyProcessAgg._count.id,
                totalWeight: decStr(paddyProcessAgg._sum.weight),
                totalProcessedWeightKg: decStr(
                  paddyProcessAgg._sum.processedWeightKg,
                ),
                stock: stock?.paddy_process ?? null,
                entries: mapRows(paddyProcessEntries),
              }
            : null,
        rice_warehouse:
          riceWarehouseAgg && season
            ? {
                recordCount: riceWarehouseAgg._count.id,
                totalQuantity: decStr(riceWarehouseAgg._sum.quantity),
                totalAmount: decStr(riceWarehouseAgg._sum.totalAmount),
                stock: stock?.rice_warehouse ?? null,
                entries: mapRows(riceWarehouseEntries),
              }
            : null,
        process_rice:
          processRiceAgg && season
            ? {
                recordCount: processRiceAgg._count.id,
                totalWeight: decStr(processRiceAgg._sum.weight),
                totalProcessedWeightKg: decStr(
                  processRiceAgg._sum.processedWeightKg,
                ),
                stock: stock?.process_rice ?? null,
                entries: mapRows(processRiceEntries),
              }
            : null,
        rice_sales:
          riceSalesAgg && season
            ? {
                recordCount: riceSalesAgg._count.id,
                totalQuantity: decStr(riceSalesAgg._sum.quantity),
                entries: riceSaleRows,
              }
            : null,
        rice_charities:
          riceCharitiesAgg && season
            ? {
                recordCount: riceCharitiesAgg._count.id,
                totalQuantity: decStr(riceCharitiesAgg._sum.quantity),
                entries: riceCharityRows,
              }
            : null,
        store:
          storeGroups !== null || storeVarietySalesAgg !== null
            ? {
                entryCount: storeGroups
                  ? storeGroups.reduce((acc, row) => acc + row._count.id, 0)
                  : 0,
                byStoreType: storeByType,
                saleCount: storeVarietySalesAgg?._count?.id ?? 0,
                totalSoldWeightKg: decStr(
                  storeVarietySalesAgg?._sum?.soldWeightKg,
                ),
                totalSaleAmount: decStr(storeVarietySalesAgg?._sum?.saleAmount),
                salesByStoreType,
                stock: stock?.store
                  ? {
                      totalAvailableKg: stock.store.totalAvailableKg,
                      byStoreType: storeStockByType,
                    }
                  : {
                      totalAvailableKg: '0.00',
                      byStoreType: storeStockByType,
                    },
                entries: mapRows(storeEntries),
                sales: storeVarietySaleRows,
              }
            : null,
        cash:
          cashAgg !== null || cashCurrencyRows !== null
            ? {
                entryCount: cashAgg?._count?.id ?? 0,
                byCurrency: (cashCurrencyRows ?? []).map((r) => ({
                  currencyCode: r.currencyCode,
                  currencyName: r.currencyName,
                  entryCount: Number(r.entryCount),
                  cashIn: decStr(r.cashIn),
                  cashOut: decStr(r.cashOut),
                })),
                stock: stock?.cash ?? null,
                entries: cashRows,
              }
            : null,
        expenses:
          expenseRows !== null
            ? {
                byCurrency: expenseRows.map((r) => ({
                  currencyCode: r.currencyCode,
                  currencyName: r.currencyName,
                  entryCount: Number(r.entryCount),
                  totalAmount: decStr(r.totalAmount),
                })),
                entries: mapRows(expenseDetailRows as any[]),
              }
            : null,
        jwali:
          jwaliAgg && season
            ? {
                entryCount: jwaliAgg._count.id,
                totalAmount: decStr(jwaliAgg._sum.amount),
                entries: jwaliRows,
              }
            : null,
        sarafi:
          sarafiCurrencyRows !== null
            ? {
                entryCount: sarafiCurrencyRows.reduce(
                  (acc, row) => acc + Number(row.entryCount),
                  0,
                ),
                byCurrency: sarafiCurrencyRows.map((r) => ({
                  currencyCode: r.currencyCode,
                  currencyName: r.currencyName,
                  entryCount: Number(r.entryCount),
                  totalAmount: decStr(r.totalAmount),
                })),
                stock: stock?.sarafi ?? null,
                entries: sarafiRows,
              }
            : null,
      },
    };
  }
}
