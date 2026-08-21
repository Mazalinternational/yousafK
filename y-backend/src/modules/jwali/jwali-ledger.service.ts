import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CurrencyService } from '../currency/currency.service.js';
import { CashService } from '../cash/cash.service.js';
import { SarafLedgerService } from '../sarafi/saraf-ledger.service.js';
import { SeasonService } from '../season/season.service.js';
import { CreateJwaliLedgerEntryDto } from './dto/create-jwali-ledger-entry.dto.js';
import { CreateJwaliPaymentDto } from './dto/create-jwali-payment.dto.js';
import { UpdateJwaliLedgerEntryDto } from './dto/update-jwali-ledger-entry.dto.js';
import { UpdateJwaliPaymentDto } from './dto/update-jwali-payment.dto.js';

@Injectable()
export class JwaliLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
    private readonly currencyService: CurrencyService,
    private readonly sarafLedgerService: SarafLedgerService,
    private readonly cashService: CashService,
  ) {}

  async getJwaliAccount(jwaliId: string) {
    const jwaliRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        j."id"::text AS "id",
        j."name" AS "name",
        j."phone_no" AS "phoneNo",
        j."address" AS "address",
        j."notes" AS "notes",
        j."season_id" AS "seasonId",
        j."season_name" AS "seasonName",
        j."created_at" AS "createdAt",
        j."updated_at" AS "updatedAt",
        s."id" AS "seasonRefId",
        s."name" AS "seasonRefName",
        s."status"::text AS "seasonRefStatus",
        l."id"::text AS "ledgerId",
        l."created_at" AS "ledgerCreatedAt",
        l."updated_at" AS "ledgerUpdatedAt"
      FROM "jwalis" j
      INNER JOIN "seasons" s ON s."id" = j."season_id"
      LEFT JOIN "jwali_ledgers" l ON l."jwali_id" = j."id"
      WHERE j."id" = ${this.parseId(jwaliId)}
      LIMIT 1
    `);

    const jwali = jwaliRows[0];

    if (!jwali) {
      throw new NotFoundException(`Jwali with id "${jwaliId}" not found`);
    }

    if (!jwali.ledgerId) {
      throw new NotFoundException(`Ledger for jwali "${jwaliId}" not found`);
    }

    const entries = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        e."bag_count" AS "bagCount",
        e."rate_per_bag"::text AS "ratePerBag",
        e."amount"::text AS "amount",
        e."currency_id" AS "currencyId",
        e."occurred_at"::text AS "occurredAt",
        e."notes" AS "notes",
        e."created_at" AS "createdAt",
        e."updated_at" AS "updatedAt",
        c."id" AS "currencyRefId",
        c."code" AS "currencyCode",
        c."name" AS "currencyName"
      FROM "jwali_ledger_entries" e
      LEFT JOIN "currencies" c ON c."id" = e."currency_id"
      WHERE e."jwali_id" = ${this.parseId(jwaliId)}
      ORDER BY e."occurred_at" DESC, e."created_at" DESC
    `);

    const payments = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        p."id"::text AS "id",
        p."amount"::text AS "amount",
        p."occurred_at"::text AS "occurredAt",
        p."payment_channel"::text AS "paymentChannel",
        p."saraf_id"::text AS "sarafId",
        p."currency_id" AS "currencyId",
        p."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
        p."notes" AS "notes",
        p."created_at" AS "createdAt",
        p."updated_at" AS "updatedAt",
        s."id"::text AS "sarafRefId",
        s."name" AS "sarafName",
        c."id" AS "currencyRefId",
        c."code" AS "currencyCode",
        c."name" AS "currencyName"
      FROM "jwali_payments" p
      LEFT JOIN "sarafs" s ON s."id" = p."saraf_id"
      LEFT JOIN "currencies" c ON c."id" = COALESCE(p."currency_id", p."saraf_ledger_currency_id")
      WHERE p."jwali_id" = ${this.parseId(jwaliId)}
      ORDER BY p."occurred_at" DESC, p."created_at" DESC
    `);

    const serializedEntries = entries.map((entry) =>
      this.serializeLedgerEntryRow(entry),
    );

    const serializedPayments = payments.map((payment) =>
      this.serializePaymentRow(payment),
    );

    return {
      jwali: {
        id: jwali.id,
        name: jwali.name,
        phoneNo: jwali.phoneNo,
        address: jwali.address,
        notes: jwali.notes,
        seasonId: jwali.seasonId,
        seasonName: jwali.seasonName,
        createdAt: jwali.createdAt,
        updatedAt: jwali.updatedAt,
        season: jwali.seasonRefId
          ? {
              id: jwali.seasonRefId,
              name: jwali.seasonRefName,
              status: jwali.seasonRefStatus,
            }
          : null,
      },
      ledger: {
        id: jwali.ledgerId,
        createdAt: jwali.ledgerCreatedAt,
        updatedAt: jwali.ledgerUpdatedAt,
        summary: this.buildSummary(serializedEntries, serializedPayments),
        entries: serializedEntries,
        payments: serializedPayments,
      },
    };
  }

  async getCashPaymentsSummary(seasonId?: string) {
    let resolvedSeasonId = seasonId?.trim();

    if (!resolvedSeasonId) {
      const activeSeason = await this.seasonService.getActiveSeasonOrThrow();
      resolvedSeasonId = activeSeason.id;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        currencyCode: string;
        currencyName: string;
        totalAmount: Prisma.Decimal | string;
      }>
    >(Prisma.sql`
      SELECT
        c."code"::text AS "currencyCode",
        c."name" AS "currencyName",
        COALESCE(SUM(p."amount"), 0)::decimal AS "totalAmount"
      FROM "jwali_payments" p
      INNER JOIN "jwalis" j ON j."id" = p."jwali_id"
      INNER JOIN "currencies" c ON c."id" = COALESCE(p."currency_id", p."saraf_ledger_currency_id")
      WHERE j."season_id" = ${resolvedSeasonId}
        AND p."payment_channel" = 'cash'::"RiceSalePaymentChannel"
      GROUP BY c."id", c."code", c."name"
      ORDER BY c."code" ASC
    `);

    const byCurrency = rows.map((row) => ({
      currencyCode: row.currencyCode,
      currencyName: row.currencyName,
      cashPaidAmount: new Prisma.Decimal(row.totalAmount ?? 0).toFixed(2),
    }));

    const cashPaidAmount = byCurrency
      .reduce(
        (sum, row) => sum.plus(new Prisma.Decimal(row.cashPaidAmount)),
        new Prisma.Decimal(0),
      )
      .toFixed(2);

    return {
      seasonId: resolvedSeasonId,
      cashPaidAmount,
      byCurrency,
    };
  }

  async addLedgerEntry(jwaliId: string, dto: CreateJwaliLedgerEntryDto) {
    const jwali = await this.requireJwali(jwaliId);
    await this.seasonService.assertSeasonIsEditableById(jwali.seasonId);
    const ledger = await this.requireLedger(jwali.id);

    const bagCount = this.parsePositiveInteger(dto.bagCount, 'bagCount');
    const ratePerBag = this.parsePositiveDecimal(dto.ratePerBag, 'ratePerBag');
    const currencyId = await this.currencyService.requireActiveCurrencyId(
      dto.currencyId,
    );
    const occurredAt = this.requireDate(dto.occurredAt, 'occurredAt');
    const notes = dto.notes?.trim() || null;
    const amount = ratePerBag.mul(bagCount).toDecimalPlaces(2);

    const inserted = await this.prisma.$transaction(async (tx) => {
      const createdRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO "jwali_ledger_entries" (
          "ledger_id",
          "jwali_id",
          "bag_count",
          "rate_per_bag",
          "amount",
          "currency_id",
          "occurred_at",
          "notes",
          "updated_at"
        )
        VALUES (
          ${ledger.id},
          ${jwali.id},
          ${bagCount},
          ${ratePerBag},
          ${amount},
          ${currencyId},
          ${occurredAt},
          ${notes},
          NOW()
        )
        RETURNING
          "id"::text AS "id",
          "bag_count" AS "bagCount",
          "rate_per_bag"::text AS "ratePerBag",
          "amount"::text AS "amount",
          "currency_id" AS "currencyId",
          "occurred_at"::text AS "occurredAt",
          "notes" AS "notes",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "jwali_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${ledger.id}
      `);

      return createdRows;
    });

    const row = inserted[0];
    const currency = await this.prisma.currency.findUnique({
      where: { id: currencyId },
      select: { id: true, code: true, name: true },
    });

    return this.serializeLedgerEntryRow({
      ...row,
      currencyRefId: currency?.id ?? currencyId,
      currencyCode: currency?.code ?? null,
      currencyName: currency?.name ?? null,
    });
  }

  async addPayment(jwaliId: string, dto: CreateJwaliPaymentDto) {
    const jwali = await this.requireJwali(jwaliId);
    await this.seasonService.assertSeasonIsEditableById(jwali.seasonId);
    const ledger = await this.requireLedger(jwali.id);

    const amount = this.parsePositiveDecimal(dto.amount, 'amount');
    const paymentDate = this.requireDate(dto.paymentDate, 'paymentDate');
    const notes = dto.notes?.trim() || null;
    const paymentChannel = this.normalizePaymentChannel(dto.paymentChannel);

    const sarafIdTrimmed = dto.sarafId?.trim() ?? '';
    const currencyIdTrimmed =
      dto.currencyId?.trim() ?? dto.sarafLedgerCurrencyId?.trim() ?? '';

    if (!currencyIdTrimmed) {
      throw new BadRequestException(
        'currencyId is required when recording a Jwali payment',
      );
    }

    const resolvedCurrencyId =
      await this.currencyService.requireActiveCurrencyId(currencyIdTrimmed);

    if (paymentChannel === 'cash' && sarafIdTrimmed) {
      throw new BadRequestException(
        'sarafId must be omitted when paying Jwali in cash',
      );
    }

    let sarafIdBig: bigint | null = null;

    if (paymentChannel === 'saraf') {
      if (!sarafIdTrimmed) {
        throw new BadRequestException(
          'sarafId is required when paying Jwali from Saraf',
        );
      }

      sarafIdBig = this.parseId(sarafIdTrimmed);

      const saraf = await this.prisma.saraf.findUnique({
        where: { id: sarafIdBig },
        select: {
          id: true,
          seasonId: true,
          name: true,
          ledger: { select: { id: true } },
        },
      });

      if (!saraf) {
        throw new NotFoundException(
          `Saraf with id "${sarafIdTrimmed}" not found`,
        );
      }

      if (saraf.seasonId !== jwali.seasonId) {
        throw new BadRequestException(
          'Selected Saraf must belong to the same season as the Jwali',
        );
      }

      if (!saraf.ledger) {
        throw new BadRequestException(
          'This Saraf has no ledger yet; open the Saraf account once or recreate the Saraf',
        );
      }
    }

    const inserted = await this.prisma.$transaction(async (tx) => {
      const createdRows = await tx.$queryRaw<any[]>(Prisma.sql`
        INSERT INTO "jwali_payments" (
          "ledger_id",
          "jwali_id",
          "amount",
          "occurred_at",
          "payment_channel",
          "saraf_id",
          "currency_id",
          "saraf_ledger_currency_id",
          "notes",
          "updated_at"
        )
        VALUES (
          ${ledger.id},
          ${jwali.id},
          ${amount},
          ${paymentDate},
          ${paymentChannel}::"RiceSalePaymentChannel",
          ${paymentChannel === 'saraf' ? sarafIdBig : null},
          ${resolvedCurrencyId},
          ${paymentChannel === 'saraf' ? resolvedCurrencyId : null},
          ${notes},
          NOW()
        )
        RETURNING "id"
      `);

      const paymentId = BigInt(createdRows[0].id);

      if (paymentChannel === 'saraf' && sarafIdBig) {
        await this.sarafLedgerService.createLinkedJwaliPaymentEntry(tx, {
          sarafId: sarafIdBig,
          currencyId: resolvedCurrencyId,
          amount,
          occurredAt: new Date(paymentDate),
          notes: `Paid by Saraf — Jwali ${jwali.name}`,
          jwaliPaymentId: paymentId,
        });
      }

      if (paymentChannel === 'cash') {
        await this.cashService.createLinkedJwaliPaymentOutEntry(tx, {
          currencyId: resolvedCurrencyId,
          amount,
          occurredAt: new Date(paymentDate),
          notes: notes ?? `Jwali payment — ${jwali.name}`,
          seasonId: jwali.seasonId,
          seasonName: jwali.seasonName,
        });
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "jwali_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${ledger.id}
      `);

      const detailRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT
          p."id"::text AS "id",
          p."amount"::text AS "amount",
          p."occurred_at"::text AS "occurredAt",
          p."payment_channel"::text AS "paymentChannel",
          p."saraf_id"::text AS "sarafId",
          p."currency_id" AS "currencyId",
          p."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
          s."name" AS "sarafName",
          c."id" AS "currencyRefId",
          c."code" AS "currencyCode",
          c."name" AS "currencyName",
          p."notes" AS "notes",
          p."created_at" AS "createdAt",
          p."updated_at" AS "updatedAt"
        FROM "jwali_payments" p
        LEFT JOIN "sarafs" s ON s."id" = p."saraf_id"
        LEFT JOIN "currencies" c ON c."id" = COALESCE(p."currency_id", p."saraf_ledger_currency_id")
        WHERE p."id" = ${paymentId}
        LIMIT 1
      `);

      return detailRows;
    });

    return this.serializePaymentRow(inserted[0]);
  }

  async updateLedgerEntry(
    jwaliId: string,
    entryId: string,
    dto: UpdateJwaliLedgerEntryDto,
  ) {
    const jwali = await this.requireJwali(jwaliId);
    await this.seasonService.assertSeasonIsEditableById(jwali.seasonId);
    const ledger = await this.requireLedger(jwali.id);

    const currentRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        e."id"::text AS "id",
        e."bag_count" AS "bagCount",
        e."rate_per_bag"::text AS "ratePerBag",
        e."currency_id" AS "currencyId",
        e."occurred_at"::text AS "occurredAt",
        e."notes" AS "notes"
      FROM "jwali_ledger_entries" e
      WHERE e."id" = ${this.parseId(entryId)}
        AND e."jwali_id" = ${jwali.id}
      LIMIT 1
    `);

    const current = currentRows[0];
    if (!current) {
      throw new NotFoundException(
        `Jwali ledger entry with id "${entryId}" not found`,
      );
    }

    const bagCount =
      dto.bagCount !== undefined
        ? this.parsePositiveInteger(dto.bagCount as any, 'bagCount')
        : Number(current.bagCount);
    const ratePerBag =
      dto.ratePerBag !== undefined
        ? this.parsePositiveDecimal(dto.ratePerBag as any, 'ratePerBag')
        : this.parsePositiveDecimal(current.ratePerBag, 'ratePerBag');
    const currencyId =
      dto.currencyId !== undefined &&
      dto.currencyId !== null &&
      dto.currencyId.trim()
        ? await this.currencyService.requireActiveCurrencyId(dto.currencyId)
        : (current.currencyId as string);
    const occurredAt =
      dto.occurredAt !== undefined
        ? this.requireDate(dto.occurredAt, 'occurredAt')
        : (current.occurredAt as string);
    const notes =
      dto.notes !== undefined
        ? dto.notes?.trim() || null
        : (current.notes ?? null);

    const amount = ratePerBag.mul(bagCount).toDecimalPlaces(2);

    const updatedRows = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        UPDATE "jwali_ledger_entries"
        SET
          "bag_count" = ${bagCount},
          "rate_per_bag" = ${ratePerBag},
          "amount" = ${amount},
          "currency_id" = ${currencyId},
          "occurred_at" = ${occurredAt},
          "notes" = ${notes},
          "updated_at" = NOW()
        WHERE "id" = ${this.parseId(entryId)}
          AND "jwali_id" = ${jwali.id}
        RETURNING
          "id"::text AS "id",
          "bag_count" AS "bagCount",
          "rate_per_bag"::text AS "ratePerBag",
          "amount"::text AS "amount",
          "currency_id" AS "currencyId",
          "occurred_at"::text AS "occurredAt",
          "notes" AS "notes",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "jwali_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${ledger.id}
      `);

      return rows;
    });

    const row = updatedRows[0];
    const currency = await this.prisma.currency.findUnique({
      where: { id: currencyId },
      select: { id: true, code: true, name: true },
    });

    return this.serializeLedgerEntryRow({
      ...row,
      currencyRefId: currency?.id ?? currencyId,
      currencyCode: currency?.code ?? null,
      currencyName: currency?.name ?? null,
    });
  }

  async removeLedgerEntry(jwaliId: string, entryId: string) {
    const jwali = await this.requireJwali(jwaliId);
    await this.seasonService.assertSeasonIsEditableById(jwali.seasonId);
    const ledger = await this.requireLedger(jwali.id);

    const deletedRows = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        DELETE FROM "jwali_ledger_entries"
        WHERE "id" = ${this.parseId(entryId)}
          AND "jwali_id" = ${jwali.id}
        RETURNING
          "id"::text AS "id",
          "bag_count" AS "bagCount",
          "rate_per_bag"::text AS "ratePerBag",
          "amount"::text AS "amount",
          "currency_id" AS "currencyId",
          "occurred_at"::text AS "occurredAt",
          "notes" AS "notes",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
      `);

      if (!rows[0]) {
        throw new NotFoundException(
          `Jwali ledger entry with id "${entryId}" not found`,
        );
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "jwali_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${ledger.id}
      `);

      return rows;
    });

    const row = deletedRows[0];
    const currency = row.currencyId
      ? await this.prisma.currency.findUnique({
          where: { id: row.currencyId as string },
          select: { id: true, code: true, name: true },
        })
      : null;

    return this.serializeLedgerEntryRow({
      ...row,
      currencyRefId: currency?.id ?? row.currencyId ?? null,
      currencyCode: currency?.code ?? null,
      currencyName: currency?.name ?? null,
    });
  }

  async updatePayment(
    jwaliId: string,
    paymentId: string,
    dto: UpdateJwaliPaymentDto,
  ) {
    const jwali = await this.requireJwali(jwaliId);
    await this.seasonService.assertSeasonIsEditableById(jwali.seasonId);
    const ledger = await this.requireLedger(jwali.id);

    const currentRows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        p."id"::text AS "id",
        p."amount"::text AS "amount",
        p."occurred_at"::text AS "occurredAt",
        p."payment_channel"::text AS "paymentChannel",
        p."saraf_id"::text AS "sarafId",
        p."currency_id" AS "currencyId",
        p."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
        p."notes" AS "notes"
      FROM "jwali_payments" p
      WHERE p."id" = ${this.parseId(paymentId)}
        AND p."jwali_id" = ${jwali.id}
      LIMIT 1
    `);

    const current = currentRows[0];
    if (!current) {
      throw new NotFoundException(
        `Jwali payment with id "${paymentId}" not found`,
      );
    }

    const newAmount =
      dto.amount !== undefined
        ? this.parsePositiveDecimal(dto.amount as any, 'amount')
        : this.parsePositiveDecimal(current.amount, 'amount');
    const newDate =
      dto.paymentDate !== undefined
        ? this.requireDate(dto.paymentDate, 'paymentDate')
        : (current.occurredAt as string);
    const newNotes =
      dto.notes !== undefined
        ? dto.notes?.trim() || null
        : (current.notes ?? null);

    const oldAmount = this.parsePositiveDecimal(current.amount, 'amount');
    const oldDate = current.occurredAt as string;
    const paymentChannel = this.normalizePaymentChannel(current.paymentChannel);

    const detailRows = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`
        UPDATE "jwali_payments"
        SET
          "amount" = ${newAmount},
          "occurred_at" = ${newDate},
          "notes" = ${newNotes},
          "updated_at" = NOW()
        WHERE "id" = ${this.parseId(paymentId)}
          AND "jwali_id" = ${jwali.id}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "jwali_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${ledger.id}
      `);

      if (paymentChannel === 'saraf') {
        // Keep Saraf ledger in sync (linked by jwaliPaymentId)
        await (tx as any).sarafLedgerEntry.updateMany({
          where: { jwaliPaymentId: this.parseId(paymentId) },
          data: {
            amount: newAmount.negated(),
            occurredAt: new Date(newDate),
            notes: newNotes ?? `Paid by Saraf — Jwali ${jwali.name}`,
          },
        });
      } else {
        // Cash transactions are not linked by payment id, so we compensate via adjustments.
        const amountChanged = !newAmount.equals(oldAmount);
        const dateChanged = newDate !== oldDate;
        const currencyId =
          (current.currencyId as string | null) ??
          (current.sarafLedgerCurrencyId as string | null);

        if (currencyId && (amountChanged || dateChanged)) {
          if (dateChanged) {
            // Reverse old date, apply new date.
            await (tx as any).cashTransaction.create({
              data: {
                currencyId,
                direction: 'in',
                amount: oldAmount,
                occurredAt: new Date(oldDate),
                notes: `Reversal (edit) — Jwali payment ${paymentId} — ${jwali.name}`,
                seasonId: jwali.seasonId,
                seasonName: jwali.seasonName,
              },
            });
            await (tx as any).cashTransaction.create({
              data: {
                currencyId,
                direction: 'out',
                amount: newAmount,
                occurredAt: new Date(newDate),
                notes: `Adjustment (edit) — Jwali payment ${paymentId} — ${jwali.name}`,
                seasonId: jwali.seasonId,
                seasonName: jwali.seasonName,
              },
            });
          } else {
            const delta = newAmount.minus(oldAmount);
            if (!delta.equals(0)) {
              await (tx as any).cashTransaction.create({
                data: {
                  currencyId,
                  direction: delta.greaterThan(0) ? 'out' : 'in',
                  amount: delta.abs(),
                  occurredAt: new Date(newDate),
                  notes: `Adjustment (edit) — Jwali payment ${paymentId} — ${jwali.name}`,
                  seasonId: jwali.seasonId,
                  seasonName: jwali.seasonName,
                },
              });
            }
          }
        }
      }

      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT
          p."id"::text AS "id",
          p."amount"::text AS "amount",
          p."occurred_at"::text AS "occurredAt",
          p."payment_channel"::text AS "paymentChannel",
          p."saraf_id"::text AS "sarafId",
          p."currency_id" AS "currencyId",
          p."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
          s."name" AS "sarafName",
          c."id" AS "currencyRefId",
          c."code" AS "currencyCode",
          c."name" AS "currencyName",
          p."notes" AS "notes",
          p."created_at" AS "createdAt",
          p."updated_at" AS "updatedAt"
        FROM "jwali_payments" p
        LEFT JOIN "sarafs" s ON s."id" = p."saraf_id"
        LEFT JOIN "currencies" c ON c."id" = COALESCE(p."currency_id", p."saraf_ledger_currency_id")
        WHERE p."id" = ${this.parseId(paymentId)}
          AND p."jwali_id" = ${jwali.id}
        LIMIT 1
      `);

      return rows;
    });

    return this.serializePaymentRow(detailRows[0]);
  }

  async removePayment(jwaliId: string, paymentId: string) {
    const jwali = await this.requireJwali(jwaliId);
    await this.seasonService.assertSeasonIsEditableById(jwali.seasonId);
    const ledger = await this.requireLedger(jwali.id);

    const deleted = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`
        DELETE FROM "jwali_payments"
        WHERE "id" = ${this.parseId(paymentId)}
          AND "jwali_id" = ${jwali.id}
        RETURNING
          "id"::text AS "id",
          "amount"::text AS "amount",
          "occurred_at"::text AS "occurredAt",
          "payment_channel"::text AS "paymentChannel",
          "saraf_id"::text AS "sarafId",
          "currency_id" AS "currencyId",
          "saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
          "notes" AS "notes",
          "created_at" AS "createdAt",
          "updated_at" AS "updatedAt"
      `);

      if (!rows[0]) {
        throw new NotFoundException(
          `Jwali payment with id "${paymentId}" not found`,
        );
      }

      const row = rows[0];
      const amount = this.parsePositiveDecimal(row.amount, 'amount');
      const occurredAt = row.occurredAt as string;
      const paymentChannel = this.normalizePaymentChannel(row.paymentChannel);

      if (paymentChannel === 'saraf') {
        await (tx as any).sarafLedgerEntry.deleteMany({
          where: { jwaliPaymentId: this.parseId(paymentId) },
        });
      } else {
        const currencyId =
          (row.currencyId as string | null) ??
          (row.sarafLedgerCurrencyId as string | null);
        if (currencyId) {
          await (tx as any).cashTransaction.create({
            data: {
              currencyId,
              direction: 'in',
              amount,
              occurredAt: new Date(occurredAt),
              notes: `Reversal (delete) — Jwali payment ${paymentId} — ${jwali.name}`,
              seasonId: jwali.seasonId,
              seasonName: jwali.seasonName,
            },
          });
        }
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "jwali_ledgers"
        SET "updated_at" = NOW()
        WHERE "id" = ${ledger.id}
      `);

      const detailRows = await tx.$queryRaw<any[]>(Prisma.sql`
        SELECT
          p."id"::text AS "id",
          p."amount"::text AS "amount",
          p."occurred_at"::text AS "occurredAt",
          p."payment_channel"::text AS "paymentChannel",
          p."saraf_id"::text AS "sarafId",
          p."currency_id" AS "currencyId",
          p."saraf_ledger_currency_id" AS "sarafLedgerCurrencyId",
          s."name" AS "sarafName",
          c."id" AS "currencyRefId",
          c."code" AS "currencyCode",
          c."name" AS "currencyName",
          p."notes" AS "notes",
          p."created_at" AS "createdAt",
          p."updated_at" AS "updatedAt"
        FROM "jwali_payments" p
        LEFT JOIN "sarafs" s ON s."id" = p."saraf_id"
        LEFT JOIN "currencies" c ON c."id" = COALESCE(p."currency_id", p."saraf_ledger_currency_id")
        WHERE p."id" = ${this.parseId(paymentId)}
        LIMIT 1
      `);

      return { deletedRow: row, detailRow: detailRows[0] ?? null };
    });

    // We return the deleted row (with currency/saraf resolved if possible)
    const currencyId =
      deleted.deletedRow.currencyId ??
      deleted.deletedRow.sarafLedgerCurrencyId ??
      null;
    const currency = currencyId
      ? await this.prisma.currency.findUnique({
          where: { id: currencyId as string },
          select: { id: true, code: true, name: true },
        })
      : null;
    const saraf =
      deleted.deletedRow.sarafId && deleted.deletedRow.sarafName
        ? { id: deleted.deletedRow.sarafId, name: deleted.deletedRow.sarafName }
        : null;

    return this.serializePaymentRow({
      ...deleted.deletedRow,
      sarafName: saraf?.name ?? null,
      currencyRefId: currency?.id ?? currencyId,
      currencyCode: currency?.code ?? null,
      currencyName: currency?.name ?? null,
    });
  }

  private serializeLedgerEntryRow(entry: any) {
    return {
      id: entry.id,
      bagCount: Number(entry.bagCount),
      ratePerBag: new Prisma.Decimal(entry.ratePerBag).toFixed(2),
      amount: new Prisma.Decimal(entry.amount).toFixed(2),
      currencyId: entry.currencyId ?? entry.currencyRefId ?? null,
      currency:
        (entry.currencyId ?? entry.currencyRefId) && entry.currencyCode
          ? {
              id: entry.currencyRefId ?? entry.currencyId,
              code: entry.currencyCode,
              name: entry.currencyName,
            }
          : null,
      occurredAt: entry.occurredAt,
      notes: entry.notes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private serializePaymentRow(payment: any) {
    const currencyId =
      payment.currencyId ??
      payment.sarafLedgerCurrencyId ??
      payment.currencyRefId ??
      null;

    return {
      id: payment.id,
      amount: new Prisma.Decimal(payment.amount).toFixed(2),
      occurredAt: payment.occurredAt,
      paymentChannel: payment.paymentChannel ?? 'cash',
      sarafId: payment.sarafId ?? null,
      currencyId,
      sarafLedgerCurrencyId: payment.sarafLedgerCurrencyId ?? null,
      saraf:
        payment.sarafId && payment.sarafName
          ? { id: payment.sarafId, name: payment.sarafName }
          : null,
      currency:
        currencyId && payment.currencyRefId
          ? {
              id: payment.currencyRefId,
              code: payment.currencyCode,
              name: payment.currencyName,
            }
          : null,
      sarafLedgerCurrency:
        payment.sarafLedgerCurrencyId && payment.currencyRefId
          ? {
              id: payment.currencyRefId,
              code: payment.currencyCode,
              name: payment.currencyName,
            }
          : null,
      notes: payment.notes,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private buildSummary(
    entries: Array<{
      bagCount: number;
      amount: string;
      currencyId?: string | null;
      currency?: { id: string; code: string; name: string } | null;
    }>,
    payments: Array<{
      amount: string;
      occurredAt: string;
      currencyId?: string | null;
      currency?: { id: string; code: string; name: string } | null;
    }>,
  ) {
    const totalBags = entries.reduce(
      (sum, entry) => sum + Number(entry.bagCount),
      0,
    );

    type CurrencyBucket = {
      currencyId: string;
      currencyCode: string;
      currencyName: string;
      chargeTotal: Prisma.Decimal;
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
          chargeTotal: new Prisma.Decimal(0),
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

      const bucket = ensureBucket(
        currencyId,
        entry.currency?.code?.trim() ?? '',
        entry.currency?.name?.trim() ?? entry.currency?.code?.trim() ?? '',
      );
      bucket.chargeTotal = bucket.chargeTotal.plus(
        new Prisma.Decimal(entry.amount),
      );
    }

    for (const payment of payments) {
      const currencyId = payment.currencyId?.trim() ?? '';
      if (!currencyId) {
        continue;
      }

      const bucket = ensureBucket(
        currencyId,
        payment.currency?.code?.trim() ?? '',
        payment.currency?.name?.trim() ?? payment.currency?.code?.trim() ?? '',
      );
      bucket.paidTotal = bucket.paidTotal.plus(
        new Prisma.Decimal(payment.amount),
      );
    }

    const byCurrency = [...buckets.values()]
      .map((bucket) => {
        const amountWeOweJwali = Prisma.Decimal.max(
          bucket.chargeTotal.minus(bucket.paidTotal),
          0,
        );
        const amountJwaliOwesUs = Prisma.Decimal.max(
          bucket.paidTotal.minus(bucket.chargeTotal),
          0,
        );

        return {
          currencyId: bucket.currencyId,
          currencyCode: bucket.currencyCode,
          currencyName: bucket.currencyName,
          totalChargeAmount: bucket.chargeTotal.toFixed(2),
          totalPaidAmount: bucket.paidTotal.toFixed(2),
          amountWeOweJwali: amountWeOweJwali.toFixed(2),
          amountJwaliOwesUs: amountJwaliOwesUs.toFixed(2),
        };
      })
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      );

    const singleCurrency = byCurrency.length === 1 ? byCurrency[0] : null;

    return {
      totalBags,
      byCurrency,
      totalAmount: singleCurrency?.totalChargeAmount ?? null,
      totalPaidAmount: singleCurrency?.totalPaidAmount ?? null,
      remainingAmount: singleCurrency?.amountWeOweJwali ?? null,
      jwaliOwesUsAmount: singleCurrency?.amountJwaliOwesUs ?? null,
      entryCount: entries.length,
      paymentCount: payments.length,
      paymentStatus: this.resolvePaymentStatus(byCurrency),
      lastPaymentDate: payments[0]?.occurredAt ?? null,
    };
  }

  private resolvePaymentStatus(
    byCurrency: Array<{
      totalChargeAmount: string;
      totalPaidAmount: string;
      amountWeOweJwali: string;
    }>,
  ): 'paid' | 'partial_paid' | 'remaining' {
    const activeBuckets = byCurrency.filter(
      (bucket) =>
        new Prisma.Decimal(bucket.totalChargeAmount).greaterThan(0) ||
        new Prisma.Decimal(bucket.totalPaidAmount).greaterThan(0),
    );

    if (activeBuckets.length === 0) {
      return 'paid';
    }

    const hasUnpaid = activeBuckets.some((bucket) =>
      new Prisma.Decimal(bucket.amountWeOweJwali).greaterThan(0),
    );
    const hasPaidSomething = activeBuckets.some((bucket) =>
      new Prisma.Decimal(bucket.totalPaidAmount).greaterThan(0),
    );

    if (!hasUnpaid) {
      return 'paid';
    }

    if (!hasPaidSomething) {
      return 'remaining';
    }

    return 'partial_paid';
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

  private async requireJwali(jwaliId: string) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        "id",
        "name",
        "season_id" AS "seasonId",
        "season_name" AS "seasonName"
      FROM "jwalis"
      WHERE "id" = ${this.parseId(jwaliId)}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException(`Jwali with id "${jwaliId}" not found`);
    }

    return {
      id: BigInt(rows[0].id),
      name: rows[0].name as string,
      seasonId: rows[0].seasonId as string,
      seasonName: rows[0].seasonName as string,
    };
  }

  private async requireLedger(jwaliId: bigint) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT "id", "jwali_id" AS "jwaliId"
      FROM "jwali_ledgers"
      WHERE "jwali_id" = ${jwaliId}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException(
        `Ledger for jwali "${String(jwaliId)}" not found`,
      );
    }

    return {
      id: BigInt(rows[0].id),
      jwaliId: BigInt(rows[0].jwaliId),
    };
  }

  private parseId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid bigint');
    }
  }

  private parsePositiveInteger(value: string | number, fieldName: string) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
      throw new BadRequestException(
        `${fieldName} must be a positive whole number`,
      );
    }

    return numberValue;
  }

  private requireDate(value: string, fieldName: string) {
    const normalized = value?.trim();

    if (!normalized || Number.isNaN(Date.parse(normalized))) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    return normalized.slice(0, 10);
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
