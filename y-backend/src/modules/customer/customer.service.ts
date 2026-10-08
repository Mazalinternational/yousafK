import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/auth-types.js';
import {
  assertCanAccessCustomerType,
  customerTypeWhereFilter,
} from '../../common/rbac/customer-type-access.js';
import { shamsiToGregorian } from '../../common/shamsi-calendar.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

const CUSTOMER_TYPE_SEARCH_TERMS: Array<{
  type:
    | 'paddy_farmer'
    | 'paddy_seller'
    | 'rice_seller'
    | 'buyer'
    | 'vendor'
    | 'debtor';
  terms: string[];
}> = [
  {
    type: 'paddy_seller',
    terms: [
      'paddy seller',
      'paddy_seller',
      'فروشنده شلتوک',
      'د شلتوک پلورونکی',
    ],
  },
  {
    type: 'paddy_farmer',
    terms: [
      'paddy farmer',
      'paddy former',
      'paddy_farmer',
      'کشاورز شلتوک',
      'د شلتوک کروندګر',
    ],
  },
  {
    type: 'buyer',
    terms: ['paddy buyer', 'buyer', 'خریدار', 'پیرودونکی'],
  },
  {
    type: 'rice_seller',
    terms: ['rice seller', 'rice_seller', 'فروشنده برنج', 'د وریجو پلورونکی'],
  },
  {
    type: 'vendor',
    terms: ['vendor', 'عرضه کوونکی'],
  },
  {
    type: 'debtor',
    terms: ['debtor', 'بدهکار', 'پوروړ'],
  },
];

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function customerTypesMatchingQuery(query: string) {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 3) {
    return [];
  }

  return CUSTOMER_TYPE_SEARCH_TERMS.filter((entry) =>
    entry.terms.some((term) => {
      const normalizedTerm = normalizeSearchText(term);
      return (
        normalizedTerm.includes(normalized) || normalized.includes(normalizedTerm)
      );
    }),
  ).map((entry) => entry.type);
}

