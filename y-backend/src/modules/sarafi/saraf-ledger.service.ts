import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateSarafLedgerEntryDto } from './dto/create-saraf-ledger-entry.dto.js';

@Injectable()
export class SarafLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly currencyService: CurrencyService,
  ) {}

  async getSarafAccount(sarafId: string) {
    const saraf = await this.prisma.saraf.findUnique({
      where: { id: this.parseId(sarafId) },
      select: {
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
        ledger: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            entries: {
              orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
              select: {
                id: true,
                amount: true,
                occurredAt: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
                riceSale: {
                  select: {
                    id: true,
                    billNo: true,
                  },
                },
                companyOwnedPaddyWarehouse: {
                  select: {
                    id: true,
                    billNo: true,
                  },
                },
                employeeLedgerEntry: {
                  select: {
                    id: true,
                    employee: {
                      select: {
                        name: true,
                        employeeNo: true,
                      },
                    },
                  },
                },
                jwaliPayment: {
                  select: {
                    id: true,
                    jwali: {
                      select: {
                        name: true,
                        phoneNo: true,
                      },
                    },
                  },
                },
                storeEntry: {
                  select: {
                    id: true,
                    billNo: true,
                  },
                },
                currency: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!saraf) {
      throw new NotFoundException(`Saraf with id "${sarafId}" not found`);
    }

    if (!saraf.ledger) {
      throw new NotFoundException(`Ledger for saraf "${sarafId}" not found`);
    }

    const serializedEntries = saraf.ledger.entries.map((entry) =>
      this.serializeEntry(entry),
    );

    return {
      saraf: {
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
      },
      ledger: {
        id: String(saraf.ledger.id),
        createdAt: saraf.ledger.createdAt.toISOString(),
        updatedAt: saraf.ledger.updatedAt.toISOString(),
        summary: this.buildSummary(serializedEntries),
        entries: serializedEntries,
      },
    };
  }

  async addLedgerEntry(sarafId: string, dto: CreateSarafLedgerEntryDto) {
    const saraf = await this.prisma.saraf.findUnique({
      where: { id: this.parseId(sarafId) },
      select: {
        id: true,
        seasonId: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf) {
      throw new NotFoundException(`Saraf with id "${sarafId}" not found`);
    }

    if (!saraf.ledger) {
      throw new NotFoundException(`Ledger for saraf "${sarafId}" not found`);
    }

    await this.seasonService.assertSeasonIsEditableById(saraf.seasonId);
    const currencyId = await this.currencyService.requireActiveCurrencyId(
      dto.currencyId,
    );
    const direction = this.normalizeLedgerDirection(dto.direction);
    const absoluteAmount = this.parsePositiveDecimal(dto.amount, 'amount');
    const amount =
      direction === 'out' ? absoluteAmount.negated() : absoluteAmount;
    const occurredAt = this.requireDate(dto.occurredAt, 'occurredAt');
    const notes = dto.notes?.trim() || null;

    const created = await this.prisma.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId,
        amount,
        occurredAt: new Date(occurredAt),
        notes,
      },
      select: {
        id: true,
        amount: true,
        occurredAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return this.serializeEntry(created);
  }

  async getSeasonCashSummary(seasonId?: string) {
    let resolvedSeasonId = seasonId?.trim();

    if (!resolvedSeasonId) {
      const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
      resolvedSeasonId = activeSeason.id;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        currencyCode: string;
        currencyName: string;
        cashIn: Prisma.Decimal | string;
        cashOut: Prisma.Decimal | string;
      }>
    >(Prisma.sql`
      SELECT
        c."code"::text AS "currencyCode",
        c."name" AS "currencyName",
        COALESCE(SUM(CASE WHEN e."amount" > 0 THEN e."amount" ELSE 0 END), 0)::decimal AS "cashIn",
        COALESCE(SUM(CASE WHEN e."amount" < 0 THEN ABS(e."amount") ELSE 0 END), 0)::decimal AS "cashOut"
      FROM "saraf_ledger_entries" e
      INNER JOIN "sarafs" s ON s."id" = e."saraf_id"
      INNER JOIN "currencies" c ON c."id" = e."currency_id"
      WHERE s."season_id" = ${resolvedSeasonId}
      GROUP BY c."id", c."code", c."name"
      ORDER BY c."code" ASC
    `);

    return {
      seasonId: resolvedSeasonId,
      byCurrency: rows.map((row) => ({
        currencyCode: row.currencyCode,
        currencyName: row.currencyName,
        cashIn: new Prisma.Decimal(row.cashIn ?? 0).toFixed(2),
        cashOut: new Prisma.Decimal(row.cashOut ?? 0).toFixed(2),
      })),
    };
  }

  /** Used when recording a rice sale settled through a Saraf (same DB transaction as the sale). */
  async createLinkedRiceSaleEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      riceSaleId: bigint;
      chargeType: 'rice' | 'loading' | 'bags';
    },
  ) {
    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        riceSaleId: params.riceSaleId,
        riceSaleChargeType: params.chargeType,
      },
    });
  }

  /** Jwali payment settled via Saraf: negative amount (payout through the Saraf). */
  async createLinkedJwaliPaymentEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      jwaliPaymentId: bigint;
    },
  ) {
    const amountOut = params.amount.negated();
    if (!amountOut.lessThan(0)) {
      throw new BadRequestException(
        'Jwali payment Saraf settlement must use a negative ledger amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: amountOut,
        occurredAt: params.occurredAt,
        notes: params.notes,
        jwaliPaymentId: params.jwaliPaymentId,
      },
    });
  }

  /** Employee salary settled via Saraf: negative amount (payout through the Saraf), same sign convention as company paddy. */
  async createLinkedEmployeeSalaryPaymentEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      employeeLedgerEntryId: bigint;
    },
  ) {
    const amountOut = params.amount.negated();
    if (!amountOut.lessThan(0)) {
      throw new BadRequestException(
        'Employee salary Saraf settlement must use a negative ledger amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: amountOut,
        occurredAt: params.occurredAt,
        notes: params.notes,
        employeeLedgerEntryId: params.employeeLedgerEntryId,
      },
    });
  }

  /** Employee pays back overpaid credit via Saraf: positive amount increases Saraf balance. */
  async createLinkedEmployeeCreditRepaymentSarafEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      employeeLedgerEntryId: bigint;
    },
  ) {
    if (!params.amount.greaterThan(0)) {
      throw new BadRequestException(
        'Saraf collection for employee credit repayment must use a positive amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        employeeLedgerEntryId: params.employeeLedgerEntryId,
      },
    });
  }

  /** Store sale settled via Saraf: positive amount increases Saraf running balance. */
  async createLinkedStoreSaleEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      storeEntryId: bigint;
    },
  ) {
    if (!params.amount.greaterThan(0)) {
      throw new BadRequestException(
        'Saraf settlement for store sale must use a positive amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        storeEntryId: params.storeEntryId,
      },
    });
  }

  /** Store variety sale settled via Saraf. */
  async createLinkedStoreVarietySaleEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      storeVarietySaleId: bigint;
      chargeType: 'sale' | 'loading' | 'bags';
    },
  ) {
    if (!params.amount.greaterThan(0)) {
      throw new BadRequestException(
        'Saraf settlement for store variety sale must use a positive amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        storeVarietySaleId: params.storeVarietySaleId,
        storeVarietySaleChargeType: params.chargeType,
      },
    });
  }

  /**
   * Company paddy purchase paid via Saraf: negative amount reduces Saraf running balance
   * (positive entries are cash given to the Saraf).
   */
  async createLinkedRiceWarehousePurchaseEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      riceWarehouseId: bigint;
    },
  ) {
    if (!params.amount.lessThan(0)) {
      throw new BadRequestException(
        'Saraf settlement for rice warehouse purchase must use a negative amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        riceWarehouseId: params.riceWarehouseId,
      },
    });
  }

  async createLinkedCompanyPaddyPurchaseEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      companyOwnedPaddyWarehouseId: bigint;
    },
  ) {
    if (!params.amount.lessThan(0)) {
      throw new BadRequestException(
        'Saraf settlement for company paddy must use a negative amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        companyOwnedPaddyWarehouseId: params.companyOwnedPaddyWarehouseId,
      },
    });
  }

  /**
   * Expense paid from Saraf: negative amount reduces Saraf running balance.
   */
  /** Rice buyer or debtor repays through Saraf: positive amount increases Saraf balance. */
  async createLinkedBuyerPaymentSarafEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      customerLedgerEntryId: bigint;
    },
  ) {
    if (!params.amount.greaterThan(0)) {
      throw new BadRequestException(
        'Saraf collection for buyer or debtor repayment must use a positive amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        customerLedgerEntryId: params.customerLedgerEntryId,
      },
    });
  }

  async createLinkedCustomerPaymentEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      customerLedgerEntryId: bigint;
    },
  ) {
    if (!params.amount.lessThan(0)) {
      throw new BadRequestException(
        'Saraf settlement for customer payment must use a negative amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        customerLedgerEntryId: params.customerLedgerEntryId,
      },
    });
  }

  async createLinkedExpenseEntry(
    tx: Prisma.TransactionClient,
    params: {
      sarafId: bigint;
      currencyId: string;
      amount: Prisma.Decimal;
      occurredAt: Date;
      notes: string | null;
      expenseId: bigint;
    },
  ) {
    if (!params.amount.lessThan(0)) {
      throw new BadRequestException(
        'Saraf settlement for expense must use a negative amount',
      );
    }

    const saraf = await tx.saraf.findUnique({
      where: { id: params.sarafId },
      select: {
        id: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf?.ledger) {
      throw new NotFoundException(
        `Ledger for saraf "${params.sarafId.toString()}" not found`,
      );
    }

    await tx.sarafLedgerEntry.create({
      data: {
        ledgerId: saraf.ledger.id,
        sarafId: saraf.id,
        currencyId: params.currencyId,
        amount: params.amount,
        occurredAt: params.occurredAt,
        notes: params.notes,
        expenseId: params.expenseId,
      },
    });
  }

  private serializeEntry(entry: {
    id: bigint;
    amount: Prisma.Decimal;
    occurredAt: Date;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    currency: { id: string; code: string; name: string };
    riceSale?: { id: bigint; billNo: string } | null;
    companyOwnedPaddyWarehouse?: { id: bigint; billNo: string } | null;
    employeeLedgerEntry?: {
      id: bigint;
      employee: { name: string; employeeNo: string };
    } | null;
    jwaliPayment?: {
      id: bigint;
      jwali: { name: string; phoneNo: string };
    } | null;
    storeEntry?: { id: bigint; billNo: string } | null;
  }) {
    const emp = entry.employeeLedgerEntry?.employee;
    const jwali = entry.jwaliPayment?.jwali;
    return {
      id: String(entry.id),
      currencyId: entry.currency.id,
      currencyCode: entry.currency.code,
      currencyName: entry.currency.name,
      amount: entry.amount.toFixed(2),
      occurredAt: entry.occurredAt.toISOString(),
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      riceSaleId: entry.riceSale ? String(entry.riceSale.id) : null,
      riceSaleBillNo: entry.riceSale?.billNo ?? null,
      companyPaddyWarehouseId: entry.companyOwnedPaddyWarehouse
        ? String(entry.companyOwnedPaddyWarehouse.id)
        : null,
      companyPaddyWarehouseBillNo:
        entry.companyOwnedPaddyWarehouse?.billNo ?? null,
      employeeLedgerEntryId: entry.employeeLedgerEntry
        ? String(entry.employeeLedgerEntry.id)
        : null,
      employeeSalaryEmployeeName: emp?.name ?? null,
      employeeSalaryEmployeeNo: emp?.employeeNo ?? null,
      jwaliPaymentId: entry.jwaliPayment ? String(entry.jwaliPayment.id) : null,
      jwaliPaymentJwaliName: jwali?.name ?? null,
      jwaliPaymentJwaliPhone: jwali?.phoneNo ?? null,
      storeEntryId: entry.storeEntry ? String(entry.storeEntry.id) : null,
      storeEntryBillNo: entry.storeEntry?.billNo ?? null,
    };
  }

  private buildSummary(
    entries: Array<{
      currencyId: string;
      currencyCode: string;
      currencyName: string;
      amount: string;
    }>,
  ) {
    const byCurrency = new Map<
      string,
      {
        currencyId: string;
        currencyCode: string;
        currencyName: string;
        totalAmount: Prisma.Decimal;
        entryCount: number;
      }
    >();

    for (const entry of entries) {
      const existing = byCurrency.get(entry.currencyId) ?? {
        currencyId: entry.currencyId,
        currencyCode: entry.currencyCode,
        currencyName: entry.currencyName,
        totalAmount: new Prisma.Decimal(0),
        entryCount: 0,
      };
      existing.totalAmount = existing.totalAmount.plus(
        new Prisma.Decimal(entry.amount),
      );
      existing.entryCount += 1;
      byCurrency.set(entry.currencyId, existing);
    }

    return {
      entryCount: entries.length,
      byCurrency: Array.from(byCurrency.values()).map((row) => ({
        currencyId: row.currencyId,
        currencyCode: row.currencyCode,
        currencyName: row.currencyName,
        totalAmount: row.totalAmount.toFixed(2),
        entryCount: row.entryCount,
      })),
    };
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private requireDate(value: string, fieldName: string) {
    const normalized = value?.trim();

    if (!normalized || Number.isNaN(Date.parse(normalized))) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return normalized.slice(0, 10);
  }

  private normalizeLedgerDirection(direction?: string) {
    const normalized = direction?.trim().toLowerCase() || 'in';

    if (normalized !== 'in' && normalized !== 'out') {
      throw new BadRequestException('direction must be in or out');
    }

    return normalized;
  }

  private parsePositiveDecimal(
    value: string | number | Prisma.Decimal,
    fieldName: string,
  ) {
    try {
      const decimal = new Prisma.Decimal(value as Prisma.Decimal.Value);
      if (decimal.lessThanOrEqualTo(0)) {
        throw new BadRequestException(`${fieldName} must be greater than 0`);
      }
      return decimal.toDecimalPlaces(2);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
  }
}
