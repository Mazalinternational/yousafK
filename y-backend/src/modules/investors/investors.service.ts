import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateInvestorDto } from './dto/create-investor.dto.js';
import { FindInvestorsQueryDto } from './dto/find-investors-query.dto.js';
import { InvestorDashboardDto } from './dto/investor-dashboard.dto.js';
import { UpdateInvestorDto } from './dto/update-investor.dto.js';

const investorSelect = {
  id: true,
  name: true,
  phoneNo: true,
  address: true,
  sharePercentage: true,
  investedAmount: true,
  isActive: true,
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
} as const;

@Injectable()
export class InvestorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
  ) {}

  async create(createDto: CreateInvestorDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const sharePercentage = this.parsePercentage(
      createDto.sharePercentage,
      'sharePercentage',
    );
    const investedAmount = this.parseAmount(
      createDto.investedAmount ?? 0,
      'investedAmount',
      true,
    );
    const isActive = createDto.isActive ?? true;

    await this.assertShareCap(
      activeSeason.id,
      sharePercentage,
      undefined,
      isActive,
    );

    const created = await this.prisma.investor.create({
      data: {
        name: this.requireText(createDto.name, 'name'),
        phoneNo: this.requireText(createDto.phoneNo, 'phoneNo'),
        address: this.requireText(createDto.address, 'address'),
        sharePercentage,
        investedAmount,
        isActive,
        notes: this.normalizeOptionalText(createDto.notes),
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
      },
      select: investorSelect,
    });

    return this.serializeInvestor(created);
  }

  async findAll(filters: FindInvestorsQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'name',
      'phoneNo',
      'sharePercentage',
      'investedAmount',
      'isActive',
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const where: Prisma.InvestorWhereInput = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(filters.isActive === 'true' ? { isActive: true } : {}),
      ...(filters.isActive === 'false' ? { isActive: false } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { phoneNo: { contains: query, mode: 'insensitive' } },
              { address: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.investor.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: investorSelect,
      }),
      this.prisma.investor.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item) => this.serializeInvestor(item)),
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
    const investor = await this.prisma.investor.findUnique({
      where: { id: this.parseId(id) },
      select: investorSelect,
    });

    if (!investor) {
      throw new NotFoundException(`Investor with id "${id}" not found`);
    }

    return this.serializeInvestor(investor);
  }

  async getDashboard(seasonId?: string): Promise<InvestorDashboardDto> {
    let season: Awaited<
      ReturnType<SeasonService['getActiveSeasonOrThrow']>
    > | null = null;

    try {
      season = await this.seasonService.resolveSeasonForRead(seasonId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          season: null,
          overview: [],
          totals: {
            totalSales: '0.00',
            totalExpenses: '0.00',
            totalPurchases: '0.00',
            netProfit: '0.00',
            distributableProfit: '0.00',
          },
          investors: [],
        };
      }
      throw error;
    }

    const [
      investors,
      salesSum,
      expenseSumRows,
      companyPaddySum,
      riceWarehouseSum,
    ] = await Promise.all([
      this.prisma.investor.findMany({
        where: { seasonId: season.id },
        orderBy: [
          { isActive: 'desc' },
          { sharePercentage: 'desc' },
          { name: 'asc' },
        ],
        select: investorSelect,
      }),
      this.prisma.riceSale.aggregate({
        where: { seasonId: season.id },
        _sum: { totalAmount: true },
      }),
      this.prisma.$queryRaw<
        Array<{ totalAmount: Prisma.Decimal | null }>
      >(Prisma.sql`
        SELECT COALESCE(SUM("amount"), 0)::decimal AS "totalAmount"
        FROM "expenses"
        WHERE "season_id" = ${season.id}
      `),
      this.prisma.companyOwnedPaddyWarehouse.aggregate({
        where: { seasonId: season.id },
        _sum: { totalAmount: true },
      }),
      this.prisma.riceWarehouse.aggregate({
        where: { seasonId: season.id },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalSales = new Prisma.Decimal(salesSum._sum.totalAmount ?? 0);
    const totalExpenses = new Prisma.Decimal(
      expenseSumRows[0]?.totalAmount ?? 0,
    );
    const totalPurchases = new Prisma.Decimal(
      companyPaddySum._sum.totalAmount ?? 0,
    ).plus(new Prisma.Decimal(riceWarehouseSum._sum.totalAmount ?? 0));
    const netProfit = totalSales.minus(totalExpenses).minus(totalPurchases);
    const distributableProfit = Prisma.Decimal.max(
      netProfit,
      new Prisma.Decimal(0),
    );

    const activeInvestors = investors.filter((item) => item.isActive);
    const totalSharePercentage = activeInvestors.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(item.sharePercentage)),
      new Prisma.Decimal(0),
    );

    return {
      season: {
        id: season.id,
        name: season.name,
        status: season.status as 'ACTIVE' | 'CLOSED',
        startDate: season.startDate,
        endDate: season.endDate,
      },
      overview: [
        {
          label: 'total_investors',
          value: String(investors.length),
          unit: 'count',
        },
        {
          label: 'active_investors',
          value: String(activeInvestors.length),
          unit: 'count',
        },
        {
          label: 'investor_total_share_percentage',
          value: totalSharePercentage.toFixed(2),
          unit: 'percent',
        },
        {
          label: 'net_profit',
          value: netProfit.toFixed(2),
          unit: 'amount',
        },
        {
          label: 'distributable_profit',
          value: distributableProfit.toFixed(2),
          unit: 'amount',
        },
      ],
      totals: {
        totalSales: totalSales.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        totalPurchases: totalPurchases.toFixed(2),
        netProfit: netProfit.toFixed(2),
        distributableProfit: distributableProfit.toFixed(2),
      },
      investors: investors.map((item) => {
        const sharePercentage = new Prisma.Decimal(item.sharePercentage);
        const projectedShareAmount = item.isActive
          ? distributableProfit.mul(sharePercentage).div(100)
          : new Prisma.Decimal(0);

        return {
          id: String(item.id),
          name: item.name,
          sharePercentage: sharePercentage.toFixed(2),
          investedAmount: new Prisma.Decimal(item.investedAmount).toFixed(2),
          isActive: item.isActive,
          projectedShareAmount: projectedShareAmount.toFixed(2),
        };
      }),
    };
  }

  async update(id: string, updateDto: UpdateInvestorDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const sharePercentage =
      updateDto.sharePercentage !== undefined
        ? this.parsePercentage(updateDto.sharePercentage, 'sharePercentage')
        : new Prisma.Decimal(current.sharePercentage);
    const isActive = updateDto.isActive ?? current.isActive;

    await this.assertShareCap(current.seasonId, sharePercentage, id, isActive);

    const updated = await this.prisma.investor.update({
      where: { id: this.parseId(id) },
      data: {
        ...(updateDto.name !== undefined
          ? { name: this.requireText(updateDto.name, 'name') }
          : {}),
        ...(updateDto.phoneNo !== undefined
          ? { phoneNo: this.requireText(updateDto.phoneNo, 'phoneNo') }
          : {}),
        ...(updateDto.address !== undefined
          ? { address: this.requireText(updateDto.address, 'address') }
          : {}),
        ...(updateDto.sharePercentage !== undefined ? { sharePercentage } : {}),
        ...(updateDto.investedAmount !== undefined
          ? {
              investedAmount: this.parseAmount(
                updateDto.investedAmount,
                'investedAmount',
                true,
              ),
            }
          : {}),
        ...(updateDto.isActive !== undefined
          ? { isActive: updateDto.isActive }
          : {}),
        ...(updateDto.notes !== undefined
          ? { notes: this.normalizeOptionalText(updateDto.notes) }
          : {}),
      },
      select: investorSelect,
    });

    return this.serializeInvestor(updated);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const deleted = await this.prisma.investor.delete({
      where: { id: this.parseId(id) },
      select: investorSelect,
    });

    return this.serializeInvestor(deleted);
  }

  private async assertShareCap(
    seasonId: string,
    sharePercentage: Prisma.Decimal,
    excludeInvestorId?: string,
    isActive = true,
  ) {
    if (!isActive) {
      return;
    }

    const currentAggregate = await this.prisma.investor.aggregate({
      where: {
        seasonId,
        isActive: true,
        ...(excludeInvestorId
          ? { id: { not: this.parseId(excludeInvestorId) } }
          : {}),
      },
      _sum: { sharePercentage: true },
    });

    const currentTotal = new Prisma.Decimal(
      currentAggregate._sum.sharePercentage ?? 0,
    );
    const nextTotal = currentTotal.plus(sharePercentage);

    if (nextTotal.greaterThan(100)) {
      throw new BadRequestException(
        `Active investors share percentage cannot exceed 100. Current total is ${currentTotal.toFixed(2)}%.`,
      );
    }
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private requireText(value: string, fieldName: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return normalized;
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private parsePercentage(value: string | number, fieldName: string) {
    try {
      const decimal = new Prisma.Decimal(value);
      if (decimal.lessThanOrEqualTo(0) || decimal.greaterThan(100)) {
        throw new BadRequestException(
          `${fieldName} must be greater than 0 and at most 100`,
        );
      }
      return decimal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
  }

  private parseAmount(
    value: string | number,
    fieldName: string,
    allowZero = false,
  ) {
    try {
      const decimal = new Prisma.Decimal(value);
      if (allowZero) {
        if (decimal.lessThan(0)) {
          throw new BadRequestException(
            `${fieldName} must be greater than or equal to 0`,
          );
        }
      } else if (decimal.lessThanOrEqualTo(0)) {
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

  private serializeInvestor(investor: {
    id: bigint;
    name: string;
    phoneNo: string;
    address: string;
    sharePercentage: Prisma.Decimal;
    investedAmount: Prisma.Decimal;
    isActive: boolean;
    notes: string | null;
    seasonId: string;
    seasonName: string;
    createdAt: Date;
    updatedAt: Date;
    season: { id: string; name: string; status: string } | null;
  }) {
    return {
      id: String(investor.id),
      name: investor.name,
      phoneNo: investor.phoneNo,
      address: investor.address,
      sharePercentage: new Prisma.Decimal(investor.sharePercentage).toFixed(2),
      investedAmount: new Prisma.Decimal(investor.investedAmount).toFixed(2),
      isActive: investor.isActive,
      notes: investor.notes,
      seasonId: investor.seasonId,
      seasonName: investor.seasonName,
      createdAt: investor.createdAt.toISOString(),
      updatedAt: investor.updatedAt.toISOString(),
      season: investor.season
        ? {
            id: investor.season.id,
            name: investor.season.name,
            status: investor.season.status,
          }
        : null,
    };
  }
}
