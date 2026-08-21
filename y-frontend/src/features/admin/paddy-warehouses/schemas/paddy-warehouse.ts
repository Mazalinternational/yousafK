import z from "zod";
import type { TFunction } from "i18next";

export const PADDY_STOCK_TYPE = "company" as const;
export const PADDY_UNIT_OPTIONS = ["seven_kg"] as const;
export const PADDY_PAYMENT_TYPE_OPTIONS = [
  "paid",
  "partial_paid",
  "remaining",
] as const;

/** Seller settlement: company cash vs paid through Saraf ledger. */
export const COMPANY_PADDY_SELLER_PAYMENT_ROUTE = ["cash", "saraf"] as const;

export const PaddyWarehouseSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const PaddyWarehouseEnteringSummarySchema = z.object({
  id: z.string(),
  billNo: z.string(),
  paddyOwner: z.string(),
  receivedFrom: z.enum(["farmer", "seller"]),
  trackedInWarehouse: z.boolean(),
  trackedStockType: z.enum(["company", "farmer"]).nullable().optional(),
});

export const PaddyWarehouseSarafSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const PaddyWarehouseCurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const PaddyWarehouseSchema = z.object({
  id: z.string(),
  enteringPaddyId: z.string().nullable().optional(),
  billNo: z.string().min(1),
  enteringBillNo: z.string().nullable().optional(),
  stockType: z.literal(PADDY_STOCK_TYPE),
  variety: z.string().min(1),
  quantity: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(PADDY_UNIT_OPTIONS),
  ownerName: z.string().min(1),
  rate: z.union([z.string(), z.number()]).transform(String),
  totalAmount: z.union([z.string(), z.number()]).transform(String),
  paymentType: z.enum(PADDY_PAYMENT_TYPE_OPTIONS),
  paidAmount: z.union([z.string(), z.number()]).transform(String),
  remainingAmount: z.union([z.string(), z.number()]).transform(String),
  paymentChannel: z.enum(COMPANY_PADDY_SELLER_PAYMENT_ROUTE).default("cash"),
  sarafId: z.string().nullable().optional(),
  saraf: PaddyWarehouseSarafSchema.nullable().optional(),
  sarafLedgerCurrencyId: z.string().nullable().optional(),
  sarafLedgerCurrency: PaddyWarehouseCurrencySchema.nullable().optional(),
  processingStatus: z
    .enum(["not_started", "under_process", "completed", "process_completed"])
    .optional(),
  processedQuantityKg: z.union([z.string(), z.number()]).transform(String).optional(),
  availableForProcessKg: z.union([z.string(), z.number()]).transform(String).optional(),
  receivedDate: z.string(),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: PaddyWarehouseSeasonSchema,
  enteringPaddy: PaddyWarehouseEnteringSummarySchema.nullable().optional(),
});

