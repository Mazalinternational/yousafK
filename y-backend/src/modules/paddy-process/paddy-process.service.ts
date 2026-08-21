import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  APP_WEIGHT_UNIT,
  toKilograms,
} from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { StockSyncService } from '../stock/stock-sync.service.js';
import { POOLED_SALE_VARIETY } from '../store/store.constants.js';
import { StoreService } from '../store/store.service.js';
import { CreatePaddyProcessDto } from './dto/create-paddy-process.dto.js';
import { FindPaddyProcessesQueryDto } from './dto/find-paddy-processes-query.dto.js';
import { PaddyProcessDashboardDto } from './dto/paddy-process-dashboard.dto.js';
import { UpdatePaddyProcessDto } from './dto/update-paddy-process.dto.js';
import {
  isPaddyWarehouseStockSourceType,
  isProcessStoreSourceType,
  type PaddyProcessStockSourceType,
} from './paddy-process.constants.js';

type ProcessStockSource = {
  stockSourceType: PaddyProcessStockSourceType;
  variety: string;
  unit: string;
  receivedDate: Date;
};

const paddyProcessSelect = {
  id: true,
  sourceCompanyPaddyWarehouseId: true,
  sourceFarmerPaddyWarehouseId: true,
  stockSourceType: true,
  billNo: true,
  variety: true,
  date: true,
  weight: true,
  unit: true,
  processedWeightKg: true,
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
  sourceCompanyPaddyWarehouse: {
    select: {
      id: true,
      billNo: true,
      variety: true,
      quantity: true,
      unit: true,
      ownerName: true,
      receivedDate: true,
    },
  },
  sourceFarmerPaddyWarehouse: {
    select: {
      id: true,
      billNo: true,
      paddyVariety: true,
      paddyQuantity: true,
      unit: true,
      ownerName: true,
      receivedDate: true,
    },
  },
} as const;

