import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toKilograms } from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { resolvePaddyProcessWarehouseBucket } from '../paddy-process/paddy-process.constants.js';

@Injectable()
export class StockSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async applyPaddyVarietyStockDelta(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: string;
      seasonName: string;
      variety: string;
      companyWeightKgDelta: Prisma.Decimal;
      farmerWeightKgDelta: Prisma.Decimal;
      entryCountDelta: number;
    },
  ) {
    const variety = params.variety.trim();

    if (!variety) {
      throw new BadRequestException('variety is required for paddy stock');
    }

    const companyDelta = params.companyWeightKgDelta;
    const farmerDelta = params.farmerWeightKgDelta;
    const companyInsert = Prisma.Decimal.max(companyDelta, 0);
    const farmerInsert = Prisma.Decimal.max(farmerDelta, 0);
    const totalInsert = companyInsert.plus(farmerInsert);

    if (
      companyDelta.isZero() &&
      farmerDelta.isZero() &&
      params.entryCountDelta === 0
    ) {
      return;
    }

    const updated = await tx.$queryRaw<
      Array<{
        companyWeightKg: string;
        farmerWeightKg: string;
        totalWeightKg: string;
      }>
    >(Prisma.sql`
      INSERT INTO "paddy_variety_stocks" (
        "season_id",
        "season_name",
        "variety",
        "company_weight_kg",
        "farmer_weight_kg",
        "total_weight_kg",
        "entry_count",
        "updated_at"
      )
      VALUES (
        ${params.seasonId},
        ${params.seasonName},
        ${variety},
        ${companyInsert},
        ${farmerInsert},
        ${totalInsert},
        ${Math.max(params.entryCountDelta, 0)},
        NOW()
      )
      ON CONFLICT ("season_id", "variety")
      DO UPDATE SET
        "company_weight_kg" = GREATEST("paddy_variety_stocks"."company_weight_kg" + ${companyDelta}, 0),
        "farmer_weight_kg" = GREATEST("paddy_variety_stocks"."farmer_weight_kg" + ${farmerDelta}, 0),
        "total_weight_kg" = GREATEST("paddy_variety_stocks"."company_weight_kg" + ${companyDelta}, 0)
          + GREATEST("paddy_variety_stocks"."farmer_weight_kg" + ${farmerDelta}, 0),
        "entry_count" = "paddy_variety_stocks"."entry_count" + ${params.entryCountDelta},
        "season_name" = EXCLUDED."season_name",
        "updated_at" = NOW()
      RETURNING
        "company_weight_kg"::text AS "companyWeightKg",
        "farmer_weight_kg"::text AS "farmerWeightKg",
        "total_weight_kg"::text AS "totalWeightKg"
    `);

    const result = updated[0];

    if (result) {
      const company = new Prisma.Decimal(result.companyWeightKg);
      const farmer = new Prisma.Decimal(result.farmerWeightKg);
      const total = new Prisma.Decimal(result.totalWeightKg);

      if (company.lessThan(0) || farmer.lessThan(0) || total.lessThan(0)) {
        throw new BadRequestException(
          'Paddy stock cannot be reduced below zero',
        );
      }

      if (!company.plus(farmer).equals(total)) {
        throw new BadRequestException('Paddy stock totals are inconsistent');
      }
    }

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "paddy_variety_stocks"
      WHERE "season_id" = ${params.seasonId}
        AND "variety" = ${variety}
        AND "total_weight_kg" <= 0
        AND "entry_count" <= 0
    `);
  }

  async applyRiceVarietyStockDelta(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: string;
      seasonName: string;
      variety: string;
      totalWeightKgDelta: Prisma.Decimal;
      entryCountDelta: number;
    },
  ) {
    const variety = params.variety.trim();

    if (!variety) {
      throw new BadRequestException('variety is required for rice stock');
    }

    if (params.totalWeightKgDelta.isZero() && params.entryCountDelta === 0) {
      return;
    }

    const updated = await tx.$queryRaw<
      Array<{ totalWeightKg: string }>
    >(Prisma.sql`
      INSERT INTO "rice_variety_stocks" (
        "season_id",
        "season_name",
        "variety",
        "total_weight_kg",
        "entry_count",
        "updated_at"
      )
      VALUES (
        ${params.seasonId},
        ${params.seasonName},
        ${variety},
        ${Prisma.Decimal.max(params.totalWeightKgDelta, 0)},
        ${Math.max(params.entryCountDelta, 0)},
        NOW()
      )
      ON CONFLICT ("season_id", "variety")
      DO UPDATE SET
        "total_weight_kg" = "rice_variety_stocks"."total_weight_kg" + ${params.totalWeightKgDelta},
        "entry_count" = "rice_variety_stocks"."entry_count" + ${params.entryCountDelta},
        "season_name" = EXCLUDED."season_name",
        "updated_at" = NOW()
      RETURNING "total_weight_kg"::text AS "totalWeightKg"
    `);

    const result = updated[0];
    if (result && new Prisma.Decimal(result.totalWeightKg).lessThan(0)) {
      throw new BadRequestException('Rice stock cannot be reduced below zero');
    }

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "rice_variety_stocks"
      WHERE "season_id" = ${params.seasonId}
        AND "variety" = ${variety}
        AND "total_weight_kg" <= 0
        AND "entry_count" <= 0
    `);
  }

  /**
   * Returns true when warehouse totals and paddy_variety_stocks are out of sync
   * (e.g. company rows exist but farmer_weight_kg was never backfilled).
   */
  async getPaddyVarietyCompanyAvailableKg(seasonId: string, variety: string) {
    const normalizedVariety = variety.trim();

    if (!normalizedVariety) {
      return new Prisma.Decimal(0);
    }

    const rows = await this.getPaddyVarietyStockRows(seasonId);
    const row = rows.find((item) => item.variety.trim() === normalizedVariety);

    return row
      ? new Prisma.Decimal(row.companyWeightKg)
      : new Prisma.Decimal(0);
  }

  async getPaddyVarietyFarmerAvailableKg(seasonId: string, variety: string) {
    const normalizedVariety = variety.trim();

    if (!normalizedVariety) {
      return new Prisma.Decimal(0);
    }

    const rows = await this.getPaddyVarietyStockRows(seasonId);
    const row = rows.find((item) => item.variety.trim() === normalizedVariety);

    return row ? new Prisma.Decimal(row.farmerWeightKg) : new Prisma.Decimal(0);
  }

  async ensurePaddyVarietyStocksSynced(seasonId: string) {
    if (await this.paddyVarietyStockNeedsRebuild(seasonId)) {
      await this.rebuildPaddyVarietyStocksForSeason(seasonId);
    }
  }

  async paddyVarietyStockNeedsRebuild(seasonId: string): Promise<boolean> {
    const [companyEntries, farmerEntries, processEntries, varietyRows] =
      await Promise.all([
        this.prisma.companyOwnedPaddyWarehouse.findMany({
          where: { seasonId },
          select: { variety: true, quantity: true, unit: true },
        }),
        this.prisma.farmerOwnedPaddyWarehouse.findMany({
          where: { seasonId },
          select: { paddyVariety: true, paddyQuantity: true, unit: true },
        }),
        this.prisma.paddyProcess.findMany({
          where: { seasonId },
          select: {
            variety: true,
            processedWeightKg: true,
            stockSourceType: true,
            sourceCompanyPaddyWarehouseId: true,
            sourceFarmerPaddyWarehouseId: true,
          },
        }),
        this.getPaddyVarietyStockRows(seasonId),
      ]);

    if (companyEntries.length === 0 && farmerEntries.length === 0) {
      return varietyRows.length > 0;
    }

    if (varietyRows.length === 0) {
      return true;
    }

    const expected = new Map<
      string,
      { companyWeightKg: Prisma.Decimal; farmerWeightKg: Prisma.Decimal }
    >();

    const touch = (variety: string) => {
      const key = variety.trim();
      if (!key) {
        return null;
      }

      if (!expected.has(key)) {
        expected.set(key, {
          companyWeightKg: new Prisma.Decimal(0),
          farmerWeightKg: new Prisma.Decimal(0),
        });
      }

      return expected.get(key)!;
    };

    for (const entry of companyEntries) {
      const bucket = touch(entry.variety);
      if (!bucket) {
        continue;
      }

      bucket.companyWeightKg = bucket.companyWeightKg.plus(
        toKilograms(new Prisma.Decimal(entry.quantity), entry.unit),
      );
    }

    for (const entry of farmerEntries) {
      const bucket = touch(entry.paddyVariety);
      if (!bucket) {
        continue;
      }

      bucket.farmerWeightKg = bucket.farmerWeightKg.plus(
        toKilograms(new Prisma.Decimal(entry.paddyQuantity), entry.unit),
      );
    }

    for (const entry of processEntries) {
      const bucket = touch(entry.variety);
      if (!bucket) {
        continue;
      }

      const processedWeightKg = new Prisma.Decimal(entry.processedWeightKg);
      const warehouseBucket = resolvePaddyProcessWarehouseBucket(entry);

      if (warehouseBucket === 'store') {
        continue;
      }

      if (warehouseBucket === 'farmer') {
        bucket.farmerWeightKg = bucket.farmerWeightKg.minus(processedWeightKg);
      } else {
        bucket.companyWeightKg =
          bucket.companyWeightKg.minus(processedWeightKg);
      }
    }

    const stockByVariety = new Map(
      varietyRows.map((row) => [
        row.variety.trim(),
        {
          companyWeightKg: new Prisma.Decimal(row.companyWeightKg),
          farmerWeightKg: new Prisma.Decimal(row.farmerWeightKg),
        },
      ]),
    );

    for (const [variety, totals] of expected.entries()) {
      const stock = stockByVariety.get(variety);

      if (!stock) {
        return true;
      }

      if (
        !stock.companyWeightKg.equals(totals.companyWeightKg) ||
        !stock.farmerWeightKg.equals(totals.farmerWeightKg)
      ) {
        return true;
      }

      stockByVariety.delete(variety);
    }

    return stockByVariety.size > 0;
  }

  /**
   * Rebuilds paddy_variety_stocks for a season from warehouse entry tables.
   * Use when stock rows are missing but purchases/movements exist (e.g. pre-migration data).
   */
  async rebuildPaddyVarietyStocksForSeason(seasonId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true, name: true },
    });

    if (!season) {
      return;
    }

    const [companyEntries, farmerEntries, processEntries] = await Promise.all([
      this.prisma.companyOwnedPaddyWarehouse.findMany({
        where: { seasonId },
        select: { variety: true, quantity: true, unit: true },
      }),
      this.prisma.farmerOwnedPaddyWarehouse.findMany({
        where: { seasonId },
        select: { paddyVariety: true, paddyQuantity: true, unit: true },
      }),
      this.prisma.paddyProcess.findMany({
        where: { seasonId },
        select: {
          variety: true,
          processedWeightKg: true,
          stockSourceType: true,
          sourceCompanyPaddyWarehouseId: true,
          sourceFarmerPaddyWarehouseId: true,
        },
      }),
    ]);

    const aggregates = new Map<
      string,
      {
        companyWeightKg: Prisma.Decimal;
        farmerWeightKg: Prisma.Decimal;
        entryCount: number;
      }
    >();

    const touch = (variety: string) => {
      const key = variety.trim();
      if (!key) {
        return null;
      }

      if (!aggregates.has(key)) {
        aggregates.set(key, {
          companyWeightKg: new Prisma.Decimal(0),
          farmerWeightKg: new Prisma.Decimal(0),
          entryCount: 0,
        });
      }

      return aggregates.get(key)!;
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
      const bucket = touch(entry.paddyVariety);
      if (!bucket) {
        continue;
      }

      bucket.farmerWeightKg = bucket.farmerWeightKg.plus(
        toKilograms(new Prisma.Decimal(entry.paddyQuantity), entry.unit),
      );
      bucket.entryCount += 1;
    }

    for (const entry of processEntries) {
      const bucket = touch(entry.variety);
      if (!bucket) {
        continue;
      }

      const processedWeightKg = new Prisma.Decimal(entry.processedWeightKg);
      const warehouseBucket = resolvePaddyProcessWarehouseBucket(entry);

      if (warehouseBucket === 'store') {
        continue;
      }

      if (warehouseBucket === 'farmer') {
        bucket.farmerWeightKg = bucket.farmerWeightKg.minus(processedWeightKg);
      } else {
        bucket.companyWeightKg =
          bucket.companyWeightKg.minus(processedWeightKg);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`
          DELETE FROM "paddy_variety_stocks"
          WHERE "season_id" = ${seasonId}
        `,
      );

      for (const [variety, totals] of aggregates.entries()) {
        const companyWeightKg = Prisma.Decimal.max(totals.companyWeightKg, 0);
        const farmerWeightKg = Prisma.Decimal.max(totals.farmerWeightKg, 0);

        if (companyWeightKg.isZero() && farmerWeightKg.isZero()) {
          continue;
        }

        await this.applyPaddyVarietyStockDelta(tx, {
          seasonId,
          seasonName: season.name,
          variety,
          companyWeightKgDelta: companyWeightKg,
          farmerWeightKgDelta: farmerWeightKg,
          entryCountDelta: totals.entryCount,
        });
      }
    });
  }

  async getPaddyVarietyStockRows(seasonId: string) {
    return this.prisma.$queryRaw<
      Array<{
        variety: string;
        companyWeightKg: string;
        farmerWeightKg: string;
        totalWeightKg: string;
        entryCount: number;
      }>
    >(Prisma.sql`
      SELECT
        pvs."variety" AS "variety",
        pvs."company_weight_kg"::text AS "companyWeightKg",
        pvs."farmer_weight_kg"::text AS "farmerWeightKg",
        pvs."total_weight_kg"::text AS "totalWeightKg",
        pvs."entry_count" AS "entryCount"
      FROM "paddy_variety_stocks" pvs
      WHERE pvs."season_id" = ${seasonId}
      ORDER BY pvs."total_weight_kg" DESC, pvs."variety" ASC
    `);
  }

  async getRiceVarietyStockRows(seasonId: string) {
    return this.prisma.$queryRaw<
      Array<{
        variety: string;
        totalWeightKg: string;
        entryCount: number;
      }>
    >(Prisma.sql`
      SELECT
        rvs."variety" AS "variety",
        rvs."total_weight_kg"::text AS "totalWeightKg",
        rvs."entry_count" AS "entryCount"
      FROM "rice_variety_stocks" rvs
      WHERE rvs."season_id" = ${seasonId}
      ORDER BY rvs."total_weight_kg" DESC, rvs."variety" ASC
    `);
  }
}
