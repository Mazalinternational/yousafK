import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toKilograms } from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateStoreEntryDto } from './dto/create-store-entry.dto.js';
import { FindStoreEntriesQueryDto } from './dto/find-store-entries-query.dto.js';
import { SellStoreEntryDto } from './dto/sell-store-entry.dto.js';
import { StoreDashboardDto } from './dto/store-dashboard.dto.js';
import { UpdateStoreEntryDto } from './dto/update-store-entry.dto.js';
import {
  isPooledStoreType,
  POOLED_SALE_VARIETY,
  type StoreTypeValue,
} from './store.constants.js';

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly currencyService: CurrencyService,
    private readonly sarafLedgerService: SarafLedgerService,
  ) {}

  private get paddyProcessModel() {
    return (this.prisma as any).paddyProcess;
  }

  async create(createStoreEntryDto: CreateStoreEntryDto) {
    const storeType = this.normalizeStoreType(createStoreEntryDto.storeType);

    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const sourcePaddyProcess = await this.requireSourcePaddyProcess(
      createStoreEntryDto.sourcePaddyProcessId,
      activeSeason.id,
    );
    await this.assertSourcePaddyProcessCompleted(sourcePaddyProcess.id);
    await this.ensureStoreTypeSourceAvailable(storeType, sourcePaddyProcess.id);

    const weight = this.parseDecimal(createStoreEntryDto.weight, 'weight');
    const unit = sourcePaddyProcess.unit;
    const processedWeightKg = toKilograms(weight, unit);
    await this.assertProcessWeightAvailable(
      sourcePaddyProcess.id,
      processedWeightKg,
      new Prisma.Decimal(sourcePaddyProcess.processedWeightKg),
    );

    const processBillNo = sourcePaddyProcess.billNo?.trim();

    if (!processBillNo) {
      throw new BadRequestException(
        'Source paddy process must have a bill number before it can be added to store',
      );
    }

    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
      storeType,
    );

    const variety = sourcePaddyProcess.variety?.trim();

    if (!variety) {
      throw new BadRequestException(
        'Source paddy process must have a variety before it can be added to store',
      );
    }

    const entryId = await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO "store_entries" (
          "store_type",
          "source_paddy_process_id",
          "processed_bill_no",
          "process_bill_no",
          "bill_no",
          "date",
          "variety",
          "weight",
          "sold_weight",
          "unit",
          "processed_weight_kg",
          "status",
          "sale_amount",
          "paid_in_cash",
          "payment_channel",
          "owner_name",
          "season_id",
          "season_name",
          "updated_at"
        )
        VALUES (
          ${storeType}::"StoreType",
          ${sourcePaddyProcess.id},
          ${processBillNo},
          ${processBillNo},
          ${billNo},
          ${sourcePaddyProcess.date},
          ${variety},
          ${weight},
          ${0},
          ${unit},
          ${processedWeightKg},
          ${'stock'}::"StoreEntryStatus",
          ${0},
          ${false},
          ${'cash'}::"RiceSalePaymentChannel",
          ${
            sourcePaddyProcess.sourceCompanyPaddyWarehouse?.ownerName ??
            sourcePaddyProcess.sourceFarmerPaddyWarehouse?.ownerName ??
            ''
          },
          ${activeSeason.id},
          ${activeSeason.name},
          NOW()
        )
        RETURNING "id"
      `);

      await this.applyVarietyStockDelta(tx, {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        storeType,
        variety,
        weightKgDelta: processedWeightKg,
        entryCountDelta: 1,
      });

      return inserted[0].id;
    });

    return this.findOne(String(entryId));
  }

  async sell(id: string, sellStoreEntryDto: SellStoreEntryDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const remainingWeight = this.getRemainingWeight(
      current.weight,
      current.soldWeight,
    );

    if (remainingWeight.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'This store entry has no remaining stock to sell',
      );
    }

    const soldWeightIncrement = this.parseDecimal(
      sellStoreEntryDto.soldWeight,
      'soldWeight',
    );
    const saleAmount = this.parseDecimal(
      sellStoreEntryDto.saleAmount,
      'saleAmount',
    );

    if (soldWeightIncrement.greaterThan(remainingWeight)) {
      throw new BadRequestException(
        `Sold weight cannot exceed remaining stock (${remainingWeight.toFixed(2)} ${current.unit})`,
      );
    }
    const paymentChannel = this.normalizePaymentChannel(
      sellStoreEntryDto.paymentChannel,
    );
    const paidInCash = paymentChannel === 'cash';
    const sarafIdTrimmed = sellStoreEntryDto.sarafId?.trim() ?? '';
    const currencyIdTrimmed =
      sellStoreEntryDto.sarafLedgerCurrencyId?.trim() ?? '';

    if (paymentChannel === 'cash' && (sarafIdTrimmed || currencyIdTrimmed)) {
      throw new BadRequestException(
        'Saraf and currency must be omitted when cash payment is selected',
      );
    }

    let sarafIdBig: bigint | null = null;
    let resolvedSarafCurrencyId: string | null = null;

    if (paymentChannel === 'saraf') {
      if (!sarafIdTrimmed) {
        throw new BadRequestException(
          'sarafId is required when Pay to Saraf is selected',
        );
      }

      if (!currencyIdTrimmed) {
        throw new BadRequestException(
          'sarafLedgerCurrencyId is required when Pay to Saraf is selected',
        );
      }

      sarafIdBig = this.parseId(sarafIdTrimmed);
      resolvedSarafCurrencyId =
        await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);

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

      if (saraf.seasonId !== current.seasonId) {
        throw new BadRequestException(
          'Selected Saraf must belong to the same season as the store entry',
        );
      }

      if (!saraf.ledger) {
        throw new BadRequestException(
          'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
        );
      }
    }

    const soldAt = new Date();
    const currentSoldWeight = new Prisma.Decimal(current.soldWeight);
    const currentWeight = new Prisma.Decimal(current.weight);
    const newSoldWeight = currentSoldWeight.plus(soldWeightIncrement);
    const newSaleAmount = new Prisma.Decimal(current.saleAmount).plus(
      saleAmount,
    );
    const newStatus = newSoldWeight.greaterThanOrEqualTo(currentWeight)
      ? 'sold'
      : 'stock';

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "store_entries"
        SET
          "status" = ${newStatus}::"StoreEntryStatus",
          "sold_weight" = ${newSoldWeight},
          "sale_amount" = ${newSaleAmount},
          "paid_in_cash" = ${paidInCash},
          "payment_channel" = ${paymentChannel}::"RiceSalePaymentChannel",
          "saraf_id" = ${paymentChannel === 'saraf' ? sarafIdBig : null},
          "saraf_ledger_currency_id" = ${paymentChannel === 'saraf' ? resolvedSarafCurrencyId : null},
          "updated_at" = NOW()
        WHERE "id" = ${this.parseId(id)}
      `);

      await this.applyVarietyStockDelta(tx, {
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        storeType: this.normalizeStoreType(current.storeType),
        variety: current.variety.trim(),
        weightKgDelta: new Prisma.Decimal(0),
        soldWeightKgDelta: toKilograms(soldWeightIncrement, current.unit),
        entryCountDelta: 0,
      });

      if (paymentChannel === 'saraf' && sarafIdBig && resolvedSarafCurrencyId) {
        await this.sarafLedgerService.createLinkedStoreSaleEntry(tx, {
          sarafId: sarafIdBig,
          currencyId: resolvedSarafCurrencyId,
          amount: saleAmount,
          occurredAt: soldAt,
          notes: `Store sale ${current.billNo} (${soldWeightIncrement.toFixed(2)} ${current.unit})`,
          storeEntryId: this.parseId(id),
        });
      }
    });

    return this.findOne(id);
  }

  async findAll(filters: FindStoreEntriesQueryDto = {}) {
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
      'processedBillNo',
      'processBillNo',
      'status',
      'variety',
      'weight',
      'saleAmount',
      'paymentChannel',
      'ownerName',
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const storeType = filters.storeType
      ? this.normalizeStoreType(filters.storeType)
      : undefined;
    const storeSortMap: Record<(typeof allowedSortFields)[number], string> = {
      date: 'se."date"',
      billNo: 'se."bill_no"',
      processedBillNo: 'se."processed_bill_no"',
      processBillNo: 'se."process_bill_no"',
      status: 'se."status"',
      variety: 'se."variety"',
      weight: 'se."weight"',
      saleAmount: 'se."sale_amount"',
      paymentChannel: 'se."payment_channel"',
      ownerName: 'se."owner_name"',
      seasonName: 'se."season_name"',
      createdAt: 'se."created_at"',
      updatedAt: 'se."updated_at"',
    };
    const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];

    if (filters.seasonId) {
      conditions.push(Prisma.sql`se."season_id" = ${filters.seasonId}`);
    }

    if (storeType) {
      conditions.push(Prisma.sql`se."store_type" = ${storeType}::"StoreType"`);
    }

    if (query) {
      const likeValue = `%${query}%`;
      conditions.push(Prisma.sql`
        (
          se."bill_no" ILIKE ${likeValue}
          OR se."processed_bill_no" ILIKE ${likeValue}
          OR se."process_bill_no" ILIKE ${likeValue}
          OR se."variety" ILIKE ${likeValue}
          OR se."owner_name" ILIKE ${likeValue}
          OR se."season_name" ILIKE ${likeValue}
        )
      `);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const orderBySql = Prisma.raw(storeSortMap[sortBy]);
    const orderDirectionSql = Prisma.raw(
      sortDirection === 'asc' ? ' ASC' : ' DESC',
    );

    const items = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        se."id"::text AS "id",
        se."store_type"::text AS "storeType",
        se."source_paddy_process_id"::text AS "sourcePaddyProcessId",
        se."processed_bill_no" AS "processedBillNo",
        se."process_bill_no" AS "processBillNo",
        se."bill_no" AS "billNo",
        se."date" AS "date",
        se."variety" AS "variety",
        se."weight"::text AS "weight",
        se."sold_weight"::text AS "soldWeight",
        se."unit" AS "unit",
        se."processed_weight_kg"::text AS "processedWeightKg",
        se."status"::text AS "status",
        se."sale_amount"::text AS "saleAmount",
        se."paid_in_cash" AS "paidInCash",
        se."payment_channel"::text AS "paymentChannel",
        se."saraf_id"::text AS "sarafId",
        se."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
        se."owner_name" AS "ownerName",
        se."season_id" AS "seasonId",
        se."season_name" AS "seasonName",
        se."created_at" AS "createdAt",
        se."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus",
        pp."id"::text AS "processRefId",
        pp."bill_no" AS "processRefBillNo",
        pp."variety" AS "processRefVariety",
        pp."date" AS "processRefDate",
        pp."weight"::text AS "processRefWeight",
        pp."unit" AS "processRefUnit",
        pp."processed_weight_kg"::text AS "processRefProcessedWeightKg",
        COALESCE(cpw."id"::text, fpw."id"::text) AS "warehouseRefId",
        COALESCE(cpw."bill_no", fpw."bill_no") AS "warehouseRefBillNo",
        COALESCE(cpw."owner_name", fpw."owner_name") AS "warehouseRefOwnerName",
        srf."name" AS "sarafName",
        cur."code" AS "sarafCurrencyCode",
        cur."name" AS "sarafCurrencyName"
      FROM "store_entries" se
      INNER JOIN "seasons" s ON s."id" = se."season_id"
      INNER JOIN "paddy_processes" pp ON pp."id" = se."source_paddy_process_id"
      LEFT JOIN "company_owned_paddy_warehouses" cpw ON cpw."id" = pp."source_company_paddy_warehouse_id"
      LEFT JOIN "farmer_owned_paddy_warehouses" fpw ON fpw."id" = pp."source_farmer_paddy_warehouse_id"
      LEFT JOIN "sarafs" srf ON srf."id" = se."saraf_id"
      LEFT JOIN "currencies" cur ON cur."id" = se."saraf_ledger_currency_id"
      ${whereSql}
      ORDER BY ${orderBySql}${orderDirectionSql}
      LIMIT ${pageSize}
      OFFSET ${(pageNumber - 1) * pageSize}
    `);
    const totalRows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "store_entries" se
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
    const entry = await this.getStoreEntryRowById(id);

    if (!entry) {
      throw new NotFoundException(`Store entry with id "${id}" not found`);
    }

    return this.serializeRow(entry);
  }

  async update(id: string, updateStoreEntryDto: UpdateStoreEntryDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    if (new Prisma.Decimal(current.soldWeight).greaterThan(0)) {
      throw new BadRequestException(
        'Store entries with sales cannot be updated',
      );
    }

    const storeType = this.normalizeStoreType(current.storeType);

    const sourcePaddyProcess = await this.requireSourcePaddyProcess(
      updateStoreEntryDto.sourcePaddyProcessId ?? current.sourcePaddyProcessId,
      current.seasonId,
    );
    await this.ensureStoreTypeSourceAvailable(
      storeType,
      sourcePaddyProcess.id,
      current.id,
    );
    const weight = this.parseDecimal(
      updateStoreEntryDto.weight ?? current.weight,
      'weight',
    );
    const unit = sourcePaddyProcess.unit;
    const processedWeightKg = toKilograms(weight, unit);
    await this.assertProcessWeightAvailable(
      sourcePaddyProcess.id,
      processedWeightKg,
      new Prisma.Decimal(sourcePaddyProcess.processedWeightKg),
      current.id,
    );

    const newVariety = sourcePaddyProcess.variety?.trim();

    if (!newVariety) {
      throw new BadRequestException('Source paddy process must have a variety');
    }

    const oldWeightKg = new Prisma.Decimal(current.processedWeightKg);
    const oldVariety = current.variety.trim();
    const oldStoreType = this.normalizeStoreType(current.storeType);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "store_entries"
        SET
          "source_paddy_process_id" = ${sourcePaddyProcess.id},
          "processed_bill_no" = ${sourcePaddyProcess.billNo},
          "process_bill_no" = ${sourcePaddyProcess.billNo},
          "date" = ${sourcePaddyProcess.date},
          "variety" = ${newVariety},
          "weight" = ${weight},
          "unit" = ${unit},
          "processed_weight_kg" = ${processedWeightKg},
          "owner_name" = ${sourcePaddyProcess.sourceCompanyPaddyWarehouse?.ownerName ?? ''},
          "updated_at" = NOW()
        WHERE "id" = ${this.parseId(id)}
      `);

      await this.applyVarietyStockDelta(tx, {
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        storeType: oldStoreType,
        variety: oldVariety,
        weightKgDelta: oldWeightKg.negated(),
        entryCountDelta: -1,
      });

      await this.applyVarietyStockDelta(tx, {
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        storeType,
        variety: newVariety,
        weightKgDelta: processedWeightKg,
        entryCountDelta: 1,
      });
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const storeType = this.normalizeStoreType(current.storeType);
    const variety = current.variety.trim();
    const weightKg = new Prisma.Decimal(current.processedWeightKg);
    const entrySoldKg = toKilograms(
      new Prisma.Decimal(current.soldWeight),
      current.unit,
    );
    const entryId = this.parseId(id);

    const [{ remainingTotalKg, varietySaleSoldKg }] = await this.prisma
      .$queryRaw<
      Array<{ remainingTotalKg: string; varietySaleSoldKg: string }>
    >(Prisma.sql`
      SELECT
        COALESCE(
          (
            SELECT SUM(se."processed_weight_kg")
            FROM "store_entries" se
            WHERE se."season_id" = ${current.seasonId}
              AND se."store_type" = ${storeType}::"StoreType"
              AND se."variety" = ${variety}
              AND se."id" <> ${entryId}
          ),
          0
        )::text AS "remainingTotalKg",
        COALESCE(
          (
            SELECT SUM(COALESCE(svs."from_stock_weight_kg", svs."sold_weight_kg"))
            FROM "store_variety_sales" svs
            WHERE svs."season_id" = ${current.seasonId}
              AND svs."store_type" = ${storeType}::"StoreType"
              AND svs."variety" = ${variety}
          ),
          0
        )::text AS "varietySaleSoldKg"
    `);

    const remainingTotal = new Prisma.Decimal(remainingTotalKg);
    const varietySalesSold = new Prisma.Decimal(varietySaleSoldKg);

    if (varietySalesSold.greaterThan(remainingTotal)) {
      throw new BadRequestException(
        `Cannot delete this entry: ${varietySalesSold.toFixed(2)} kg has already been sold from "${variety}" via store variety sales. Remove those sales first.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM "store_entries"
        WHERE "id" = ${entryId}
      `);

      await this.applyVarietyStockDelta(tx, {
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        storeType,
        variety,
        weightKgDelta: weightKg.negated(),
        soldWeightKgDelta: entrySoldKg.negated(),
        entryCountDelta: -1,
      });
    });

    return current;
  }

  async getProcessOptions(
    seasonId: string,
    storeType: 'short_green' | 'regection' | 'broken_rice' | 'waste',
    excludeId?: string,
  ) {
    const normalizedStoreType = this.normalizeStoreType(storeType);
    await this.seasonService.findOne(seasonId);

    const existingEntries = await this.prisma.$queryRaw<
      Array<{ sourcePaddyProcessId: string }>
    >(
      Prisma.sql`
        SELECT "source_paddy_process_id"::text AS "sourcePaddyProcessId"
        FROM "store_entries"
        WHERE "season_id" = ${seasonId}
          AND "store_type" = ${normalizedStoreType}::"StoreType"
          ${excludeId ? Prisma.sql`AND "id" <> ${this.parseId(excludeId)}` : Prisma.empty}
      `,
    );

    const excludedIds = existingEntries.map((entry) =>
      BigInt(entry.sourcePaddyProcessId),
    );

    const sources = await this.paddyProcessModel.findMany({
      where: {
        seasonId,
        ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        billNo: true,
        variety: true,
        date: true,
        weight: true,
        unit: true,
        processedWeightKg: true,
        sourceCompanyPaddyWarehouse: {
          select: {
            id: true,
            billNo: true,
            ownerName: true,
          },
        },
        sourceFarmerPaddyWarehouse: {
          select: {
            id: true,
            billNo: true,
            ownerName: true,
          },
        },
      },
    });

    return {
      seasonId,
      storeType: normalizedStoreType,
      sources: sources.map((source: any) => ({
        sourcePaddyProcessId: String(source.id),
        billNo: source.billNo,
        variety: source.variety,
        date: source.date,
        weight: new Prisma.Decimal(source.weight).toFixed(2),
        unit: source.unit,
        processedWeightKg: new Prisma.Decimal(source.processedWeightKg).toFixed(
          2,
        ),
        ownerName:
          source.sourceCompanyPaddyWarehouse?.ownerName ??
          source.sourceFarmerPaddyWarehouse?.ownerName ??
          '',
        paddyWarehouseBillNo:
          source.sourceCompanyPaddyWarehouse?.billNo ??
          source.sourceFarmerPaddyWarehouse?.billNo ??
          '',
      })),
    };
  }

  private async requireSourcePaddyProcess(
    sourcePaddyProcessId: string,
    seasonId: string,
  ) {
    const source = await this.paddyProcessModel.findUnique({
      where: { id: this.parseId(sourcePaddyProcessId) },
      select: {
        id: true,
        billNo: true,
        variety: true,
        date: true,
        weight: true,
        unit: true,
        processedWeightKg: true,
        seasonId: true,
        sourceCompanyPaddyWarehouse: {
          select: {
            id: true,
            ownerName: true,
          },
        },
        sourceFarmerPaddyWarehouse: {
          select: {
            id: true,
            ownerName: true,
          },
        },
      },
    });

    if (!source) {
      throw new NotFoundException(
        `Paddy process record with id "${sourcePaddyProcessId}" not found`,
      );
    }

    if (source.seasonId !== seasonId) {
      throw new BadRequestException(
        'Selected paddy process record must belong to the same season',
      );
    }

    return source;
  }

  private async assertSourcePaddyProcessCompleted(
    sourcePaddyProcessId: bigint,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{ status: string }>
    >(Prisma.sql`
      SELECT "status"
      FROM "paddy_processes"
      WHERE "id" = ${sourcePaddyProcessId}
      LIMIT 1
    `);

    if (rows[0]?.status !== 'process_completed') {
      throw new BadRequestException(
        'Store stock can only be added after the paddy process is marked as Process Completed',
      );
    }
  }

  private async assertProcessWeightAvailable(
    sourcePaddyProcessId: bigint,
    newWeightKg: Prisma.Decimal,
    processWeightKg: Prisma.Decimal,
    excludeEntryId?: string,
  ) {
    const usageRows = await this.prisma.$queryRaw<
      Array<{ totalKg: string | null }>
    >(Prisma.sql`
      SELECT COALESCE(SUM("processed_weight_kg"), 0)::text AS "totalKg"
      FROM "store_entries"
      WHERE "source_paddy_process_id" = ${sourcePaddyProcessId}
        ${excludeEntryId ? Prisma.sql`AND "id" <> ${this.parseId(excludeEntryId)}` : Prisma.empty}
    `);

    const usedKg = new Prisma.Decimal(usageRows[0]?.totalKg ?? 0);
    const nextTotalKg = usedKg.plus(newWeightKg);

    if (nextTotalKg.greaterThan(processWeightKg)) {
      throw new BadRequestException(
        `Store weight exceeds remaining processed quantity (${usedKg.toFixed(2)} kg already allocated of ${processWeightKg.toFixed(2)} kg)`,
      );
    }
  }

  private async ensureStoreTypeSourceAvailable(
    storeType: StoreTypeValue,
    sourcePaddyProcessId: bigint,
    excludeId?: string,
  ) {
    const existing = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT "id"::text AS "id"
      FROM "store_entries"
      WHERE "store_type" = ${storeType}::"StoreType"
        AND "source_paddy_process_id" = ${sourcePaddyProcessId}
        ${excludeId ? Prisma.sql`AND "id" <> ${this.parseId(excludeId)}` : Prisma.empty}
      LIMIT 1
    `);

    if (existing.length > 0) {
      throw new BadRequestException(
        'This processed paddy bill has already been added to the selected store',
      );
    }
  }

  private async generateBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
    storeType: StoreTypeValue,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before store entries can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-${this.getStoreBillPrefix(storeType)}-`;
    const lastEntry = await this.prisma.$queryRaw<
      Array<{ billNo: string }>
    >(Prisma.sql`
      SELECT "bill_no" AS "billNo"
      FROM "store_entries"
      WHERE "season_id" = ${seasonId}
        AND "store_type" = ${storeType}::"StoreType"
        AND "bill_no" LIKE ${`${prefix}%`}
      ORDER BY "created_at" DESC
      LIMIT 1
    `);

    const nextNumber = lastEntry[0]?.billNo?.startsWith(prefix)
      ? Number(lastEntry[0].billNo.slice(prefix.length)) + 1
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

  private normalizeStoreType(value: string) {
    const storeTypes = [
      'short_green',
      'regection',
      'broken_rice',
      'waste',
    ] as const;

    if (!storeTypes.includes(value as (typeof storeTypes)[number])) {
      throw new BadRequestException('storeType is invalid');
    }

    return value as StoreTypeValue;
  }

  private normalizePaymentChannel(value?: string | null) {
    const normalized = value?.trim().toLowerCase();

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

  private async getStoreEntryRowById(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        se."id"::text AS "id",
        se."store_type"::text AS "storeType",
        se."source_paddy_process_id"::text AS "sourcePaddyProcessId",
        se."processed_bill_no" AS "processedBillNo",
        se."process_bill_no" AS "processBillNo",
        se."bill_no" AS "billNo",
        se."date" AS "date",
        se."variety" AS "variety",
        se."weight"::text AS "weight",
        se."sold_weight"::text AS "soldWeight",
        se."unit" AS "unit",
        se."processed_weight_kg"::text AS "processedWeightKg",
        se."status"::text AS "status",
        se."sale_amount"::text AS "saleAmount",
        se."paid_in_cash" AS "paidInCash",
        se."payment_channel"::text AS "paymentChannel",
        se."saraf_id"::text AS "sarafId",
        se."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
        se."owner_name" AS "ownerName",
        se."season_id" AS "seasonId",
        se."season_name" AS "seasonName",
        se."created_at" AS "createdAt",
        se."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus",
        pp."id"::text AS "processRefId",
        pp."bill_no" AS "processRefBillNo",
        pp."variety" AS "processRefVariety",
        pp."date" AS "processRefDate",
        pp."weight"::text AS "processRefWeight",
        pp."unit" AS "processRefUnit",
        pp."processed_weight_kg"::text AS "processRefProcessedWeightKg",
        COALESCE(cpw."id"::text, fpw."id"::text) AS "warehouseRefId",
        COALESCE(cpw."bill_no", fpw."bill_no") AS "warehouseRefBillNo",
        COALESCE(cpw."owner_name", fpw."owner_name") AS "warehouseRefOwnerName",
        srf."name" AS "sarafName",
        cur."code" AS "sarafCurrencyCode",
        cur."name" AS "sarafCurrencyName"
      FROM "store_entries" se
      INNER JOIN "seasons" s ON s."id" = se."season_id"
      INNER JOIN "paddy_processes" pp ON pp."id" = se."source_paddy_process_id"
      LEFT JOIN "company_owned_paddy_warehouses" cpw ON cpw."id" = pp."source_company_paddy_warehouse_id"
      LEFT JOIN "farmer_owned_paddy_warehouses" fpw ON fpw."id" = pp."source_farmer_paddy_warehouse_id"
      LEFT JOIN "sarafs" srf ON srf."id" = se."saraf_id"
      LEFT JOIN "currencies" cur ON cur."id" = se."saraf_ledger_currency_id"
      WHERE se."id" = ${this.parseId(id)}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async getDashboard(seasonId?: string): Promise<StoreDashboardDto> {
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

    const storeTypes: StoreTypeValue[] = [
      'short_green',
      'regection',
      'broken_rice',
      'waste',
    ];

    if (!activeSeason) {
      return {
        season: null,
        overview: storeTypes.map((storeType) =>
          this.emptyOverviewItem(storeType),
        ),
        varietyByStoreType: storeTypes.map((storeType) => ({
          storeType,
          varieties: [],
        })),
        recentEntries: [],
      };
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        storeType: string;
        billNo: string;
        variety: string;
        weight: string;
        unit: string;
        updatedAt: Date;
      }>
    >(Prisma.sql`
      SELECT
        se."id"::text AS "id",
        se."store_type"::text AS "storeType",
        se."bill_no" AS "billNo",
        se."variety" AS "variety",
        se."weight"::text AS "weight",
        se."unit" AS "unit",
        se."updated_at" AS "updatedAt"
      FROM "store_entries" se
      WHERE se."season_id" = ${activeSeason.id}
      ORDER BY se."updated_at" DESC
    `);

    const varietyByStoreType = await Promise.all(
      storeTypes.map(async (storeType) => {
        const stock = await this.getVarietyStock(storeType, activeSeason.id);
        return {
          storeType,
          varieties: stock.varieties,
        };
      }),
    );

    const overview = varietyByStoreType.map(({ storeType, varieties }) => {
      let totalKg = new Prisma.Decimal(0);
      let entryCount = 0;

      for (const row of varieties) {
        totalKg = totalKg.plus(new Prisma.Decimal(row.totalWeightKg));
        entryCount += Number(row.entryCount);
      }

      return {
        storeType,
        label: storeType,
        entryCount,
        totalWeightKg: totalKg.toFixed(2),
      };
    });

    const recentEntries = rows.slice(0, 12).map((row) => ({
      id: row.id,
      storeType: row.storeType,
      billNo: row.billNo,
      variety: row.variety,
      weight: new Prisma.Decimal(row.weight).toFixed(2),
      unit: row.unit,
      updatedAt: row.updatedAt.toISOString(),
    }));

    return {
      season: {
        id: activeSeason.id,
        name: activeSeason.name,
        status: activeSeason.status,
        startDate: activeSeason.startDate.toISOString(),
        endDate: activeSeason.endDate?.toISOString() ?? null,
      },
      overview,
      varietyByStoreType,
      recentEntries,
    };
  }

  async getVarietyStock(storeType: StoreTypeValue, seasonId?: string) {
    const normalizedStoreType = this.normalizeStoreType(storeType);
    const trimmedSeasonId = seasonId?.trim();
    let resolvedSeasonId: string;

    if (!trimmedSeasonId) {
      const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
      resolvedSeasonId = activeSeason.id;
    } else {
      await this.seasonService.findOne(trimmedSeasonId);
      resolvedSeasonId = trimmedSeasonId;
    }

    if (isPooledStoreType(normalizedStoreType)) {
      return this.getPooledVarietyStock(resolvedSeasonId, normalizedStoreType);
    }

    const rows = await this.fetchPerVarietyStockRows(
      resolvedSeasonId,
      normalizedStoreType,
    );

    return {
      seasonId: resolvedSeasonId,
      storeType: normalizedStoreType,
      pooled: false,
      varieties: rows.map((row) => this.serializeVarietyStockRow(row)),
    };
  }

  async getPooledAvailableKg(seasonId: string, storeType: StoreTypeValue) {
    const stock = await this.getPooledVarietyStock(seasonId, storeType);
    const row = stock.varieties[0];

    return new Prisma.Decimal(row?.availableWeightKg ?? 0);
  }

  private async getPooledVarietyStock(
    seasonId: string,
    storeType: StoreTypeValue,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        totalWeightKg: string;
        soldWeightKg: string;
        entryCount: number;
      }>
    >(Prisma.sql`
      WITH "entry_totals" AS (
        SELECT
          COALESCE(SUM(se."processed_weight_kg"), 0) AS "total_kg",
          COALESCE(
            SUM(
              CASE
                WHEN LOWER(TRIM(se."unit")) = 'ton'
                  THEN se."sold_weight" * 1000
                ELSE se."sold_weight"
              END
            ),
            0
          ) AS "entry_sold_kg",
          COUNT(*)::int AS "entry_count"
        FROM "store_entries" se
        WHERE se."season_id" = ${seasonId}
          AND se."store_type" = ${storeType}::"StoreType"
      ),
      "sale_totals" AS (
        SELECT COALESCE(SUM(COALESCE(svs."from_stock_weight_kg", svs."sold_weight_kg")), 0) AS "sale_sold_kg"
        FROM "store_variety_sales" svs
        WHERE svs."season_id" = ${seasonId}
          AND svs."store_type" = ${storeType}::"StoreType"
      ),
      "process_totals" AS (
        SELECT COALESCE(SUM(pp."processed_weight_kg"), 0) AS "process_consumed_kg"
        FROM "paddy_processes" pp
        WHERE pp."season_id" = ${seasonId}
          AND pp."stock_source_type" = ${storeType}
      )
      SELECT
        et."total_kg"::text AS "totalWeightKg",
        (et."entry_sold_kg" + st."sale_sold_kg" + pt."process_consumed_kg")::text AS "soldWeightKg",
        et."entry_count" AS "entryCount"
      FROM "entry_totals" et
      CROSS JOIN "sale_totals" st
      CROSS JOIN "process_totals" pt
    `);

    const row = rows[0] ?? {
      totalWeightKg: '0',
      soldWeightKg: '0',
      entryCount: 0,
    };

    const serialized = this.serializeVarietyStockRow({
      variety: POOLED_SALE_VARIETY,
      totalWeightKg: row.totalWeightKg,
      soldWeightKg: row.soldWeightKg,
      entryCount: row.entryCount,
    });

    return {
      seasonId,
      storeType,
      pooled: true,
      varieties: [serialized],
    };
  }

  private async fetchPerVarietyStockRows(
    seasonId: string,
    storeType: StoreTypeValue,
  ) {
    return this.prisma.$queryRaw<
      Array<{
        variety: string;
        totalWeightKg: string;
        soldWeightKg: string;
        entryCount: number;
      }>
    >(Prisma.sql`
      WITH "entry_agg" AS (
        SELECT
          se."variety" AS "variety",
          COALESCE(SUM(se."processed_weight_kg"), 0) AS "total_kg",
          COALESCE(
            SUM(
              CASE
                WHEN LOWER(TRIM(se."unit")) = 'ton'
                  THEN se."sold_weight" * 1000
                ELSE se."sold_weight"
              END
            ),
            0
          ) AS "entry_sold_kg",
          COUNT(*)::int AS "entry_count"
        FROM "store_entries" se
        WHERE se."season_id" = ${seasonId}
          AND se."store_type" = ${storeType}::"StoreType"
        GROUP BY se."variety"
      ),
      "sale_agg" AS (
        SELECT
          svs."variety" AS "variety",
          COALESCE(SUM(COALESCE(svs."from_stock_weight_kg", svs."sold_weight_kg")), 0) AS "sale_sold_kg"
        FROM "store_variety_sales" svs
        WHERE svs."season_id" = ${seasonId}
          AND svs."store_type" = ${storeType}::"StoreType"
        GROUP BY svs."variety"
      ),
      "varieties" AS (
        SELECT "variety" FROM "entry_agg"
        UNION
        SELECT "variety" FROM "sale_agg"
      )
      SELECT
        v."variety" AS "variety",
        COALESCE(e."total_kg", 0)::text AS "totalWeightKg",
        (COALESCE(e."entry_sold_kg", 0) + COALESCE(s."sale_sold_kg", 0))::text AS "soldWeightKg",
        COALESCE(e."entry_count", 0) AS "entryCount"
      FROM "varieties" v
      LEFT JOIN "entry_agg" e ON e."variety" = v."variety"
      LEFT JOIN "sale_agg" s ON s."variety" = v."variety"
      WHERE COALESCE(e."total_kg", 0) > 0
      ORDER BY v."variety" ASC
    `);
  }

  private serializeVarietyStockRow(row: {
    variety: string;
    totalWeightKg: string;
    soldWeightKg: string;
    entryCount: number;
  }) {
    const total = new Prisma.Decimal(row.totalWeightKg);
    const sold = new Prisma.Decimal(row.soldWeightKg);
    const available = Prisma.Decimal.max(total.minus(sold), 0);

    return {
      variety: row.variety,
      entryCount: Number(row.entryCount),
      totalWeightKg: total.toFixed(2),
      availableWeightKg: available.toFixed(2),
    };
  }

  async applyVarietySoldDeltaInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: string;
      seasonName: string;
      storeType: StoreTypeValue;
      variety: string;
      soldWeightKg: Prisma.Decimal;
    },
  ) {
    if (!params.soldWeightKg.greaterThan(0)) {
      return;
    }

    await this.applyVarietyStockDelta(tx, {
      seasonId: params.seasonId,
      seasonName: params.seasonName,
      storeType: params.storeType,
      variety: params.variety,
      weightKgDelta: new Prisma.Decimal(0),
      soldWeightKgDelta: params.soldWeightKg,
      entryCountDelta: 0,
    });
  }

  async applyPooledSoldDeltaInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: string;
      seasonName: string;
      storeType: StoreTypeValue;
      soldWeightKg: Prisma.Decimal;
    },
  ) {
    if (!params.soldWeightKg.greaterThan(0)) {
      return;
    }

    const stockRows = await tx.$queryRaw<
      Array<{
        variety: string;
        totalWeightKg: string;
        soldWeightKg: string;
      }>
    >(Prisma.sql`
      SELECT
        svs."variety" AS "variety",
        svs."total_weight_kg"::text AS "totalWeightKg",
        svs."sold_weight_kg"::text AS "soldWeightKg"
      FROM "store_variety_stocks" svs
      WHERE svs."season_id" = ${params.seasonId}
        AND svs."store_type" = ${params.storeType}::"StoreType"
      ORDER BY svs."variety" ASC
    `);

    let remaining = params.soldWeightKg;

    for (const row of stockRows) {
      if (remaining.lessThanOrEqualTo(0)) {
        break;
      }

      const total = new Prisma.Decimal(row.totalWeightKg);
      const sold = new Prisma.Decimal(row.soldWeightKg);
      const available = Prisma.Decimal.max(total.minus(sold), 0);

      if (available.lessThanOrEqualTo(0)) {
        continue;
      }

      const deduct = Prisma.Decimal.min(available, remaining);

      await this.applyVarietyStockDelta(tx, {
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        storeType: params.storeType,
        variety: row.variety,
        weightKgDelta: new Prisma.Decimal(0),
        soldWeightKgDelta: deduct,
        entryCountDelta: 0,
      });

      remaining = remaining.minus(deduct);
    }

    if (remaining.greaterThan(0)) {
      throw new BadRequestException(
        'Not enough combined store stock available for this sale',
      );
    }
  }

  async reverseVarietySoldDeltaInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: string;
      seasonName: string;
      storeType: StoreTypeValue;
      variety: string;
      soldWeightKg: Prisma.Decimal;
    },
  ) {
    if (!params.soldWeightKg.greaterThan(0)) {
      return;
    }

    await this.applyVarietyStockDelta(tx, {
      seasonId: params.seasonId,
      seasonName: params.seasonName,
      storeType: params.storeType,
      variety: params.variety,
      weightKgDelta: new Prisma.Decimal(0),
      soldWeightKgDelta: params.soldWeightKg.negated(),
      entryCountDelta: 0,
    });
  }

  async reversePooledSoldDeltaInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: string;
      seasonName: string;
      storeType: StoreTypeValue;
      soldWeightKg: Prisma.Decimal;
    },
  ) {
    if (!params.soldWeightKg.greaterThan(0)) {
      return;
    }

    const stockRows = await tx.$queryRaw<
      Array<{
        variety: string;
        soldWeightKg: string;
      }>
    >(Prisma.sql`
      SELECT
        svs."variety" AS "variety",
        svs."sold_weight_kg"::text AS "soldWeightKg"
      FROM "store_variety_stocks" svs
      WHERE svs."season_id" = ${params.seasonId}
        AND svs."store_type" = ${params.storeType}::"StoreType"
      ORDER BY svs."variety" DESC
    `);

    let remaining = params.soldWeightKg;

    for (const row of stockRows) {
      if (remaining.lessThanOrEqualTo(0)) {
        break;
      }

      const sold = new Prisma.Decimal(row.soldWeightKg);

      if (sold.lessThanOrEqualTo(0)) {
        continue;
      }

      const restore = Prisma.Decimal.min(sold, remaining);

      await this.applyVarietyStockDelta(tx, {
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        storeType: params.storeType,
        variety: row.variety,
        weightKgDelta: new Prisma.Decimal(0),
        soldWeightKgDelta: restore.negated(),
        entryCountDelta: 0,
      });

      remaining = remaining.minus(restore);
    }
  }

  private async applyVarietyStockDelta(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: string;
      seasonName: string;
      storeType: StoreTypeValue;
      variety: string;
      weightKgDelta: Prisma.Decimal;
      soldWeightKgDelta?: Prisma.Decimal;
      entryCountDelta: number;
    },
  ) {
    const variety = params.variety.trim();

    if (!variety) {
      throw new BadRequestException(
        'variety is required for store variety stock',
      );
    }

    const weightKgDelta = params.weightKgDelta;
    const soldWeightKgDelta = params.soldWeightKgDelta ?? new Prisma.Decimal(0);

    if (
      weightKgDelta.isZero() &&
      soldWeightKgDelta.isZero() &&
      params.entryCountDelta === 0
    ) {
      return;
    }

    const updated = await tx.$queryRaw<
      Array<{ totalWeightKg: string; soldWeightKg: string }>
    >(Prisma.sql`
      INSERT INTO "store_variety_stocks" (
        "season_id",
        "season_name",
        "store_type",
        "variety",
        "total_weight_kg",
        "sold_weight_kg",
        "entry_count",
        "updated_at"
      )
      VALUES (
        ${params.seasonId},
        ${params.seasonName},
        ${params.storeType}::"StoreType",
        ${variety},
        ${Prisma.Decimal.max(weightKgDelta, 0)},
        ${Prisma.Decimal.max(soldWeightKgDelta, 0)},
        ${Math.max(params.entryCountDelta, 0)},
        NOW()
      )
      ON CONFLICT ("season_id", "store_type", "variety")
      DO UPDATE SET
        "total_weight_kg" = "store_variety_stocks"."total_weight_kg" + ${weightKgDelta},
        "sold_weight_kg" = "store_variety_stocks"."sold_weight_kg" + ${soldWeightKgDelta},
        "entry_count" = "store_variety_stocks"."entry_count" + ${params.entryCountDelta},
        "season_name" = EXCLUDED."season_name",
        "updated_at" = NOW()
      RETURNING
        "total_weight_kg"::text AS "totalWeightKg",
        "sold_weight_kg"::text AS "soldWeightKg"
    `);

    const result = updated[0];

    if (result) {
      const total = new Prisma.Decimal(result.totalWeightKg);
      const sold = new Prisma.Decimal(result.soldWeightKg);

      if (total.lessThan(0) || sold.lessThan(0)) {
        throw new BadRequestException(
          'Store variety stock cannot be reduced below zero',
        );
      }

      if (sold.greaterThan(total)) {
        throw new BadRequestException(
          'Sold weight cannot exceed available variety stock',
        );
      }
    }

    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "store_variety_stocks"
      WHERE "season_id" = ${params.seasonId}
        AND "store_type" = ${params.storeType}::"StoreType"
        AND "variety" = ${variety}
        AND "total_weight_kg" <= 0
        AND "entry_count" <= 0
    `);
  }

  private emptyOverviewItem(storeType: StoreTypeValue) {
    return {
      storeType,
      label: storeType,
      entryCount: 0,
      totalWeightKg: '0.00',
    };
  }

  private getRemainingWeight(
    weight: string | number | Prisma.Decimal,
    soldWeight: string | number | Prisma.Decimal,
  ) {
    const total = new Prisma.Decimal(weight);
    const sold = new Prisma.Decimal(soldWeight);
    return Prisma.Decimal.max(total.minus(sold), 0);
  }

  private serializeRow(entry: any) {
    const weight = new Prisma.Decimal(entry.weight);
    const soldWeight = new Prisma.Decimal(entry.soldWeight ?? 0);
    const remainingWeight = Prisma.Decimal.max(weight.minus(soldWeight), 0);

    return {
      id: String(entry.id),
      storeType: entry.storeType,
      sourcePaddyProcessId: String(entry.sourcePaddyProcessId),
      processedBillNo: entry.processedBillNo,
      processBillNo: entry.processBillNo,
      billNo: entry.billNo,
      date: entry.date,
      variety: entry.variety,
      weight: weight.toFixed(2),
      soldWeight: soldWeight.toFixed(2),
      remainingWeight: remainingWeight.toFixed(2),
      unit: entry.unit,
      processedWeightKg: new Prisma.Decimal(entry.processedWeightKg).toFixed(2),
      status: entry.status,
      saleAmount: new Prisma.Decimal(entry.saleAmount).toFixed(2),
      paidInCash: Boolean(entry.paidInCash),
      paymentChannel: entry.paymentChannel,
      sarafId: entry.sarafId ?? null,
      sarafLedgerCurrencyId: entry.sarafLedgerCurrencyId ?? null,
      sarafName: entry.sarafName ?? null,
      sarafCurrencyCode: entry.sarafCurrencyCode ?? null,
      sarafCurrencyName: entry.sarafCurrencyName ?? null,
      ownerName: entry.ownerName,
      seasonId: entry.seasonId,
      seasonName: entry.seasonName,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      season: entry.seasonRefId
        ? {
            id: entry.seasonRefId,
            name: entry.seasonRefName,
            status: entry.seasonRefStatus,
          }
        : null,
      sourcePaddyProcess: entry.processRefId
        ? {
            id: entry.processRefId,
            billNo: entry.processRefBillNo,
            variety: entry.processRefVariety,
            date: entry.processRefDate,
            weight: new Prisma.Decimal(entry.processRefWeight).toFixed(2),
            unit: entry.processRefUnit,
            processedWeightKg: new Prisma.Decimal(
              entry.processRefProcessedWeightKg,
            ).toFixed(2),
            sourceCompanyPaddyWarehouse: entry.warehouseRefId
              ? {
                  id: entry.warehouseRefId,
                  billNo: entry.warehouseRefBillNo,
                  ownerName: entry.warehouseRefOwnerName,
                }
              : null,
          }
        : null,
    };
  }
}
