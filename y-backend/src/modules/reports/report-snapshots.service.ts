import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toKilograms } from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CashService } from '../cash/cash.service.js';
import { RiceSaleService } from '../rice-sale/rice-sale.service.js';
import { StockSyncService } from '../stock/stock-sync.service.js';
import type { AuthenticatedUser } from '../../common/auth/auth-types.js';

function decStr(v: Prisma.Decimal | null | undefined): string {
  if (v === null || v === undefined) return '0.00';
  return v.toString();
}

const ALL_STORE_TYPES = [
  'short_green',
  'regection',
  'broken_rice',
  'waste',
] as const;

function canSeeModule(user: AuthenticatedUser, module: string): boolean {
  if (user.isAdmin) return true;
  return (
    user.permissions.includes(`${module}.read`) ||
    user.permissions.includes(`${module}.view`) ||
    user.permissions.includes(`${module}.manage`)
  );
}

function canSeeAnyModule(user: AuthenticatedUser, modules: string[]): boolean {
  return modules.some((m) => canSeeModule(user, m));
}

export type ReportStockSnapshots = {
  entering_paddy: {
    totalEnteredKg: string;
    totalRemainingKg: string;
    entryCount: number;
  } | null;
  paddy_warehouse: {
    companyAvailableKg: string;
    farmerPaddyKg: string;
    totalStockKg: string;
    varieties: Array<{
      variety: string;
      companyWeightKg: string;
      farmerWeightKg: string;
      totalWeightKg: string;
    }>;
  } | null;
  paddy_process: {
    availableCompanyPaddyKg: string;
    processedTotalKg: string;
  } | null;
  rice_warehouse: {
    currentStockKg: string;
    varieties: Array<{ variety: string; currentStockKg: string }>;
  } | null;
  process_rice: {
    note: string;
    linkedRiceStockKg: string;
  } | null;
  store: {
    totalAvailableKg: string;
    byStoreType: Array<{
      storeType: string;
      totalWeightKg: string;
      soldWeightKg: string;
      availableWeightKg: string;
    }>;
  } | null;
  cash: {
    byCurrency: Array<{
      currencyCode: string;
      currencyName: string;
      cashIn: string;
      cashOut: string;
      balance: string;
      transactionCount: number;
    }>;
  } | null;
  sarafi: {
    byCurrency: Array<{
      currencyCode: string;
      currencyName: string;
      balance: string;
      entryCount: number;
    }>;
  } | null;
};

