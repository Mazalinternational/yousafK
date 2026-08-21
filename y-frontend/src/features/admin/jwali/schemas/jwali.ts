import type { TFunction } from "i18next";
import z from "zod";

export const JwaliSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const JwaliSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  phoneNo: z.string().min(1),
  address: z.string().min(1),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: JwaliSeasonSchema.nullable().optional(),
});

export const createJwaliFormSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, { message: t("common:jwali_validation_required") }),
    phoneNo: z.string().trim().min(1, { message: t("common:jwali_validation_required") }),
    address: z.string().trim().min(1, { message: t("common:jwali_validation_required") }),
    notes: z.string().optional().or(z.literal("")),
  });

export const JWALI_PAYMENT_ROUTE = ["cash", "saraf"] as const;

export const JwaliLedgerSarafSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const JwaliLedgerCurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const JwaliCurrencyBalanceSchema = z.object({
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  totalChargeAmount: z.string(),
  totalPaidAmount: z.string(),
  amountWeOweJwali: z.string(),
  amountJwaliOwesUs: z.string(),
});

export const JwaliLedgerEntrySchema = z.object({
  id: z.string(),
  bagCount: z.number(),
  ratePerBag: z.string(),
  amount: z.string(),
  currencyId: z.string().nullable().optional(),
  currency: JwaliLedgerCurrencySchema.nullable().optional(),
  occurredAt: z.string(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const JwaliPaymentSchema = z.object({
  id: z.string(),
  amount: z.string(),
  occurredAt: z.string(),
  paymentChannel: z.enum(JWALI_PAYMENT_ROUTE).optional().default("cash"),
  sarafId: z.string().nullable().optional(),
  currencyId: z.string().nullable().optional(),
  sarafLedgerCurrencyId: z.string().nullable().optional(),
  saraf: JwaliLedgerSarafSchema.nullable().optional(),
  currency: JwaliLedgerCurrencySchema.nullable().optional(),
  sarafLedgerCurrency: JwaliLedgerCurrencySchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const JwaliAccountSummarySchema = z.object({
  totalBags: z.number(),
  byCurrency: z.array(JwaliCurrencyBalanceSchema).optional(),
  totalAmount: z.string().nullable().optional(),
  totalPaidAmount: z.string().nullable().optional(),
  remainingAmount: z.string().nullable().optional(),
  jwaliOwesUsAmount: z.string().nullable().optional(),
  entryCount: z.number(),
  paymentCount: z.number(),
  paymentStatus: z.enum(["paid", "partial_paid", "remaining"]),
  lastPaymentDate: z.string().nullable().optional(),
});

export const JwaliAccountSchema = z.object({
  jwali: JwaliSchema,
  ledger: z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    summary: JwaliAccountSummarySchema,
    entries: z.array(JwaliLedgerEntrySchema),
    payments: z.array(JwaliPaymentSchema),
  }),
});

const createDecimalField = (t: TFunction) =>
  z
    .string()
    .min(1, { message: t("common:jwali_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)), {
      message: t("common:jwali_validation_valid_number"),
    })
    .refine((value) => Number(value) > 0, {
      message: t("common:jwali_validation_positive_number"),
    });

export const createJwaliLedgerEntryFormSchema = (t: TFunction) =>
  z.object({
    bagCount: z
      .string()
      .min(1, { message: t("common:jwali_validation_required") })
      .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
        message: t("common:jwali_validation_positive_whole_number"),
      }),
    ratePerBag: createDecimalField(t),
    currencyId: z
      .string()
      .trim()
      .min(1, { message: t("common:jwali_validation_currency_required") }),
    occurredAt: z.string().min(1, { message: t("common:jwali_validation_required") }),
    notes: z.string().optional().or(z.literal("")),
  });

export const createJwaliPaymentFormSchema = (t: TFunction) =>
  z
    .object({
      amount: createDecimalField(t),
      paymentDate: z.string().min(1, { message: t("common:jwali_validation_required") }),
      paymentChannel: z.enum(JWALI_PAYMENT_ROUTE),
      currencyId: z.string().optional().or(z.literal("")),
      sarafId: z.string().optional().or(z.literal("")),
      notes: z.string().optional().or(z.literal("")),
    })
    .superRefine((values, ctx) => {
      if (!values.currencyId?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("common:jwali_validation_currency_required"),
          path: ["currencyId"],
        });
      }

      if (values.paymentChannel === "saraf" && !values.sarafId?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("common:jwali_validation_saraf_required"),
          path: ["sarafId"],
        });
      }
    });

export type Jwali = z.infer<typeof JwaliSchema>;
export type JwaliFormValues = z.infer<ReturnType<typeof createJwaliFormSchema>>;
export type JwaliAccount = z.infer<typeof JwaliAccountSchema>;
export type JwaliPayment = z.infer<typeof JwaliPaymentSchema>;
export type JwaliLedgerEntryFormValues = z.infer<
  ReturnType<typeof createJwaliLedgerEntryFormSchema>
>;
export type JwaliPaymentFormValues = z.infer<ReturnType<typeof createJwaliPaymentFormSchema>>;
