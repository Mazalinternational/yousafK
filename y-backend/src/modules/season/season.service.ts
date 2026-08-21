import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CloseSeasonDto } from './dto/close-season.dto.js';
import { CreateSeasonDto } from './dto/create-season.dto.js';
import { FindSeasonsQueryDto } from './dto/find-seasons-query.dto.js';
import { UpdateSeasonDto } from './dto/update-season.dto.js';

const seasonSelect = {
  id: true,
  name: true,
  code: true,
  startDate: true,
  endDate: true,
  status: true,
  closingNotes: true,
  totalSales: true,
  totalExpenses: true,
  totalPurchases: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const SeasonStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
} as const;

type SeasonStatusValue = (typeof SeasonStatus)[keyof typeof SeasonStatus];

@Injectable()
export class SeasonService {
  constructor(private readonly prisma: PrismaService) {}

  private get seasonModel() {
    return (this.prisma as any).season;
  }

  async create(createSeasonDto: CreateSeasonDto) {
    await this.ensureActiveSeasonCanBeCreated();
    await this.ensureCodeAvailable(createSeasonDto.code);

    const startDate = this.parseDate(createSeasonDto.startDate, 'startDate');

    return this.seasonModel.create({
      data: {
        name: createSeasonDto.name.trim(),
        code: createSeasonDto.code?.trim() || null,
        startDate,
        closingNotes: createSeasonDto.closingNotes?.trim() || null,
        status: SeasonStatus.ACTIVE,
      },
      select: seasonSelect,
    });
  }

  async findAll(filters: FindSeasonsQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'name',
      'code',
      'startDate',
      'endDate',
      'status',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { code: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.seasonModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: seasonSelect,
      }),
      this.seasonModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items,
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
    const season = await this.seasonModel.findUnique({
      where: { id },
      select: seasonSelect,
    });

    if (!season) {
      throw new NotFoundException(`Season with id "${id}" not found`);
    }

    return season;
  }

  async getActiveSeasonOrThrow() {
    const season = await this.seasonModel.findFirst({
      where: { status: SeasonStatus.ACTIVE },
      select: seasonSelect,
      orderBy: { createdAt: 'desc' },
    });

    if (!season) {
      throw new NotFoundException('No active season found');
    }

    return season;
  }

  async resolveSeasonForRead(seasonId?: string | null) {
    const normalizedSeasonId = seasonId?.trim();
    if (normalizedSeasonId) {
      return this.findOne(normalizedSeasonId);
    }

    return this.getActiveSeasonOrThrow();
  }

  async update(id: string, updateSeasonDto: UpdateSeasonDto) {
    const currentSeason = await this.findOne(id);
    this.assertSeasonIsEditable(currentSeason);

    if (updateSeasonDto.code !== undefined) {
      await this.ensureCodeAvailable(updateSeasonDto.code, id);
    }

    const startDate = updateSeasonDto.startDate
      ? this.parseDate(updateSeasonDto.startDate, 'startDate')
      : undefined;
    const endDate =
      updateSeasonDto.endDate !== undefined
        ? updateSeasonDto.endDate
          ? this.parseDate(updateSeasonDto.endDate, 'endDate')
          : null
        : undefined;

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }

    return this.seasonModel.update({
      where: { id },
      data: {
        ...(updateSeasonDto.name !== undefined
          ? { name: updateSeasonDto.name.trim() }
          : {}),
        ...(updateSeasonDto.code !== undefined
          ? { code: updateSeasonDto.code?.trim() || null }
          : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(updateSeasonDto.closingNotes !== undefined
          ? { closingNotes: updateSeasonDto.closingNotes?.trim() || null }
          : {}),
      },
      select: seasonSelect,
    });
  }

  async close(id: string, closeSeasonDto?: CloseSeasonDto) {
    const season = await this.findOne(id);

    if (season.status === SeasonStatus.CLOSED) {
      throw new ConflictException(`Season "${season.name}" is already closed`);
    }

    const endDate = closeSeasonDto?.endDate
      ? this.parseDate(closeSeasonDto.endDate, 'endDate')
      : new Date();

    if (endDate < season.startDate) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }

    const totals = await this.calculateSeasonTotals(id);

    return this.seasonModel.update({
      where: { id },
      data: {
        status: SeasonStatus.CLOSED,
        endDate,
        closedAt: new Date(),
        closingNotes:
          closeSeasonDto?.closingNotes?.trim() ?? season.closingNotes ?? null,
        totalSales: totals.totalSales,
        totalExpenses: totals.totalExpenses,
        totalPurchases: totals.totalPurchases,
      },
      select: seasonSelect,
    });
  }

  async remove(id: string) {
    const season = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.customer?.deleteMany?.({
          where: { seasonId: id },
        }),
        tx.enteringPaddy?.deleteMany?.({
          where: { seasonId: id },
        }),
        tx.companyOwnedPaddyWarehouse?.deleteMany?.({
          where: { seasonId: id },
        }),
        tx.farmerOwnedPaddyWarehouse?.deleteMany?.({
          where: { seasonId: id },
        }),
        tx.riceWarehouse?.deleteMany?.({
          where: { seasonId: id },
        }),
      ]);

      await tx.season.delete({
        where: { id },
      });
    });

    return season;
  }

  assertSeasonIsEditable(season: {
    id: string;
    name: string;
    status: SeasonStatusValue;
  }) {
    if (season.status === SeasonStatus.CLOSED) {
      throw new ConflictException(
        `Season "${season.name}" is closed. No changes are allowed.`,
      );
    }
  }

  async assertSeasonIsEditableById(seasonId: string) {
    const season = await this.findOne(seasonId);
    this.assertSeasonIsEditable(season);
    return season;
  }

  private async ensureActiveSeasonCanBeCreated() {
    const activeSeason = await this.seasonModel.findFirst({
      where: { status: SeasonStatus.ACTIVE },
      select: { id: true, name: true },
    });

    if (activeSeason) {
      throw new ConflictException(
        `Season "${activeSeason.name}" is already active. Close it before creating a new season.`,
      );
    }
  }

  private async ensureCodeAvailable(
    code?: string | null,
    excludeSeasonId?: string,
  ) {
    const normalizedCode = code?.trim();

    if (!normalizedCode) {
      return;
    }

    const existingSeason = await this.seasonModel.findUnique({
      where: { code: normalizedCode },
      select: { id: true },
    });

    if (existingSeason && existingSeason.id !== excludeSeasonId) {
      throw new ConflictException(
        `Season code "${normalizedCode}" already exists`,
      );
    }
  }

  private parseDate(value: string, fieldName: string) {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return parsedDate;
  }

  private async calculateSeasonTotals(_seasonId: string) {
    const [paddyPurchasesAggregate, ricePurchasesAggregate] = await Promise.all(
      [
        (this.prisma as any).companyOwnedPaddyWarehouse?.aggregate?.({
          where: { seasonId: _seasonId },
          _sum: {
            totalAmount: true,
          },
        }),
        (this.prisma as any).riceWarehouse?.aggregate?.({
          where: { seasonId: _seasonId },
          _sum: {
            totalAmount: true,
          },
        }),
      ],
    );

    return {
      totalSales: new Prisma.Decimal(0),
      totalExpenses: new Prisma.Decimal(0),
      totalPurchases: new Prisma.Decimal(
        paddyPurchasesAggregate?._sum?.totalAmount ?? 0,
      ).plus(
        new Prisma.Decimal(ricePurchasesAggregate?._sum?.totalAmount ?? 0),
      ),
    };
  }
}