@Injectable()
export class ReportSnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cashService: CashService,
    private readonly riceSaleService: RiceSaleService,
    private readonly stockSyncService: StockSyncService,
  ) {}

  async buildStockAndBalances(
    user: AuthenticatedUser,
    seasonId: string,
  ): Promise<ReportStockSnapshots> {
    const prisma = this.prisma as unknown as {
      enteringPaddy: { findMany: (a: object) => Promise<any[]> };
      companyOwnedPaddyWarehouse: { findMany: (a: object) => Promise<any[]> };
      farmerOwnedPaddyWarehouse: { findMany: (a: object) => Promise<any[]> };
      paddyProcess: { findMany: (a: object) => Promise<any[]> };
      processRiceEntry: { findMany: (a: object) => Promise<any[]> };
    };

    const result: ReportStockSnapshots = {
      entering_paddy: null,
      paddy_warehouse: null,
      paddy_process: null,
      rice_warehouse: null,
      process_rice: null,
      store: null,
      cash: null,
      sarafi: null,
    };

    if (canSeeModule(user, 'entering_paddy')) {
      const entries = await prisma.enteringPaddy.findMany({
        where: { seasonId },
        select: {
          totalWeightKg: true,
          companyOwnedPaddyWarehouse: {
            select: { quantity: true, unit: true },
          },
          farmerOwnedPaddyWarehouse: {
            select: { paddyQuantity: true, unit: true },
          },
        },
      });

      let totalEntered = new Prisma.Decimal(0);
      let totalRemaining = new Prisma.Decimal(0);

      for (const entry of entries) {
        const totalKg = new Prisma.Decimal(entry.totalWeightKg);
        totalEntered = totalEntered.plus(totalKg);

        let trackedKg = new Prisma.Decimal(0);
        if (entry.companyOwnedPaddyWarehouse) {
          trackedKg = toKilograms(
            new Prisma.Decimal(entry.companyOwnedPaddyWarehouse.quantity),
            entry.companyOwnedPaddyWarehouse.unit,
          );
        } else if (entry.farmerOwnedPaddyWarehouse) {
          trackedKg = toKilograms(
            new Prisma.Decimal(entry.farmerOwnedPaddyWarehouse.paddyQuantity),
            entry.farmerOwnedPaddyWarehouse.unit,
          );
        }

        totalRemaining = totalRemaining.plus(
          Prisma.Decimal.max(totalKg.minus(trackedKg), 0),
        );
      }

      result.entering_paddy = {
        totalEnteredKg: totalEntered.toFixed(2),
        totalRemainingKg: totalRemaining.toFixed(2),
        entryCount: entries.length,
      };
    }

    if (canSeeModule(user, 'paddy_warehouses')) {
      const [companyEntries, farmerEntries, processEntries, varietyRows] =
        await Promise.all([
          prisma.companyOwnedPaddyWarehouse.findMany({
            where: { seasonId },
            select: { quantity: true, unit: true },
          }),
          prisma.farmerOwnedPaddyWarehouse.findMany({
            where: { seasonId },
            select: { paddyQuantity: true, riceQuantity: true, unit: true },
          }),
          prisma.paddyProcess.findMany({
            where: { seasonId },
            select: { processedWeightKg: true },
          }),
          this.stockSyncService.getPaddyVarietyStockRows(seasonId),
        ]);

      const companyTotals = companyEntries.reduce(
        (sum: Prisma.Decimal, e: { quantity: Prisma.Decimal; unit: string }) =>
          sum.plus(toKilograms(new Prisma.Decimal(e.quantity), e.unit)),
        new Prisma.Decimal(0),
      );

      const processTotals = processEntries.reduce(
        (sum: Prisma.Decimal, e: { processedWeightKg: Prisma.Decimal }) =>
          sum.plus(new Prisma.Decimal(e.processedWeightKg)),
        new Prisma.Decimal(0),
      );

      const farmerPaddyKg = farmerEntries.reduce(
        (
          sum: Prisma.Decimal,
          e: { paddyQuantity: Prisma.Decimal; unit: string },
        ) => sum.plus(toKilograms(new Prisma.Decimal(e.paddyQuantity), e.unit)),
        new Prisma.Decimal(0),
      );

      const companyAvailableKg = Prisma.Decimal.max(
        companyTotals.minus(processTotals),
        0,
      );

      const totalStockKg = companyAvailableKg.plus(farmerPaddyKg);

      result.paddy_warehouse = {
        companyAvailableKg: companyAvailableKg.toFixed(2),
        farmerPaddyKg: farmerPaddyKg.toFixed(2),
        totalStockKg: totalStockKg.toFixed(2),
        varieties: varietyRows.map((row) => ({
          variety: row.variety,
          companyWeightKg: new Prisma.Decimal(row.companyWeightKg).toFixed(2),
          farmerWeightKg: new Prisma.Decimal(row.farmerWeightKg).toFixed(2),
          totalWeightKg: new Prisma.Decimal(row.totalWeightKg).toFixed(2),
        })),
      };
    }

    if (canSeeModule(user, 'paddy_processes')) {
      const [processes, companyEntries] = await Promise.all([
        prisma.paddyProcess.findMany({
          where: { seasonId },
          select: { processedWeightKg: true },
        }),
        prisma.companyOwnedPaddyWarehouse.findMany({
          where: { seasonId },
          select: { quantity: true, unit: true },
        }),
      ]);

      const processedTotalKg = processes.reduce(
        (sum: Prisma.Decimal, p: { processedWeightKg: Prisma.Decimal }) =>
          sum.plus(new Prisma.Decimal(p.processedWeightKg)),
        new Prisma.Decimal(0),
      );

      const totalCompanyKg = companyEntries.reduce(
        (sum: Prisma.Decimal, e: { quantity: Prisma.Decimal; unit: string }) =>
          sum.plus(toKilograms(new Prisma.Decimal(e.quantity), e.unit)),
        new Prisma.Decimal(0),
      );

      const availableCompanyPaddyKg = Prisma.Decimal.max(
        totalCompanyKg.minus(processedTotalKg),
        0,
      );

      result.paddy_process = {
        availableCompanyPaddyKg: availableCompanyPaddyKg.toFixed(2),
        processedTotalKg: processedTotalKg.toFixed(2),
      };
    }

    if (canSeeModule(user, 'rice_warehouses')) {
      const varietyNames = new Set<string>();

      const [warehouseRows, processRows] = await Promise.all([
        (this.prisma as any).riceWarehouse.findMany({
          where: { seasonId },
          select: { variety: true },
          distinct: ['variety'],
        }),
        prisma.processRiceEntry.findMany({
          where: { seasonId },
          select: { variety: true },
          distinct: ['variety'],
        }),
      ]);

      for (const row of warehouseRows) {
        if (row.variety?.trim()) varietyNames.add(row.variety.trim());
      }
      for (const row of processRows) {
        if (row.variety?.trim()) varietyNames.add(row.variety.trim());
      }

      const riceVarietyStockRows =
        await this.stockSyncService.getRiceVarietyStockRows(seasonId);
      for (const row of riceVarietyStockRows) {
        if (row.variety?.trim()) varietyNames.add(row.variety.trim());
      }

      const varieties: Array<{ variety: string; currentStockKg: string }> = [];
      let currentStockKg = new Prisma.Decimal(0);

      // Book remaining (same idea as rice warehouse dashboard) — include zeros/negatives
      // so the report stock balance is visible even after overselling.
      for (const variety of [...varietyNames].sort()) {
        const kg = await this.riceSaleService.getAvailableRiceVarietyKg({
          seasonId,
          riceVariety: variety,
          floorAtZero: false,
        });
        varieties.push({
          variety,
          currentStockKg: kg.toFixed(2),
        });
        currentStockKg = currentStockKg.plus(kg);
      }

      result.rice_warehouse = {
        currentStockKg: currentStockKg.toFixed(2),
        varieties,
      };
    }

    if (canSeeModule(user, 'process_rice')) {
      const linkedKg =
        result.rice_warehouse?.currentStockKg ??
        (await this.summarizeRiceStockKg(seasonId)).toFixed(2);

      result.process_rice = {
        note: 'process_rice_stock_in_rice_warehouse',
        linkedRiceStockKg: linkedKg,
      };
    }

    if (canSeeModule(user, 'stores')) {
      const varietyStockRows = await this.prisma.$queryRaw<
        Array<{
          storeType: string;
          totalWeightKg: string;
          soldWeightKg: string;
        }>
      >(Prisma.sql`
        SELECT
          svs."store_type"::text AS "storeType",
          svs."total_weight_kg"::text AS "totalWeightKg",
          svs."sold_weight_kg"::text AS "soldWeightKg"
        FROM "store_variety_stocks" svs
        WHERE svs."season_id" = ${seasonId}
      `);

      const byTypeMap = new Map<
        string,
        { total: Prisma.Decimal; sold: Prisma.Decimal }
      >();

      for (const row of varietyStockRows) {
        const current = byTypeMap.get(row.storeType) ?? {
          total: new Prisma.Decimal(0),
          sold: new Prisma.Decimal(0),
        };
        current.total = current.total.plus(
          new Prisma.Decimal(row.totalWeightKg),
        );
        current.sold = current.sold.plus(new Prisma.Decimal(row.soldWeightKg));
        byTypeMap.set(row.storeType, current);
      }

      let totalAvailable = new Prisma.Decimal(0);
      const byStoreType = ALL_STORE_TYPES.map((storeType) => {
        const totals = byTypeMap.get(storeType) ?? {
          total: new Prisma.Decimal(0),
          sold: new Prisma.Decimal(0),
        };
        const available = Prisma.Decimal.max(
          totals.total.minus(totals.sold),
          0,
        );
        totalAvailable = totalAvailable.plus(available);
        return {
          storeType,
          totalWeightKg: totals.total.toFixed(2),
          soldWeightKg: totals.sold.toFixed(2),
          availableWeightKg: available.toFixed(2),
        };
      });

      result.store = {
        totalAvailableKg: totalAvailable.toFixed(2),
        byStoreType,
      };
    }

    if (canSeeModule(user, 'cash')) {
      const dashboard = await this.cashService.getDashboard(seasonId);
      result.cash = {
        byCurrency: (dashboard.currencyBalances ?? []).map((row) => ({
          currencyCode: row.currencyCode,
          currencyName: row.currencyName,
          cashIn: row.cashIn,
          cashOut: row.cashOut,
          balance: row.balance,
          transactionCount: row.transactionCount,
        })),
      };
    }

    if (canSeeAnyModule(user, ['sarafi', 'sarafi_ledgers'])) {
      const rows = await this.prisma.$queryRaw<
        Array<{
          currencyCode: string;
          currencyName: string;
          entryCount: bigint;
          balance: Prisma.Decimal | null;
        }>
      >(Prisma.sql`
        SELECT
          c."code"::text AS "currencyCode",
          c."name" AS "currencyName",
          COUNT(*)::bigint AS "entryCount",
          COALESCE(SUM(e."amount"), 0)::decimal AS "balance"
        FROM "saraf_ledger_entries" e
        INNER JOIN "sarafs" s ON s."id" = e."saraf_id"
        INNER JOIN "currencies" c ON c."id" = e."currency_id"
        WHERE s."season_id" = ${seasonId}
        GROUP BY c."id", c."code", c."name"
        ORDER BY c."code" ASC
      `);

      result.sarafi = {
        byCurrency: rows.map((r) => ({
          currencyCode: r.currencyCode,
          currencyName: r.currencyName,
          balance: decStr(r.balance),
          entryCount: Number(r.entryCount),
        })),
      };
    }

    return result;
  }

  private async summarizeRiceStockKg(
    seasonId: string,
  ): Promise<Prisma.Decimal> {
    const rows = await this.stockSyncService.getRiceVarietyStockRows(seasonId);
    let total = new Prisma.Decimal(0);
    for (const row of rows) {
      const kg = await this.riceSaleService.getAvailableRiceVarietyKg({
        seasonId,
        riceVariety: row.variety,
      });
      total = total.plus(kg);
    }
    return total;
  }
}
