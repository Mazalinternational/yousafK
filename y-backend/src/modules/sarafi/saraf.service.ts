import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateSarafDto } from './dto/create-saraf.dto.js';
import { FindSarafsQueryDto } from './dto/find-sarafs-query.dto.js';
import { UpdateSarafDto } from './dto/update-saraf.dto.js';

const sarafSelect = {
  id: true,
  name: true,
  phoneNo: true,
  address: true,
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
export class SarafService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
  ) {}

  async create(createDto: CreateSarafDto) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const created = await this.prisma.$transaction(async (tx) => {
      const saraf = await tx.saraf.create({
        data: {
          name: this.requireText(createDto.name, 'name'),
          phoneNo: this.requireText(createDto.phoneNo, 'phoneNo'),
          address: this.requireText(createDto.address, 'address'),
          notes: createDto.notes?.trim() || null,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
        },
        select: sarafSelect,
      });

      await tx.sarafLedger.create({
        data: {
          sarafId: saraf.id,
        },
      });

      return saraf;
    });

    return this.serializeSaraf(created);
  }

  async findAll(filters: FindSarafsQueryDto = {}) {
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
      'seasonName',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'createdAt';

    const where: Prisma.SarafWhereInput = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { phoneNo: { contains: query, mode: 'insensitive' } },
              { address: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.saraf.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: sarafSelect,
      }),
      this.prisma.saraf.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item) => this.serializeSaraf(item)),
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
    const saraf = await this.prisma.saraf.findUnique({
      where: { id: this.parseId(id) },
      select: sarafSelect,
    });

    if (!saraf) {
      throw new NotFoundException(`Saraf with id "${id}" not found`);
    }

    return this.serializeSaraf(saraf);
  }

  async update(id: string, updateDto: UpdateSarafDto) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const updated = await this.prisma.saraf.update({
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
        ...(updateDto.notes !== undefined
          ? { notes: updateDto.notes?.trim() || null }
          : {}),
      },
      select: sarafSelect,
    });

    return this.serializeSaraf(updated);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const deleted = await this.prisma.saraf.delete({
      where: { id: this.parseId(id) },
      select: sarafSelect,
    });

    return this.serializeSaraf(deleted);
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

  private serializeSaraf(saraf: {
    id: bigint;
    name: string;
    phoneNo: string;
    address: string;
    notes: string | null;
    seasonId: string;
    seasonName: string;
    createdAt: Date;
    updatedAt: Date;
    season: { id: string; name: string; status: string } | null;
  }) {
    return {
      id: String(saraf.id),
      name: saraf.name,
      phoneNo: saraf.phoneNo,
      address: saraf.address,
      notes: saraf.notes,
      seasonId: saraf.seasonId,
      seasonName: saraf.seasonName,
      createdAt: saraf.createdAt.toISOString(),
      updatedAt: saraf.updatedAt.toISOString(),
      season: saraf.season
        ? {
            id: saraf.season.id,
            name: saraf.season.name,
            status: saraf.season.status,
          }
        : null,
    };
  }
}
