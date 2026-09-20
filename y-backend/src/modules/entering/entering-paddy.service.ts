import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { VarietyService } from '../variety/variety.service.js';
import { CreateEnteringPaddyDto } from './dto/create-entering-paddy.dto.js';
import { EnteringPaddyDashboardDto } from './dto/entering-paddy-dashboard.dto.js';
import { FindEnteringPaddiesQueryDto } from './dto/find-entering-paddies-query.dto.js';
import { UpdateEnteringPaddyDto } from './dto/update-entering-paddy.dto.js';
import {
  APP_WEIGHT_UNIT,
  normalizeWeightUnit,
  toKilograms,
} from '../../common/weight/weight-unit.util.js';
import { decodeWafSafeString } from '../../common/waf-safe-body.util.js';

const enteringPaddySelect = {
  id: true,
  paddyOwner: true,
  billNo: true,
  customerId: true,
  variety: true,
  date: true,
  weight: true,
  weightUnit: true,
  totalWeightKg: true,
  driverName: true,
  carPlate: true,
  phoneNo: true,
  address: true,
  receivedFrom: true,
  trackedInWarehouse: true,
  trackedStockType: true,
  trackedAt: true,
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
  customer: {
    select: {
      id: true,
      name: true,
      phoneNo: true,
      seasonId: true,
      seasonName: true,
    },
  },
  companyOwnedPaddyWarehouse: {
    select: {
      id: true,
      quantity: true,
      unit: true,
    },
  },
  farmerOwnedPaddyWarehouse: {
    select: {
      id: true,
      paddyQuantity: true,
      unit: true,
    },
  },
} as const;