const createNonNegativeDecimalField = (t: TFunction) =>
  z
    .string()
    .min(1, { message: t("common:expense_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)), {
      message: t("common:expense_validation_valid_number"),
    })
    .refine((value) => Number(value) >= 0, {
      message: t("common:paddy_validation_cannot_be_negative"),
    });

export const createPaddyWarehouseFormSchema = (t: TFunction) =>
  z
    .object({
      enteringPaddyId: z.string().trim().optional().or(z.literal("")),
      billNo: z.string().trim().optional().or(z.literal("")),
      enteringBillNo: z.string().trim().optional().or(z.literal("")),
      variety: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      quantity: createNonNegativeDecimalField(t),
      unit: z.enum(PADDY_UNIT_OPTIONS),
      ownerName: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      rate: createNonNegativeDecimalField(t),
      paymentType: z.enum(PADDY_PAYMENT_TYPE_OPTIONS),
      paidAmount: createNonNegativeDecimalField(t).or(z.literal("")).optional(),
      paymentChannel: z.enum(COMPANY_PADDY_SELLER_PAYMENT_ROUTE),
      sarafId: z.string().optional().or(z.literal("")),
      sarafLedgerCurrencyId: z.string().optional().or(z.literal("")),
      receivedDate: z.string().min(1, { message: t("common:expense_validation_required") }),
      notes: z.string().optional().or(z.literal("")),
    })
    .refine(
      (values) => {
        const totalAmount = Number(values.quantity) * Number(values.rate);
        const paidAmount = Number(values.paidAmount || 0);

        if (values.paymentType === "paid") {
          return true;
        }

        if (values.paymentType === "remaining") {
          return true;
        }

        return paidAmount > 0 && paidAmount < totalAmount;
      },
      {
        message: t("common:expense_validation_partial_paid_amount"),
        path: ["paidAmount"],
      },
    )
    .refine(
      (values) => !(values.paymentChannel === "saraf" && values.paymentType === "remaining"),
      {
        message: t("common:expense_validation_saraf_remaining"),
        path: ["paymentChannel"],
      },
    )
    .refine(
      (values) => {
        if (values.paymentChannel === "saraf") {
          if (values.paymentType === "remaining") {
            return false;
          }
          return Boolean(values.sarafId?.trim()) && Boolean(values.sarafLedgerCurrencyId?.trim());
        }
        if (values.paymentChannel === "cash") {
          return Boolean(values.sarafLedgerCurrencyId?.trim());
        }
        return true;
      },
      {
        message: t("common:expense_validation_currency_required"),
        path: ["sarafLedgerCurrencyId"],
      },
    );

/** @deprecated Use createPaddyWarehouseFormSchema(t) for localized validation */
export const PaddyWarehouseFormSchema = z
  .object({
    enteringPaddyId: z.string().trim().optional().or(z.literal("")),
    billNo: z.string().trim().optional().or(z.literal("")),
    enteringBillNo: z.string().trim().optional().or(z.literal("")),
    variety: z.string().trim().min(1),
    quantity: z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
      .refine((value) => Number(value) >= 0, "Cannot be negative"),
    unit: z.enum(PADDY_UNIT_OPTIONS),
    ownerName: z.string().trim().min(1),
    rate: z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
      .refine((value) => Number(value) >= 0, "Cannot be negative"),
    paymentType: z.enum(PADDY_PAYMENT_TYPE_OPTIONS),
    paidAmount: z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
      .refine((value) => Number(value) >= 0, "Cannot be negative")
      .or(z.literal(""))
      .optional(),
    paymentChannel: z.enum(COMPANY_PADDY_SELLER_PAYMENT_ROUTE),
    sarafId: z.string().optional().or(z.literal("")),
    sarafLedgerCurrencyId: z.string().optional().or(z.literal("")),
    receivedDate: z.string().min(1),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine(
    (values) => {
      const totalAmount = Number(values.quantity) * Number(values.rate);
      const paidAmount = Number(values.paidAmount || 0);

      if (values.paymentType === "paid") {
        return true;
      }

      if (values.paymentType === "remaining") {
        return true;
      }

      return paidAmount > 0 && paidAmount < totalAmount;
    },
    {
      message: "Paid amount must be greater than 0 and less than total amount",
      path: ["paidAmount"],
    },
  )
  .refine((values) => !(values.paymentChannel === "saraf" && values.paymentType === "remaining"), {
    message: "Pay from Saraf is not available when nothing has been paid yet",
    path: ["paymentChannel"],
  })
  .refine(
    (values) => {
      if (values.paymentType === "remaining") {
        return true;
      }
      if (values.paymentChannel === "saraf") {
        return Boolean(values.sarafId?.trim()) && Boolean(values.sarafLedgerCurrencyId?.trim());
      }
      if (values.paymentChannel === "cash") {
        return Boolean(values.sarafLedgerCurrencyId?.trim());
      }
      return true;
    },
    {
      message: "Select settlement currency (and Saraf when paying from Saraf)",
      path: ["sarafLedgerCurrencyId"],
    },
  );

export type PaddyWarehouse = z.infer<typeof PaddyWarehouseSchema>;
export type PaddyWarehouseFormValues = z.infer<ReturnType<typeof createPaddyWarehouseFormSchema>>;
