import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type VarietyKind } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CreateVarietyDto } from './dto/create-variety.dto.js';
import { FindVarietiesQueryDto } from './dto/find-varieties-query.dto.js';
import { UpdateVarietyDto } from './dto/update-variety.dto.js';

const KIND_VALUES = new Set<string>(['RICE', 'PADDY', 'PROCESS_PRODUCTION']);

const varietySelect = {
  id: true,
  kind: true,
  code: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class VarietyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates `raw` against an active catalog row (by name or code, case-insensitive)
   * and returns the canonical **display name** stored on the row (used everywhere
   * stock and reports key off the string value).
   */
  async resolveActiveVarietyName(
    kind: VarietyKind,
    raw: string,
  ): Promise<string> {
    const trimmed = raw?.trim();
    if (!trimmed) {
      throw new BadRequestException('variety is required');
    }

    const row = await this.prisma.variety.findFirst({
      where: {
        kind,
        isActive: true,
        OR: [
          { name: { equals: trimmed, mode: 'insensitive' } },
          { code: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      select: { name: true },
    });

    if (!row) {
      throw new BadRequestException(
        `Unknown or inactive ${kind} variety "${trimmed}". Register it under Veriety (use the same name or code).`,
      );
    }

    return row.name.trim();
  }

  async listActiveVarietyNames(kind: VarietyKind): Promise<string[]> {
    const rows = await this.prisma.variety.findMany({
      where: { kind, isActive: true },
      orderBy: { code: 'asc' },
      select: { name: true },
    });

    return rows.map((row) => row.name.trim());
  }

  private parseKind(value: unknown): VarietyKind {
    const s = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!KIND_VALUES.has(s)) {
      throw new BadRequestException(
        `kind must be one of: ${[...KIND_VALUES].join(', ')}`,
      );
    }
    return s as VarietyKind;
  }

  private normalizeCode(value?: string): string {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException('code is required');
    }
    if (trimmed.length > 64) {
      throw new BadRequestException('code must be at most 64 characters');
    }
    if (!/^[A-Za-z0-9._\- ]+$/.test(trimmed)) {
      throw new BadRequestException(
        'code may only contain letters, digits, spaces, dot, underscore, or hyphen',
      );
    }
    return trimmed;
  }

  async create(createDto: CreateVarietyDto) {
    const kind = this.parseKind(createDto.kind);
    const code = this.normalizeCode(createDto.code);
    const name = createDto.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const existing = await this.prisma.variety.findUnique({
      where: { kind_code: { kind, code } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Variety code "${code}" already exists for this category`,
      );
    }

    return this.prisma.variety.create({
      data: { kind, code, name },
      select: varietySelect,
    });
  }

  async findAll(filters: FindVarietiesQueryDto) {
    const kind = this.parseKind(filters.kind);
    const pageNumber =
      Number(filters.pageNumber) > 0 ? Number(filters.pageNumber) : 1;
    const pageSize =
      Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;
    const query = filters.query?.trim();
    const sortDirection =
      filters.sortByAction || filters.sortDirection || 'asc';
    const allowedSortFields = [
      'code',
      'name',
      'isActive',
      'createdAt',
      'updatedAt',
    ] as const;
    const sortBy = allowedSortFields.includes(
      filters.sortBy as (typeof allowedSortFields)[number],
    )
      ? (filters.sortBy as (typeof allowedSortFields)[number])
      : 'code';

    const isActiveFilter =
      filters.isActive === undefined || filters.isActive === ''
        ? {}
        : { isActive: filters.isActive === 'true' || filters.isActive === '1' };

    const where = {
      kind,
      ...isActiveFilter,
      ...(query
        ? {
            OR: [
              { code: { contains: query, mode: 'insensitive' as const } },
              { name: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.variety.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: varietySelect,
      }),
      this.prisma.variety.count({ where }),
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
    const row = await this.prisma.variety.findUnique({
      where: { id },
      select: varietySelect,
    });

    if (!row) {
      throw new NotFoundException(`Variety with id "${id}" not found`);
    }

    return row;
  }

  async update(id: string, updateDto: UpdateVarietyDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};

    if (updateDto.name !== undefined) {
      const trimmed = updateDto.name?.trim();
      if (!trimmed) {
        throw new BadRequestException('name cannot be empty');
      }
      data.name = trimmed;
    }

    if (updateDto.isActive !== undefined) {
      data.isActive = Boolean(updateDto.isActive);
    }

    if (Object.keys(data).length === 0) {
      return this.findOne(id);
    }

    return this.prisma.variety.update({
      where: { id },
      data,
      select: varietySelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.variety.delete({
      where: { id },
      select: varietySelect,
    });

    return { id, deleted: true };
  }
}
