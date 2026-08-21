import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerLedgerEntryType, Prisma } from '@prisma/client';
import {
  APP_WEIGHT_UNIT,
  normalizeWeightUnit,
  toKilograms,
} from '../../common/weight/weight-unit.util.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CashService } from '../cash/cash.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { RiceSaleService } from '../rice-sale/rice-sale.service.js';
import { VarietyService } from '../variety/variety.service.js';
import { CreateBuyerBalanceAdjustmentDto } from './dto/create-buyer-balance-adjustment.dto.js';
import { CreateBuyerPaymentDto } from './dto/create-buyer-payment.dto.js';
import { CreateSellerBalanceAdjustmentDto } from './dto/create-seller-balance-adjustment.dto.js';
import { CreateSellerBalanceTransferDto } from './dto/create-seller-balance-transfer.dto.js';
import { CreateCompanyPaymentDto } from './dto/create-company-payment.dto.js';
import { CreateFarmerRiceReturnDto } from './dto/create-farmer-rice-return.dto.js';
import { UpdateLedgerEntryDto } from './dto/update-ledger-entry.dto.js';

const ledgerEntrySelect = {
  id: true,
  entryType: true,
  sourceCompanyPaddyWarehouseId: true,
  sourceFarmerPaddyWarehouseId: true,
  sourceRiceWarehouseId: true,
  amount: true,
  paymentType: true,
  paidAmount: true,
  remainingAmount: true,
  paymentChannel: true,
  sarafId: true,
  currencyId: true,
  paddyQuantity: true,
  riceQuantity: true,
  riceVariety: true,
  unit: true,
  occurredAt: true,
  scheduledFor: true,
  riceStockFulfilledAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  saraf: {
    select: {
      id: true,
      name: true,
    },
  },
  currency: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  counterpartyCustomerId: true,
  linkedLedgerEntryId: true,
  sourceExpenseId: true,
  counterpartyCustomer: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
} as const;

type CompanyPaymentLedgerEntryType =
  | 'company_payment'
  | 'company_payment_on_behalf'
  | 'company_payment_received_on_behalf';

