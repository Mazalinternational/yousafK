import type { TFunction } from "i18next";
import z from "zod";

export const CashTransactionDirectionSchema = z.enum(["in", "out"]);

export const CashCurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const CashTransactionSchema = z.object({
  id: z.string(),
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  direction: CashTransactionDirectionSchema,
  amount: z.string(),
  occurredAt: z.string(),
  notes: z.string().nullable().optional(),
  seasonId: z.string().nullable().optional(),
  seasonName: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const createDecimalField = (t: TFunction) =>
  z
    .string()
    .min(1, { message: t("common:cash_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)), {
      message: t("common:cash_validation_valid_number"),
    })
    .refine((value) => Number(value) > 0, {
      message: t("common:cash_validation_positive_amount"),
    });

export const createCashTransactionFormSchema = (t: TFunction) =>
  z.object({
    currencyId: z.string().trim().min(1, { message: t("common:cash_validation_currency_required") }),
    direction: CashTransactionDirectionSchema,
    amount: createDecimalField(t),
    occurredAt: z.string().min(1, { message: t("common:cash_validation_required") }),
    notes: z.string().optional(),
  });

export const CashDashboardSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const CashDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.enum(["amount", "count"]),
});

export const CashCurrencyBalanceSchema = z.object({
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  cashIn: z.string(),
  cashOut: z.string(),
  availableCash: z.string(),
  balance: z.string(),
  transactionCount: z.number(),
});

export const CashDashboardSchema = z.object({
  season: CashDashboardSeasonSchema.nullable(),
  overview: z.array(CashDashboardMetricSchema),
  currencyBalances: z.array(CashCurrencyBalanceSchema),
  recentTransactions: z.array(CashTransactionSchema),
});

export type CashTransaction = z.infer<typeof CashTransactionSchema>;
export type CashTransactionFormValues = z.infer<
  ReturnType<typeof createCashTransactionFormSchema>
>;
export type CashDashboard = z.infer<typeof CashDashboardSchema>;
