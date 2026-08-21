import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  APP_WEIGHT_UNIT,
  normalizeWeightUnit,
  toKilograms,
} from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CustomerLedgerService } from '../customer/customer-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { StockSyncService } from '../stock/stock-sync.service.js';
import { VarietyService } from '../variety/variety.service.js';
import { CreateFarmerOwnedPaddyWarehouseDto } from './dto/create-farmer-owned-paddy-warehouse.dto.js';
import { FindFarmerOwnedPaddyWarehousesQueryDto } from './dto/find-farmer-owned-paddy-warehouses-query.dto.js';
import { UpdateFarmerOwnedPaddyWarehouseDto } from './dto/update-farmer-owned-paddy-warehouse.dto.js';

const farmerOwnedPaddyWarehouseSelect = {
  id: true,
  enteringPaddyId: true,
  billNo: true,
  enteringBillNo: true,
  stockType: true,
  paddyVariety: true,
  paddyQuantity: true,
  riceVariety: true,
  riceQuantity: true,
  unit: true,
  ownerName: true,
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
} as const;

@Injectable()
export class FarmerOwnedPaddyWarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly customerLedgerService: CustomerLedgerService,
    private readonly varietyService: VarietyService,
    private readonly stockSyncService: StockSyncService,
  ) {}

  private get farmerOwnedPaddyWarehouseModel() {
    return (this.prisma as any).farmerOwnedPaddyWarehouse;
  }

  private get enteringPaddyModel() {
    return (this.prisma as any).enteringPaddy;
  }

  async create(createDto: CreateFarmerOwnedPaddyWarehouseDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const linkedEnteringPaddy = await this.resolveEnteringPaddyForFarmer({
      seasonId: activeSeason.id,
      enteringPaddyId: createDto.enteringPaddyId,
    });
    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
    );

    const payload = await this.resolvePayload({
      values: createDto,
      linkedEnteringPaddy,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.farmerOwnedPaddyWarehouse.create({
        data: {
          stockType: 'farmer',
          enteringPaddyId: linkedEnteringPaddy?.id ?? null,
          billNo,
          enteringBillNo: linkedEnteringPaddy?.billNo ?? null,
          ...payload,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
        },
        select: farmerOwnedPaddyWarehouseSelect,
      });

      await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        variety: row.paddyVariety,
        companyWeightKgDelta: new Prisma.Decimal(0),
        farmerWeightKgDelta: toKilograms(
          new Prisma.Decimal(row.paddyQuantity),
          row.unit,
        ),
        entryCountDelta: 1,
      });

      return row;
    });

    if (linkedEnteringPaddy) {
      await this.markEnteringPaddyAsTracked(linkedEnteringPaddy.id, 'farmer');
      await this.customerLedgerService.syncFarmerObligationEntry({
        customerId: linkedEnteringPaddy.customerId,
        farmerPaddyWarehouseId: created.id,
        paddyQuantity: new Prisma.Decimal(payload.paddyQuantity),
        riceQuantity: new Prisma.Decimal(payload.riceQuantity),
        riceVariety: payload.riceVariety,
        unit: payload.unit,
        receivedDate: payload.receivedDate,
        notes: payload.notes,
      });
    }

    await this.stockSyncService.ensurePaddyVarietyStocksSynced(activeSeason.id);

    return this.serializeFarmerOwnedPaddyWarehouse(created);
  }

  async findAll(filters: FindFarmerOwnedPaddyWarehousesQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'receivedDate',
      'ownerName',
      'paddyVariety',
      'riceVariety',
      'paddyQuantity',
      'riceQuantity',
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
              { ownerName: { contains: query, mode: 'insensitive' } },
              { billNo: { contains: query, mode: 'insensitive' } },
              { enteringBillNo: { contains: query, mode: 'insensitive' } },
              { paddyVariety: { contains: query, mode: 'insensitive' } },
              { riceVariety: { contains: query, mode: 'insensitive' } },
              { unit: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.farmerOwnedPaddyWarehouseModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: farmerOwnedPaddyWarehouseSelect,
      }),
      this.farmerOwnedPaddyWarehouseModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item: any) =>
        this.serializeFarmerOwnedPaddyWarehouse(item),
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
    const farmerOwnedPaddyWarehouse =
      await this.farmerOwnedPaddyWarehouseModel.findUnique({
        where: { id: this.parseId(id) },
        select: farmerOwnedPaddyWarehouseSelect,
      });

    if (!farmerOwnedPaddyWarehouse) {
      throw new NotFoundException(
        `Farmer owned paddy record with id "${id}" not found`,
      );
    }

    return this.serializeFarmerOwnedPaddyWarehouse(farmerOwnedPaddyWarehouse);
  }

  async update(id: string, updateDto: UpdateFarmerOwnedPaddyWarehouseDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const payload = await this.resolvePayload({
      values: {
        paddyVariety: current.enteringPaddyId
          ? current.paddyVariety
          : (updateDto.paddyVariety ?? current.paddyVariety),
        paddyQuantity: current.enteringPaddyId
          ? current.paddyQuantity
          : (updateDto.paddyQuantity ?? current.paddyQuantity),
        riceVariety: updateDto.riceVariety ?? current.riceVariety,
        riceQuantity: updateDto.riceQuantity ?? current.riceQuantity,
        unit: current.enteringPaddyId
          ? current.unit
          : (updateDto.unit ?? current.unit),
        ownerName: current.enteringPaddyId
          ? current.ownerName
          : (updateDto.ownerName ?? current.ownerName),
        receivedDate: current.enteringPaddyId
          ? current.receivedDate
          : (updateDto.receivedDate ?? current.receivedDate),
        notes:
          updateDto.notes !== undefined
            ? (updateDto.notes ?? undefined)
            : (current.notes ?? undefined),
      },
      linkedEnteringPaddy: null,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.farmerOwnedPaddyWarehouse.update({
        where: { id: this.parseId(id) },
        data: {
          billNo: current.billNo,
          ...payload,
        },
        select: farmerOwnedPaddyWarehouseSelect,
      });

      await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
        seasonId: current.seasonId,
        seasonName: current.seasonName,
        variety: current.paddyVariety,
        companyWeightKgDelta: new Prisma.Decimal(0),
        farmerWeightKgDelta: toKilograms(
          new Prisma.Decimal(current.paddyQuantity),
          current.unit,
        ).negated(),
        entryCountDelta: -1,
      });

      await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
        seasonId: row.seasonId,
        seasonName: row.seasonName,
        variety: row.paddyVariety,
        companyWeightKgDelta: new Prisma.Decimal(0),
        farmerWeightKgDelta: toKilograms(
          new Prisma.Decimal(row.paddyQuantity),
          row.unit,
        ),
        entryCountDelta: 1,
      });

      return row;
    });

    if (current.enteringPaddy?.customerId) {
      await this.customerLedgerService.syncFarmerObligationEntry({
        customerId: BigInt(current.enteringPaddy.customerId),
        farmerPaddyWarehouseId: this.parseId(id),
        paddyQuantity: new Prisma.Decimal(updated.paddyQuantity),
        riceQuantity: new Prisma.Decimal(updated.riceQuantity),
        riceVariety: updated.riceVariety,
        unit: updated.unit,
        receivedDate: updated.receivedDate,
        notes: updated.notes,
      });
    }

    await this.stockSyncService.ensurePaddyVarietyStocksSynced(
      current.seasonId,
    );

    return this.serializeFarmerOwnedPaddyWarehouse(updated);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const deleted = await this.prisma.$transaction(async (tx) => {
      const row = await tx.farmerOwnedPaddyWarehouse.delete({
        where: { id: this.parseId(id) },
        select: farmerOwnedPaddyWarehouseSelect,
      });

      await this.stockSyncService.applyPaddyVarietyStockDelta(tx, {
        seasonId: row.seasonId,
        seasonName: row.seasonName,
        variety: row.paddyVariety,
        companyWeightKgDelta: new Prisma.Decimal(0),
        farmerWeightKgDelta: toKilograms(
          new Prisma.Decimal(row.paddyQuantity),
          row.unit,
        ).negated(),
        entryCountDelta: -1,
      });

      return row;
    });

    if (current.enteringPaddyId) {
      await this.untrackEnteringPaddy(current.enteringPaddyId);
      await this.customerLedgerService.removeFarmerObligationEntry(id);
    }

    await this.stockSyncService.ensurePaddyVarietyStocksSynced(
      current.seasonId,
    );

    return this.serializeFarmerOwnedPaddyWarehouse(deleted);
  }

  private async resolvePayload({
    values,
    linkedEnteringPaddy,
  }: {
    values: {
      enteringPaddyId?: string;
      paddyVariety: string;
      paddyQuantity: string | number | Prisma.Decimal;
      riceVariety: string;
      riceQuantity: string | number | Prisma.Decimal;
      unit: string;
      ownerName: string;
      receivedDate: string | Date;
      notes?: string;
    };
    linkedEnteringPaddy?: {
      id: bigint;
      paddyOwner: string;
      variety: string;
      date: Date;
      weight: Prisma.Decimal;
    } | null;
  }) {
    const paddyVariety = linkedEnteringPaddy
      ? linkedEnteringPaddy.variety
      : values.paddyVariety?.trim();
    const riceVariety = values.riceVariety?.trim();
    const ownerName = linkedEnteringPaddy
      ? linkedEnteringPaddy.paddyOwner
      : values.ownerName?.trim();
    const unit = linkedEnteringPaddy
      ? APP_WEIGHT_UNIT
      : normalizeWeightUnit(values.unit);
    const receivedDate = linkedEnteringPaddy
      ? linkedEnteringPaddy.date
      : values.receivedDate instanceof Date
        ? values.receivedDate
        : this.parseDate(values.receivedDate, 'receivedDate');
    const paddyQuantity = linkedEnteringPaddy
      ? new Prisma.Decimal(linkedEnteringPaddy.weight)
      : this.parseDecimal(values.paddyQuantity, 'paddyQuantity');
    const riceQuantity = this.parseDecimal(values.riceQuantity, 'riceQuantity');

    if (!paddyVariety) {
      throw new BadRequestException('paddyVariety is required');
    }

    if (!riceVariety) {
      throw new BadRequestException('riceVariety is required');
    }

    if (!ownerName) {
      throw new BadRequestException('ownerName is required');
    }

    const paddyVarietyResolved =
      await this.varietyService.resolveActiveVarietyName('PADDY', paddyVariety);
    const riceVarietyResolved =
      await this.varietyService.resolveActiveVarietyName('RICE', riceVariety);

    const paddyQuantityKg = toKilograms(paddyQuantity, unit);
    const riceQuantityKg = toKilograms(riceQuantity, unit);

    if (paddyQuantityKg.lessThanOrEqualTo(riceQuantityKg)) {
      throw new BadRequestException(
        'paddyQuantity must be greater than riceQuantity',
      );
    }

    return {
      paddyVariety: paddyVarietyResolved,
      paddyQuantity,
      riceVariety: riceVarietyResolved,
      riceQuantity,
      unit,
      ownerName,
      receivedDate,
      notes: values.notes?.trim() || null,
    };
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
        'Active season must have a code before farmer-owned paddy can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-FPW-`;
    const lastEntry = await this.farmerOwnedPaddyWarehouseModel.findFirst({
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

  private serializeFarmerOwnedPaddyWarehouse(farmerOwnedPaddyWarehouse: any) {
    return {
      ...farmerOwnedPaddyWarehouse,
      id: String(farmerOwnedPaddyWarehouse.id),
      enteringPaddyId:
        farmerOwnedPaddyWarehouse.enteringPaddyId !== null &&
        farmerOwnedPaddyWarehouse.enteringPaddyId !== undefined
          ? String(farmerOwnedPaddyWarehouse.enteringPaddyId)
          : null,
      enteringPaddy: farmerOwnedPaddyWarehouse.enteringPaddy
        ? {
            ...farmerOwnedPaddyWarehouse.enteringPaddy,
            id: String(farmerOwnedPaddyWarehouse.enteringPaddy.id),
            customerId:
              farmerOwnedPaddyWarehouse.enteringPaddy.customerId !== null &&
              farmerOwnedPaddyWarehouse.enteringPaddy.customerId !== undefined
                ? String(farmerOwnedPaddyWarehouse.enteringPaddy.customerId)
                : null,
          }
        : null,
    };
  }

  private async resolveEnteringPaddyForFarmer({
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

    if (entry.receivedFrom !== 'farmer') {
      throw new BadRequestException(
        'Farmer-owned paddy can only be created from farmer entering paddy',
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
}