type SerializedLedgerEntry = {
  id: string;
  entryType:
    | 'company_receivable'
    | 'company_payment'
    | 'company_payment_on_behalf'
    | 'company_payment_received_on_behalf'
    | 'farmer_obligation'
    | 'farmer_rice_return'
    | 'buyer_rice_sale'
    | 'buyer_payment'
    | 'buyer_payment_on_behalf'
    | 'buyer_payment_received_on_behalf'
    | 'buyer_debit'
    | 'buyer_credit'
    | 'seller_debit'
    | 'seller_credit'
    | 'process_production_store_sale'
    | 'vendor_expense'
    | 'vendor_payment'
    | 'debtor_disbursement'
    | 'debtor_repayment';
  sourceCompanyPaddyWarehouseId: string | null;
  sourceFarmerPaddyWarehouseId: string | null;
  sourceRiceWarehouseId?: string | null;
  counterpartyCustomerId?: string | null;
  counterpartyCustomerName?: string | null;
  counterpartyCustomerType?: string | null;
  linkedLedgerEntryId?: string | null;
  amount: string | null;
  paidAmount?: string | null;
  remainingAmount?: string | null;
  paymentType?: string | null;
  paymentChannel?: 'cash' | 'saraf' | null;
  sarafId?: string | null;
  sarafName?: string | null;
  currencyId?: string | null;
  currencyCode?: string | null;
  currencyName?: string | null;
  paddyQuantity: string | null;
  riceQuantity: string | null;
  riceVariety: string | null;
  paddyVariety: string | null;
  unit: string | null;
  occurredAt: string;
  scheduledFor: string | null;
  riceStockFulfilledAt?: string | null;
  notes: string | null;
  billNo?: string | null;
  isEditable?: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class CustomerLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly varietyService: VarietyService,
    private readonly currencyService: CurrencyService,
    private readonly sarafLedgerService: SarafLedgerService,
    private readonly cashService: CashService,
    private readonly riceSaleService: RiceSaleService,
  ) {}

  private get customerModel() {
    return (this.prisma as any).customer;
  }

  private get customerLedgerModel() {
    return (this.prisma as any).customerLedger;
  }

  private get customerLedgerEntryModel() {
    return (this.prisma as any).customerLedgerEntry;
  }

  private get riceWarehouseModel() {
    return (this.prisma as any).riceWarehouse;
  }

  private isBuyerCustomerType(
    customerType: string,
  ): customerType is 'buyer' | 'process_production_buyer' {
    return (
      customerType === 'buyer' || customerType === 'process_production_buyer'
    );
  }

  async createLedgerForCustomer(
    customerId: bigint,
    customerType:
      | 'paddy_farmer'
      | 'paddy_seller'
      | 'rice_seller'
      | 'buyer'
      | 'vendor',
  ) {
    return this.customerLedgerModel.create({
      data: {
        customerId,
        ledgerType:
          customerType === 'paddy_farmer'
            ? 'farmer_owned'
            : customerType === 'rice_seller'
              ? 'rice_owned'
              : 'company_owned',
      },
    });
  }

  async getCustomerAccount(customerId: string) {
    const customer = await this.customerModel.findUnique({
      where: { id: this.parseId(customerId) },
      select: {
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
        enteringPaddies: {
          select: {
            companyOwnedPaddyWarehouse: {
              select: {
                id: true,
                billNo: true,
                variety: true,
                quantity: true,
                unit: true,
                paidAmount: true,
                remainingAmount: true,
                paymentType: true,
                paymentChannel: true,
                sarafId: true,
                sarafLedgerCurrencyId: true,
                receivedDate: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
                saraf: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                sarafLedgerCurrency: {
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
        ledger: {
          select: {
            id: true,
            ledgerType: true,
            createdAt: true,
            updatedAt: true,
            entries: {
              orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
              select: ledgerEntrySelect,
            },
          },
        },
        riceSales: {
          orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            billNo: true,
            riceVariety: true,
            quantity: true,
            unit: true,
            saleDate: true,
            totalAmount: true,
            loadingAmount: true,
            loadingPaymentChannel: true,
            loadingSarafId: true,
            loadingCurrencyId: true,
            riceBagsAmount: true,
            bagsPaymentChannel: true,
            bagsSarafId: true,
            bagsCurrencyId: true,
            paymentType: true,
            paidAmount: true,
            remainingAmount: true,
            paymentChannel: true,
            sarafId: true,
            sarafLedgerCurrencyId: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            saraf: {
              select: {
                id: true,
                name: true,
              },
            },
            loadingSaraf: {
              select: {
                id: true,
                name: true,
              },
            },
            bagsSaraf: {
              select: {
                id: true,
                name: true,
              },
            },
            sarafLedgerCurrency: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            loadingCurrency: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            bagsCurrency: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        storeVarietySales: {
          orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            billNo: true,
            storeType: true,
            variety: true,
            soldWeight: true,
            unit: true,
            soldWeightKg: true,
            saleAmount: true,
            loadingAmount: true,
            loadingPaymentChannel: true,
            loadingSarafId: true,
            loadingCurrencyId: true,
            riceBagsAmount: true,
            bagsPaymentChannel: true,
            bagsSarafId: true,
            bagsCurrencyId: true,
            paymentType: true,
            paidAmount: true,
            remainingAmount: true,
            paymentChannel: true,
            sarafId: true,
            sarafLedgerCurrencyId: true,
            saleDate: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            saraf: {
              select: {
                id: true,
                name: true,
              },
            },
            loadingSaraf: {
              select: {
                id: true,
                name: true,
              },
            },
            bagsSaraf: {
              select: {
                id: true,
                name: true,
              },
            },
            sarafLedgerCurrency: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            loadingCurrency: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            bagsCurrency: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${customerId}" not found`);
    }

    if (!customer.ledger) {
      throw new NotFoundException(
        `Ledger for customer "${customerId}" not found`,
      );
    }

    const warehouseMaps = await this.loadWarehouseDetailsForLedgerSources(
      customer.ledger.entries,
    );
    const persistedEntries = customer.ledger.entries.map((entry: any) =>
      this.enrichLedgerEntryFromWarehouse(
        this.serializeLedgerEntry(entry),
        warehouseMaps,
      ),
    );
    const riceWarehouseEntries =
      customer.type === 'rice_seller'
        ? await this.listRiceWarehouseEntries(customer.id)
        : [];
    const buyerRiceSaleEntries = this.isBuyerCustomerType(customer.type)
      ? (customer.riceSales ?? []).flatMap((sale: any) =>
          this.serializeBuyerRiceSaleLedgerEntries(sale),
        )
      : [];
    const storeVarietySaleEntries = this.isBuyerCustomerType(customer.type)
      ? (customer.storeVarietySales ?? []).flatMap((sale: any) =>
          this.serializeProcessProductionStoreSaleLedgerEntries(sale),
        )
      : [];
    const warehouseCurrencyMap = this.buildWarehouseCurrencyMap(
      customer.enteringPaddies,
      customer.type === 'rice_seller' ? riceWarehouseEntries : [],
    );
    const currencyEnrichedPersisted = persistedEntries.map((entry) =>
      this.enrichSellerEntryCurrency(entry, warehouseCurrencyMap),
    );
    const entries =
      customer.type === 'paddy_seller' || customer.type === 'rice_seller'
        ? this.mergeSellerEntriesWithWarehouseActivity(
            currencyEnrichedPersisted,
            customer.enteringPaddies,
            customer.type === 'rice_seller' ? riceWarehouseEntries : [],
          )
        : this.isBuyerCustomerType(customer.type)
          ? this.sortLedgerEntriesDesc([
              ...buyerRiceSaleEntries,
              ...storeVarietySaleEntries,
              ...persistedEntries,
            ])
          : persistedEntries;
    const {
      ledger,
      enteringPaddies: _enteringPaddies,
      riceSales: _riceSales,
      storeVarietySales: _storeVarietySales,
      ...customerWithoutLedger
    } = customer;

    return {
      customer: {
        ...customerWithoutLedger,
        id: String(customer.id),
      },
      ledger: {
        id: String(ledger.id),
        ledgerType: ledger.ledgerType,
        createdAt: ledger.createdAt,
        updatedAt: ledger.updatedAt,
        summary: this.buildSummary(customer.type, entries),
        entries,
      },
    };
  }

  async getBuyerTransfersSummary(seasonId?: string) {
    let resolvedSeasonId = seasonId?.trim();

    if (!resolvedSeasonId) {
      const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
      resolvedSeasonId = activeSeason.id;
    }

    const entries = await this.customerLedgerEntryModel.findMany({
      where: {
        entryType: {
          in: ['buyer_payment_on_behalf', 'buyer_payment_received_on_behalf'],
        },
        currencyId: { not: null },
        customer: { seasonId: resolvedSeasonId },
      },
      select: {
        entryType: true,
        amount: true,
        currencyId: true,
        currency: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    type CurrencyBucket = {
      currencyId: string;
      currencyCode: string;
      currencyName: string;
      paidOnBehalf: Prisma.Decimal;
      receivedOnBehalf: Prisma.Decimal;
    };

    const buckets = new Map<string, CurrencyBucket>();
    let transferCount = 0;

    for (const entry of entries) {
      const currencyId = entry.currencyId?.trim() ?? '';
      if (!currencyId) {
        continue;
      }

      if (!buckets.has(currencyId)) {
        buckets.set(currencyId, {
          currencyId,
          currencyCode: entry.currency?.code ?? currencyId,
          currencyName:
            entry.currency?.name ?? entry.currency?.code ?? currencyId,
          paidOnBehalf: new Prisma.Decimal(0),
          receivedOnBehalf: new Prisma.Decimal(0),
        });
      }

      const bucket = buckets.get(currencyId)!;
      const amount = new Prisma.Decimal(entry.amount ?? 0);

      if (entry.entryType === 'buyer_payment_on_behalf') {
        bucket.paidOnBehalf = bucket.paidOnBehalf.plus(amount);
        transferCount += 1;
        continue;
      }

      if (entry.entryType === 'buyer_payment_received_on_behalf') {
        bucket.receivedOnBehalf = bucket.receivedOnBehalf.plus(amount);
      }
    }

    const byCurrency = [...buckets.values()]
      .filter(
        (bucket) =>
          bucket.paidOnBehalf.greaterThan(0) ||
          bucket.receivedOnBehalf.greaterThan(0),
      )
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      )
      .map((bucket) => ({
        currencyId: bucket.currencyId,
        currencyCode: bucket.currencyCode,
        currencyName: bucket.currencyName,
        paidOnBehalfTotal: bucket.paidOnBehalf.toFixed(2),
        receivedOnBehalfTotal: bucket.receivedOnBehalf.toFixed(2),
      }));

    return {
      seasonId: resolvedSeasonId,
      transferCount: String(transferCount),
      byCurrency,
    };
  }

  async addCompanyPayment(customerId: string, dto: CreateCompanyPaymentDto) {
    const customer = await this.requireCustomerByTypes(customerId, [
      'paddy_seller',
      'rice_seller',
      'vendor',
    ]);
    const season = await this.seasonService.assertSeasonIsEditableById(
      customer.seasonId,
    );
    const ledger = await this.requireLedger(customer.id);
    const paymentType = this.normalizePaymentType(dto.paymentType);
    const paymentChannel = this.normalizePaymentChannel(dto.paymentChannel);
    const totalAmount = this.parsePositiveDecimal(dto.amount, 'amount');
    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const notes = dto.notes?.trim() || null;

    const { paidAmount, remainingAmount } = this.resolvePaidAmountByPaymentType(
      {
        paymentType,
        paidAmount: dto.paidAmount,
        totalAmount,
      },
    );

    const settlementAmount = this.resolveSettlementAmount({
      paymentType,
      totalAmount,
      paidAmount,
    });

    const sarafIdTrimmed = dto.sarafId?.trim() ?? '';
    const currencyIdTrimmed = dto.currencyId?.trim() ?? '';

    if (paymentChannel === 'cash') {
      if (sarafIdTrimmed) {
        throw new BadRequestException(
          'sarafId must be omitted when paying the seller in cash',
        );
      }
    }

    if (
      paymentChannel === 'saraf' &&
      settlementAmount.greaterThan(0) &&
      !sarafIdTrimmed
    ) {
      throw new BadRequestException(
        'sarafId is required when paying the seller from Saraf',
      );
    }

    if (settlementAmount.greaterThan(0) && !currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required when recording a cash or Saraf settlement',
      );
    }

    const currencyId =
      settlementAmount.greaterThan(0) && currencyIdTrimmed
        ? await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed)
        : null;

    let sarafIdBig: bigint | null = null;

    if (paymentChannel === 'saraf' && settlementAmount.greaterThan(0)) {
      sarafIdBig = this.parseId(sarafIdTrimmed);

      const saraf = await this.prisma.saraf.findUnique({
        where: { id: sarafIdBig },
        select: {
          id: true,
          seasonId: true,
          ledger: { select: { id: true } },
        },
      });

      if (!saraf) {
        throw new NotFoundException(
          `Saraf with id "${sarafIdTrimmed}" not found`,
        );
      }

      if (saraf.seasonId !== customer.seasonId) {
        throw new BadRequestException(
          'Selected Saraf must belong to the customer season',
        );
      }

      if (!saraf.ledger) {
        throw new BadRequestException(
          'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
        );
      }
    }

    if (paymentChannel === 'saraf' && paymentType === 'remaining') {
      throw new BadRequestException(
        'Pay from Saraf is not available when nothing has been paid yet',
      );
    }

    const customerRow = await this.customerModel.findUnique({
      where: { id: customer.id },
      select: { name: true, seasonName: true },
    });

    const paymentLabel =
      customer.type === 'vendor'
        ? customerRow?.name
          ? `Vendor payment — ${customerRow.name}`
          : 'Vendor payment'
        : customerRow?.name
          ? `Seller payment — ${customerRow.name}`
          : 'Seller payment';

    const paymentEntryType =
      customer.type === 'vendor' ? 'vendor_payment' : 'company_payment';

    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.customerLedgerEntry.create({
        data: {
          ledgerId: ledger.id,
          customerId: customer.id,
          entryType: paymentEntryType,
          amount: settlementAmount,
          paymentType,
          paidAmount,
          remainingAmount,
          paymentChannel: settlementAmount.greaterThan(0)
            ? paymentChannel
            : null,
          sarafId:
            paymentChannel === 'saraf' && settlementAmount.greaterThan(0)
              ? sarafIdBig
              : null,
          currencyId: currencyId,
          occurredAt: paymentDate,
          notes,
        },
        select: ledgerEntrySelect,
      });

      if (
        paymentChannel === 'cash' &&
        settlementAmount.greaterThan(0) &&
        currencyId
      ) {
        await this.cashService.createLinkedCustomerPaymentOutEntry(tx, {
          currencyId,
          amount: settlementAmount,
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          seasonId: season.id,
          seasonName: customerRow?.seasonName ?? season.name,
          customerLedgerEntryId: entry.id,
        });
      } else if (
        paymentChannel === 'saraf' &&
        settlementAmount.greaterThan(0) &&
        sarafIdBig &&
        currencyId
      ) {
        await this.sarafLedgerService.createLinkedCustomerPaymentEntry(tx, {
          sarafId: sarafIdBig,
          currencyId,
          amount: settlementAmount.negated(),
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          customerLedgerEntryId: entry.id,
        });
      }

      return entry;
    });

    return this.serializeLedgerEntry(created);
  }

  async addBuyerBalanceAdjustment(
    customerId: string,
    dto: CreateBuyerBalanceAdjustmentDto,
  ) {
    const customer = await this.requireCustomerByTypes(customerId, ['buyer']);
    await this.seasonService.assertSeasonIsEditableById(customer.seasonId);
    const ledger = await this.requireLedger(customer.id);

    const directionRaw = dto.direction?.trim().toLowerCase() ?? '';
    if (directionRaw !== 'debit' && directionRaw !== 'credit') {
      throw new BadRequestException(
        'direction must be either "debit" or "credit"',
      );
    }

    const amount = this.parsePositiveDecimal(dto.amount, 'amount');
    const currencyIdTrimmed = dto.currencyId?.trim() ?? '';

    if (!currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required for a buyer debit or credit',
      );
    }

    const currencyId =
      await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);
    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const notes = dto.notes?.trim() || null;
    const entryType =
      directionRaw === 'debit'
        ? CustomerLedgerEntryType.buyer_debit
        : CustomerLedgerEntryType.buyer_credit;

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.customerLedgerEntry.create({
        data: {
          ledgerId: ledger.id,
          customerId: customer.id,
          entryType,
          amount,
          paymentType: null,
          paidAmount: null,
          remainingAmount: null,
          paymentChannel: null,
          sarafId: null,
          currencyId,
          occurredAt: paymentDate,
          notes,
        },
        select: ledgerEntrySelect,
      });
    });

    return this.serializeLedgerEntry(created);
  }

  async addSellerBalanceAdjustment(
    customerId: string,
    dto: CreateSellerBalanceAdjustmentDto,
  ) {
    const customer = await this.requireCustomerByTypes(customerId, [
      'paddy_seller',
    ]);
    await this.seasonService.assertSeasonIsEditableById(customer.seasonId);
    const ledger = await this.requireLedger(customer.id);

    const directionRaw = dto.direction?.trim().toLowerCase() ?? '';
    if (directionRaw !== 'debit' && directionRaw !== 'credit') {
      throw new BadRequestException(
        'direction must be either "debit" or "credit"',
      );
    }

    const amount = this.parsePositiveDecimal(dto.amount, 'amount');
    const currencyIdTrimmed = dto.currencyId?.trim() ?? '';

    if (!currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required for a seller debit or credit',
      );
    }

    const currencyId =
      await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);
    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const notes = dto.notes?.trim() || null;
    const entryType =
      directionRaw === 'debit'
        ? CustomerLedgerEntryType.seller_debit
        : CustomerLedgerEntryType.seller_credit;

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.customerLedgerEntry.create({
        data: {
          ledgerId: ledger.id,
          customerId: customer.id,
          entryType,
          amount,
          paymentType: null,
          paidAmount: null,
          remainingAmount: null,
          paymentChannel: null,
          sarafId: null,
          currencyId,
          occurredAt: paymentDate,
          notes,
        },
        select: ledgerEntrySelect,
      });
    });

    return this.serializeLedgerEntry(created);
  }

  async addSellerBalanceTransfer(
    customerId: string,
    dto: CreateSellerBalanceTransferDto,
  ) {
    const customer = await this.requireCustomerByTypes(customerId, [
      'paddy_seller',
    ]);
    const season = await this.seasonService.assertSeasonIsEditableById(
      customer.seasonId,
    );
    const ledger = await this.requireLedger(customer.id);
    const toCustomerIdTrimmed = dto.toCustomerId?.trim() ?? '';

    if (!toCustomerIdTrimmed) {
      throw new BadRequestException(
        'toCustomerId is required when transferring balance to another paddy seller',
      );
    }

    const beneficiaryCustomerIdBig = this.parseId(toCustomerIdTrimmed);

    if (beneficiaryCustomerIdBig === customer.id) {
      throw new BadRequestException(
        'Select a different paddy seller when transferring balance',
      );
    }

    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const notes = dto.notes?.trim() || null;
    const onBehalfPaymentType = 'paid';
    const onBehalfTotal = this.parsePositiveDecimal(dto.amount, 'amount');
    const { paidAmount, remainingAmount: _remainingAmount } =
      this.resolvePaidAmountByPaymentType({
        paymentType: onBehalfPaymentType,
        paidAmount: undefined,
        totalAmount: onBehalfTotal,
      });
    const settlementAmount = this.resolveSettlementAmount({
      paymentType: onBehalfPaymentType,
      totalAmount: onBehalfTotal,
      paidAmount,
    });
    const currencyIdTrimmed = dto.currencyId?.trim() ?? '';

    if (!currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required when transferring balance to another paddy seller',
      );
    }

    const currencyId =
      await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);

    const customerRow = await this.customerModel.findUnique({
      where: { id: customer.id },
      select: { name: true, seasonName: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const onBehalfPair =
        await this.createSellerPayOnBehalfPaymentPairInTransaction(tx, {
          payer: customer,
          payerLedgerId: ledger.id,
          payerName: customerRow?.name ?? null,
          season,
          seasonName: customerRow?.seasonName ?? season.name,
          beneficiaryCustomerId: beneficiaryCustomerIdBig,
          onBehalfPaymentType,
          onBehalfAmount: dto.amount,
          onBehalfPaidAmount: paidAmount.toFixed(2),
          settlementAmount,
          paymentDate,
          notes,
          currencyId,
        });

      return onBehalfPair;
    });

    return {
      payerEntry: this.serializeLedgerEntry(created.payerEntry),
      beneficiaryEntry: this.serializeLedgerEntry(created.beneficiaryEntry),
    };
  }

  async addDebtorDisbursement(
    customerId: string,
    dto: CreateCompanyPaymentDto,
  ) {
    const customer = await this.requireCustomerByTypes(customerId, ['debtor']);
    const season = await this.seasonService.assertSeasonIsEditableById(
      customer.seasonId,
    );
    const ledger = await this.requireLedger(customer.id);
    const paymentType = this.normalizePaymentType(dto.paymentType);
    const paymentChannel = this.normalizePaymentChannel(dto.paymentChannel);
    const totalAmount = this.parsePositiveDecimal(dto.amount, 'amount');
    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const notes = dto.notes?.trim() || null;

    const { paidAmount, remainingAmount } = this.resolvePaidAmountByPaymentType(
      {
        paymentType,
        paidAmount: dto.paidAmount,
        totalAmount,
      },
    );

    const settlementAmount = this.resolveSettlementAmount({
      paymentType,
      totalAmount,
      paidAmount,
    });

    const sarafIdTrimmed = dto.sarafId?.trim() ?? '';
    const currencyIdTrimmed = dto.currencyId?.trim() ?? '';

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId must be omitted when disbursing to the debtor in cash',
      );
    }

    if (
      paymentChannel === 'saraf' &&
      settlementAmount.greaterThan(0) &&
      !sarafIdTrimmed
    ) {
      throw new BadRequestException(
        'sarafId is required when disbursing to the debtor from Saraf',
      );
    }

    if (settlementAmount.greaterThan(0) && !currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required when recording a cash or Saraf disbursement',
      );
    }

    const currencyId =
      settlementAmount.greaterThan(0) && currencyIdTrimmed
        ? await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed)
        : null;

    let sarafIdBig: bigint | null = null;

    if (paymentChannel === 'saraf' && settlementAmount.greaterThan(0)) {
      sarafIdBig = await this.resolveSarafForPayment(
        sarafIdTrimmed,
        customer.seasonId,
        settlementAmount,
      );
    }

    if (paymentChannel === 'saraf' && paymentType === 'remaining') {
      throw new BadRequestException(
        'Pay from Saraf is not available when nothing has been disbursed yet',
      );
    }

    const customerRow = await this.customerModel.findUnique({
      where: { id: customer.id },
      select: { name: true, seasonName: true },
    });

    const paymentLabel = customerRow?.name
      ? `Debtor disbursement — ${customerRow.name}`
      : 'Debtor disbursement';

    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.customerLedgerEntry.create({
        data: {
          ledgerId: ledger.id,
          customerId: customer.id,
          entryType: CustomerLedgerEntryType.debtor_disbursement,
          amount: settlementAmount,
          paymentType,
          paidAmount,
          remainingAmount,
          paymentChannel: settlementAmount.greaterThan(0)
            ? paymentChannel
            : null,
          sarafId:
            paymentChannel === 'saraf' && settlementAmount.greaterThan(0)
              ? sarafIdBig
              : null,
          currencyId,
          occurredAt: paymentDate,
          notes,
        },
        select: ledgerEntrySelect,
      });

      if (
        paymentChannel === 'cash' &&
        settlementAmount.greaterThan(0) &&
        currencyId
      ) {
        await this.cashService.createLinkedCustomerPaymentOutEntry(tx, {
          currencyId,
          amount: settlementAmount,
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          seasonId: season.id,
          seasonName: customerRow?.seasonName ?? season.name,
          customerLedgerEntryId: entry.id,
        });
      } else if (
        paymentChannel === 'saraf' &&
        settlementAmount.greaterThan(0) &&
        sarafIdBig &&
        currencyId
      ) {
        await this.sarafLedgerService.createLinkedCustomerPaymentEntry(tx, {
          sarafId: sarafIdBig,
          currencyId,
          amount: settlementAmount.negated(),
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          customerLedgerEntryId: entry.id,
        });
      }

      return entry;
    });

    return this.serializeLedgerEntry(created);
  }

  async addDebtorRepayment(customerId: string, dto: CreateBuyerPaymentDto) {
    const customer = await this.requireCustomerByTypes(customerId, ['debtor']);
    const season = await this.seasonService.assertSeasonIsEditableById(
      customer.seasonId,
    );
    const ledger = await this.requireLedger(customer.id);
    const amountRaw = dto.amount?.trim() ?? '';

    if (!amountRaw) {
      throw new BadRequestException(
        'amount is required for a debtor repayment',
      );
    }

    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const paymentChannel = this.normalizePaymentChannel(dto.paymentChannel);
    const notes = dto.notes?.trim() || null;
    const sarafIdTrimmed = dto.sarafId?.trim() ?? '';
    const currencyIdTrimmed = dto.currencyId?.trim() ?? '';
    const totalAmount = this.parsePositiveDecimal(amountRaw, 'amount');
    const settlementAmount = totalAmount;

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId must be omitted when recording a debtor repayment in cash',
      );
    }

    if (paymentChannel === 'saraf' && !sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId is required when recording a debtor repayment through Saraf',
      );
    }

    if (!currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required when recording a cash or Saraf repayment',
      );
    }

    const currencyId =
      await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);

    const sarafIdBig =
      paymentChannel === 'saraf'
        ? await this.resolveSarafForPayment(
            sarafIdTrimmed,
            customer.seasonId,
            settlementAmount,
          )
        : null;

    const customerRow = await this.customerModel.findUnique({
      where: { id: customer.id },
      select: { name: true, seasonName: true },
    });

    const paymentLabel = customerRow?.name
      ? `Debtor repayment — ${customerRow.name}`
      : 'Debtor repayment';

    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.customerLedgerEntry.create({
        data: {
          ledgerId: ledger.id,
          customerId: customer.id,
          entryType: CustomerLedgerEntryType.debtor_repayment,
          amount: settlementAmount,
          paymentType: 'paid',
          paidAmount: settlementAmount,
          remainingAmount: new Prisma.Decimal(0),
          paymentChannel,
          sarafId: paymentChannel === 'saraf' ? sarafIdBig : null,
          currencyId,
          occurredAt: paymentDate,
          notes,
        },
        select: ledgerEntrySelect,
      });

      if (paymentChannel === 'cash') {
        await this.cashService.createLinkedCustomerPaymentInEntry(tx, {
          currencyId,
          amount: settlementAmount,
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          seasonId: season.id,
          seasonName: customerRow?.seasonName ?? season.name,
          customerLedgerEntryId: entry.id,
        });
      } else if (sarafIdBig) {
        await this.sarafLedgerService.createLinkedBuyerPaymentSarafEntry(tx, {
          sarafId: sarafIdBig,
          currencyId,
          amount: settlementAmount,
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          customerLedgerEntryId: entry.id,
        });
      }

      return entry;
    });

    return this.serializeLedgerEntry(created);
  }

  async syncVendorExpenseFromExpense(
    tx: Prisma.TransactionClient,
    params: {
      expenseId: bigint;
      vendorCustomerId: bigint;
      billNo: string;
      title: string;
      totalAmount: Prisma.Decimal;
      currencyId: string;
      paymentType: string;
      paidAmount: Prisma.Decimal;
      remainingAmount: Prisma.Decimal;
      settlementAmount: Prisma.Decimal;
      paymentChannel: 'cash' | 'saraf';
      sarafId: bigint | null;
      occurredAt: Date;
      notes: string | null;
      seasonId: string;
      seasonName: string;
    },
  ) {
    const ledger = await this.requireLedger(params.vendorCustomerId);
    const expenseNotes = params.notes
      ? `Expense ${params.billNo} — ${params.title} — ${params.notes}`
      : `Expense ${params.billNo} — ${params.title}`;

    await tx.customerLedgerEntry.create({
      data: {
        ledgerId: ledger.id,
        customerId: params.vendorCustomerId,
        entryType: 'vendor_expense',
        sourceExpenseId: params.expenseId,
        amount: params.totalAmount,
        paymentType: params.paymentType,
        paidAmount: params.paidAmount,
        remainingAmount: params.remainingAmount,
        currencyId: params.currencyId,
        occurredAt: params.occurredAt,
        notes: expenseNotes,
      },
    });

    if (!params.settlementAmount.greaterThan(0)) {
      return;
    }

    const paymentEntry = await tx.customerLedgerEntry.create({
      data: {
        ledgerId: ledger.id,
        customerId: params.vendorCustomerId,
        entryType: 'vendor_payment',
        sourceExpenseId: params.expenseId,
        amount: params.settlementAmount,
        paymentType: params.paymentType,
        paidAmount: params.paidAmount,
        remainingAmount: params.remainingAmount,
        paymentChannel: params.paymentChannel,
        sarafId: params.paymentChannel === 'saraf' ? params.sarafId : null,
        currencyId: params.currencyId,
        occurredAt: params.occurredAt,
        notes: expenseNotes,
      },
      select: ledgerEntrySelect,
    });

    const paymentLabel = `Expense ${params.billNo} — ${params.title}`;

    if (params.paymentChannel === 'cash') {
      await this.cashService.createLinkedCustomerPaymentOutEntry(tx, {
        currencyId: params.currencyId,
        amount: params.settlementAmount,
        occurredAt: params.occurredAt,
        notes: params.notes
          ? `${paymentLabel} — ${params.notes}`
          : paymentLabel,
        seasonId: params.seasonId,
        seasonName: params.seasonName,
        customerLedgerEntryId: paymentEntry.id,
      });
    } else if (params.paymentChannel === 'saraf' && params.sarafId) {
      await this.sarafLedgerService.createLinkedCustomerPaymentEntry(tx, {
        sarafId: params.sarafId,
        currencyId: params.currencyId,
        amount: params.settlementAmount.negated(),
        occurredAt: params.occurredAt,
        notes: params.notes
          ? `${paymentLabel} — ${params.notes}`
          : paymentLabel,
        customerLedgerEntryId: paymentEntry.id,
      });
    }
  }

  async removeVendorExpenseEntries(
    tx: Prisma.TransactionClient,
    expenseId: bigint,
  ) {
    await tx.customerLedgerEntry.deleteMany({
      where: { sourceExpenseId: expenseId },
    });
  }

  async addBuyerPayment(customerId: string, dto: CreateBuyerPaymentDto) {
    const customer = await this.requireCustomerByTypes(customerId, ['buyer']);
    const season = await this.seasonService.assertSeasonIsEditableById(
      customer.seasonId,
    );
    const ledger = await this.requireLedger(customer.id);
    const payOnBehalf = dto.payOnBehalf === true;
    const selfAmountRaw = dto.amount?.trim() ?? '';
    const hasSelfPayment = Boolean(selfAmountRaw);

    if (!hasSelfPayment && !payOnBehalf) {
      throw new BadRequestException(
        'Enter an amount for this buyer or enable pay on behalf of another buyer',
      );
    }

    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const paymentChannel = this.normalizePaymentChannel(dto.paymentChannel);
    const notes = dto.notes?.trim() || null;
    const sarafIdTrimmed = dto.sarafId?.trim() ?? '';
    const currencyIdTrimmed = dto.currencyId?.trim() ?? '';

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId must be omitted when recording a buyer payment in cash',
      );
    }

    let selfSettlement = new Prisma.Decimal(0);
    let selfPaymentType: string | null = null;

    if (hasSelfPayment) {
      if (!dto.paymentType?.trim()) {
        throw new BadRequestException(
          'paymentType is required for your payment',
        );
      }

      selfPaymentType = this.normalizePaymentType(dto.paymentType);
      const totalAmount = this.parsePositiveDecimal(dto.amount!, 'amount');
      const { paidAmount } = this.resolvePaidAmountByPaymentType({
        paymentType: selfPaymentType,
        paidAmount: dto.paidAmount,
        totalAmount,
      });
      selfSettlement = this.resolveSettlementAmount({
        paymentType: selfPaymentType,
        totalAmount,
        paidAmount,
      });

      if (paymentChannel === 'saraf' && selfPaymentType === 'remaining') {
        throw new BadRequestException(
          'Pay to Saraf is not available when nothing has been paid yet',
        );
      }
    }

    let onBehalfSettlement = new Prisma.Decimal(0);
    let onBehalfPaymentType: string | null = null;
    let onBehalfCustomerIdBig: bigint | null = null;

    if (payOnBehalf) {
      const onBehalfIdTrimmed = dto.onBehalfCustomerId?.trim() ?? '';

      if (!onBehalfIdTrimmed) {
        throw new BadRequestException(
          'onBehalfCustomerId is required when paying on behalf of another buyer',
        );
      }

      onBehalfCustomerIdBig = this.parseId(onBehalfIdTrimmed);

      if (onBehalfCustomerIdBig === customer.id) {
        throw new BadRequestException(
          'Select a different buyer when paying on behalf of another buyer',
        );
      }

      if (!dto.onBehalfPaymentType?.trim()) {
        throw new BadRequestException(
          'onBehalfPaymentType is required when paying on behalf of another buyer',
        );
      }

      onBehalfPaymentType = this.normalizePaymentType(dto.onBehalfPaymentType);
      const onBehalfTotal = this.parsePositiveDecimal(
        dto.onBehalfAmount ?? '',
        'onBehalfAmount',
      );
      const onBehalfPaidResolved = this.resolvePaidAmountByPaymentType({
        paymentType: onBehalfPaymentType,
        paidAmount: dto.onBehalfPaidAmount,
        totalAmount: onBehalfTotal,
      });
      onBehalfSettlement = this.resolveSettlementAmount({
        paymentType: onBehalfPaymentType,
        totalAmount: onBehalfTotal,
        paidAmount: onBehalfPaidResolved.paidAmount,
      });
    }

    if (
      paymentChannel === 'saraf' &&
      selfSettlement.greaterThan(0) &&
      !sarafIdTrimmed
    ) {
      throw new BadRequestException(
        'sarafId is required when recording a buyer payment through Saraf',
      );
    }

    if (selfSettlement.greaterThan(0) && !currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required when recording a cash or Saraf collection',
      );
    }

    const currencyId =
      selfSettlement.greaterThan(0) && currencyIdTrimmed
        ? await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed)
        : null;

    let onBehalfCurrencyId: string | null = null;

    if (payOnBehalf && onBehalfSettlement.greaterThan(0)) {
      const onBehalfCurrencyIdTrimmed =
        dto.onBehalfCurrencyId?.trim() ?? currencyIdTrimmed;

      if (!onBehalfCurrencyIdTrimmed) {
        throw new BadRequestException(
          'onBehalfCurrencyId is required when transferring a balance on behalf of another buyer',
        );
      }

      onBehalfCurrencyId = await this.currencyService.requireActiveCurrencyId(
        onBehalfCurrencyIdTrimmed,
      );
    }

    let deductOnBehalfFromSelf = false;

    if (
      hasSelfPayment &&
      payOnBehalf &&
      onBehalfSettlement.greaterThan(0) &&
      selfSettlement.greaterThan(0) &&
      currencyId &&
      onBehalfCurrencyId &&
      currencyId === onBehalfCurrencyId
    ) {
      if (onBehalfSettlement.greaterThan(selfSettlement)) {
        throw new BadRequestException(
          'On-behalf amount cannot exceed your payment amount when both use the same currency',
        );
      }

      deductOnBehalfFromSelf = true;
      selfSettlement = selfSettlement.minus(onBehalfSettlement);
    }

    let sarafIdBig: bigint | null = null;

    if (paymentChannel === 'saraf' && selfSettlement.greaterThan(0)) {
      sarafIdBig = this.parseId(sarafIdTrimmed);

      const saraf = await this.prisma.saraf.findUnique({
        where: { id: sarafIdBig },
        select: {
          id: true,
          seasonId: true,
          ledger: { select: { id: true } },
        },
      });

      if (!saraf) {
        throw new NotFoundException(
          `Saraf with id "${sarafIdTrimmed}" not found`,
        );
      }

      if (saraf.seasonId !== customer.seasonId) {
        throw new BadRequestException(
          'Selected Saraf must belong to the customer season',
        );
      }

      if (!saraf.ledger) {
        throw new BadRequestException(
          'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
        );
      }
    }

    const customerRow = await this.customerModel.findUnique({
      where: { id: customer.id },
      select: { name: true, seasonName: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      let selfEntry: any = null;
      let onBehalfPair: {
        payerEntry: any;
        beneficiaryEntry: any;
      } | null = null;

      if (hasSelfPayment && selfPaymentType && selfSettlement.greaterThan(0)) {
        const grossTotalAmount = this.parsePositiveDecimal(
          dto.amount!,
          'amount',
        );
        const netTotalAmount = deductOnBehalfFromSelf
          ? grossTotalAmount.minus(
              this.parsePositiveDecimal(
                dto.onBehalfAmount ?? '',
                'onBehalfAmount',
              ),
            )
          : grossTotalAmount;
        const { paidAmount, remainingAmount } =
          this.resolvePaidAmountByPaymentType({
            paymentType: selfPaymentType,
            paidAmount:
              deductOnBehalfFromSelf && selfPaymentType === 'paid'
                ? selfSettlement.toFixed(2)
                : dto.paidAmount,
            totalAmount: netTotalAmount,
          });

        selfEntry = await this.createBuyerPaymentEntryInTransaction(tx, {
          ledgerId: ledger.id,
          customerId: customer.id,
          customerName: customerRow?.name ?? null,
          customerType: 'buyer',
          season,
          seasonName: customerRow?.seasonName ?? season.name,
          entryType: 'buyer_payment',
          paymentType: selfPaymentType,
          totalAmount: netTotalAmount,
          paidAmount,
          remainingAmount,
          settlementAmount: selfSettlement,
          paymentChannel,
          paymentDate,
          notes,
          currencyId,
          sarafIdBig,
          counterpartyCustomerId: null,
        });
      }

      if (payOnBehalf && onBehalfCustomerIdBig && onBehalfPaymentType) {
        onBehalfPair = await this.createPayOnBehalfPaymentPairInTransaction(
          tx,
          {
            payer: customer,
            payerLedgerId: ledger.id,
            payerName: customerRow?.name ?? null,
            season,
            seasonName: customerRow?.seasonName ?? season.name,
            beneficiaryCustomerId: onBehalfCustomerIdBig,
            onBehalfPaymentType,
            onBehalfAmount: dto.onBehalfAmount!,
            onBehalfPaidAmount: dto.onBehalfPaidAmount,
            settlementAmount: onBehalfSettlement,
            paymentDate,
            notes,
            currencyId: onBehalfCurrencyId,
          },
        );
      }

      return { selfEntry, onBehalfPair };
    });

    return {
      self: created.selfEntry
        ? this.serializeLedgerEntry(created.selfEntry)
        : null,
      onBehalf: created.onBehalfPair
        ? {
            payerEntry: this.serializeLedgerEntry(
              created.onBehalfPair.payerEntry,
            ),
            beneficiaryEntry: this.serializeLedgerEntry(
              created.onBehalfPair.beneficiaryEntry,
            ),
          }
        : null,
    };
  }

  async addFarmerRiceReturn(
    customerId: string,
    dto: CreateFarmerRiceReturnDto,
  ) {
    const customer = await this.requireCustomerByTypes(customerId, [
      'paddy_farmer',
    ]);
    await this.seasonService.assertSeasonIsEditableById(customer.seasonId);
    const ledger = await this.requireLedger(customer.id);
    const riceQuantity = this.parsePositiveDecimal(
      dto.riceQuantity,
      'riceQuantity',
    );
    const returnDate = this.parseDate(dto.returnDate, 'returnDate');
    const unit = normalizeWeightUnit(dto.unit);
    const riceVariety = await this.varietyService.resolveActiveVarietyName(
      'RICE',
      dto.riceVariety ?? '',
    );

    const obligationEntries = await this.customerLedgerEntryModel.findMany({
      where: {
        customerId: customer.id,
        entryType: { in: ['farmer_obligation', 'farmer_rice_return'] },
      },
      select: {
        entryType: true,
        riceVariety: true,
        riceQuantity: true,
        unit: true,
      },
    });
    const remainingByVariety =
      this.computeFarmerRiceRemainingByVariety(obligationEntries);
    const remainingKg = remainingByVariety.get(riceVariety);
    const returnKg = toKilograms(riceQuantity, unit);

    if (!remainingKg || remainingKg.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        `No rice obligation remains for variety "${riceVariety}". Returns must use the same rice variety owed to this farmer.`,
      );
    }

    if (returnKg.greaterThan(remainingKg)) {
      throw new BadRequestException(
        `Return quantity exceeds remaining ${riceVariety} rice obligation (${remainingKg.toFixed(2)} kg remaining)`,
      );
    }

    const created = await this.customerLedgerEntryModel.create({
      data: {
        ledgerId: ledger.id,
        customerId: customer.id,
        entryType: 'farmer_rice_return',
        riceQuantity,
        riceVariety,
        unit,
        occurredAt: returnDate,
        scheduledFor: dto.scheduledFor
          ? this.parseDate(dto.scheduledFor, 'scheduledFor')
          : null,
        notes: dto.notes?.trim() || null,
      },
      select: ledgerEntrySelect,
    });

    return this.serializeLedgerEntry(created);
  }

  async fulfillFarmerRiceReturn(customerId: string, entryId: string) {
    const customer = await this.requireCustomerByTypes(customerId, [
      'paddy_farmer',
    ]);
    await this.seasonService.assertSeasonIsEditableById(customer.seasonId);

    const ledgerEntryId = this.parseId(entryId);
    const entry = await this.customerLedgerEntryModel.findFirst({
      where: {
        id: ledgerEntryId,
        customerId: customer.id,
        entryType: 'farmer_rice_return',
      },
      select: {
        id: true,
        riceQuantity: true,
        riceVariety: true,
        unit: true,
        riceStockFulfilledAt: true,
        customer: {
          select: {
            seasonId: true,
            name: true,
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(
        `Farmer rice return ledger entry "${entryId}" not found`,
      );
    }

    if (entry.riceStockFulfilledAt) {
      throw new BadRequestException(
        'This farmer rice return has already been issued from stock',
      );
    }

    const riceVariety = entry.riceVariety?.trim();
    if (!riceVariety) {
      throw new BadRequestException('Ledger entry is missing rice variety');
    }

    const riceQuantity = entry.riceQuantity;
    if (
      riceQuantity === null ||
      riceQuantity === undefined ||
      new Prisma.Decimal(riceQuantity).lessThanOrEqualTo(0)
    ) {
      throw new BadRequestException('Ledger entry is missing rice quantity');
    }

    const unit = normalizeWeightUnit(entry.unit ?? APP_WEIGHT_UNIT);
    const requestedKg = toKilograms(new Prisma.Decimal(riceQuantity), unit);
    const availableKg = await this.riceSaleService.getAvailableRiceVarietyKg({
      seasonId: customer.seasonId,
      riceVariety,
    });

    if (requestedKg.greaterThan(availableKg)) {
      throw new BadRequestException(
        `Not enough ${riceVariety} rice in stock to fulfill this return`,
      );
    }

    const fulfilledAt = new Date();
    const updated = await this.customerLedgerEntryModel.update({
      where: { id: ledgerEntryId },
      data: { riceStockFulfilledAt: fulfilledAt },
      select: ledgerEntrySelect,
    });

    return this.serializeLedgerEntry(updated);
  }

  async deleteLedgerEntry(customerId: string, entryId: string) {
    const customer = await this.requireCustomer(customerId);
    await this.seasonService.assertSeasonIsEditableById(customer.seasonId);
    const entry = await this.requireEditableLedgerEntry(customerId, entryId);

    await this.prisma.$transaction(async (tx) => {
      if (entry.linkedLedgerEntryId) {
        const linkedId = entry.linkedLedgerEntryId;
        await tx.customerLedgerEntry.updateMany({
          where: { id: { in: [entry.id, linkedId] } },
          data: { linkedLedgerEntryId: null },
        });
        await this.deleteLinkedCashAndSaraf(tx, entry.id);
        await this.deleteLinkedCashAndSaraf(tx, linkedId);
        await tx.customerLedgerEntry.deleteMany({
          where: { id: { in: [entry.id, linkedId] } },
        });
      } else {
        await this.deleteLinkedCashAndSaraf(tx, entry.id);
        await tx.customerLedgerEntry.delete({ where: { id: entry.id } });
      }
    });

    return { id: entryId };
  }

  async updateLedgerEntry(
    customerId: string,
    entryId: string,
    dto: UpdateLedgerEntryDto,
  ) {
    const customer = await this.requireCustomer(customerId);
    const season = await this.seasonService.assertSeasonIsEditableById(
      customer.seasonId,
    );
    const entry = await this.requireEditableLedgerEntry(customerId, entryId);

    if (
      entry.entryType === 'company_payment' ||
      entry.entryType === 'vendor_payment' ||
      entry.entryType === 'debtor_disbursement'
    ) {
      return this.updateCompanyPaymentEntry(customer, season, entry, dto);
    }

    if (
      entry.entryType === 'buyer_payment' ||
      entry.entryType === 'debtor_repayment'
    ) {
      return this.updateBuyerPaymentEntry(customer, season, entry, dto);
    }

    if (
      entry.entryType === 'buyer_payment_on_behalf' ||
      entry.entryType === 'buyer_payment_received_on_behalf' ||
      entry.entryType === 'company_payment_on_behalf' ||
      entry.entryType === 'company_payment_received_on_behalf'
    ) {
      return this.updateOnBehalfPaymentEntry(customer, season, entry, dto);
    }

    if (
      entry.entryType === 'buyer_debit' ||
      entry.entryType === 'buyer_credit' ||
      entry.entryType === 'seller_debit' ||
      entry.entryType === 'seller_credit'
    ) {
      return this.updateBuyerBalanceAdjustmentEntry(entry, dto);
    }

    if (entry.entryType === 'farmer_rice_return') {
      return this.updateFarmerRiceReturnEntry(customer, entry, dto);
    }

    throw new BadRequestException(
      'This ledger entry cannot be updated from the customer account',
    );
  }

  async getFarmerRiceObligationByVarietyForSeason(seasonId: string) {
    const entries = await this.customerLedgerEntryModel.findMany({
      where: {
        entryType: { in: ['farmer_obligation', 'farmer_rice_return'] },
        customer: { seasonId, type: 'paddy_farmer' },
      },
      select: {
        entryType: true,
        riceVariety: true,
        riceQuantity: true,
        unit: true,
        riceStockFulfilledAt: true,
      },
    });

    const obligationByVariety = new Map<string, Prisma.Decimal>();
    const returnedByVariety = new Map<string, Prisma.Decimal>();

    for (const entry of entries) {
      if (!entry.riceVariety?.trim() || entry.riceQuantity === null) {
        continue;
      }

      const variety = entry.riceVariety.trim();
      const kg = toKilograms(
        new Prisma.Decimal(entry.riceQuantity),
        entry.unit ?? undefined,
      );

      if (entry.entryType === 'farmer_obligation') {
        obligationByVariety.set(
          variety,
          (obligationByVariety.get(variety) ?? new Prisma.Decimal(0)).plus(kg),
        );
        continue;
      }

      if (!entry.riceStockFulfilledAt) {
        continue;
      }

      returnedByVariety.set(
        variety,
        (returnedByVariety.get(variety) ?? new Prisma.Decimal(0)).plus(kg),
      );
    }

    const allVarieties = new Set([
      ...obligationByVariety.keys(),
      ...returnedByVariety.keys(),
    ]);

    const byVariety = Array.from(allVarieties)
      .map((variety) => {
        const obligationKg =
          obligationByVariety.get(variety) ?? new Prisma.Decimal(0);
        const returnedKg =
          returnedByVariety.get(variety) ?? new Prisma.Decimal(0);
        const toIssueKg = Prisma.Decimal.max(obligationKg.minus(returnedKg), 0);

        return { variety, obligationKg, returnedKg, toIssueKg };
      })
      .sort((left, right) => right.toIssueKg.minus(left.toIssueKg).toNumber());

    const totals = byVariety.reduce(
      (acc, row) => ({
        obligationKg: acc.obligationKg.plus(row.obligationKg),
        returnedKg: acc.returnedKg.plus(row.returnedKg),
        toIssueKg: acc.toIssueKg.plus(row.toIssueKg),
      }),
      {
        obligationKg: new Prisma.Decimal(0),
        returnedKg: new Prisma.Decimal(0),
        toIssueKg: new Prisma.Decimal(0),
      },
    );

    return { byVariety, totals };
  }

  async listFulfilledFarmerRiceReturnsForSeason(seasonId: string) {
    const rows = await this.customerLedgerEntryModel.findMany({
      where: {
        entryType: 'farmer_rice_return',
        riceStockFulfilledAt: { not: null },
        customer: { seasonId },
      },
      orderBy: { riceStockFulfilledAt: 'desc' },
      select: {
        id: true,
        riceVariety: true,
        riceQuantity: true,
        unit: true,
        riceStockFulfilledAt: true,
        customer: {
          select: { name: true },
        },
      },
    });

    return rows.map((row: any) => ({
      id: String(row.id),
      variety: row.riceVariety ?? '',
      quantityKg: toKilograms(
        new Prisma.Decimal(row.riceQuantity ?? 0),
        normalizeWeightUnit(row.unit),
      ),
      fulfilledAt: row.riceStockFulfilledAt as Date,
      ownerName: row.customer?.name ?? 'Farmer',
    }));
  }

  async syncCompanyReceivableEntry(params: {
    customerId: bigint;
    companyPaddyWarehouseId: bigint;
    totalAmount: Prisma.Decimal;
    receivedDate: Date;
    notes?: string | null;
    currencyId?: string | null;
  }) {
    const ledger = await this.requireLedger(params.customerId);

    await this.customerLedgerEntryModel.upsert({
      where: {
        sourceCompanyPaddyWarehouseId: params.companyPaddyWarehouseId,
      },
      update: {
        ledgerId: ledger.id,
        customerId: params.customerId,
        entryType: 'company_receivable',
        amount: params.totalAmount,
        currencyId: params.currencyId ?? null,
        occurredAt: params.receivedDate,
        notes: params.notes?.trim() || null,
      },
      create: {
        ledgerId: ledger.id,
        customerId: params.customerId,
        entryType: 'company_receivable',
        sourceCompanyPaddyWarehouseId: params.companyPaddyWarehouseId,
        amount: params.totalAmount,
        currencyId: params.currencyId ?? null,
        occurredAt: params.receivedDate,
        notes: params.notes?.trim() || null,
      },
    });
  }

  async removeCompanyReceivableEntry(companyPaddyWarehouseId: string | bigint) {
    const sourceCompanyPaddyWarehouseId =
      typeof companyPaddyWarehouseId === 'bigint'
        ? companyPaddyWarehouseId
        : this.parseId(companyPaddyWarehouseId);

    await this.customerLedgerEntryModel.deleteMany({
      where: {
        sourceCompanyPaddyWarehouseId,
      },
    });
  }

  async syncFarmerObligationEntry(params: {
    customerId: bigint;
    farmerPaddyWarehouseId: bigint;
    paddyQuantity: Prisma.Decimal;
    riceQuantity: Prisma.Decimal;
    riceVariety: string;
    unit: string;
    receivedDate: Date;
    notes?: string | null;
  }) {
    const ledger = await this.requireLedger(params.customerId);

    await this.customerLedgerEntryModel.upsert({
      where: {
        sourceFarmerPaddyWarehouseId: params.farmerPaddyWarehouseId,
      },
      update: {
        ledgerId: ledger.id,
        customerId: params.customerId,
        entryType: 'farmer_obligation',
        paddyQuantity: params.paddyQuantity,
        riceQuantity: params.riceQuantity,
        riceVariety: params.riceVariety,
        unit: params.unit,
        occurredAt: params.receivedDate,
        notes: params.notes?.trim() || null,
      },
      create: {
        ledgerId: ledger.id,
        customerId: params.customerId,
        entryType: 'farmer_obligation',
        sourceFarmerPaddyWarehouseId: params.farmerPaddyWarehouseId,
        paddyQuantity: params.paddyQuantity,
        riceQuantity: params.riceQuantity,
        riceVariety: params.riceVariety,
        unit: params.unit,
        occurredAt: params.receivedDate,
        notes: params.notes?.trim() || null,
      },
    });
  }

  async removeFarmerObligationEntry(farmerPaddyWarehouseId: string | bigint) {
    const sourceFarmerPaddyWarehouseId =
      typeof farmerPaddyWarehouseId === 'bigint'
        ? farmerPaddyWarehouseId
        : this.parseId(farmerPaddyWarehouseId);

    await this.customerLedgerEntryModel.deleteMany({
      where: {
        sourceFarmerPaddyWarehouseId,
      },
    });
  }

  async syncRiceWarehouseActivity(params: {
    customerId: bigint;
    riceWarehouseId: bigint;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    remainingAmount: Prisma.Decimal;
    paymentType: string;
    paymentChannel: 'cash' | 'saraf';
    sarafId: bigint | null;
    currencyId: string | null;
    receivedDate: Date;
    variety: string;
    quantity: Prisma.Decimal;
    unit: string;
    notes?: string | null;
  }) {
    const ledger = await this.requireLedger(params.customerId);

    await this.customerLedgerEntryModel.upsert({
      where: {
        sourceRiceWarehouseId: params.riceWarehouseId,
      },
      update: {
        ledgerId: ledger.id,
        customerId: params.customerId,
        entryType: 'company_receivable',
        amount: params.totalAmount,
        paymentType: params.paymentType,
        paidAmount: params.paidAmount,
        remainingAmount: params.remainingAmount,
        paymentChannel: params.paymentChannel,
        sarafId: params.sarafId,
        currencyId: params.currencyId,
        riceQuantity: params.quantity,
        riceVariety: params.variety,
        unit: params.unit,
        occurredAt: params.receivedDate,
        notes: params.notes?.trim() || null,
      },
      create: {
        ledgerId: ledger.id,
        customerId: params.customerId,
        entryType: 'company_receivable',
        sourceRiceWarehouseId: params.riceWarehouseId,
        amount: params.totalAmount,
        paymentType: params.paymentType,
        paidAmount: params.paidAmount,
        remainingAmount: params.remainingAmount,
        paymentChannel: params.paymentChannel,
        sarafId: params.sarafId,
        currencyId: params.currencyId,
        riceQuantity: params.quantity,
        riceVariety: params.variety,
        unit: params.unit,
        occurredAt: params.receivedDate,
        notes: params.notes?.trim() || null,
      },
    });
  }

  async removeRiceWarehouseActivity(riceWarehouseId: string | bigint) {
    const sourceRiceWarehouseId =
      typeof riceWarehouseId === 'bigint'
        ? riceWarehouseId
        : this.parseId(riceWarehouseId);

    await this.customerLedgerEntryModel.deleteMany({
      where: {
        sourceRiceWarehouseId,
      },
    });
  }

  private async requireCustomerByTypes(
    customerId: string,
    expectedTypes: Array<
      | 'paddy_farmer'
      | 'paddy_seller'
      | 'rice_seller'
      | 'buyer'
      | 'vendor'
      | 'debtor'
    >,
  ) {
    const customer = await this.customerModel.findUnique({
      where: { id: this.parseId(customerId) },
      select: {
        id: true,
        type: true,
        seasonId: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${customerId}" not found`);
    }

    const matchesExpectedType =
      expectedTypes.includes(customer.type) ||
      (customer.type === 'process_production_buyer' &&
        expectedTypes.includes('buyer'));

    if (!matchesExpectedType) {
      throw new BadRequestException(
        `Customer account only accepts ${expectedTypes.join(' or ')} ledger actions`,
      );
    }

    return customer;
  }

  private async requireLedger(customerId: bigint) {
    const ledger = await this.customerLedgerModel.findUnique({
      where: { customerId },
      select: {
        id: true,
        customerId: true,
        ledgerType: true,
      },
    });

    if (!ledger) {
      throw new NotFoundException(
        `Ledger for customer "${String(customerId)}" not found`,
      );
    }

    return ledger;
  }

  private buildSummary(
    customerType:
      | 'paddy_farmer'
      | 'paddy_seller'
      | 'rice_seller'
      | 'buyer'
      | 'process_production_buyer'
      | 'vendor'
      | 'debtor',
    entries: any[],
  ) {
    if (customerType === 'vendor') {
      return this.buildVendorSummary(entries);
    }

    if (customerType === 'debtor') {
      return this.buildDebtorSummary(entries);
    }

    if (this.isBuyerCustomerType(customerType)) {
      return this.buildBuyerSummary(entries);
    }

    if (customerType === 'paddy_seller' || customerType === 'rice_seller') {
      return this.buildSellerSummary(entries);
    }

    return this.buildFarmerSummary(entries);
  }

  private buildVendorSummary(entries: SerializedLedgerEntry[]) {
    type CurrencyBucket = {
      currencyId: string;
      currencyCode: string;
      currencyName: string;
      expenseTotal: Prisma.Decimal;
      paidTotal: Prisma.Decimal;
    };

    const buckets = new Map<string, CurrencyBucket>();

    const ensureBucket = (
      currencyId: string,
      currencyCode: string,
      currencyName: string,
    ) => {
      const key = currencyId || 'unknown';
      if (!buckets.has(key)) {
        buckets.set(key, {
          currencyId,
          currencyCode: currencyCode || '—',
          currencyName: currencyName || currencyCode || '—',
          expenseTotal: new Prisma.Decimal(0),
          paidTotal: new Prisma.Decimal(0),
        });
      }

      return buckets.get(key)!;
    };

    for (const entry of entries) {
      const currencyId = entry.currencyId?.trim() ?? '';
      if (!currencyId) {
        continue;
      }

      const currencyCode = entry.currencyCode?.trim() ?? '';
      const currencyName = entry.currencyName?.trim() ?? currencyCode;
      const bucket = ensureBucket(currencyId, currencyCode, currencyName);

      if (entry.entryType === 'vendor_expense') {
        bucket.expenseTotal = bucket.expenseTotal.plus(
          new Prisma.Decimal(entry.amount ?? 0),
        );
      }

      if (entry.entryType === 'vendor_payment') {
        bucket.paidTotal = bucket.paidTotal.plus(
          new Prisma.Decimal(entry.amount ?? 0),
        );
      }
    }

    const byCurrency = [...buckets.values()]
      .map((bucket) => {
        const amountWeOweVendor = Prisma.Decimal.max(
          bucket.expenseTotal.minus(bucket.paidTotal),
          0,
        );
        const amountVendorOwesUs = Prisma.Decimal.max(
          bucket.paidTotal.minus(bucket.expenseTotal),
          0,
        );

        return {
          currencyId: bucket.currencyId,
          currencyCode: bucket.currencyCode,
          currencyName: bucket.currencyName,
          totalExpenseAmount: bucket.expenseTotal.toFixed(2),
          totalPaidAmount: bucket.paidTotal.toFixed(2),
          amountWeOweVendor: amountWeOweVendor.toFixed(2),
          amountVendorOwesUs: amountVendorOwesUs.toFixed(2),
        };
      })
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      );

    const singleCurrency = byCurrency.length === 1 ? byCurrency[0] : null;

    return {
      vendorByCurrency: byCurrency,
      totalExpenseAmount: singleCurrency?.totalExpenseAmount ?? null,
      totalPaidAmount: singleCurrency?.totalPaidAmount ?? null,
      outstandingAmount: singleCurrency?.amountWeOweVendor ?? null,
      vendorOwesUsAmount: singleCurrency?.amountVendorOwesUs ?? null,
    };
  }

  private buildDebtorSummary(entries: SerializedLedgerEntry[]) {
    type CurrencyBucket = {
      currencyId: string;
      currencyCode: string;
      currencyName: string;
      disbursedTotal: Prisma.Decimal;
      repaidTotal: Prisma.Decimal;
    };

    const buckets = new Map<string, CurrencyBucket>();

    const ensureBucket = (
      currencyId: string,
      currencyCode: string,
      currencyName: string,
    ) => {
      const key = currencyId || 'unknown';
      if (!buckets.has(key)) {
        buckets.set(key, {
          currencyId,
          currencyCode: currencyCode || '—',
          currencyName: currencyName || currencyCode || '—',
          disbursedTotal: new Prisma.Decimal(0),
          repaidTotal: new Prisma.Decimal(0),
        });
      }

      return buckets.get(key)!;
    };

    for (const entry of entries) {
      const currencyId = entry.currencyId?.trim() ?? '';
      if (!currencyId) {
        continue;
      }

      const currencyCode = entry.currencyCode?.trim() ?? '';
      const currencyName = entry.currencyName?.trim() ?? currencyCode;
      const bucket = ensureBucket(currencyId, currencyCode, currencyName);

      if (entry.entryType === 'debtor_disbursement') {
        bucket.disbursedTotal = bucket.disbursedTotal.plus(
          new Prisma.Decimal(entry.amount ?? 0),
        );
      }

      if (entry.entryType === 'debtor_repayment') {
        bucket.repaidTotal = bucket.repaidTotal.plus(
          new Prisma.Decimal(entry.amount ?? 0),
        );
      }
    }

    const byCurrency = [...buckets.values()]
      .map((bucket) => {
        const outstandingAmount = Prisma.Decimal.max(
          bucket.disbursedTotal.minus(bucket.repaidTotal),
          0,
        );
        const debtorOverpaidAmount = Prisma.Decimal.max(
          bucket.repaidTotal.minus(bucket.disbursedTotal),
          0,
        );

        return {
          currencyId: bucket.currencyId,
          currencyCode: bucket.currencyCode,
          currencyName: bucket.currencyName,
          totalDisbursedAmount: bucket.disbursedTotal.toFixed(2),
          totalRepaidAmount: bucket.repaidTotal.toFixed(2),
          outstandingAmount: outstandingAmount.toFixed(2),
          debtorOverpaidAmount: debtorOverpaidAmount.toFixed(2),
        };
      })
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      );

    const singleCurrency = byCurrency.length === 1 ? byCurrency[0] : null;

    return {
      debtorByCurrency: byCurrency,
      totalDisbursedAmount: singleCurrency?.totalDisbursedAmount ?? null,
      totalRepaidAmount: singleCurrency?.totalRepaidAmount ?? null,
      outstandingAmount: singleCurrency?.outstandingAmount ?? null,
      debtorOverpaidAmount: singleCurrency?.debtorOverpaidAmount ?? null,
    };
  }

  private computeFarmerRiceRemainingByVariety(
    entries: Array<{
      entryType: string;
      riceVariety: string | null;
      riceQuantity: Prisma.Decimal | string | null;
      unit: string | null;
    }>,
  ) {
    const obligationByVariety = new Map<string, Prisma.Decimal>();
    const returnedByVariety = new Map<string, Prisma.Decimal>();

    for (const entry of entries) {
      if (!entry.riceVariety?.trim() || entry.riceQuantity === null) {
        continue;
      }

      const kg = toKilograms(
        new Prisma.Decimal(entry.riceQuantity),
        entry.unit ?? undefined,
      );

      if (entry.entryType === 'farmer_obligation') {
        obligationByVariety.set(
          entry.riceVariety,
          (
            obligationByVariety.get(entry.riceVariety) ?? new Prisma.Decimal(0)
          ).plus(kg),
        );
        continue;
      }

      if (entry.entryType === 'farmer_rice_return') {
        returnedByVariety.set(
          entry.riceVariety,
          (
            returnedByVariety.get(entry.riceVariety) ?? new Prisma.Decimal(0)
          ).plus(kg),
        );
      }
    }

    const remainingByVariety = new Map<string, Prisma.Decimal>();

    for (const [variety, obligationKg] of obligationByVariety) {
      const returnedKg =
        returnedByVariety.get(variety) ?? new Prisma.Decimal(0);
      const remainingKg = Prisma.Decimal.max(obligationKg.minus(returnedKg), 0);

      if (remainingKg.greaterThan(0)) {
        remainingByVariety.set(variety, remainingKg);
      }
    }

    return remainingByVariety;
  }

  private buildFarmerSummary(entries: SerializedLedgerEntry[]) {
    const paddyReceivedKg = entries.reduce((sum, entry) => {
      if (entry.entryType !== 'farmer_obligation' || !entry.paddyQuantity) {
        return sum;
      }

      return sum.plus(
        toKilograms(
          new Prisma.Decimal(entry.paddyQuantity),
          entry.unit ?? undefined,
        ),
      );
    }, new Prisma.Decimal(0));

    const riceObligationKg = entries.reduce((sum, entry) => {
      if (entry.entryType !== 'farmer_obligation' || !entry.riceQuantity) {
        return sum;
      }

      return sum.plus(
        toKilograms(
          new Prisma.Decimal(entry.riceQuantity),
          entry.unit ?? undefined,
        ),
      );
    }, new Prisma.Decimal(0));

    const riceReturnedKg = entries.reduce((sum, entry) => {
      if (entry.entryType !== 'farmer_rice_return' || !entry.riceQuantity) {
        return sum;
      }

      return sum.plus(
        toKilograms(
          new Prisma.Decimal(entry.riceQuantity),
          entry.unit ?? undefined,
        ),
      );
    }, new Prisma.Decimal(0));

    return {
      totalPaddyReceived: paddyReceivedKg.toFixed(2),
      totalRiceObligation: riceObligationKg.toFixed(2),
      totalRiceReturned: riceReturnedKg.toFixed(2),
      remainingRiceToReturn: Prisma.Decimal.max(
        riceObligationKg.minus(riceReturnedKg),
        0,
      ).toFixed(2),
    };
  }

  private buildWarehouseCurrencyMap(
    enteringPaddies: Array<{
      companyOwnedPaddyWarehouse?: {
        id: bigint;
        sarafLedgerCurrencyId: string | null;
        sarafLedgerCurrency?: {
          id: string;
          code: string;
          name?: string;
        } | null;
      } | null;
    }>,
    riceWarehouses: Array<{
      id: bigint;
      sarafLedgerCurrencyId: string | null;
      sarafLedgerCurrency?: { id: string; code: string; name?: string } | null;
    }>,
  ) {
    const map = new Map<
      string,
      { currencyId: string; currencyCode: string; currencyName: string }
    >();

    for (const enteringPaddy of enteringPaddies) {
      const warehouse = enteringPaddy.companyOwnedPaddyWarehouse;
      if (!warehouse?.sarafLedgerCurrencyId) {
        continue;
      }

      map.set(String(warehouse.id), {
        currencyId: warehouse.sarafLedgerCurrencyId,
        currencyCode: warehouse.sarafLedgerCurrency?.code ?? '',
        currencyName: warehouse.sarafLedgerCurrency?.name ?? '',
      });
    }

    for (const warehouse of riceWarehouses) {
      if (!warehouse.sarafLedgerCurrencyId) {
        continue;
      }

      map.set(String(warehouse.id), {
        currencyId: warehouse.sarafLedgerCurrencyId,
        currencyCode: warehouse.sarafLedgerCurrency?.code ?? '',
        currencyName: warehouse.sarafLedgerCurrency?.name ?? '',
      });
    }

    return map;
  }

  private enrichSellerEntryCurrency(
    entry: SerializedLedgerEntry,
    warehouseCurrencyMap: Map<
      string,
      { currencyId: string; currencyCode: string; currencyName: string }
    >,
  ): SerializedLedgerEntry {
    if (entry.currencyId) {
      return entry;
    }

    const warehouseId =
      entry.sourceCompanyPaddyWarehouseId ?? entry.sourceRiceWarehouseId;
    if (!warehouseId) {
      return entry;
    }

    const currency = warehouseCurrencyMap.get(warehouseId);
    if (!currency) {
      return entry;
    }

    return {
      ...entry,
      currencyId: currency.currencyId,
      currencyCode: currency.currencyCode,
      currencyName: currency.currencyName,
    };
  }

  private isDirectBuyerCollectionPayment(entry: SerializedLedgerEntry) {
    return (
      entry.entryType === 'buyer_payment' &&
      !entry.counterpartyCustomerId &&
      (entry.paymentChannel === 'cash' || entry.paymentChannel === 'saraf')
    );
  }

  private buildBuyerSummary(entries: SerializedLedgerEntry[]) {
    const riceSaleEntries = entries.filter(
      (entry) => entry.entryType === 'buyer_rice_sale',
    );
    const storeSaleEntries = entries.filter(
      (entry) => entry.entryType === 'process_production_store_sale',
    );

    let totalRiceKg = new Prisma.Decimal(0);
    let totalStoreKg = new Prisma.Decimal(0);

    for (const entry of riceSaleEntries) {
      if (!entry.riceQuantity) {
        continue;
      }

      totalRiceKg = totalRiceKg.plus(
        toKilograms(
          new Prisma.Decimal(entry.riceQuantity),
          entry.unit ?? undefined,
        ),
      );
    }

    for (const entry of storeSaleEntries) {
      if (!entry.riceQuantity) {
        continue;
      }

      totalStoreKg = totalStoreKg.plus(
        toKilograms(
          new Prisma.Decimal(entry.riceQuantity),
          entry.unit ?? undefined,
        ),
      );
    }

    type BuyerCurrencyBucket = {
      currencyId: string;
      currencyCode: string;
      currencyName: string;
      saleTotal: Prisma.Decimal;
      paidAtSale: Prisma.Decimal;
      paymentsReceived: Prisma.Decimal;
      paidOnBehalf: Prisma.Decimal;
      receivedOnBehalf: Prisma.Decimal;
    };

    const buckets = new Map<string, BuyerCurrencyBucket>();

    const ensureBuyerCurrencyBucket = (
      currencyId: string,
      currencyCode: string,
      currencyName: string,
    ) => {
      const key = currencyId || 'unknown';
      if (!buckets.has(key)) {
        buckets.set(key, {
          currencyId,
          currencyCode: currencyCode || '—',
          currencyName: currencyName || currencyCode || '—',
          saleTotal: new Prisma.Decimal(0),
          paidAtSale: new Prisma.Decimal(0),
          paymentsReceived: new Prisma.Decimal(0),
          paidOnBehalf: new Prisma.Decimal(0),
          receivedOnBehalf: new Prisma.Decimal(0),
        });
      }

      return buckets.get(key)!;
    };

    const addSaleAmounts = (entry: SerializedLedgerEntry) => {
      const currencyId = entry.currencyId?.trim() ?? '';

      const bucket = ensureBuyerCurrencyBucket(
        currencyId,
        entry.currencyCode?.trim() || '—',
        entry.currencyName?.trim() || entry.currencyCode?.trim() || '—',
      );

      if (entry.amount) {
        bucket.saleTotal = bucket.saleTotal.plus(
          new Prisma.Decimal(entry.amount),
        );
      }

      if (entry.paidAmount) {
        bucket.paidAtSale = bucket.paidAtSale.plus(
          new Prisma.Decimal(entry.paidAmount),
        );
      }
    };

    for (const entry of riceSaleEntries) {
      addSaleAmounts(entry);
    }

    for (const entry of storeSaleEntries) {
      addSaleAmounts(entry);
    }

    for (const entry of entries) {
      if (!entry.amount) {
        continue;
      }

      const currencyId = entry.currencyId?.trim() ?? '';
      if (!currencyId) {
        continue;
      }

      const bucket = ensureBuyerCurrencyBucket(
        currencyId,
        entry.currencyCode?.trim() ?? '',
        entry.currencyName?.trim() ?? entry.currencyCode?.trim() ?? '',
      );
      const amount = new Prisma.Decimal(entry.amount);

      if (this.isDirectBuyerCollectionPayment(entry)) {
        bucket.paymentsReceived = bucket.paymentsReceived.plus(amount);
        continue;
      }

      // Ledger-only credit: reduces outstanding / increases collection without cash or Saraf.
      if (entry.entryType === 'buyer_credit') {
        bucket.paymentsReceived = bucket.paymentsReceived.plus(amount);
        continue;
      }

      // Ledger-only debit: increases what the buyer owes without cash or Saraf.
      if (entry.entryType === 'buyer_debit') {
        bucket.saleTotal = bucket.saleTotal.plus(amount);
        continue;
      }

      if (entry.entryType === 'buyer_payment_on_behalf') {
        bucket.paidOnBehalf = bucket.paidOnBehalf.plus(amount);
        continue;
      }

      if (
        entry.entryType === 'buyer_payment_received_on_behalf' ||
        (entry.entryType === 'buyer_payment' && entry.counterpartyCustomerId)
      ) {
        bucket.receivedOnBehalf = bucket.receivedOnBehalf.plus(amount);
      }
    }

    const buyerByCurrency = [...buckets.values()]
      .filter(
        (bucket) =>
          bucket.saleTotal.greaterThan(0) ||
          bucket.paymentsReceived.greaterThan(0) ||
          bucket.paidOnBehalf.greaterThan(0) ||
          bucket.receivedOnBehalf.greaterThan(0),
      )
      .map((bucket) => {
        const directCollected = bucket.paidAtSale.plus(bucket.paymentsReceived);
        const totalCollected = directCollected;
        const outstandingAmount = Prisma.Decimal.max(
          bucket.saleTotal
            .minus(directCollected)
            .minus(bucket.paidOnBehalf)
            .plus(bucket.receivedOnBehalf),
          0,
        );
        const amountBuyerOverpaid = Prisma.Decimal.max(
          directCollected.plus(bucket.paidOnBehalf).minus(bucket.saleTotal),
          0,
        );

        return {
          currencyId: bucket.currencyId,
          currencyCode: bucket.currencyCode,
          currencyName: bucket.currencyName,
          totalSaleAmount: bucket.saleTotal.toFixed(2),
          totalPaidAmount: totalCollected.toFixed(2),
          outstandingAmount: outstandingAmount.toFixed(2),
          amountBuyerOverpaid: amountBuyerOverpaid.toFixed(2),
        };
      })
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      );

    const buyerTransfersByCurrency = [...buckets.values()]
      .filter(
        (bucket) =>
          bucket.paidOnBehalf.greaterThan(0) ||
          bucket.receivedOnBehalf.greaterThan(0),
      )
      .map((bucket) => ({
        currencyId: bucket.currencyId,
        currencyCode: bucket.currencyCode,
        currencyName: bucket.currencyName,
        paidOnBehalfTotal: bucket.paidOnBehalf.toFixed(2),
        receivedOnBehalfTotal: bucket.receivedOnBehalf.toFixed(2),
      }))
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      );

    const singleCurrency =
      buyerByCurrency.length === 1 ? buyerByCurrency[0] : null;

    return {
      riceSaleCount: String(riceSaleEntries.length),
      storeSaleCount: String(storeSaleEntries.length),
      totalRicePurchasedKg: totalRiceKg.toFixed(2),
      totalStoreWeightSoldKg: totalStoreKg.toFixed(2),
      buyerByCurrency,
      buyerTransfersByCurrency,
      totalSaleAmount: singleCurrency?.totalSaleAmount ?? null,
      totalPaidAmount: singleCurrency?.totalPaidAmount ?? null,
      outstandingAmount: singleCurrency?.outstandingAmount ?? null,
      buyerOverpaidAmount: singleCurrency?.amountBuyerOverpaid ?? null,
    };
  }

  private isDirectSellerCollectionPayment(entry: SerializedLedgerEntry) {
    return (
      entry.entryType === 'company_payment' &&
      !entry.counterpartyCustomerId &&
      (entry.paymentChannel === 'cash' || entry.paymentChannel === 'saraf')
    );
  }

  private buildSellerSummary(entries: SerializedLedgerEntry[]) {
    type CurrencyBucket = {
      currencyId: string;
      currencyCode: string;
      currencyName: string;
      purchaseTotal: Prisma.Decimal;
      paidTotal: Prisma.Decimal;
      paidOnBehalf: Prisma.Decimal;
      receivedOnBehalf: Prisma.Decimal;
    };

    const buckets = new Map<string, CurrencyBucket>();

    const ensureBucket = (
      currencyId: string,
      currencyCode: string,
      currencyName: string,
    ) => {
      const key = currencyId || 'unknown';
      if (!buckets.has(key)) {
        buckets.set(key, {
          currencyId,
          currencyCode: currencyCode || '—',
          currencyName: currencyName || currencyCode || '—',
          purchaseTotal: new Prisma.Decimal(0),
          paidTotal: new Prisma.Decimal(0),
          paidOnBehalf: new Prisma.Decimal(0),
          receivedOnBehalf: new Prisma.Decimal(0),
        });
      }

      return buckets.get(key)!;
    };

    for (const entry of entries) {
      const currencyId = entry.currencyId?.trim() ?? '';
      if (!currencyId || !entry.amount) {
        continue;
      }

      const currencyCode = entry.currencyCode?.trim() || '—';
      const currencyName =
        entry.currencyName?.trim() || entry.currencyCode?.trim() || '—';
      const bucket = ensureBucket(currencyId, currencyCode, currencyName);
      const amount = new Prisma.Decimal(entry.amount);

      if (entry.entryType === 'company_receivable') {
        bucket.purchaseTotal = bucket.purchaseTotal.plus(amount);
        continue;
      }

      if (this.isDirectSellerCollectionPayment(entry)) {
        bucket.paidTotal = bucket.paidTotal.plus(amount);
        continue;
      }

      // Ledger-only credit: treats amount as already paid without cash or Saraf.
      if (entry.entryType === 'seller_credit') {
        bucket.paidTotal = bucket.paidTotal.plus(amount);
        continue;
      }

      // Ledger-only debit: increases what we owe the seller without cash or Saraf.
      if (entry.entryType === 'seller_debit') {
        bucket.purchaseTotal = bucket.purchaseTotal.plus(amount);
        continue;
      }

      if (entry.entryType === 'company_payment_on_behalf') {
        bucket.paidOnBehalf = bucket.paidOnBehalf.plus(amount);
        continue;
      }

      if (entry.entryType === 'company_payment_received_on_behalf') {
        bucket.receivedOnBehalf = bucket.receivedOnBehalf.plus(amount);
      }
    }

    const byCurrency = [...buckets.values()]
      .filter(
        (bucket) =>
          bucket.purchaseTotal.greaterThan(0) ||
          bucket.paidTotal.greaterThan(0) ||
          bucket.paidOnBehalf.greaterThan(0) ||
          bucket.receivedOnBehalf.greaterThan(0),
      )
      .map((bucket) => {
        const directPaid = bucket.paidTotal;
        const amountWeOweSeller = Prisma.Decimal.max(
          bucket.purchaseTotal
            .minus(directPaid)
            .minus(bucket.paidOnBehalf)
            .plus(bucket.receivedOnBehalf),
          0,
        );
        const amountSellerOwesUs = Prisma.Decimal.max(
          directPaid.plus(bucket.paidOnBehalf).minus(bucket.purchaseTotal),
          0,
        );

        return {
          currencyId: bucket.currencyId,
          currencyCode: bucket.currencyCode,
          currencyName: bucket.currencyName,
          totalPurchaseAmount: bucket.purchaseTotal.toFixed(2),
          totalPaidAmount: directPaid.toFixed(2),
          amountWeOweSeller: amountWeOweSeller.toFixed(2),
          amountSellerOwesUs: amountSellerOwesUs.toFixed(2),
        };
      })
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      );

    const sellerTransfersByCurrency = [...buckets.values()]
      .filter(
        (bucket) =>
          bucket.paidOnBehalf.greaterThan(0) ||
          bucket.receivedOnBehalf.greaterThan(0),
      )
      .map((bucket) => ({
        currencyId: bucket.currencyId,
        currencyCode: bucket.currencyCode,
        currencyName: bucket.currencyName,
        paidOnBehalfTotal: bucket.paidOnBehalf.toFixed(2),
        receivedOnBehalfTotal: bucket.receivedOnBehalf.toFixed(2),
      }))
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      );

    const singleCurrency = byCurrency.length === 1 ? byCurrency[0] : null;

    return {
      byCurrency,
      sellerTransfersByCurrency,
      totalReceivableAmount: singleCurrency?.totalPurchaseAmount ?? null,
      totalPaidAmount: singleCurrency?.totalPaidAmount ?? null,
      outstandingAmount: singleCurrency?.amountWeOweSeller ?? null,
      sellerOwesUsAmount: singleCurrency?.amountSellerOwesUs ?? null,
    };
  }

  private mergeSellerEntriesWithWarehouseActivity(
    persistedEntries: SerializedLedgerEntry[],
    enteringPaddies: Array<{
      companyOwnedPaddyWarehouse?: {
        id: bigint;
        billNo: string;
        variety: string;
        quantity: Prisma.Decimal | string | number;
        unit: string;
        paidAmount: Prisma.Decimal | string | number;
        remainingAmount: Prisma.Decimal | string | number;
        paymentType: string;
        paymentChannel: 'cash' | 'saraf';
        sarafId: bigint | null;
        sarafLedgerCurrencyId: string | null;
        receivedDate: Date;
        notes: string | null;
        createdAt: Date;
        updatedAt: Date;
        saraf?: { id: bigint; name: string } | null;
        sarafLedgerCurrency?: {
          id: string;
          code: string;
          name?: string;
        } | null;
      } | null;
    }>,
    riceWarehouses: Array<{
      id: bigint;
      billNo: string;
      variety: string;
      quantity: Prisma.Decimal;
      unit: string;
      totalAmount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      remainingAmount: Prisma.Decimal;
      paymentType: string;
      paymentChannel: 'cash' | 'saraf';
      sarafId: bigint | null;
      sarafLedgerCurrencyId: string | null;
      receivedDate: Date;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
      saraf?: { id: bigint; name: string } | null;
      sarafLedgerCurrency?: { id: string; code: string; name?: string } | null;
    }>,
  ) {
    const derivedWarehousePayments = enteringPaddies
      .map((enteringPaddy) => enteringPaddy.companyOwnedPaddyWarehouse)
      .filter((warehouse): warehouse is NonNullable<typeof warehouse> =>
        Boolean(warehouse),
      )
      .filter((warehouse) =>
        new Prisma.Decimal(warehouse.paidAmount ?? 0).greaterThan(0),
      )
      .map((warehouse) => ({
        id: `company-warehouse-payment-${String(warehouse.id)}`,
        entryType: 'company_payment' as const,
        sourceCompanyPaddyWarehouseId: String(warehouse.id),
        sourceFarmerPaddyWarehouseId: null,
        amount: new Prisma.Decimal(warehouse.paidAmount).toFixed(2),
        paymentType: warehouse.paymentType,
        paidAmount: new Prisma.Decimal(warehouse.paidAmount).toFixed(2),
        remainingAmount: new Prisma.Decimal(warehouse.remainingAmount).toFixed(
          2,
        ),
        paymentChannel: warehouse.paymentChannel,
        sarafId: warehouse.sarafId ? String(warehouse.sarafId) : null,
        sarafName: warehouse.saraf?.name ?? null,
        currencyId: warehouse.sarafLedgerCurrencyId,
        currencyCode: warehouse.sarafLedgerCurrency?.code ?? null,
        currencyName: warehouse.sarafLedgerCurrency?.name ?? null,
        paddyQuantity: new Prisma.Decimal(warehouse.quantity).toFixed(2),
        paddyVariety: warehouse.variety,
        riceQuantity: null,
        riceVariety: null,
        unit: warehouse.unit,
        occurredAt: warehouse.receivedDate.toISOString(),
        scheduledFor: null,
        notes: warehouse.notes,
        billNo: warehouse.billNo,
        createdAt: warehouse.createdAt.toISOString(),
        updatedAt: warehouse.updatedAt.toISOString(),
      }));

    const derivedRiceWarehousePayments = riceWarehouses
      .filter((warehouse) =>
        new Prisma.Decimal(warehouse.paidAmount).greaterThan(0),
      )
      .map((warehouse) => ({
        id: `rice-warehouse-payment-${String(warehouse.id)}`,
        entryType: 'company_payment' as const,
        sourceCompanyPaddyWarehouseId: null,
        sourceFarmerPaddyWarehouseId: null,
        sourceRiceWarehouseId: String(warehouse.id),
        amount: new Prisma.Decimal(warehouse.paidAmount).toFixed(2),
        paymentType: warehouse.paymentType,
        paidAmount: new Prisma.Decimal(warehouse.paidAmount).toFixed(2),
        remainingAmount: new Prisma.Decimal(warehouse.remainingAmount).toFixed(
          2,
        ),
        paymentChannel: warehouse.paymentChannel,
        sarafId: warehouse.sarafId ? String(warehouse.sarafId) : null,
        sarafName: warehouse.saraf?.name ?? null,
        currencyId: warehouse.sarafLedgerCurrencyId,
        currencyCode: warehouse.sarafLedgerCurrency?.code ?? null,
        currencyName: warehouse.sarafLedgerCurrency?.name ?? null,
        paddyQuantity: null,
        paddyVariety: null,
        riceQuantity: new Prisma.Decimal(warehouse.quantity).toFixed(2),
        riceVariety: warehouse.variety,
        unit: warehouse.unit,
        occurredAt: warehouse.receivedDate.toISOString(),
        scheduledFor: null,
        notes: warehouse.notes,
        billNo: warehouse.billNo,
        createdAt: warehouse.createdAt.toISOString(),
        updatedAt: warehouse.updatedAt.toISOString(),
      }));

    return [
      ...persistedEntries,
      ...derivedWarehousePayments,
      ...derivedRiceWarehousePayments,
    ].sort((left, right) => {
      const occurredAtDiff =
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime();

      if (occurredAtDiff !== 0) {
        return occurredAtDiff;
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }

  private serializeProcessProductionStoreSaleLedgerEntries(
    sale: any,
  ): SerializedLedgerEntry[] {
    const productAmount = new Prisma.Decimal(sale.saleAmount ?? 0);
    const loadingAmount = new Prisma.Decimal(sale.loadingAmount ?? 0);
    const riceBagsAmount = new Prisma.Decimal(sale.riceBagsAmount ?? 0);
    const invoiceTotal = productAmount.plus(loadingAmount).plus(riceBagsAmount);
    const totalPaid = new Prisma.Decimal(sale.paidAmount ?? 0);
    const storeLabel = String(sale.storeType ?? '').replace(/_/g, ' ');

    let pool = totalPaid;
    const takePaid = (charge: Prisma.Decimal) => {
      if (pool.lessThanOrEqualTo(0) || charge.lessThanOrEqualTo(0)) {
        return new Prisma.Decimal(0);
      }

      const paid = Prisma.Decimal.min(pool, charge);
      pool = pool.minus(paid);
      return paid;
    };

    const productPaid = takePaid(productAmount);
    const loadingPaid = takePaid(loadingAmount);
    const bagsPaid = takePaid(riceBagsAmount);

    const buildEntry = (params: {
      suffix: string;
      label: string;
      amount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      paymentChannel: 'cash' | 'saraf' | null;
      saraf: { id: bigint; name: string } | null | undefined;
      currencyId: string | null | undefined;
      currency: { code: string; name: string } | null | undefined;
      includeProductDetails: boolean;
    }): SerializedLedgerEntry | null => {
      if (params.amount.lessThanOrEqualTo(0)) {
        return null;
      }

      const noteParts = [
        storeLabel ? `Store: ${storeLabel}` : null,
        params.label,
        params.paymentChannel === 'saraf' && params.saraf?.name
          ? `Pay to Saraf: ${params.saraf.name}`
          : params.paymentChannel === 'cash'
            ? 'Pay in Cash'
            : null,
        sale.notes?.trim(),
      ].filter(Boolean);

      return {
        id: `store-variety-sale-${String(sale.id)}-${params.suffix}`,
        entryType: 'process_production_store_sale',
        sourceCompanyPaddyWarehouseId: null,
        sourceFarmerPaddyWarehouseId: null,
        amount: params.amount.toFixed(2),
        paidAmount: params.paidAmount.toFixed(2),
        remainingAmount: params.amount.minus(params.paidAmount).toFixed(2),
        paymentType: sale.paymentType,
        paymentChannel: params.paymentChannel,
        sarafId: params.saraf?.id != null ? String(params.saraf.id) : null,
        sarafName: params.saraf?.name ?? null,
        currencyId: params.currencyId ?? null,
        currencyCode: params.currency?.code ?? null,
        currencyName: params.currency?.name ?? null,
        paddyQuantity: null,
        paddyVariety: null,
        riceQuantity: params.includeProductDetails
          ? new Prisma.Decimal(sale.soldWeight).toFixed(2)
          : null,
        riceVariety: params.includeProductDetails ? sale.variety : null,
        unit: params.includeProductDetails ? sale.unit : null,
        occurredAt: sale.saleDate.toISOString(),
        scheduledFor: null,
        riceStockFulfilledAt: null,
        notes: noteParts.length ? noteParts.join(' — ') : null,
        billNo: sale.billNo,
        createdAt: sale.createdAt.toISOString(),
        updatedAt: sale.updatedAt.toISOString(),
      };
    };

    const entries = [
      buildEntry({
        suffix: 'sale',
        label: 'Store sale',
        amount: productAmount,
        paidAmount: productPaid,
        paymentChannel: sale.paymentChannel ?? null,
        saraf: sale.saraf,
        currencyId: sale.sarafLedgerCurrencyId,
        currency: sale.sarafLedgerCurrency,
        includeProductDetails: true,
      }),
      buildEntry({
        suffix: 'loading',
        label: 'Loading charge',
        amount: loadingAmount,
        paidAmount: loadingPaid,
        paymentChannel: sale.loadingPaymentChannel ?? null,
        saraf: sale.loadingSaraf,
        currencyId: sale.loadingCurrencyId,
        currency: sale.loadingCurrency,
        includeProductDetails: false,
      }),
      buildEntry({
        suffix: 'bags',
        label: 'Rice bags charge',
        amount: riceBagsAmount,
        paidAmount: bagsPaid,
        paymentChannel: sale.bagsPaymentChannel ?? null,
        saraf: sale.bagsSaraf,
        currencyId: sale.bagsCurrencyId,
        currency: sale.bagsCurrency,
        includeProductDetails: false,
      }),
    ].filter((entry): entry is SerializedLedgerEntry => entry !== null);

    if (entries.length === 0 && invoiceTotal.greaterThan(0)) {
      return [
        buildEntry({
          suffix: 'sale',
          label: 'Store sale',
          amount: invoiceTotal,
          paidAmount: totalPaid,
          paymentChannel: sale.paymentChannel ?? null,
          saraf: sale.saraf,
          currencyId: sale.sarafLedgerCurrencyId,
          currency: sale.sarafLedgerCurrency,
          includeProductDetails: true,
        })!,
      ];
    }

    return entries;
  }

  private serializeBuyerRiceSaleLedgerEntries(
    sale: any,
  ): SerializedLedgerEntry[] {
    const riceAmount = new Prisma.Decimal(sale.totalAmount ?? 0);
    const loadingAmount = new Prisma.Decimal(sale.loadingAmount ?? 0);
    const riceBagsAmount = new Prisma.Decimal(sale.riceBagsAmount ?? 0);
    const invoiceTotal = riceAmount.plus(loadingAmount).plus(riceBagsAmount);
    const totalPaid = new Prisma.Decimal(sale.paidAmount ?? 0);

    let pool = totalPaid;
    const takePaid = (charge: Prisma.Decimal) => {
      if (pool.lessThanOrEqualTo(0) || charge.lessThanOrEqualTo(0)) {
        return new Prisma.Decimal(0);
      }

      const paid = Prisma.Decimal.min(pool, charge);
      pool = pool.minus(paid);
      return paid;
    };

    const ricePaid = takePaid(riceAmount);
    const loadingPaid = takePaid(loadingAmount);
    const bagsPaid = takePaid(riceBagsAmount);

    const buildEntry = (params: {
      suffix: string;
      label: string;
      amount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      paymentChannel: 'cash' | 'saraf' | null;
      saraf: { id: bigint; name: string } | null | undefined;
      currencyId: string | null | undefined;
      currency: { code: string; name: string } | null | undefined;
      includeRiceDetails: boolean;
    }): SerializedLedgerEntry | null => {
      if (params.amount.lessThanOrEqualTo(0)) {
        return null;
      }

      const noteParts = [
        params.label,
        params.paymentChannel === 'saraf' && params.saraf?.name
          ? `Pay to Saraf: ${params.saraf.name}`
          : params.paymentChannel === 'cash'
            ? 'Pay in Cash'
            : null,
        sale.notes?.trim(),
      ].filter(Boolean);

      return {
        id: `rice-sale-${String(sale.id)}-${params.suffix}`,
        entryType: 'buyer_rice_sale',
        sourceCompanyPaddyWarehouseId: null,
        sourceFarmerPaddyWarehouseId: null,
        amount: params.amount.toFixed(2),
        paidAmount: params.paidAmount.toFixed(2),
        remainingAmount: params.amount.minus(params.paidAmount).toFixed(2),
        paymentType: sale.paymentType,
        paymentChannel: params.paymentChannel,
        sarafId: params.saraf?.id != null ? String(params.saraf.id) : null,
        sarafName: params.saraf?.name ?? null,
        currencyId: params.currencyId ?? null,
        currencyCode: params.currency?.code ?? null,
        currencyName: params.currency?.name ?? null,
        paddyQuantity: null,
        paddyVariety: null,
        riceQuantity: params.includeRiceDetails
          ? new Prisma.Decimal(sale.quantity).toFixed(2)
          : null,
        riceVariety: params.includeRiceDetails ? sale.riceVariety : null,
        unit: params.includeRiceDetails ? sale.unit : null,
        occurredAt: sale.saleDate.toISOString(),
        scheduledFor: null,
        riceStockFulfilledAt: null,
        notes: noteParts.length ? noteParts.join(' — ') : null,
        billNo: sale.billNo,
        createdAt: sale.createdAt.toISOString(),
        updatedAt: sale.updatedAt.toISOString(),
      };
    };

    const entries = [
      buildEntry({
        suffix: 'rice',
        label: 'Rice sale',
        amount: riceAmount,
        paidAmount: ricePaid,
        paymentChannel: sale.paymentChannel ?? null,
        saraf: sale.saraf,
        currencyId: sale.sarafLedgerCurrencyId,
        currency: sale.sarafLedgerCurrency,
        includeRiceDetails: true,
      }),
      buildEntry({
        suffix: 'loading',
        label: 'Loading charge',
        amount: loadingAmount,
        paidAmount: loadingPaid,
        paymentChannel: sale.loadingPaymentChannel ?? null,
        saraf: sale.loadingSaraf,
        currencyId: sale.loadingCurrencyId,
        currency: sale.loadingCurrency,
        includeRiceDetails: false,
      }),
      buildEntry({
        suffix: 'bags',
        label: 'Rice bags charge',
        amount: riceBagsAmount,
        paidAmount: bagsPaid,
        paymentChannel: sale.bagsPaymentChannel ?? null,
        saraf: sale.bagsSaraf,
        currencyId: sale.bagsCurrencyId,
        currency: sale.bagsCurrency,
        includeRiceDetails: false,
      }),
    ].filter((entry): entry is SerializedLedgerEntry => entry !== null);

    if (entries.length === 0 && invoiceTotal.greaterThan(0)) {
      return [
        buildEntry({
          suffix: 'rice',
          label: 'Rice sale',
          amount: invoiceTotal,
          paidAmount: totalPaid,
          paymentChannel: sale.paymentChannel ?? null,
          saraf: sale.saraf,
          currencyId: sale.sarafLedgerCurrencyId,
          currency: sale.sarafLedgerCurrency,
          includeRiceDetails: true,
        })!,
      ];
    }

    return entries;
  }

  private sortLedgerEntriesDesc(entries: SerializedLedgerEntry[]) {
    return [...entries].sort((left, right) => {
      const occurredAtDiff =
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime();

      if (occurredAtDiff !== 0) {
        return occurredAtDiff;
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }

  private listRiceWarehouseEntries(customerId: bigint) {
    return this.riceWarehouseModel.findMany({
      where: {
        customerId,
      },
      orderBy: [{ receivedDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        billNo: true,
        variety: true,
        quantity: true,
        unit: true,
        totalAmount: true,
        paidAmount: true,
        remainingAmount: true,
        paymentType: true,
        paymentChannel: true,
        sarafId: true,
        sarafLedgerCurrencyId: true,
        receivedDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        saraf: {
          select: {
            id: true,
            name: true,
          },
        },
        sarafLedgerCurrency: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  private async loadWarehouseDetailsForLedgerSources(entries: any[]): Promise<{
    company: Map<
      string,
      { billNo: string; variety: string; quantity: string; unit: string }
    >;
    farmer: Map<
      string,
      {
        billNo: string;
        paddyVariety: string;
        paddyQuantity: string;
        unit: string;
      }
    >;
    rice: Map<
      string,
      {
        billNo: string;
        variety: string;
        quantity: string;
        unit: string;
      }
    >;
  }> {
    const companyIdSet = new Set<bigint>();
    const farmerIdSet = new Set<bigint>();
    const riceIdSet = new Set<bigint>();

    for (const ledgerEntry of entries) {
      if (ledgerEntry.sourceCompanyPaddyWarehouseId != null) {
        companyIdSet.add(
          BigInt(String(ledgerEntry.sourceCompanyPaddyWarehouseId)),
        );
      }

      if (ledgerEntry.sourceFarmerPaddyWarehouseId != null) {
        farmerIdSet.add(
          BigInt(String(ledgerEntry.sourceFarmerPaddyWarehouseId)),
        );
      }

      if (ledgerEntry.sourceRiceWarehouseId != null) {
        riceIdSet.add(BigInt(String(ledgerEntry.sourceRiceWarehouseId)));
      }
    }

    const companyOwnedPaddyWarehouseModel = (this.prisma as any)
      .companyOwnedPaddyWarehouse;
    const farmerOwnedPaddyWarehouseModel = (this.prisma as any)
      .farmerOwnedPaddyWarehouse;

    const [companyRows, farmerRows, riceRows] = await Promise.all([
      companyIdSet.size
        ? companyOwnedPaddyWarehouseModel.findMany({
            where: { id: { in: [...companyIdSet] } },
            select: {
              id: true,
              billNo: true,
              variety: true,
              quantity: true,
              unit: true,
            },
          })
        : [],
      farmerIdSet.size
        ? farmerOwnedPaddyWarehouseModel.findMany({
            where: { id: { in: [...farmerIdSet] } },
            select: {
              id: true,
              billNo: true,
              paddyVariety: true,
              paddyQuantity: true,
              unit: true,
            },
          })
        : [],
      riceIdSet.size
        ? this.riceWarehouseModel.findMany({
            where: { id: { in: [...riceIdSet] } },
            select: {
              id: true,
              billNo: true,
              variety: true,
              quantity: true,
              unit: true,
            },
          })
        : [],
    ]);

    return {
      company: new Map(
        companyRows.map(
          (row: {
            id: bigint;
            billNo: string;
            variety: string;
            quantity: Prisma.Decimal;
            unit: string;
          }) => [
            String(row.id),
            {
              billNo: row.billNo,
              variety: row.variety,
              quantity: new Prisma.Decimal(row.quantity).toFixed(2),
              unit: row.unit,
            },
          ],
        ),
      ),
      farmer: new Map(
        farmerRows.map(
          (row: {
            id: bigint;
            billNo: string;
            paddyVariety: string;
            paddyQuantity: Prisma.Decimal;
            unit: string;
          }) => [
            String(row.id),
            {
              billNo: row.billNo,
              paddyVariety: row.paddyVariety,
              paddyQuantity: new Prisma.Decimal(row.paddyQuantity).toFixed(2),
              unit: row.unit,
            },
          ],
        ),
      ),
      rice: new Map(
        riceRows.map(
          (row: {
            id: bigint;
            billNo: string;
            variety: string;
            quantity: Prisma.Decimal;
            unit: string;
          }) => [
            String(row.id),
            {
              billNo: row.billNo,
              variety: row.variety,
              quantity: new Prisma.Decimal(row.quantity).toFixed(2),
              unit: row.unit,
            },
          ],
        ),
      ),
    };
  }

  private enrichLedgerEntryFromWarehouse(
    serialized: SerializedLedgerEntry,
    maps: {
      company: Map<
        string,
        { billNo: string; variety: string; quantity: string; unit: string }
      >;
      farmer: Map<
        string,
        {
          billNo: string;
          paddyVariety: string;
          paddyQuantity: string;
          unit: string;
        }
      >;
      rice: Map<
        string,
        { billNo: string; variety: string; quantity: string; unit: string }
      >;
    },
  ): SerializedLedgerEntry {
    if (serialized.sourceCompanyPaddyWarehouseId) {
      const warehouse = maps.company.get(
        serialized.sourceCompanyPaddyWarehouseId,
      );

      if (warehouse) {
        return {
          ...serialized,
          billNo: warehouse.billNo,
          paddyVariety: warehouse.variety,
          paddyQuantity: serialized.paddyQuantity ?? warehouse.quantity,
          unit: serialized.unit ?? warehouse.unit,
        };
      }
    }

    if (serialized.sourceFarmerPaddyWarehouseId) {
      const warehouse = maps.farmer.get(
        serialized.sourceFarmerPaddyWarehouseId,
      );

      if (warehouse) {
        return {
          ...serialized,
          billNo: warehouse.billNo,
          paddyVariety: warehouse.paddyVariety,
          paddyQuantity: serialized.paddyQuantity ?? warehouse.paddyQuantity,
          unit: serialized.unit ?? warehouse.unit,
        };
      }
    }

    if (serialized.sourceRiceWarehouseId) {
      const warehouse = maps.rice.get(serialized.sourceRiceWarehouseId);

      if (warehouse) {
        return {
          ...serialized,
          billNo: warehouse.billNo,
          riceVariety: serialized.riceVariety ?? warehouse.variety,
          riceQuantity: serialized.riceQuantity ?? warehouse.quantity,
          unit: serialized.unit ?? warehouse.unit,
        };
      }
    }

    return {
      ...serialized,
      paddyVariety: serialized.paddyVariety ?? null,
      billNo: serialized.billNo ?? null,
    };
  }

  private async createBuyerPaymentEntryInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      ledgerId: bigint;
      customerId: bigint;
      customerName: string | null;
      customerType: 'buyer';
      season: { id: string; name: string };
      seasonName: string;
      entryType:
        | 'buyer_payment'
        | 'buyer_payment_on_behalf'
        | 'buyer_payment_received_on_behalf';
      paymentType: string;
      totalAmount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      remainingAmount: Prisma.Decimal;
      settlementAmount: Prisma.Decimal;
      paymentChannel: 'cash' | 'saraf' | null;
      paymentDate: Date;
      notes: string | null;
      currencyId: string | null;
      sarafIdBig: bigint | null;
      counterpartyCustomerId: bigint | null;
      counterpartyName?: string | null;
    },
  ) {
    const isOnBehalf = params.entryType === 'buyer_payment_on_behalf';
    const isReceivedOnBehalf =
      params.entryType === 'buyer_payment_received_on_behalf';
    const isBalanceTransfer = isOnBehalf || isReceivedOnBehalf;
    const paymentLabel = isOnBehalf
      ? params.counterpartyName
        ? `Balance transfer to ${params.counterpartyName}`
        : 'Balance transfer to another buyer'
      : isReceivedOnBehalf
        ? params.counterpartyName
          ? `Balance transfer from ${params.counterpartyName}`
          : 'Balance transfer from another buyer'
        : params.customerName
          ? `Buyer payment — ${params.customerName}`
          : 'Buyer payment';

    const entry = await tx.customerLedgerEntry.create({
      data: {
        ledgerId: params.ledgerId,
        customerId: params.customerId,
        entryType: params.entryType,
        amount: params.settlementAmount,
        paymentType: params.paymentType,
        paidAmount: params.paidAmount,
        remainingAmount: params.remainingAmount,
        paymentChannel: isBalanceTransfer
          ? null
          : params.settlementAmount.greaterThan(0)
            ? params.paymentChannel
            : null,
        sarafId:
          !isBalanceTransfer &&
          params.paymentChannel === 'saraf' &&
          params.settlementAmount.greaterThan(0)
            ? params.sarafIdBig
            : null,
        currencyId: params.currencyId,
        counterpartyCustomerId: params.counterpartyCustomerId,
        occurredAt: params.paymentDate,
        notes: params.notes,
      },
      select: ledgerEntrySelect,
    });

    if (
      !isBalanceTransfer &&
      params.paymentChannel === 'cash' &&
      params.settlementAmount.greaterThan(0) &&
      params.currencyId
    ) {
      await this.cashService.createLinkedCustomerPaymentInEntry(tx, {
        currencyId: params.currencyId,
        amount: params.settlementAmount,
        occurredAt: params.paymentDate,
        notes: params.notes
          ? `${paymentLabel} — ${params.notes}`
          : paymentLabel,
        seasonId: params.season.id,
        seasonName: params.seasonName,
        customerLedgerEntryId: entry.id,
      });
    } else if (
      !isBalanceTransfer &&
      params.paymentChannel === 'saraf' &&
      params.settlementAmount.greaterThan(0) &&
      params.sarafIdBig &&
      params.currencyId
    ) {
      await this.sarafLedgerService.createLinkedBuyerPaymentSarafEntry(tx, {
        sarafId: params.sarafIdBig,
        currencyId: params.currencyId,
        amount: params.settlementAmount,
        occurredAt: params.paymentDate,
        notes: params.notes
          ? `${paymentLabel} — ${params.notes}`
          : paymentLabel,
        customerLedgerEntryId: entry.id,
      });
    }

    return entry;
  }

  private async createPayOnBehalfPaymentPairInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      payer: { id: bigint; type: string; seasonId: string };
      payerLedgerId: bigint;
      payerName: string | null;
      season: { id: string; name: string };
      seasonName: string;
      beneficiaryCustomerId: bigint;
      onBehalfPaymentType: string;
      onBehalfAmount: string;
      onBehalfPaidAmount?: string | null;
      settlementAmount: Prisma.Decimal;
      paymentDate: Date;
      notes: string | null;
      currencyId: string | null;
    },
  ) {
    const beneficiary = await tx.customer.findUnique({
      where: { id: params.beneficiaryCustomerId },
      select: {
        id: true,
        name: true,
        type: true,
        seasonId: true,
        ledger: { select: { id: true } },
      },
    });

    if (!beneficiary) {
      throw new NotFoundException(
        `Customer with id "${params.beneficiaryCustomerId.toString()}" not found`,
      );
    }

    if (beneficiary.type !== 'buyer') {
      throw new BadRequestException(
        'Payments on behalf can only be recorded for buyers',
      );
    }

    if (beneficiary.seasonId !== params.payer.seasonId) {
      throw new BadRequestException(
        'The selected buyer must belong to the same season',
      );
    }

    if (!beneficiary.ledger) {
      throw new NotFoundException(
        `Ledger for customer "${params.beneficiaryCustomerId.toString()}" not found`,
      );
    }

    const onBehalfTotal = this.parsePositiveDecimal(
      params.onBehalfAmount,
      'onBehalfAmount',
    );
    const { paidAmount, remainingAmount } = this.resolvePaidAmountByPaymentType(
      {
        paymentType: params.onBehalfPaymentType,
        paidAmount: params.onBehalfPaidAmount,
        totalAmount: onBehalfTotal,
      },
    );

    const beneficiaryNotes = params.payerName
      ? `Balance transfer received from ${params.payerName}${params.notes ? ` — ${params.notes}` : ''}`
      : params.notes;

    const beneficiaryEntry = await this.createBuyerPaymentEntryInTransaction(
      tx,
      {
        ledgerId: beneficiary.ledger.id,
        customerId: beneficiary.id,
        customerName: beneficiary.name,
        customerType: 'buyer',
        season: params.season,
        seasonName: params.seasonName,
        entryType: 'buyer_payment_received_on_behalf',
        paymentType: params.onBehalfPaymentType,
        totalAmount: onBehalfTotal,
        paidAmount,
        remainingAmount,
        settlementAmount: params.settlementAmount,
        paymentChannel: null,
        paymentDate: params.paymentDate,
        notes: beneficiaryNotes,
        currencyId: params.currencyId,
        sarafIdBig: null,
        counterpartyCustomerId: params.payer.id,
        counterpartyName: params.payerName,
      },
    );

    const payerNotes = beneficiary.name
      ? `Balance transfer to ${beneficiary.name}${params.notes ? ` — ${params.notes}` : ''}`
      : params.notes;

    const payerEntry = await this.createBuyerPaymentEntryInTransaction(tx, {
      ledgerId: params.payerLedgerId,
      customerId: params.payer.id,
      customerName: params.payerName,
      customerType: 'buyer',
      season: params.season,
      seasonName: params.seasonName,
      entryType: 'buyer_payment_on_behalf',
      paymentType: params.onBehalfPaymentType,
      totalAmount: onBehalfTotal,
      paidAmount,
      remainingAmount,
      settlementAmount: params.settlementAmount,
      paymentChannel: null,
      paymentDate: params.paymentDate,
      notes: payerNotes,
      currencyId: params.currencyId,
      sarafIdBig: null,
      counterpartyCustomerId: beneficiary.id,
      counterpartyName: beneficiary.name,
    });

    await tx.customerLedgerEntry.update({
      where: { id: beneficiaryEntry.id },
      data: { linkedLedgerEntryId: payerEntry.id },
    });
    await tx.customerLedgerEntry.update({
      where: { id: payerEntry.id },
      data: { linkedLedgerEntryId: beneficiaryEntry.id },
    });

    const [beneficiaryWithLink, payerWithLink] = await Promise.all([
      tx.customerLedgerEntry.findUnique({
        where: { id: beneficiaryEntry.id },
        select: ledgerEntrySelect,
      }),
      tx.customerLedgerEntry.findUnique({
        where: { id: payerEntry.id },
        select: ledgerEntrySelect,
      }),
    ]);

    return {
      payerEntry: payerWithLink ?? payerEntry,
      beneficiaryEntry: beneficiaryWithLink ?? beneficiaryEntry,
    };
  }

  private async createCompanyPaymentEntryInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      ledgerId: bigint;
      customerId: bigint;
      customerName: string | null;
      season: { id: string; name: string };
      seasonName: string;
      entryType: CompanyPaymentLedgerEntryType;
      paymentType: string;
      totalAmount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      remainingAmount: Prisma.Decimal;
      settlementAmount: Prisma.Decimal;
      paymentChannel: 'cash' | 'saraf' | null;
      paymentDate: Date;
      notes: string | null;
      currencyId: string | null;
      sarafIdBig: bigint | null;
      counterpartyCustomerId: bigint | null;
      counterpartyName?: string | null;
    },
  ) {
    const isOnBehalf = params.entryType === 'company_payment_on_behalf';
    const isReceivedOnBehalf =
      params.entryType === 'company_payment_received_on_behalf';
    const isBalanceTransfer = isOnBehalf || isReceivedOnBehalf;
    const paymentLabel = isOnBehalf
      ? params.counterpartyName
        ? `Balance transfer to ${params.counterpartyName}`
        : 'Balance transfer to another paddy seller'
      : isReceivedOnBehalf
        ? params.counterpartyName
          ? `Balance transfer from ${params.counterpartyName}`
          : 'Balance transfer from another paddy seller'
        : params.customerName
          ? `Seller payment — ${params.customerName}`
          : 'Seller payment';

    const entry = await tx.customerLedgerEntry.create({
      data: {
        ledgerId: params.ledgerId,
        customerId: params.customerId,
        entryType: params.entryType as CustomerLedgerEntryType,
        amount: params.settlementAmount,
        paymentType: params.paymentType,
        paidAmount: params.paidAmount,
        remainingAmount: params.remainingAmount,
        paymentChannel: isBalanceTransfer
          ? null
          : params.settlementAmount.greaterThan(0)
            ? params.paymentChannel
            : null,
        sarafId:
          !isBalanceTransfer &&
          params.paymentChannel === 'saraf' &&
          params.settlementAmount.greaterThan(0)
            ? params.sarafIdBig
            : null,
        currencyId: params.currencyId,
        counterpartyCustomerId: params.counterpartyCustomerId,
        occurredAt: params.paymentDate,
        notes: params.notes,
      },
      select: ledgerEntrySelect,
    });

    if (
      !isBalanceTransfer &&
      params.paymentChannel === 'cash' &&
      params.settlementAmount.greaterThan(0) &&
      params.currencyId
    ) {
      await this.cashService.createLinkedCustomerPaymentOutEntry(tx, {
        currencyId: params.currencyId,
        amount: params.settlementAmount,
        occurredAt: params.paymentDate,
        notes: params.notes
          ? `${paymentLabel} — ${params.notes}`
          : paymentLabel,
        seasonId: params.season.id,
        seasonName: params.seasonName,
        customerLedgerEntryId: entry.id,
      });
    } else if (
      !isBalanceTransfer &&
      params.paymentChannel === 'saraf' &&
      params.settlementAmount.greaterThan(0) &&
      params.sarafIdBig &&
      params.currencyId
    ) {
      await this.sarafLedgerService.createLinkedCustomerPaymentEntry(tx, {
        sarafId: params.sarafIdBig,
        currencyId: params.currencyId,
        amount: params.settlementAmount.negated(),
        occurredAt: params.paymentDate,
        notes: params.notes
          ? `${paymentLabel} — ${params.notes}`
          : paymentLabel,
        customerLedgerEntryId: entry.id,
      });
    }

    return entry;
  }

  private async createSellerPayOnBehalfPaymentPairInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      payer: { id: bigint; type: string; seasonId: string };
      payerLedgerId: bigint;
      payerName: string | null;
      season: { id: string; name: string };
      seasonName: string;
      beneficiaryCustomerId: bigint;
      onBehalfPaymentType: string;
      onBehalfAmount: string;
      onBehalfPaidAmount?: string | null;
      settlementAmount: Prisma.Decimal;
      paymentDate: Date;
      notes: string | null;
      currencyId: string | null;
    },
  ) {
    const beneficiary = await tx.customer.findUnique({
      where: { id: params.beneficiaryCustomerId },
      select: {
        id: true,
        name: true,
        type: true,
        seasonId: true,
        ledger: { select: { id: true } },
      },
    });

    if (!beneficiary) {
      throw new NotFoundException(
        `Customer with id "${params.beneficiaryCustomerId.toString()}" not found`,
      );
    }

    if (beneficiary.type !== 'paddy_seller') {
      throw new BadRequestException(
        'Balance transfers can only be recorded between paddy sellers',
      );
    }

    if (beneficiary.seasonId !== params.payer.seasonId) {
      throw new BadRequestException(
        'The selected paddy seller must belong to the same season',
      );
    }

    if (!beneficiary.ledger) {
      throw new NotFoundException(
        `Ledger for customer "${params.beneficiaryCustomerId.toString()}" not found`,
      );
    }

    const onBehalfTotal = this.parsePositiveDecimal(
      params.onBehalfAmount,
      'onBehalfAmount',
    );
    const { paidAmount, remainingAmount } = this.resolvePaidAmountByPaymentType(
      {
        paymentType: params.onBehalfPaymentType,
        paidAmount: params.onBehalfPaidAmount,
        totalAmount: onBehalfTotal,
      },
    );

    const beneficiaryNotes = params.payerName
      ? `Balance transfer received from ${params.payerName}${params.notes ? ` — ${params.notes}` : ''}`
      : params.notes;

    const beneficiaryEntry = await this.createCompanyPaymentEntryInTransaction(
      tx,
      {
        ledgerId: beneficiary.ledger.id,
        customerId: beneficiary.id,
        customerName: beneficiary.name,
        season: params.season,
        seasonName: params.seasonName,
        entryType: 'company_payment_received_on_behalf',
        paymentType: params.onBehalfPaymentType,
        totalAmount: onBehalfTotal,
        paidAmount,
        remainingAmount,
        settlementAmount: params.settlementAmount,
        paymentChannel: null,
        paymentDate: params.paymentDate,
        notes: beneficiaryNotes,
        currencyId: params.currencyId,
        sarafIdBig: null,
        counterpartyCustomerId: params.payer.id,
        counterpartyName: params.payerName,
      },
    );

    const payerNotes = beneficiary.name
      ? `Balance transfer to ${beneficiary.name}${params.notes ? ` — ${params.notes}` : ''}`
      : params.notes;

    const payerEntry = await this.createCompanyPaymentEntryInTransaction(tx, {
      ledgerId: params.payerLedgerId,
      customerId: params.payer.id,
      customerName: params.payerName,
      season: params.season,
      seasonName: params.seasonName,
      entryType: 'company_payment_on_behalf',
      paymentType: params.onBehalfPaymentType,
      totalAmount: onBehalfTotal,
      paidAmount,
      remainingAmount,
      settlementAmount: params.settlementAmount,
      paymentChannel: null,
      paymentDate: params.paymentDate,
      notes: payerNotes,
      currencyId: params.currencyId,
      sarafIdBig: null,
      counterpartyCustomerId: beneficiary.id,
      counterpartyName: beneficiary.name,
    });

    await tx.customerLedgerEntry.update({
      where: { id: beneficiaryEntry.id },
      data: { linkedLedgerEntryId: payerEntry.id },
    });
    await tx.customerLedgerEntry.update({
      where: { id: payerEntry.id },
      data: { linkedLedgerEntryId: beneficiaryEntry.id },
    });

    const [beneficiaryWithLink, payerWithLink] = await Promise.all([
      tx.customerLedgerEntry.findUnique({
        where: { id: beneficiaryEntry.id },
        select: ledgerEntrySelect,
      }),
      tx.customerLedgerEntry.findUnique({
        where: { id: payerEntry.id },
        select: ledgerEntrySelect,
      }),
    ]);

    return {
      payerEntry: payerWithLink ?? payerEntry,
      beneficiaryEntry: beneficiaryWithLink ?? beneficiaryEntry,
    };
  }

  private serializeLedgerEntry(entry: any): SerializedLedgerEntry {
    return {
      id: String(entry.id),
      entryType: entry.entryType,
      sourceCompanyPaddyWarehouseId:
        entry.sourceCompanyPaddyWarehouseId != null
          ? String(entry.sourceCompanyPaddyWarehouseId)
          : null,
      sourceFarmerPaddyWarehouseId:
        entry.sourceFarmerPaddyWarehouseId != null
          ? String(entry.sourceFarmerPaddyWarehouseId)
          : null,
      sourceRiceWarehouseId:
        entry.sourceRiceWarehouseId != null
          ? String(entry.sourceRiceWarehouseId)
          : null,
      amount:
        entry.amount != null
          ? new Prisma.Decimal(entry.amount).toFixed(2)
          : null,
      paymentType: entry.paymentType ?? null,
      paidAmount:
        entry.paidAmount != null
          ? new Prisma.Decimal(entry.paidAmount).toFixed(2)
          : null,
      remainingAmount:
        entry.remainingAmount != null
          ? new Prisma.Decimal(entry.remainingAmount).toFixed(2)
          : null,
      paymentChannel: entry.paymentChannel ?? null,
      sarafId: entry.sarafId != null ? String(entry.sarafId) : null,
      sarafName: entry.saraf?.name ?? null,
      currencyId: entry.currencyId ?? null,
      currencyCode: entry.currency?.code ?? null,
      currencyName: entry.currency?.name ?? null,
      paddyQuantity:
        entry.paddyQuantity != null
          ? new Prisma.Decimal(entry.paddyQuantity).toFixed(2)
          : null,
      riceQuantity:
        entry.riceQuantity != null
          ? new Prisma.Decimal(entry.riceQuantity).toFixed(2)
          : null,
      riceVariety: entry.riceVariety ?? null,
      unit: entry.unit ?? null,
      occurredAt: new Date(entry.occurredAt).toISOString(),
      scheduledFor:
        entry.scheduledFor != null
          ? new Date(entry.scheduledFor).toISOString()
          : null,
      riceStockFulfilledAt:
        entry.riceStockFulfilledAt != null
          ? new Date(entry.riceStockFulfilledAt).toISOString()
          : null,
      notes: entry.notes ?? null,
      paddyVariety: null,
      billNo: entry.billNo ?? null,
      counterpartyCustomerId:
        entry.counterpartyCustomerId != null
          ? String(entry.counterpartyCustomerId)
          : null,
      counterpartyCustomerName: entry.counterpartyCustomer?.name ?? null,
      counterpartyCustomerType: entry.counterpartyCustomer?.type ?? null,
      linkedLedgerEntryId:
        entry.linkedLedgerEntryId != null
          ? String(entry.linkedLedgerEntryId)
          : null,
      isEditable: this.computeIsEditable(entry),
      createdAt: new Date(entry.createdAt).toISOString(),
      updatedAt: new Date(entry.updatedAt).toISOString(),
    };
  }

  private normalizePaymentChannel(paymentChannel?: string | null) {
    const normalized = paymentChannel?.trim().toLowerCase();

    if (!normalized || normalized === 'cash') {
      return 'cash' as const;
    }

    if (normalized === 'saraf') {
      return 'saraf' as const;
    }

    throw new BadRequestException(
      'paymentChannel must be either cash or saraf',
    );
  }

  private normalizePaymentType(paymentType?: string) {
    const normalizedPaymentType = paymentType?.trim().toLowerCase();

    if (!normalizedPaymentType) {
      throw new BadRequestException('paymentType is required');
    }

    if (
      !['paid', 'partial_paid', 'remaining'].includes(normalizedPaymentType)
    ) {
      throw new BadRequestException(
        'paymentType must be one of paid, partial_paid, or remaining',
      );
    }

    return normalizedPaymentType;
  }

  private resolvePaidAmountByPaymentType({
    paymentType,
    paidAmount,
    totalAmount,
  }: {
    paymentType: string;
    paidAmount?: string | number | Prisma.Decimal | null;
    totalAmount: Prisma.Decimal;
  }) {
    if (paymentType === 'paid') {
      return {
        paidAmount: totalAmount,
        remainingAmount: new Prisma.Decimal(0),
      };
    }

    if (paymentType === 'remaining') {
      return {
        paidAmount: new Prisma.Decimal(0),
        remainingAmount: totalAmount,
      };
    }

    const normalizedPaidAmount = this.parsePositiveDecimal(
      paidAmount ?? 0,
      'paidAmount',
    );

    if (normalizedPaidAmount.greaterThanOrEqualTo(totalAmount)) {
      throw new BadRequestException(
        'paidAmount must be greater than 0 and less than amount for partial_paid',
      );
    }

    return {
      paidAmount: normalizedPaidAmount,
      remainingAmount: totalAmount.minus(normalizedPaidAmount),
    };
  }

  private resolveSettlementAmount({
    paymentType,
    totalAmount,
    paidAmount,
  }: {
    paymentType: string;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
  }) {
    if (paymentType === 'remaining') {
      return new Prisma.Decimal(0);
    }

    if (paymentType === 'paid') {
      return totalAmount;
    }

    return paidAmount;
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

  private parsePositiveDecimal(
    value: string | number | Prisma.Decimal,
    fieldName: string,
  ) {
    try {
      const decimal = new Prisma.Decimal(value as Prisma.Decimal.Value);

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

  private requireText(value: string, fieldName: string) {
    const normalized = value?.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private async requireCustomer(customerId: string) {
    const customer = await this.customerModel.findUnique({
      where: { id: this.parseId(customerId) },
      select: {
        id: true,
        name: true,
        type: true,
        seasonId: true,
        seasonName: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${customerId}" not found`);
    }

    return customer;
  }

  private computeIsEditable(entry: {
    entryType: string;
    sourceCompanyPaddyWarehouseId?: bigint | null;
    sourceFarmerPaddyWarehouseId?: bigint | null;
    sourceRiceWarehouseId?: bigint | null;
    sourceExpenseId?: bigint | null;
    riceStockFulfilledAt?: Date | null;
  }) {
    const manualTypes = new Set([
      'company_payment',
      'company_payment_on_behalf',
      'company_payment_received_on_behalf',
      'vendor_payment',
      'debtor_disbursement',
      'debtor_repayment',
      'buyer_payment',
      'buyer_payment_on_behalf',
      'buyer_payment_received_on_behalf',
      'buyer_debit',
      'buyer_credit',
      'seller_debit',
      'seller_credit',
      'farmer_rice_return',
    ]);

    if (!manualTypes.has(entry.entryType)) {
      return false;
    }

    if (
      entry.sourceCompanyPaddyWarehouseId ||
      entry.sourceFarmerPaddyWarehouseId ||
      entry.sourceRiceWarehouseId ||
      entry.sourceExpenseId
    ) {
      return false;
    }

    if (
      entry.entryType === 'farmer_rice_return' &&
      entry.riceStockFulfilledAt
    ) {
      return false;
    }

    return true;
  }

  private async requireEditableLedgerEntry(
    customerId: string,
    entryId: string,
  ) {
    let ledgerEntryId: bigint;

    try {
      ledgerEntryId = this.parseId(entryId);
    } catch {
      throw new BadRequestException(
        'This ledger entry is managed by another module and cannot be edited or deleted here',
      );
    }

    const entry = await this.customerLedgerEntryModel.findFirst({
      where: {
        id: ledgerEntryId,
        customerId: this.parseId(customerId),
      },
      select: ledgerEntrySelect,
    });

    if (!entry) {
      throw new NotFoundException(
        `Ledger entry with id "${entryId}" not found`,
      );
    }

    if (!this.computeIsEditable(entry)) {
      throw new BadRequestException(
        'This ledger entry is managed by another module and cannot be edited or deleted here',
      );
    }

    return entry;
  }

  private async deleteLinkedCashAndSaraf(
    tx: Prisma.TransactionClient,
    entryId: bigint,
  ) {
    await tx.sarafLedgerEntry.deleteMany({
      where: { customerLedgerEntryId: entryId },
    });
    await tx.cashTransaction.deleteMany({
      where: { customerLedgerEntryId: entryId },
    });
  }

  private async resolveSarafForPayment(
    sarafIdTrimmed: string,
    seasonId: string,
    settlementAmount: Prisma.Decimal,
  ) {
    if (!settlementAmount.greaterThan(0)) {
      return null;
    }

    const sarafIdBig = this.parseId(sarafIdTrimmed);
    const saraf = await this.prisma.saraf.findUnique({
      where: { id: sarafIdBig },
      select: {
        id: true,
        seasonId: true,
        ledger: { select: { id: true } },
      },
    });

    if (!saraf) {
      throw new NotFoundException(
        `Saraf with id "${sarafIdTrimmed}" not found`,
      );
    }

    if (saraf.seasonId !== seasonId) {
      throw new BadRequestException(
        'Selected Saraf must belong to the customer season',
      );
    }

    if (!saraf.ledger) {
      throw new BadRequestException(
        'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
      );
    }

    return sarafIdBig;
  }

  private async updateCompanyPaymentEntry(
    customer: {
      id: bigint;
      name: string;
      type: string;
      seasonId: string;
      seasonName: string;
    },
    season: { id: string; name: string },
    entry: any,
    dto: UpdateLedgerEntryDto,
  ) {
    const paymentType = this.normalizePaymentType(
      dto.paymentType ?? entry.paymentType ?? '',
    );
    const paymentChannel = this.normalizePaymentChannel(
      dto.paymentChannel ?? entry.paymentChannel,
    );
    const totalAmount = this.parsePositiveDecimal(
      dto.amount ?? String(entry.amount ?? ''),
      'amount',
    );
    const paymentDate = this.parseDate(
      dto.paymentDate ?? new Date(entry.occurredAt).toISOString(),
      'paymentDate',
    );
    const notes =
      dto.notes !== undefined ? dto.notes?.trim() || null : entry.notes;

    const { paidAmount, remainingAmount } = this.resolvePaidAmountByPaymentType(
      {
        paymentType,
        paidAmount: dto.paidAmount ?? entry.paidAmount,
        totalAmount,
      },
    );

    const settlementAmount = this.resolveSettlementAmount({
      paymentType,
      totalAmount,
      paidAmount,
    });

    const sarafIdTrimmed =
      dto.sarafId?.trim() ??
      (entry.sarafId != null ? String(entry.sarafId) : '');
    const currencyIdTrimmed = dto.currencyId?.trim() ?? entry.currencyId ?? '';

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId must be omitted when paying in cash',
      );
    }

    if (
      paymentChannel === 'saraf' &&
      settlementAmount.greaterThan(0) &&
      !sarafIdTrimmed
    ) {
      throw new BadRequestException(
        'sarafId is required when paying from Saraf',
      );
    }

    if (settlementAmount.greaterThan(0) && !currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required when recording a cash or Saraf settlement',
      );
    }

    const currencyId =
      settlementAmount.greaterThan(0) && currencyIdTrimmed
        ? await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed)
        : null;

    const sarafIdBig =
      paymentChannel === 'saraf' && settlementAmount.greaterThan(0)
        ? await this.resolveSarafForPayment(
            sarafIdTrimmed,
            customer.seasonId,
            settlementAmount,
          )
        : null;

    if (paymentChannel === 'saraf' && paymentType === 'remaining') {
      throw new BadRequestException(
        'Pay from Saraf is not available when nothing has been paid yet',
      );
    }

    const paymentLabel =
      customer.type === 'vendor'
        ? customer.name
          ? `Vendor payment — ${customer.name}`
          : 'Vendor payment'
        : customer.type === 'debtor'
          ? customer.name
            ? `Debtor disbursement — ${customer.name}`
            : 'Debtor disbursement'
          : customer.name
            ? `Seller payment — ${customer.name}`
            : 'Seller payment';

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.deleteLinkedCashAndSaraf(tx, entry.id);

      const row = await tx.customerLedgerEntry.update({
        where: { id: entry.id },
        data: {
          amount: settlementAmount,
          paymentType,
          paidAmount,
          remainingAmount,
          paymentChannel: settlementAmount.greaterThan(0)
            ? paymentChannel
            : null,
          sarafId:
            paymentChannel === 'saraf' && settlementAmount.greaterThan(0)
              ? sarafIdBig
              : null,
          currencyId,
          occurredAt: paymentDate,
          notes,
        },
        select: ledgerEntrySelect,
      });

      if (
        paymentChannel === 'cash' &&
        settlementAmount.greaterThan(0) &&
        currencyId
      ) {
        await this.cashService.createLinkedCustomerPaymentOutEntry(tx, {
          currencyId,
          amount: settlementAmount,
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          seasonId: season.id,
          seasonName: customer.seasonName ?? season.name,
          customerLedgerEntryId: entry.id,
        });
      } else if (
        paymentChannel === 'saraf' &&
        settlementAmount.greaterThan(0) &&
        sarafIdBig &&
        currencyId
      ) {
        await this.sarafLedgerService.createLinkedCustomerPaymentEntry(tx, {
          sarafId: sarafIdBig,
          currencyId,
          amount: settlementAmount.negated(),
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          customerLedgerEntryId: entry.id,
        });
      }

      return row;
    });

    return this.serializeLedgerEntry(updated);
  }

  private async updateBuyerPaymentEntry(
    customer: {
      id: bigint;
      name: string;
      seasonId: string;
      seasonName: string;
    },
    season: { id: string; name: string },
    entry: any,
    dto: UpdateLedgerEntryDto,
  ) {
    const paymentType = this.normalizePaymentType(
      dto.paymentType ?? entry.paymentType ?? '',
    );
    const paymentChannel = this.normalizePaymentChannel(
      dto.paymentChannel ?? entry.paymentChannel,
    );
    const totalAmount = this.parsePositiveDecimal(
      dto.amount ?? String(entry.amount ?? ''),
      'amount',
    );
    const paymentDate = this.parseDate(
      dto.paymentDate ?? new Date(entry.occurredAt).toISOString(),
      'paymentDate',
    );
    const notes =
      dto.notes !== undefined ? dto.notes?.trim() || null : entry.notes;

    const { paidAmount, remainingAmount } = this.resolvePaidAmountByPaymentType(
      {
        paymentType,
        paidAmount: dto.paidAmount ?? entry.paidAmount,
        totalAmount,
      },
    );

    const settlementAmount = this.resolveSettlementAmount({
      paymentType,
      totalAmount,
      paidAmount,
    });

    const sarafIdTrimmed =
      dto.sarafId?.trim() ??
      (entry.sarafId != null ? String(entry.sarafId) : '');
    const currencyIdTrimmed = dto.currencyId?.trim() ?? entry.currencyId ?? '';

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId must be omitted when recording a buyer payment in cash',
      );
    }

    if (
      paymentChannel === 'saraf' &&
      settlementAmount.greaterThan(0) &&
      !sarafIdTrimmed
    ) {
      throw new BadRequestException(
        'sarafId is required when recording a buyer payment through Saraf',
      );
    }

    if (settlementAmount.greaterThan(0) && !currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required when recording a cash or Saraf collection',
      );
    }

    if (paymentChannel === 'saraf' && paymentType === 'remaining') {
      throw new BadRequestException(
        'Pay to Saraf is not available when nothing has been paid yet',
      );
    }

    const currencyId =
      settlementAmount.greaterThan(0) && currencyIdTrimmed
        ? await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed)
        : null;

    const sarafIdBig =
      paymentChannel === 'saraf' && settlementAmount.greaterThan(0)
        ? await this.resolveSarafForPayment(
            sarafIdTrimmed,
            customer.seasonId,
            settlementAmount,
          )
        : null;

    const paymentLabel = customer.name
      ? `Buyer payment — ${customer.name}`
      : 'Buyer payment';

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.deleteLinkedCashAndSaraf(tx, entry.id);

      const row = await tx.customerLedgerEntry.update({
        where: { id: entry.id },
        data: {
          amount: settlementAmount,
          paymentType,
          paidAmount,
          remainingAmount,
          paymentChannel: settlementAmount.greaterThan(0)
            ? paymentChannel
            : null,
          sarafId:
            paymentChannel === 'saraf' && settlementAmount.greaterThan(0)
              ? sarafIdBig
              : null,
          currencyId,
          occurredAt: paymentDate,
          notes,
        },
        select: ledgerEntrySelect,
      });

      if (
        paymentChannel === 'cash' &&
        settlementAmount.greaterThan(0) &&
        currencyId
      ) {
        await this.cashService.createLinkedCustomerPaymentInEntry(tx, {
          currencyId,
          amount: settlementAmount,
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          seasonId: season.id,
          seasonName: customer.seasonName ?? season.name,
          customerLedgerEntryId: entry.id,
        });
      } else if (
        paymentChannel === 'saraf' &&
        settlementAmount.greaterThan(0) &&
        sarafIdBig &&
        currencyId
      ) {
        await this.sarafLedgerService.createLinkedBuyerPaymentSarafEntry(tx, {
          sarafId: sarafIdBig,
          currencyId,
          amount: settlementAmount,
          occurredAt: paymentDate,
          notes: notes ? `${paymentLabel} — ${notes}` : paymentLabel,
          customerLedgerEntryId: entry.id,
        });
      }

      return row;
    });

    return this.serializeLedgerEntry(updated);
  }

  private async updateBuyerBalanceAdjustmentEntry(
    entry: any,
    dto: UpdateLedgerEntryDto,
  ) {
    const totalAmount = this.parsePositiveDecimal(
      dto.amount ?? String(entry.amount ?? ''),
      'amount',
    );
    const paymentDate = this.parseDate(
      dto.paymentDate ?? new Date(entry.occurredAt).toISOString(),
      'paymentDate',
    );
    const notes =
      dto.notes !== undefined ? dto.notes?.trim() || null : entry.notes;
    const currencyIdTrimmed = dto.currencyId?.trim() ?? entry.currencyId ?? '';

    if (!currencyIdTrimmed) {
      throw new BadRequestException('currencyId is required');
    }

    const currencyId =
      await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);

    const updated = await this.customerLedgerEntryModel.update({
      where: { id: entry.id },
      data: {
        amount: totalAmount,
        currencyId,
        occurredAt: paymentDate,
        notes,
        paymentChannel: null,
        sarafId: null,
      },
      select: ledgerEntrySelect,
    });

    return this.serializeLedgerEntry(updated);
  }

  private async updateOnBehalfPaymentEntry(
    customer: {
      id: bigint;
      name: string;
      seasonId: string;
    },
    season: { id: string; name: string },
    entry: any,
    dto: UpdateLedgerEntryDto,
  ) {
    if (!entry.linkedLedgerEntryId) {
      throw new BadRequestException(
        'This on-behalf payment is missing its linked ledger entry',
      );
    }

    const linkedEntry = await this.customerLedgerEntryModel.findUnique({
      where: { id: entry.linkedLedgerEntryId },
      select: {
        id: true,
        customerId: true,
        entryType: true,
        counterpartyCustomerId: true,
        customer: { select: { name: true } },
      },
    });

    if (!linkedEntry) {
      throw new NotFoundException('Linked on-behalf ledger entry not found');
    }

    const paymentType = this.normalizePaymentType(
      dto.paymentType ?? entry.paymentType ?? '',
    );
    const totalAmount = this.parsePositiveDecimal(
      dto.amount ?? String(entry.amount ?? ''),
      'amount',
    );
    const paymentDate = this.parseDate(
      dto.paymentDate ?? new Date(entry.occurredAt).toISOString(),
      'paymentDate',
    );
    const notes =
      dto.notes !== undefined ? dto.notes?.trim() || null : entry.notes;
    const currencyIdTrimmed = dto.currencyId?.trim() ?? entry.currencyId ?? '';

    if (!currencyIdTrimmed) {
      throw new BadRequestException('currencyId is required');
    }

    const currencyId =
      await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);

    const { paidAmount, remainingAmount } = this.resolvePaidAmountByPaymentType(
      {
        paymentType,
        paidAmount: dto.paidAmount ?? entry.paidAmount,
        totalAmount,
      },
    );

    const settlementAmount = this.resolveSettlementAmount({
      paymentType,
      totalAmount,
      paidAmount,
    });

    const isPayerEntry =
      entry.entryType === 'buyer_payment_on_behalf' ||
      entry.entryType === 'company_payment_on_behalf';
    const payerEntry = isPayerEntry ? entry : linkedEntry;
    const beneficiaryEntry = isPayerEntry ? linkedEntry : entry;

    const payerCustomer = await this.customerModel.findUnique({
      where: { id: payerEntry.customerId },
      select: { name: true },
    });
    const beneficiaryCustomer = await this.customerModel.findUnique({
      where: { id: beneficiaryEntry.customerId },
      select: { name: true },
    });

    const payerName = payerCustomer?.name ?? null;
    const beneficiaryName = beneficiaryCustomer?.name ?? null;

    const beneficiaryNotes = payerName
      ? `Balance transfer received from ${payerName}${notes ? ` — ${notes}` : ''}`
      : notes;
    const payerNotes = beneficiaryName
      ? `Balance transfer to ${beneficiaryName}${notes ? ` — ${notes}` : ''}`
      : notes;

    const sharedData = {
      amount: settlementAmount,
      paymentType,
      paidAmount,
      remainingAmount,
      currencyId,
      occurredAt: paymentDate,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const beneficiaryRow = await tx.customerLedgerEntry.update({
        where: { id: beneficiaryEntry.id },
        data: {
          ...sharedData,
          notes: beneficiaryNotes,
        },
        select: ledgerEntrySelect,
      });

      const payerRow = await tx.customerLedgerEntry.update({
        where: { id: payerEntry.id },
        data: {
          ...sharedData,
          notes: payerNotes,
        },
        select: ledgerEntrySelect,
      });

      return entry.id === payerEntry.id ? payerRow : beneficiaryRow;
    });

    return this.serializeLedgerEntry(updated);
  }

  private async updateFarmerRiceReturnEntry(
    customer: { id: bigint; seasonId: string },
    entry: any,
    dto: UpdateLedgerEntryDto,
  ) {
    const riceQuantity = this.parsePositiveDecimal(
      dto.riceQuantity ?? String(entry.riceQuantity ?? ''),
      'riceQuantity',
    );
    const returnDate = this.parseDate(
      dto.returnDate ?? new Date(entry.occurredAt).toISOString(),
      'returnDate',
    );
    const unit = normalizeWeightUnit(dto.unit ?? entry.unit ?? APP_WEIGHT_UNIT);
    const riceVariety = await this.varietyService.resolveActiveVarietyName(
      'RICE',
      dto.riceVariety ?? entry.riceVariety ?? '',
    );
    const notes =
      dto.notes !== undefined ? dto.notes?.trim() || null : entry.notes;
    const scheduledFor =
      dto.scheduledFor !== undefined
        ? dto.scheduledFor
          ? this.parseDate(dto.scheduledFor, 'scheduledFor')
          : null
        : entry.scheduledFor;

    const obligationEntries = await this.customerLedgerEntryModel.findMany({
      where: {
        customerId: customer.id,
        entryType: { in: ['farmer_obligation', 'farmer_rice_return'] },
        NOT: { id: entry.id },
      },
      select: {
        entryType: true,
        riceVariety: true,
        riceQuantity: true,
        unit: true,
      },
    });
    const remainingByVariety =
      this.computeFarmerRiceRemainingByVariety(obligationEntries);
    const remainingKg = remainingByVariety.get(riceVariety);
    const returnKg = toKilograms(riceQuantity, unit);

    if (!remainingKg || remainingKg.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        `No rice obligation remains for variety "${riceVariety}". Returns must use the same rice variety owed to this farmer.`,
      );
    }

    if (returnKg.greaterThan(remainingKg)) {
      throw new BadRequestException(
        `Return quantity exceeds remaining ${riceVariety} rice obligation (${remainingKg.toFixed(2)} kg remaining)`,
      );
    }

    const updated = await this.customerLedgerEntryModel.update({
      where: { id: entry.id },
      data: {
        riceQuantity,
        riceVariety,
        unit,
        occurredAt: returnDate,
        scheduledFor,
        notes,
      },
      select: ledgerEntrySelect,
    });

    return this.serializeLedgerEntry(updated);
  }
}
