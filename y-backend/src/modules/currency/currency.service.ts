import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CreateCurrencyDto } from './dto/create-currency.dto.js';
import { FindCurrenciesQueryDto } from './dto/find-currencies-query.dto.js';
import { UpdateCurrencyDto } from './dto/update-currency.dto.js';

const SUGGESTED_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  PKR: 'Pakistani Rupee',
  AFN: 'Afghan Afghani',
  EUR: 'Euro',
  GBP: 'British Pound',
  SAR: 'Saudi Riyal',
  AED: 'UAE Dirham',
};

const currencySelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  private get currencyModel() {
    return (this.prisma as any).currency;
  }

  async create(createDto: CreateCurrencyDto) {
    const code = this.normalizeCurrencyCode(createDto.code);
    const name = createDto.name?.trim() || SUGGESTED_NAMES[code] || code;

    const existing = await this.currencyModel.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Currency ${code} is already registered`);
    }

    const created = await this.currencyModel.create({
      data: {
        code,
        name,
      },
      select: currencySelect,
    });

    return created;
  }

  async findAll(filters: FindCurrenciesQueryDto = {}) {
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
      ...isActiveFilter,
      ...(query
        ? {
            OR: [
              { code: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.currencyModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: currencySelect,
      }),
      this.currencyModel.count({ where }),
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
    const currency = await this.currencyModel.findUnique({
      where: { id },
      select: currencySelect,
    });

    if (!currency) {
      throw new NotFoundException(`Currency with id "${id}" not found`);
    }

    return currency;
  }

  /** Ensures the currency exists and is active (for expense create/update). */
  async requireActiveCurrencyId(id: string) {
    const currency = await this.findOne(id);

    if (!currency.isActive) {
      throw new BadRequestException(
        `Currency "${currency.code}" is inactive and cannot be selected for expenses`,
      );
    }

    return currency.id;
  }

  async update(id: string, updateDto: UpdateCurrencyDto) {
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

    return this.currencyModel.update({
      where: { id },
      data,
      select: currencySelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.currencyModel.delete({
      where: { id },
      select: currencySelect,
    });

    return { id, deleted: true };
  }

  listAllowedCodes() {
    return {
      codePattern: '^[A-Z]{3}$',
      examples: ['USD', 'PKR', 'AFN', 'EUR', 'GBP'],
    };
  }

  private normalizeCurrencyCode(value?: string): string {
    const normalized = value?.trim().toUpperCase();

    if (!normalized) {
      throw new BadRequestException('code is required');
    }

    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new BadRequestException(
        'code must be exactly three Latin letters (ISO 4217 style, e.g. USD or EUR)',
      );
    }

    return normalized;
  }
}
