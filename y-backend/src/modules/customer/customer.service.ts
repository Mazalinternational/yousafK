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
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { FindCustomersQueryDto } from './dto/find-customers-query.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

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

    const where = {
      ...(filters.seasonId ? { seasonId: filters.seasonId } : {}),
      ...(typeFilter ?? {}),
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
