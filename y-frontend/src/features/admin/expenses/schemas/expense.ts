import type { TFunction } from "i18next";
import z from "zod";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";

export const EXPENSE_PAYMENT_ROUTE = ["cash", "saraf"] as const;
export const EXPENSE_SETTLEMENT_MODE = ["direct", "vendor"] as const;

export const ExpenseSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const ExpenseSarafSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ExpenseVendorSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ExpenseSchema = z.object({
  id: z.string(),
  billNo: z.string(),
  date: z.string(),
  categoryId: z.string(),
  categoryCode: z.string(),
  categoryName: z.string(),
  title: z.string(),
  amount: z.union([z.string(), z.number()]).transform(String),
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  settlementMode: z.enum(EXPENSE_SETTLEMENT_MODE).default("direct"),
  vendorId: z.string().nullable().optional(),
  vendorName: z.string().nullable().optional(),
  paymentType: z.enum(RICE_PAYMENT_TYPE_OPTIONS).nullable().optional(),
  paidAmount: z.string().nullable().optional(),
  remainingAmount: z.string().nullable().optional(),
  paymentChannel: z.enum(EXPENSE_PAYMENT_ROUTE).default("cash"),
  sarafId: z.string().nullable().optional(),
  sarafName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: ExpenseSeasonSchema.nullable().optional(),
});

const createDecimalField = (t: TFunction) =>
  z
    .string()
    .min(1, { message: t("common:expense_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)), {
      message: t("common:expense_validation_valid_number"),
    })
    .refine((value) => Number(value) > 0, {
      message: t("common:expense_validation_positive_amount"),
    });

export const createExpenseFormSchema = (t: TFunction) => {
  const decimalField = createDecimalField(t);

  return z
    .object({
      billNo: z.string().optional().or(z.literal("")),
      date: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      categoryId: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      title: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      amount: decimalField,
      currencyId: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      settlementMode: z.enum(EXPENSE_SETTLEMENT_MODE),
      vendorId: z.string().optional().or(z.literal("")),
      paymentType: z.enum(RICE_PAYMENT_TYPE_OPTIONS).optional(),
      paidAmount: decimalField.or(z.literal("")).optional(),
      paymentChannel: z.enum(EXPENSE_PAYMENT_ROUTE),
      sarafId: z.string().optional().or(z.literal("")),
      notes: z.string().optional().nullable().or(z.literal("")),
    })
    .refine(
      (values) => {
        if (values.settlementMode !== "vendor") {
          return true;
        }
        return Boolean(values.vendorId?.trim());
      },
      {
        message: t("common:expense_validation_select_vendor"),
        path: ["vendorId"],
      },
    )
    .refine(
      (values) => {
        if (values.settlementMode !== "vendor") {
          return true;
        }
        return Boolean(values.paymentType);
      },
      {
        message: t("common:expense_validation_payment_type_required"),
        path: ["paymentType"],
      },
    )
    .refine(
      (values) => {
        if (values.settlementMode !== "vendor" || values.paymentType !== "partial_paid") {
          return true;
        }
        const totalAmount = Number(values.amount);
        const paidAmount = Number(values.paidAmount || 0);
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
        const hasSettlement =
          values.settlementMode === "direct" ||
          (values.paymentType !== "remaining" && values.paymentType !== undefined);

        if (!hasSettlement) {
          return true;
        }

        return Boolean(values.currencyId?.trim());
      },
      {
        message: t("common:expense_validation_currency_required"),
        path: ["currencyId"],
      },
    )
    .refine(
      (values) => {
        const hasSettlement =
          values.settlementMode === "direct" ||
          (values.paymentType !== "remaining" && values.paymentType !== undefined);

        if (values.paymentChannel !== "saraf" || !hasSettlement) {
          return true;
        }

        if (values.paymentType === "remaining") {
          return true;
        }

        return Boolean(values.sarafId?.trim());
      },
      {
        message: t("common:expense_validation_select_saraf"),
        path: ["sarafId"],
      },
    );
};

export type Expense = z.infer<typeof ExpenseSchema>;
export type ExpenseFormValues = z.infer<ReturnType<typeof createExpenseFormSchema>>;

export function sanitizeExpensePayload(values: ExpenseFormValues) {
  const payload: Record<string, unknown> = { ...values };

  delete payload.billNo;

  if (values.settlementMode === "direct") {
    delete payload.vendorId;
    delete payload.paymentType;
    delete payload.paidAmount;
  } else if (values.paymentType !== "partial_paid") {
    delete payload.paidAmount;
  }

  if (values.paymentChannel === "cash") {
    delete payload.sarafId;
  }

  return payload;
}