@Injectable()
export class PaddyProcessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly stockSyncService: StockSyncService,
    private readonly storeService: StoreService,
  ) {}

  private get paddyProcessModel() {
    return (this.prisma as any).paddyProcess;
  }

  private get companyOwnedPaddyWarehouseModel() {
    return (this.prisma as any).companyOwnedPaddyWarehouse;
  }

  private get farmerOwnedPaddyWarehouseModel() {
    return (this.prisma as any).farmerOwnedPaddyWarehouse;
  }

  async create(createDto: CreatePaddyProcessDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const source = this.resolveCreateSource(createDto);
    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
    );
    const normalized = await this.resolveProcessPayload({
      seasonId: activeSeason.id,
      source,
      weight: createDto.weight,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.paddyProcess.create({
        data: {
          sourceCompanyPaddyWarehouseId: null,
          sourceFarmerPaddyWarehouseId: null,
          stockSourceType: source.stockSourceType,
          billNo,
          variety: source.variety,
          date: source.receivedDate,
          weight: normalized.weight,
          unit: source.unit,
          processedWeightKg: normalized.processedWeightKg,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
        },
        select: paddyProcessSelect,
      });

      await this.applyProcessStockDelta(tx, {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        source,
        processedWeightKg: normalized.processedWeightKg,
        direction: 'deduct',
      });

      return row;
    });

    return this.serializeWithLifecycle(created);
  }

  async findAll(filters: FindPaddyProcessesQueryDto = {}) {
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
      'variety',
      'weight',
      'createdAt',
      'updatedAt',
      'seasonName',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const where = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(filters.variety ? { variety: filters.variety.trim() } : {}),
      ...(query
        ? {
            OR: [
              { billNo: { contains: query, mode: 'insensitive' } },
              { variety: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
              {
                sourceCompanyPaddyWarehouse: {
                  OR: [
                    { billNo: { contains: query, mode: 'insensitive' } },
                    { ownerName: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.paddyProcessModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: paddyProcessSelect,
      }),
      this.paddyProcessModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const lifecycleMap = await this.getLifecycleMap(
      items.map((item: any) => String(item.id)),
    );

    return {
      items: items.map((item: any) =>
        this.serialize(item, lifecycleMap.get(String(item.id))),
      ),
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
    const paddyProcess = await this.paddyProcessModel.findUnique({
      where: { id: this.parseId(id) },
      select: paddyProcessSelect,
    });

    if (!paddyProcess) {
      throw new NotFoundException(
        `Paddy process record with id "${id}" not found`,
      );
    }

    return this.serializeWithLifecycle(paddyProcess);
  }

  async update(id: string, updateDto: UpdatePaddyProcessDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const source = this.resolveSourceForExistingProcess(current);
    const previousProcessedWeightKg = new Prisma.Decimal(
      current.processedWeightKg,
    );
    const previousSourceType = current.stockSourceType;

    const normalized = await this.resolveProcessPayload({
      seasonId: current.seasonId,
      source,
      weight: updateDto.weight ?? current.weight,
      excludeId: current.id,
      previousProcessedWeightKg,
      previousVariety: current.variety,
      previousStockSourceType: previousSourceType,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.paddyProcess.update({
        where: { id: this.parseId(id) },
        data: {
          billNo: current.billNo,
          variety: source.variety,
          date: source.receivedDate,
          weight: normalized.weight,
          unit: source.unit,
          processedWeightKg: normalized.processedWeightKg,
        },
        select: paddyProcessSelect,
      });

      if (!previousProcessedWeightKg.isZero()) {
        await this.applyProcessStockDelta(tx, {
          seasonId: current.seasonId,
          seasonName: current.seasonName,
          source: this.resolveSourceForExistingProcess({
            stockSourceType: previousSourceType,
            variety: current.variety,
            unit: current.unit,
            date: current.date,
          }),
          processedWeightKg: previousProcessedWeightKg,
          direction: 'restore',
        });
      }

      await this.applyProcessStockDelta(tx, {
        seasonId: row.seasonId,
        seasonName: row.seasonName,
        source,
        processedWeightKg: normalized.processedWeightKg,
        direction: 'deduct',
      });

      return row;
    });

    return this.serializeWithLifecycle(updated);
  }

  async complete(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "paddy_processes"
      SET
        "status" = 'process_completed',
        "end_date" = CURRENT_TIMESTAMP,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${this.parseId(id)}
    `);

    return this.findOne(id);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const deleted = await this.prisma.$transaction(async (tx) => {
      const row = await tx.paddyProcess.delete({
        where: { id: this.parseId(id) },
        select: paddyProcessSelect,
      });

      const source = this.resolveSourceForExistingProcess(row);

      await this.applyProcessStockDelta(tx, {
        seasonId: row.seasonId,
        seasonName: row.seasonName,
        source,
        processedWeightKg: new Prisma.Decimal(row.processedWeightKg),
        direction: 'restore',
      });

      return row;
    });

    return this.serializeWithLifecycle(deleted);
  }

  async getStoreSourceAvailability(
    seasonId: string,
    storeType: string,
    excludeId?: string,
  ) {
    await this.seasonService.findOne(seasonId);

    const normalizedStoreType = storeType?.trim() ?? '';

    if (!isProcessStoreSourceType(normalizedStoreType)) {
      throw new BadRequestException(
        'storeType must be short_green, regection, or broken_rice',
      );
    }

    let availableKg = await this.storeService.getPooledAvailableKg(
      seasonId,
      normalizedStoreType,
    );

    if (excludeId) {
      const currentProcess = await this.paddyProcessModel.findUnique({
        where: { id: this.parseId(excludeId) },
        select: {
          stockSourceType: true,
          processedWeightKg: true,
        },
      });

      if (
        currentProcess &&
        currentProcess.stockSourceType === normalizedStoreType
      ) {
        availableKg = availableKg.plus(
          new Prisma.Decimal(currentProcess.processedWeightKg),
        );
      }
    }

    return {
      seasonId,
      storeType: normalizedStoreType,
      availableWeightKg: availableKg.toFixed(2),
    };
  }

  async getAvailability(
    seasonId: string,
    variety?: string,
    excludeId?: string,
  ) {
    await this.seasonService.findOne(seasonId);

    const normalizedVariety = variety?.trim();

    await this.stockSyncService.ensurePaddyVarietyStocksSynced(seasonId);

    let varietyCompanyStockKg = normalizedVariety
      ? await this.stockSyncService.getPaddyVarietyCompanyAvailableKg(
          seasonId,
          normalizedVariety,
        )
      : new Prisma.Decimal(0);
    let varietyFarmerStockKg = normalizedVariety
      ? await this.stockSyncService.getPaddyVarietyFarmerAvailableKg(
          seasonId,
          normalizedVariety,
        )
      : new Prisma.Decimal(0);

    if (excludeId && normalizedVariety) {
      const currentProcess = await this.paddyProcessModel.findUnique({
        where: { id: this.parseId(excludeId) },
        select: {
          variety: true,
          stockSourceType: true,
          processedWeightKg: true,
        },
      });

      if (
        currentProcess &&
        currentProcess.variety.trim() === normalizedVariety
      ) {
        const processedWeightKg = new Prisma.Decimal(
          currentProcess.processedWeightKg,
        );

        if (currentProcess.stockSourceType === 'farmer') {
          varietyFarmerStockKg = varietyFarmerStockKg.plus(processedWeightKg);
        } else {
          varietyCompanyStockKg = varietyCompanyStockKg.plus(processedWeightKg);
        }
      }
    }

    const totalAvailableKg = normalizedVariety
      ? varietyCompanyStockKg.plus(varietyFarmerStockKg)
      : new Prisma.Decimal(0);

    return {
      seasonId,
      variety: normalizedVariety ?? null,
      varietyCompanyStockAvailableKg: normalizedVariety
        ? varietyCompanyStockKg.toFixed(2)
        : null,
      varietyFarmerStockAvailableKg: normalizedVariety
        ? varietyFarmerStockKg.toFixed(2)
        : null,
      varietyStockAvailableKg: normalizedVariety
        ? varietyCompanyStockKg.plus(varietyFarmerStockKg).toFixed(2)
        : null,
      totalAvailableQuantityKg: totalAvailableKg.toFixed(2),
      totalAvailableQuantityTon: totalAvailableKg.dividedBy(1000).toFixed(2),
      sources: [],
    };
  }

  async getDashboard(seasonId?: string): Promise<PaddyProcessDashboardDto> {
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
          { label: 'processEntryCount', value: '0', unit: 'count' },
          { label: 'processedPaddyKg', value: '0.00', unit: APP_WEIGHT_UNIT },
          { label: 'underProcessCount', value: '0', unit: 'count' },
          { label: 'completedProcessCount', value: '0', unit: 'count' },
        ],
        recentProcesses: [],
      };
    }

    const processes = await this.paddyProcessModel.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: { createdAt: 'desc' },
      select: paddyProcessSelect,
    });

    const lifecycleMap = await this.getLifecycleMap(
      processes.map((item: any) => String(item.id)),
    );

    let processedTotalKg = new Prisma.Decimal(0);
    let underProcessCount = 0;
    let completedProcessCount = 0;

    for (const process of processes) {
      const lifecycle = lifecycleMap.get(String(process.id));
      const status = lifecycle?.status ?? 'under_process';

      if (status === 'process_completed') {
        completedProcessCount += 1;
      } else {
        underProcessCount += 1;
      }

      processedTotalKg = processedTotalKg.plus(
        new Prisma.Decimal(process.processedWeightKg),
      );
    }

    return {
      season: activeSeason,
      overview: [
        {
          label: 'processEntryCount',
          value: String(processes.length),
          unit: 'count',
        },
        {
          label: 'processedPaddyKg',
          value: processedTotalKg.toFixed(2),
          unit: APP_WEIGHT_UNIT,
        },
        {
          label: 'underProcessCount',
          value: String(underProcessCount),
          unit: 'count',
        },
        {
          label: 'completedProcessCount',
          value: String(completedProcessCount),
          unit: 'count',
        },
      ],
      recentProcesses: processes
        .slice(0, 10)
        .map((item: any) =>
          this.serialize(item, lifecycleMap.get(String(item.id))),
        ),
    };
  }

  private async resolveProcessPayload({
    seasonId,
    source,
    weight,
    excludeId,
    previousProcessedWeightKg,
    previousVariety,
    previousStockSourceType,
  }: {
    seasonId: string;
    source: ProcessStockSource;
    weight: string | number | Prisma.Decimal;
    excludeId?: string;
    previousProcessedWeightKg?: Prisma.Decimal;
    previousVariety?: string;
    previousStockSourceType?: PaddyProcessStockSourceType;
  }) {
    const normalizedWeight = this.parseDecimal(weight, 'weight');
    const processedWeightKg = toKilograms(normalizedWeight, source.unit);

    if (isProcessStoreSourceType(source.stockSourceType)) {
      let availableKg = await this.storeService.getPooledAvailableKg(
        seasonId,
        source.stockSourceType,
      );

      if (
        excludeId &&
        previousProcessedWeightKg &&
        previousStockSourceType === source.stockSourceType
      ) {
        availableKg = availableKg.plus(previousProcessedWeightKg);
      }

      if (processedWeightKg.greaterThan(availableKg)) {
        throw new BadRequestException(
          `Process weight cannot exceed available ${source.stockSourceType.replace(/_/g, ' ')} store stock`,
        );
      }

      return {
        weight: normalizedWeight,
        processedWeightKg,
      };
    }

    let varietyStockKg =
      source.stockSourceType === 'company'
        ? await this.stockSyncService.getPaddyVarietyCompanyAvailableKg(
            seasonId,
            source.variety,
          )
        : await this.stockSyncService.getPaddyVarietyFarmerAvailableKg(
            seasonId,
            source.variety,
          );

    if (
      excludeId &&
      previousProcessedWeightKg &&
      previousVariety?.trim() === source.variety.trim() &&
      previousStockSourceType === source.stockSourceType
    ) {
      varietyStockKg = varietyStockKg.plus(previousProcessedWeightKg);
    }

    if (processedWeightKg.greaterThan(varietyStockKg)) {
      throw new BadRequestException(
        `Process weight cannot exceed available paddy stock for variety ${source.variety}`,
      );
    }

    await this.stockSyncService.ensurePaddyVarietyStocksSynced(seasonId);

    return {
      weight: normalizedWeight,
      processedWeightKg,
    };
  }

  private resolveCreateSource(
    createDto: CreatePaddyProcessDto,
  ): ProcessStockSource {
    const stockSourceType = createDto.stockSourceType;

    if (
      !isPaddyWarehouseStockSourceType(stockSourceType) &&
      !isProcessStoreSourceType(stockSourceType)
    ) {
      throw new BadRequestException(
        'stockSourceType must be company, farmer, short_green, regection, or broken_rice',
      );
    }

    const dateValue = createDto.date?.trim() ?? '';

    if (!dateValue) {
      throw new BadRequestException('date is required');
    }

    const receivedDate = new Date(dateValue);

    if (Number.isNaN(receivedDate.getTime())) {
      throw new BadRequestException('date must be a valid date');
    }

    if (isProcessStoreSourceType(stockSourceType)) {
      return {
        stockSourceType,
        variety: POOLED_SALE_VARIETY,
        unit: createDto.unit?.trim() || 'seven_kg',
        receivedDate,
      };
    }

    const variety = createDto.variety?.trim() ?? '';

    if (!variety) {
      throw new BadRequestException('variety is required');
    }

    return {
      stockSourceType,
      variety,
      unit: createDto.unit?.trim() || 'seven_kg',
      receivedDate,
    };
  }

  private resolveSourceForExistingProcess(process: {
    stockSourceType: string;
    variety: string;
    unit: string;
    date: string | Date;
  }): ProcessStockSource {
    const stockSourceType = process.stockSourceType;

    if (isProcessStoreSourceType(stockSourceType)) {
      return {
        stockSourceType,
        variety: process.variety,
        unit: process.unit,
        receivedDate: new Date(process.date),
      };
    }

    return {
      stockSourceType: stockSourceType === 'farmer' ? 'farmer' : 'company',
      variety: process.variety,
      unit: process.unit,
      receivedDate: new Date(process.date),
    };
  }

  private async applyProcessStockDelta(
    tx: Prisma.TransactionClient,
    params: {
      seasonId: string;
      seasonName: string;
      source: ProcessStockSource;
      processedWeightKg: Prisma.Decimal;
      direction: 'deduct' | 'restore';
    },
  ) {
    if (isProcessStoreSourceType(params.source.stockSourceType)) {
      return;
    }

    const signedDelta =
      params.direction === 'deduct'
        ? params.processedWeightKg.negated()
        : params.processedWeightKg;

    await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
      seasonId: params.seasonId,
      seasonName: params.seasonName,
      variety: params.source.variety,
      companyWeightKgDelta:
        params.source.stockSourceType === 'company'
          ? signedDelta
          : new Prisma.Decimal(0),
      farmerWeightKgDelta:
        params.source.stockSourceType === 'farmer'
          ? signedDelta
          : new Prisma.Decimal(0),
      entryCountDelta: 0,
    });
  }

  private async generateBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before paddy process can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-PP-`;
    const lastEntry = await this.paddyProcessModel.findFirst({
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

  private async getLifecycleMap(ids: string[]) {
    if (ids.length === 0) {
      return new Map<
        string,
        {
          status: string;
          endDate: string | null;
          riceExtracted: boolean;
          storeOutputs: {
            regection: boolean;
            short_green: boolean;
            broken_rice: boolean;
            waste: boolean;
          };
        }
      >();
    }

    const parsedIds = ids.map((id) => this.parseId(id));
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        status: string;
        endDate: string | null;
        riceExtracted: boolean;
        regectionAdded: boolean;
        shortGreenAdded: boolean;
        brokenRiceAdded: boolean;
        wasteAdded: boolean;
      }>
    >(Prisma.sql`
      SELECT
        pp."id"::text AS "id",
        pp."status" AS "status",
        pp."end_date" AS "endDate",
        EXISTS (
          SELECT 1
          FROM "process_rice_entries" pre
          WHERE pre."source_paddy_process_id" = pp."id"
        ) AS "riceExtracted",
        EXISTS (
          SELECT 1
          FROM "store_entries" se
          WHERE se."source_paddy_process_id" = pp."id"
            AND se."store_type" = 'regection'::"StoreType"
        ) AS "regectionAdded",
        EXISTS (
          SELECT 1
          FROM "store_entries" se
          WHERE se."source_paddy_process_id" = pp."id"
            AND se."store_type" = 'short_green'::"StoreType"
        ) AS "shortGreenAdded",
        EXISTS (
          SELECT 1
          FROM "store_entries" se
          WHERE se."source_paddy_process_id" = pp."id"
            AND se."store_type" = 'broken_rice'::"StoreType"
        ) AS "brokenRiceAdded",
        EXISTS (
          SELECT 1
          FROM "store_entries" se
          WHERE se."source_paddy_process_id" = pp."id"
            AND se."store_type" = 'waste'::"StoreType"
        ) AS "wasteAdded"
      FROM "paddy_processes" pp
      WHERE pp."id" IN (${Prisma.join(parsedIds)})
    `);

    return new Map(
      rows.map((row) => [
        row.id,
        {
          status: row.status,
          endDate: row.endDate,
          riceExtracted: row.riceExtracted,
          storeOutputs: {
            regection: row.regectionAdded,
            short_green: row.shortGreenAdded,
            broken_rice: row.brokenRiceAdded,
            waste: row.wasteAdded,
          },
        },
      ]),
    );
  }

  private async serializeWithLifecycle(paddyProcess: any) {
    const lifecycleMap = await this.getLifecycleMap([String(paddyProcess.id)]);
    return this.serialize(
      paddyProcess,
      lifecycleMap.get(String(paddyProcess.id)),
    );
  }

  private serialize(
    paddyProcess: any,
    lifecycle?: {
      status: string;
      endDate: string | null;
      riceExtracted: boolean;
      storeOutputs: {
        regection: boolean;
        short_green: boolean;
        broken_rice: boolean;
        waste: boolean;
      };
    },
  ) {
    return {
      ...paddyProcess,
      id: String(paddyProcess.id),
      status: lifecycle?.status ?? 'under_process',
      endDate: lifecycle?.endDate ?? null,
      riceExtracted: lifecycle?.riceExtracted ?? false,
      storeOutputs: lifecycle?.storeOutputs ?? {
        regection: false,
        short_green: false,
        broken_rice: false,
        waste: false,
      },
      stockSourceType: isProcessStoreSourceType(paddyProcess.stockSourceType)
        ? paddyProcess.stockSourceType
        : paddyProcess.stockSourceType === 'farmer'
          ? 'farmer'
          : 'company',
      sourceCompanyPaddyWarehouseId: paddyProcess.sourceCompanyPaddyWarehouseId
        ? String(paddyProcess.sourceCompanyPaddyWarehouseId)
        : null,
      sourceFarmerPaddyWarehouseId: paddyProcess.sourceFarmerPaddyWarehouseId
        ? String(paddyProcess.sourceFarmerPaddyWarehouseId)
        : null,
      sourceWarehouseKey: paddyProcess.sourceFarmerPaddyWarehouseId
        ? `farmer:${String(paddyProcess.sourceFarmerPaddyWarehouseId)}`
        : paddyProcess.sourceCompanyPaddyWarehouseId
          ? `company:${String(paddyProcess.sourceCompanyPaddyWarehouseId)}`
          : null,
      sourceCompanyPaddyWarehouse: paddyProcess.sourceCompanyPaddyWarehouse
        ? {
            ...paddyProcess.sourceCompanyPaddyWarehouse,
            id: String(paddyProcess.sourceCompanyPaddyWarehouse.id),
          }
        : null,
      sourceFarmerPaddyWarehouse: paddyProcess.sourceFarmerPaddyWarehouse
        ? {
            ...paddyProcess.sourceFarmerPaddyWarehouse,
            id: String(paddyProcess.sourceFarmerPaddyWarehouse.id),
          }
        : null,
    };
  }
}
