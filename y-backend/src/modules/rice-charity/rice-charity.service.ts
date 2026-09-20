import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeWeightUnit } from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { VarietyService } from '../variety/variety.service.js';
import { CreateRiceCharityDto } from './dto/create-rice-charity.dto.js';
import { FindRiceCharitiesQueryDto } from './dto/find-rice-charities-query.dto.js';
import { UpdateRiceCharityDto } from './dto/update-rice-charity.dto.js';

const riceCharitySelect = {
  id: true,
  billNo: true,
  recipientName: true,
  riceVariety: true,
  quantity: true,
  unit: true,
  charityDate: true,
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
export class RiceCharityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly varietyService: VarietyService,
  ) {}

  private get riceCharityModel() {
    return (this.prisma as any).riceCharity;
  }

  async create(createDto: CreateRiceCharityDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const prepared = await this.prepareCharityWrite({
      dto: createDto,
    });

    const billNo = await this.generateBillNo(
      activeSeason.id,
      activeSeason.code,
    );

    const created = await this.riceCharityModel.create({
      data: {
        billNo,
        recipientName: prepared.recipientName,
        riceVariety: prepared.riceVariety,
        quantity: prepared.quantity,
        unit: prepared.unit,
        charityDate: prepared.charityDate,
        notes: createDto.notes?.trim() || null,
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
      },
      select: riceCharitySelect,
    });

    return this.serializeRiceCharity(created);
  }

  async findOne(id: string) {
    const charity = await this.riceCharityModel.findUnique({
      where: { id: this.parseId(id) },
      select: riceCharitySelect,
    });

    if (!charity) {
      throw new NotFoundException(`Rice charity with id "${id}" not found`);
    }

    return this.serializeRiceCharity(charity);
  }

  async update(id: string, updateDto: UpdateRiceCharityDto) {
    const charityId = this.parseId(id);
    const current = await this.riceCharityModel.findUnique({
      where: { id: charityId },
      select: {
        id: true,
        seasonId: true,
      },
    });

    if (!current) {
      throw new NotFoundException(`Rice charity with id "${id}" not found`);
    }

    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const prepared = await this.prepareCharityWrite({
      dto: updateDto,
    });

    const updated = await this.riceCharityModel.update({
      where: { id: charityId },
      data: {
        recipientName: prepared.recipientName,
        riceVariety: prepared.riceVariety,
        quantity: prepared.quantity,
        unit: prepared.unit,
        charityDate: prepared.charityDate,
        notes: updateDto.notes?.trim() || null,
      },
      select: riceCharitySelect,
    });

    return this.serializeRiceCharity(updated);
  }

  async remove(id: string) {
    const charityId = this.parseId(id);
    const current = await this.riceCharityModel.findUnique({
      where: { id: charityId },
      select: riceCharitySelect,
    });

    if (!current) {
      throw new NotFoundException(`Rice charity with id "${id}" not found`);
    }

    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    await this.riceCharityModel.delete({ where: { id: charityId } });

    return this.serializeRiceCharity(current);
  }

  async findAll(filters: FindRiceCharitiesQueryDto = {}) {
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'desc';
    const allowedSortFields = [
      'charityDate',
      'billNo',
      'riceVariety',
      'quantity',
      'recipientName',
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
              { billNo: { contains: query, mode: 'insensitive' } },
              { riceVariety: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
              { recipientName: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.riceCharityModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: riceCharitySelect,
      }),
      this.riceCharityModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item: any) => this.serializeRiceCharity(item)),
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

  private async prepareCharityWrite(params: {
    dto: CreateRiceCharityDto | UpdateRiceCharityDto;
  }) {
    const recipientName = params.dto.recipientName?.trim();

    if (!recipientName) {
      throw new BadRequestException('recipientName is required');
    }

    const riceVariety = await this.resolveRiceVarietyName(
      params.dto.riceVariety ?? '',
    );
    const unit = normalizeWeightUnit(params.dto.unit);
    const quantity = this.parsePositiveDecimal(params.dto.quantity, 'quantity');
    const charityDate = this.parseDate(params.dto.charityDate, 'charityDate');

    // Charity reduces book stock the same way as sales. Do not block when
    // physical/book remaining is already zero or negative (oversell seasons).

    return {
      recipientName,
      riceVariety,
      unit,
      quantity,
      charityDate,
    };
  }

  private async resolveRiceVarietyName(raw: string): Promise<string> {
    const trimmed = raw?.trim();

    if (!trimmed) {
      throw new BadRequestException('riceVariety is required');
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
      `Unknown or inactive rice variety "${trimmed}". Register it under Veriety as RICE (preferred) or PADDY.`,
    );
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

  private parsePositiveDecimal(value: string | number, fieldName: string) {
    try {
      const decimal = new Prisma.Decimal(value);

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
        'Active season must have a code before rice charity can be recorded',
      );
    }

    const prefix = `${normalizedSeasonCode.toUpperCase()}-RC-`;
    const lastEntry = await this.riceCharityModel.findFirst({
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

  private serializeRiceCharity(charity: any) {
    return {
      ...charity,
      id: String(charity.id),
      quantity: new Prisma.Decimal(charity.quantity).toFixed(2),
    };
  }
}