@Injectable()
export class EnteringPaddyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly varietyService: VarietyService,
  ) {}

  private get enteringPaddyModel() {
    return (this.prisma as any).enteringPaddy;
  }

  private get customerModel() {
    return (this.prisma as any).customer;
  }

  private toWarehouseTrackingSummary(enteringPaddy: any) {
    if (enteringPaddy.companyOwnedPaddyWarehouse) {
      const quantityKg = toKilograms(
        new Prisma.Decimal(enteringPaddy.companyOwnedPaddyWarehouse.quantity),
        enteringPaddy.companyOwnedPaddyWarehouse.unit,
      );

      return {
        trackedQuantityKg: quantityKg.toFixed(2),
        remainingQuantityKg: new Prisma.Decimal(enteringPaddy.totalWeightKg)
          .minus(quantityKg)
          .toFixed(2),
      };
    }

    if (enteringPaddy.farmerOwnedPaddyWarehouse) {
      const quantityKg = toKilograms(
        new Prisma.Decimal(
          enteringPaddy.farmerOwnedPaddyWarehouse.paddyQuantity,
        ),
        enteringPaddy.farmerOwnedPaddyWarehouse.unit,
      );

      return {
        trackedQuantityKg: quantityKg.toFixed(2),
        remainingQuantityKg: new Prisma.Decimal(enteringPaddy.totalWeightKg)
          .minus(quantityKg)
          .toFixed(2),
      };
    }

    return {
      trackedQuantityKg: '0.00',
      remainingQuantityKg: new Prisma.Decimal(
        enteringPaddy.totalWeightKg,
      ).toFixed(2),
    };
  }

  async create(createEnteringPaddyDto: CreateEnteringPaddyDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);
    const customer = await this.resolveCustomerForSeason(
      createEnteringPaddyDto.customerId,
      activeSeason.id,
    );
    const receivedFrom = this.resolveReceivedFrom(customer);
    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
      receivedFrom,
    );

    const variety = await this.varietyService.resolveActiveVarietyName(
      'PADDY',
      createEnteringPaddyDto.variety,
    );
    const data = this.normalizePayload(
      {
        ...createEnteringPaddyDto,
        variety,
        receivedFrom,
      },
      customer,
      billNo,
    );

    const created = await this.enteringPaddyModel.create({
      data: {
        ...data,
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
      },
      select: enteringPaddySelect,
    });

    return this.serialize(created);
  }

  async findAll(filters: FindEnteringPaddiesQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'date',
      'paddyOwner',
      'billNo',
      'variety',
      'driverName',
      'carPlate',
      'receivedFrom',
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const where: Prisma.EnteringPaddyWhereInput = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(filters.receivedFrom
        ? { receivedFrom: this.normalizeReceivedFrom(filters.receivedFrom) }
        : {}),
      ...(filters.trackedInWarehouse !== undefined
        ? {
            trackedInWarehouse:
              filters.trackedInWarehouse === true ||
              filters.trackedInWarehouse === 'true',
          }
        : {}),
      ...(query ? { OR: this.buildSearchFilters(query) } : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.enteringPaddyModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: enteringPaddySelect,
      }),
      this.enteringPaddyModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item: any) => this.serialize(item)),
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
    const enteringPaddy = await this.enteringPaddyModel.findUnique({
      where: { id: this.parseId(id) },
      select: enteringPaddySelect,
    });

    if (!enteringPaddy) {
      throw new NotFoundException(
        `Entering paddy record with id "${id}" not found`,
      );
    }

    return this.serialize(enteringPaddy);
  }

  async getDashboard(seasonId?: string): Promise<EnteringPaddyDashboardDto> {
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
          { label: 'totalWeightKg', value: '0.00', unit: APP_WEIGHT_UNIT },
          { label: 'totalEntries', value: '0', unit: 'count' },
          { label: 'recentEntriesCount', value: '0', unit: 'count' },
        ],
        sourceSummary: {
          farmerCount: 0,
          sellerCount: 0,
        },
        unitSummary: {
          oneKgCount: 0,
          sevenKgCount: 0,
          tonCount: 0,
        },
        recentEntries: [],
      };
    }

    const entries = await this.enteringPaddyModel.findMany({
      where: { seasonId: activeSeason.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        billNo: true,
        paddyOwner: true,
        variety: true,
        date: true,
        totalWeightKg: true,
        receivedFrom: true,
        weightUnit: true,
        driverName: true,
        carPlate: true,
      },
    });

    const totals = entries.reduce(
      (acc: any, entry: any) => {
        const totalWeightKg = new Prisma.Decimal(entry.totalWeightKg);

        return {
          totalWeightKg: acc.totalWeightKg.plus(totalWeightKg),
          farmerCount:
            acc.farmerCount + (entry.receivedFrom === 'farmer' ? 1 : 0),
          sellerCount:
            acc.sellerCount + (entry.receivedFrom === 'seller' ? 1 : 0),
        };
      },
      {
        totalWeightKg: new Prisma.Decimal(0),
        farmerCount: 0,
        sellerCount: 0,
      },
    );

    return {
      season: activeSeason,
      overview: [
        {
          label: 'totalWeightKg',
          value: totals.totalWeightKg.toFixed(2),
          unit: APP_WEIGHT_UNIT,
        },
        {
          label: 'totalEntries',
          value: String(entries.length),
          unit: 'count',
        },
        {
          label: 'recentEntriesCount',
          value: String(Math.min(entries.length, 5)),
          unit: 'count',
        },
      ],
      sourceSummary: {
        farmerCount: totals.farmerCount,
        sellerCount: totals.sellerCount,
      },
      unitSummary: entries.reduce(
        (
          acc: {
            oneKgCount: number;
            sevenKgCount: number;
            tonCount: number;
          },
          entry: { weightUnit: string },
        ) => {
          const u = entry.weightUnit;
          if (u === 'one_kg') {
            acc.oneKgCount += 1;
          } else if (u === 'seven_kg') {
            acc.sevenKgCount += 1;
          } else if (u === 'ton') {
            acc.tonCount += 1;
          }
          return acc;
        },
        { oneKgCount: 0, sevenKgCount: 0, tonCount: 0 },
      ),
      recentEntries: entries.slice(0, 5).map((entry: any) => ({
        id: String(entry.id),
        billNo: entry.billNo,
        paddyOwner: entry.paddyOwner,
        variety: entry.variety,
        date: entry.date,
        totalWeightKg: new Prisma.Decimal(entry.totalWeightKg).toFixed(2),
        receivedFrom: entry.receivedFrom,
        driverName: entry.driverName,
        carPlate: entry.carPlate,
      })),
    };
  }

  async update(id: string, updateEnteringPaddyDto: UpdateEnteringPaddyDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    if (
      current.trackedInWarehouse &&
      updateEnteringPaddyDto.customerId !== undefined &&
      updateEnteringPaddyDto.customerId !== current.customerId
    ) {
      throw new BadRequestException(
        'Tracked entering paddy cannot be reassigned to a different customer',
      );
    }

    const customer = await this.resolveCustomerForSeason(
      updateEnteringPaddyDto.customerId ?? current.customerId,
      current.seasonId,
    );
    const receivedFrom = this.resolveReceivedFrom(customer);

    const variety = await this.varietyService.resolveActiveVarietyName(
      'PADDY',
      updateEnteringPaddyDto.variety ?? current.variety,
    );
    const normalized = this.normalizePayload(
      {
        customerId: updateEnteringPaddyDto.customerId ?? current.customerId,
        variety,
        date: updateEnteringPaddyDto.date ?? current.date,
        weight: updateEnteringPaddyDto.weight ?? current.weight,
        weightUnit: updateEnteringPaddyDto.weightUnit ?? current.weightUnit,
        driverName: updateEnteringPaddyDto.driverName ?? current.driverName,
        carPlate: updateEnteringPaddyDto.carPlate ?? current.carPlate,
        phoneNo: updateEnteringPaddyDto.phoneNo ?? current.phoneNo,
        address: updateEnteringPaddyDto.address ?? current.address,
        receivedFrom,
      },
      customer,
      current.billNo,
    );

    const updated = await this.enteringPaddyModel.update({
      where: { id: this.parseId(id) },
      data: normalized,
      select: enteringPaddySelect,
    });

    return this.serialize(updated);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const deleted = await this.enteringPaddyModel.delete({
      where: { id: this.parseId(id) },
      select: enteringPaddySelect,
    });

    return this.serialize(deleted);
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private parseNullableId(value: string | null | undefined, fieldName: string) {
    if (!value) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return this.parseId(value);
  }

  private parseDate(value: string | Date, fieldName: string) {
    const parsedDate = value instanceof Date ? value : new Date(value);

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
    } catch {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
  }

  private buildSearchFilters(query: string): Prisma.EnteringPaddyWhereInput[] {
    const contains = { contains: query, mode: 'insensitive' as const };
    const filters: Prisma.EnteringPaddyWhereInput[] = [
      { paddyOwner: contains },
      { billNo: contains },
      { variety: contains },
      { driverName: contains },
      { carPlate: contains },
      { phoneNo: contains },
      { address: contains },
      { seasonName: contains },
      { customer: { name: contains } },
      { customer: { phoneNo: contains } },
    ];

    const normalized = query.trim().toLowerCase();
    if (normalized === 'farmer' || normalized === 'seller') {
      filters.push({ receivedFrom: normalized });
    }

    return filters;
  }

  private normalizeReceivedFrom(receivedFrom?: string) {
    const normalizedReceivedFrom = receivedFrom?.trim().toLowerCase();

    if (!normalizedReceivedFrom) {
      throw new BadRequestException('receivedFrom is required');
    }

    if (!['farmer', 'seller'].includes(normalizedReceivedFrom)) {
      throw new BadRequestException(
        'receivedFrom must be either farmer or seller',
      );
    }

    return normalizedReceivedFrom as 'farmer' | 'seller';
  }

  private requireText(value: string, fieldName: string) {
    const normalizedValue = decodeWafSafeString(value ?? '').trim();

    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalizedValue;
  }

  private normalizePayload(
    payload: {
      customerId: string | null | undefined;
      variety: string;
      date: string | Date;
      weight: string | number | Prisma.Decimal;
      weightUnit: string;
      driverName: string;
      carPlate: string;
      phoneNo: string;
      address: string;
      receivedFrom: string;
    },
    customer: any,
    billNo: string,
  ) {
    const weightUnit = normalizeWeightUnit(payload.weightUnit);
    const weight = this.parseDecimal(payload.weight, 'weight');

    return {
      paddyOwner: customer.name,
      billNo,
      customerId: this.parseNullableId(payload.customerId, 'customerId'),
      variety: this.requireText(payload.variety, 'variety'),
      date: this.parseDate(payload.date, 'date'),
      weight,
      weightUnit,
      totalWeightKg: toKilograms(weight, weightUnit),
      driverName: this.requireText(payload.driverName, 'driverName'),
      carPlate: this.requireText(payload.carPlate, 'carPlate'),
      phoneNo: this.requireText(payload.phoneNo, 'phoneNo'),
      address: this.requireText(payload.address, 'address'),
      receivedFrom: this.normalizeReceivedFrom(payload.receivedFrom),
    };
  }

  private async resolveCustomerForSeason(
    customerId: string | null | undefined,
    seasonId: string,
  ) {
    const parsedCustomerId = this.parseNullableId(customerId, 'customerId');

    const seasonCustomerCount = await this.customerModel.count({
      where: { seasonId },
    });

    if (seasonCustomerCount === 0) {
      throw new BadRequestException(
        'At least one customer is required before entering paddy can be recorded',
      );
    }

    const customer = await this.customerModel.findUnique({
      where: { id: parsedCustomerId },
      select: {
        id: true,
        name: true,
        type: true,
        seasonId: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer with id "${String(customerId)}" not found`,
      );
    }

    if (customer.seasonId !== seasonId) {
      throw new BadRequestException(
        'Selected customer must belong to the current active season',
      );
    }

    if (!['paddy_farmer', 'paddy_seller'].includes(customer.type)) {
      throw new BadRequestException(
        'Selected customer must be a paddy_farmer or paddy_seller account',
      );
    }

    return customer;
  }

  private resolveReceivedFrom(customer: { type: string }) {
    if (customer.type === 'paddy_farmer') {
      return 'farmer' as const;
    }

    if (customer.type === 'paddy_seller') {
      return 'seller' as const;
    }

    throw new BadRequestException(
      'Selected customer must be a paddy_farmer or paddy_seller account',
    );
  }

  private async generateBillNo(
    seasonId: string,
    seasonCode: string | null | undefined,
    receivedFrom: 'farmer' | 'seller',
  ) {
    const normalizedSeasonCode = seasonCode?.trim();

    if (!normalizedSeasonCode) {
      throw new BadRequestException(
        'Active season must have a code before entering paddy can be recorded',
      );
    }

    const sourcePrefix = receivedFrom === 'farmer' ? 'EPF' : 'EPS';
    const prefix = `${normalizedSeasonCode.toUpperCase()}-${sourcePrefix}-`;

    const lastEntry = await this.enteringPaddyModel.findFirst({
      where: {
        seasonId,
        receivedFrom,
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

  private serialize(enteringPaddy: any) {
    const trackingSummary = this.toWarehouseTrackingSummary(enteringPaddy);

    return {
      ...enteringPaddy,
      id: String(enteringPaddy.id),
      customerId:
        enteringPaddy.customerId !== null &&
        enteringPaddy.customerId !== undefined
          ? String(enteringPaddy.customerId)
          : null,
      customer: enteringPaddy.customer
        ? {
            ...enteringPaddy.customer,
            id: String(enteringPaddy.customer.id),
          }
        : null,
      trackedQuantityKg: trackingSummary.trackedQuantityKg,
      remainingQuantityKg: trackingSummary.remainingQuantityKg,
      trackedAt: enteringPaddy.trackedAt
        ? new Date(enteringPaddy.trackedAt).toISOString()
        : null,
    };
  }
}
