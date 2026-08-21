import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toKilograms } from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { StockSyncService } from '../stock/stock-sync.service.js';
import { VarietyService } from '../variety/variety.service.js';
import { CreateProcessRiceDto } from './dto/create-process-rice.dto.js';
import { FindProcessRiceQueryDto } from './dto/find-process-rice-query.dto.js';
import { UpdateProcessRiceDto } from './dto/update-process-rice.dto.js';

@Injectable()
export class ProcessRiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly varietyService: VarietyService,
    private readonly stockSyncService: StockSyncService,
  ) {}

  private get paddyProcessModel() {
    return (this.prisma as any).paddyProcess;
  }

  async create(createProcessRiceDto: CreateProcessRiceDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const sourcePaddyProcessId =
      createProcessRiceDto.sourcePaddyProcessId?.trim();

    if (!sourcePaddyProcessId) {
      throw new BadRequestException('sourcePaddyProcessId is required');
    }

    const sourcePaddyProcess = await this.requireSourcePaddyProcess(
      sourcePaddyProcessId,
      activeSeason.id,
    );
    await this.assertSourcePaddyProcessCompleted(sourcePaddyProcess.id);
    await this.ensureSourceAvailable(sourcePaddyProcess.id);

    const variety = createProcessRiceDto.riceVariety?.trim()
      ? await this.varietyService.resolveActiveVarietyName(
          'RICE',
          createProcessRiceDto.riceVariety,
        )
      : await this.resolveRiceVarietyFromSource(sourcePaddyProcess.variety);

    const weight = this.parseDecimal(createProcessRiceDto.weight, 'weight');
    const processedWeightKg = toKilograms(weight, sourcePaddyProcess.unit);
    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
    );

    const inserted = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO "process_rice_entries" (
          "source_paddy_process_id",
          "processed_bill_no",
          "bill_no",
          "date",
          "variety",
          "weight",
          "unit",
          "processed_weight_kg",
          "season_id",
          "season_name",
          "updated_at"
        )
        VALUES (
          ${sourcePaddyProcess.id},
          ${sourcePaddyProcess.billNo},
          ${billNo},
          ${sourcePaddyProcess.date},
          ${variety},
          ${weight},
          ${sourcePaddyProcess.unit},
          ${processedWeightKg},
          ${activeSeason.id},
          ${activeSeason.name},
          NOW()
        )
        RETURNING "id"
      `);

      await this.stockSyncService.applyRiceVarietyStockDelta(tx, {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        variety,
        totalWeightKgDelta: processedWeightKg,
        entryCountDelta: 1,
      });

      return rows;
    });

    return this.findOne(String(inserted[0].id));
  }

  async findAll(filters: FindProcessRiceQueryDto = {}) {
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
      'variety',
      'weight',
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const sortMap: Record<(typeof allowedSortFields)[number], string> = {
      date: 'pr."date"',
      billNo: 'pr."bill_no"',
      processedBillNo: 'pr."processed_bill_no"',
      variety: 'pr."variety"',
      weight: 'pr."weight"',
      seasonName: 'pr."season_name"',
      createdAt: 'pr."created_at"',
      updatedAt: 'pr."updated_at"',
    };

    const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];
    if (filters.seasonId) {
      conditions.push(Prisma.sql`pr."season_id" = ${filters.seasonId}`);
    }
    if (query) {
      const likeValue = `%${query}%`;
      conditions.push(Prisma.sql`
        (
          pr."bill_no" ILIKE ${likeValue}
          OR pr."processed_bill_no" ILIKE ${likeValue}
          OR pr."variety" ILIKE ${likeValue}
          OR pr."season_name" ILIKE ${likeValue}
        )
      `);
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const orderBySql = Prisma.raw(sortMap[sortBy]);
    const directionSql = Prisma.raw(sortDirection === 'asc' ? ' ASC' : ' DESC');

    const items = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        pr."id"::text AS "id",
        pr."source_paddy_process_id"::text AS "sourcePaddyProcessId",
        pr."processed_bill_no" AS "processedBillNo",
        pr."bill_no" AS "billNo",
        pr."date" AS "date",
        pr."variety" AS "variety",
        pr."weight"::text AS "weight",
        pr."unit" AS "unit",
        pr."processed_weight_kg"::text AS "processedWeightKg",
        pr."season_id" AS "seasonId",
        pr."season_name" AS "seasonName",
        pr."created_at" AS "createdAt",
        pr."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus",
        pp."id"::text AS "processRefId",
        pp."bill_no" AS "processRefBillNo",
        pp."variety" AS "processRefVariety",
        pp."date" AS "processRefDate",
        pp."weight"::text AS "processRefWeight",
        pp."unit" AS "processRefUnit",
        pp."processed_weight_kg"::text AS "processRefProcessedWeightKg"
      FROM "process_rice_entries" pr
      INNER JOIN "seasons" s ON s."id" = pr."season_id"
      INNER JOIN "paddy_processes" pp ON pp."id" = pr."source_paddy_process_id"
      ${whereSql}
      ORDER BY ${orderBySql}${directionSql}
      LIMIT ${pageSize}
      OFFSET ${(pageNumber - 1) * pageSize}
    `);

    const totalRows = await this.prisma.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "process_rice_entries" pr
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
    const row = await this.getRowById(id);
    if (!row) {
      throw new NotFoundException(
        `Process rice record with id "${id}" not found`,
      );
    }
    return this.serializeRow(row);
  }

  async update(id: string, updateProcessRiceDto: UpdateProcessRiceDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const sourcePaddyProcess = await this.requireSourcePaddyProcess(
      updateProcessRiceDto.sourcePaddyProcessId ?? current.sourcePaddyProcessId,
      current.seasonId,
    );
    await this.ensureSourceAvailable(sourcePaddyProcess.id, current.id);

    const variety = updateProcessRiceDto.riceVariety?.trim()
      ? await this.varietyService.resolveActiveVarietyName(
          'RICE',
          updateProcessRiceDto.riceVariety,
        )
      : await this.resolveRiceVarietyFromSource(sourcePaddyProcess.variety);

    const weight = this.parseDecimal(
      updateProcessRiceDto.weight ?? current.weight,
      'weight',
    );
    const processedWeightKg = toKilograms(weight, sourcePaddyProcess.unit);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "process_rice_entries"
        SET
          "source_paddy_process_id" = ${sourcePaddyProcess.id},
          "processed_bill_no" = ${sourcePaddyProcess.billNo},
          "date" = ${sourcePaddyProcess.date},
          "variety" = ${variety},
          "weight" = ${weight},
          "unit" = ${sourcePaddyProcess.unit},
          "processed_weight_kg" = ${processedWeightKg},
          "updated_at" = NOW()
        WHERE "id" = ${this.parseId(id)}
      `);

      await this.stockSyncService.applyRiceVarietyStockDelta(tx, {
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        variety: current.variety,
        totalWeightKgDelta: new Prisma.Decimal(
          current.processedWeightKg,
        ).negated(),
        entryCountDelta: -1,
      });

      await this.stockSyncService.applyRiceVarietyStockDelta(tx, {
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        variety,
        totalWeightKgDelta: processedWeightKg,
        entryCountDelta: 1,
      });
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM "process_rice_entries"
        WHERE "id" = ${this.parseId(id)}
      `);

      await this.stockSyncService.applyRiceVarietyStockDelta(tx, {
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        variety: current.variety,
        totalWeightKgDelta: new Prisma.Decimal(
          current.processedWeightKg,
        ).negated(),
        entryCountDelta: -1,
      });
    });

    return current;
  }

  async getProcessOptions(seasonId: string, excludeId?: string) {
    await this.seasonService.findOne(seasonId);

    const existing = await this.prisma.$queryRaw<
      Array<{ sourcePaddyProcessId: string }>
    >(Prisma.sql`
      SELECT "source_paddy_process_id"::text AS "sourcePaddyProcessId"
      FROM "process_rice_entries"
      WHERE "season_id" = ${seasonId}
      ${excludeId ? Prisma.sql`AND "id" <> ${this.parseId(excludeId)}` : Prisma.empty}
    `);
    const excludedIds = existing.map((entry) =>
      BigInt(entry.sourcePaddyProcessId),
    );

    const sources = await this.paddyProcessModel.findMany({
      where: {
        seasonId,
        status: 'process_completed',
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
      },
    });

    return {
      seasonId,
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
        'Process rice can only be added after the paddy process is marked as Process Completed',
      );
    }
  }

  private async ensureSourceAvailable(
    sourcePaddyProcessId: bigint,
    excludeId?: string,
  ) {
    const existing = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT "id"::text AS "id"
      FROM "process_rice_entries"
      WHERE "source_paddy_process_id" = ${sourcePaddyProcessId}
      ${excludeId ? Prisma.sql`AND "id" <> ${this.parseId(excludeId)}` : Prisma.empty}
      LIMIT 1
    `);

    if (existing.length > 0) {
      throw new BadRequestException(
        'This processed paddy bill has already been added to process rice',
      );
    }
  }

  private async generateBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();
    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before process rice can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-PR-`;
    const lastEntry = await this.prisma.$queryRaw<
      Array<{ billNo: string }>
    >(Prisma.sql`
      SELECT "bill_no" AS "billNo"
      FROM "process_rice_entries"
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

  private async getRowById(id: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        pr."id"::text AS "id",
        pr."source_paddy_process_id"::text AS "sourcePaddyProcessId",
        pr."processed_bill_no" AS "processedBillNo",
        pr."bill_no" AS "billNo",
        pr."date" AS "date",
        pr."variety" AS "variety",
        pr."weight"::text AS "weight",
        pr."unit" AS "unit",
        pr."processed_weight_kg"::text AS "processedWeightKg",
        pr."season_id" AS "seasonId",
        pr."season_name" AS "seasonName",
        pr."created_at" AS "createdAt",
        pr."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus",
        pp."id"::text AS "processRefId",
        pp."bill_no" AS "processRefBillNo",
        pp."variety" AS "processRefVariety",
        pp."date" AS "processRefDate",
        pp."weight"::text AS "processRefWeight",
        pp."unit" AS "processRefUnit",
        pp."processed_weight_kg"::text AS "processRefProcessedWeightKg"
      FROM "process_rice_entries" pr
      INNER JOIN "seasons" s ON s."id" = pr."season_id"
      INNER JOIN "paddy_processes" pp ON pp."id" = pr."source_paddy_process_id"
      WHERE pr."id" = ${this.parseId(id)}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private async resolveRiceVarietyFromSource(sourceVariety?: string | null) {
    const trimmed = sourceVariety?.trim();

    if (!trimmed) {
      throw new BadRequestException(
        'Source paddy process must have a variety before rice can be recorded',
      );
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
      `Unknown or inactive variety "${trimmed}". Register it under Veriety as RICE (preferred) or PADDY.`,
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

  private serializeRow(entry: any) {
    return {
      id: entry.id,
      sourcePaddyProcessId: entry.sourcePaddyProcessId,
      processedBillNo: entry.processedBillNo,
      billNo: entry.billNo,
      date: entry.date,
      variety: entry.variety,
      weight: new Prisma.Decimal(entry.weight).toFixed(2),
      unit: entry.unit,
      processedWeightKg: new Prisma.Decimal(entry.processedWeightKg).toFixed(2),
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
          }
        : null,
    };
  }
}
