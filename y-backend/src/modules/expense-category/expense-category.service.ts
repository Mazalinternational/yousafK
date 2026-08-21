import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto.js';
import { FindExpenseCategoriesQueryDto } from './dto/find-expense-categories-query.dto.js';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto.js';

const categorySelect = {
  id: true,
  code: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ExpenseCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  private get categoryModel() {
    return (this.prisma as any).expenseCategory;
  }

  async create(createDto: CreateExpenseCategoryDto) {
    const code = this.normalizeCategoryCode(createDto.code);
    const name = createDto.name?.trim() || this.titleCaseFromCode(code);

    const existing = await this.categoryModel.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Expense category "${code}" is already registered`,
      );
    }

    return this.categoryModel.create({
      data: { code, name },
      select: categorySelect,
    });
  }

  async findAll(filters: FindExpenseCategoriesQueryDto = {}) {
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
      this.categoryModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: categorySelect,
      }),
      this.categoryModel.count({ where }),
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
    const category = await this.categoryModel.findUnique({
      where: { id },
      select: categorySelect,
    });

    if (!category) {
      throw new NotFoundException(`Expense category with id "${id}" not found`);
    }

    return category;
  }

  async requireActiveCategoryId(id: string) {
    const category = await this.findOne(id);

    if (!category.isActive) {
      throw new BadRequestException(
        `Expense category "${category.name}" is inactive and cannot be selected`,
      );
    }

    return category.id;
  }

  async update(id: string, updateDto: UpdateExpenseCategoryDto) {
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

    return this.categoryModel.update({
      where: { id },
      data,
      select: categorySelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const usageRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS "count"
        FROM "expenses"
        WHERE "category_id" = ${id}
      `,
    );

    const usageCount = Number(usageRows[0]?.count ?? 0);
    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete this category because ${usageCount} expense record(s) still use it`,
      );
    }

    await this.categoryModel.delete({
      where: { id },
      select: categorySelect,
    });

    return { id, deleted: true };
  }

  private normalizeCategoryCode(value?: string) {
    const normalized = value
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    if (!normalized || normalized.length < 2 || normalized.length > 32) {
      throw new BadRequestException(
        'code must be 2–32 characters (letters, numbers, underscore)',
      );
    }

    return normalized;
  }

  private titleCaseFromCode(code: string) {
    return code
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