function gregorianDateFromSearch(query: string) {
  const match = query
    .trim()
    .replace(/\//g, '-')
    .match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  if (year >= 1300 && year <= 1500) {
    try {
      return shamsiToGregorian(year, month, day);
    } catch {
      return null;
    }
  }

  if (year < 1900 || year > 2200) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function kabulDayRange(gregorianYmd: string) {
  const start = new Date(`${gregorianYmd}T00:00:00+04:30`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

const customerSelect = {
  id: true,
  name: true,
  type: true,
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
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
  ) {}

  private get customerModel() {
    return (this.prisma as any).customer;
  }

  async create(createCustomerDto: CreateCustomerDto, user: AuthenticatedUser) {
    const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
    this.seasonService.assertSeasonIsEditable(activeSeason);

    const type = this.normalizeCustomerType(createCustomerDto.type);
    assertCanAccessCustomerType(user, type);

    const created = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: this.requireText(createCustomerDto.name, 'name'),
          type,
          phoneNo: this.requireText(createCustomerDto.phoneNo, 'phoneNo'),
          address: this.requireText(createCustomerDto.address, 'address'),
          notes: createCustomerDto.notes?.trim() || null,
          seasonId: activeSeason.id,
          seasonName: activeSeason.name,
        },
        select: customerSelect,
      });

      await tx.customerLedger.create({
        data: {
          customerId: customer.id,
          ledgerType: this.resolveLedgerType(customer.type),
        },
      });

      return customer;
    });

    return this.serializeCustomer(created);
  }

  async findAll(filters: FindCustomersQueryDto = {}, user: AuthenticatedUser) {
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

    const typeFilter = customerTypeWhereFilter(user, filters.type);
    const matchedTypes = query ? customerTypesMatchingQuery(query) : [];
    const searchDate = query ? gregorianDateFromSearch(query) : null;
    const searchDateRange = searchDate ? kabulDayRange(searchDate) : null;
    const fromDate = this.resolveFilterDate(filters.fromDate, 'fromDate');
    const toDate = this.resolveFilterDate(filters.toDate, 'toDate');
    const createdAtFilter =
      fromDate || toDate
        ? {
            ...(fromDate ? { gte: fromDate.start } : {}),
            ...(toDate ? { lt: toDate.end } : {}),
          }
        : undefined;

    const where = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(typeFilter ?? {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { phoneNo: { contains: query, mode: 'insensitive' } },
              { address: { contains: query, mode: 'insensitive' } },
              { notes: { contains: query, mode: 'insensitive' } },
              { seasonName: { contains: query, mode: 'insensitive' } },
              ...(matchedTypes.length
                ? [{ type: { in: matchedTypes } }]
                : []),
              ...(searchDateRange
                ? [
                    {
                      createdAt: {
                        gte: searchDateRange.start,
                        lt: searchDateRange.end,
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const [items, totalCount] = await this.prisma.$transaction([
      this.customerModel.findMany({
        where,
        orderBy: { [sortBy]: sortDirection as Prisma.SortOrder },
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        select: customerSelect,
      }),
      this.customerModel.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      items: items.map((item: any) => this.serializeCustomer(item)),
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

  async findOne(id: string, user: AuthenticatedUser) {
    const customer = await this.customerModel.findUnique({
      where: { id: this.parseId(id) },
      select: customerSelect,
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${id}" not found`);
    }

    assertCanAccessCustomerType(user, customer.type);

    return this.serializeCustomer(customer);
  }

  /**
   * Verifies the customer exists and the user may access its type.
   * Used by ledger endpoints that do not return the customer payload.
   */
  async assertUserCanAccessCustomer(
    id: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.findOne(id, user);
  }

  assertUserCanAccessCustomerTypeOnly(
    user: AuthenticatedUser,
    type: string,
  ): void {
    assertCanAccessCustomerType(user, type);
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user: AuthenticatedUser,
  ) {
    const current = await this.findOne(id, user);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    if (
      updateCustomerDto.type !== undefined &&
      this.normalizeCustomerType(updateCustomerDto.type) !== current.type
    ) {
      throw new BadRequestException(
        'Customer type cannot be changed after the account ledger is created',
      );
    }

    const updated = await this.customerModel.update({
      where: { id: this.parseId(id) },
      data: {
        ...(updateCustomerDto.name !== undefined
          ? { name: this.requireText(updateCustomerDto.name, 'name') }
          : {}),
        ...(updateCustomerDto.phoneNo !== undefined
          ? { phoneNo: this.requireText(updateCustomerDto.phoneNo, 'phoneNo') }
          : {}),
        ...(updateCustomerDto.address !== undefined
          ? { address: this.requireText(updateCustomerDto.address, 'address') }
          : {}),
        ...(updateCustomerDto.notes !== undefined
          ? { notes: updateCustomerDto.notes?.trim() || null }
          : {}),
      },
      select: customerSelect,
    });

    return this.serializeCustomer(updated);
  }

  async remove(id: string, user: AuthenticatedUser) {
    const current = await this.findOne(id, user);
    await this.seasonService.assertSeasonIsEditableById(current.seasonId);

    const deleted = await this.customerModel.delete({
      where: { id: this.parseId(id) },
      select: customerSelect,
    });

    return this.serializeCustomer(deleted);
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private resolveFilterDate(value: string | undefined, fieldName: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }

    const gregorian = gregorianDateFromSearch(trimmed);
    const range = gregorian ? kabulDayRange(gregorian) : null;

    if (!range) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return range;
  }

  private requireText(value: string, fieldName: string) {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalizedValue;
  }

  private normalizeCustomerType(value?: string) {
    const normalizedValue = value?.trim().toLowerCase();

    if (!normalizedValue) {
      throw new BadRequestException('type is required');
    }

    if (
      ![
        'paddy_farmer',
        'paddy_seller',
        'rice_seller',
        'buyer',
        'vendor',
        'debtor',
      ].includes(normalizedValue)
    ) {
      throw new BadRequestException(
        'type must be one of paddy_farmer, paddy_seller, rice_seller, buyer, vendor, or debtor',
      );
    }

    return normalizedValue as
      | 'paddy_farmer'
      | 'paddy_seller'
      | 'rice_seller'
      | 'buyer'
      | 'vendor'
      | 'debtor';
  }

  private resolveLedgerType(customerType: string) {
    if (customerType === 'paddy_farmer') {
      return 'farmer_owned';
    }

    if (customerType === 'rice_seller') {
      return 'rice_owned';
    }

    return 'company_owned';
  }

  private serializeCustomer(customer: any) {
    return {
      ...customer,
      id: String(customer.id),
    };
  }
}
