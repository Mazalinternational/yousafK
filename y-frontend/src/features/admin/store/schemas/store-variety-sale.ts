import z from "zod";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";
import { RICE_SALE_PAYMENT_ROUTE } from "../../rice-sales/schemas/rice-sale";
import { isPooledStoreType } from "../utils/storePooledTypes";
import { STORE_TYPE_OPTIONS } from "./store";

export const StoreVarietySaleBuyerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  phoneNo: z.string(),
  address: z.string().optional(),
});

export const StoreVarietySaleSarafSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneNo: z.string().optional(),
});

export const StoreVarietySaleCurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const StoreVarietySaleSchema = z.object({
  id: z.string(),
  storeType: z.enum(STORE_TYPE_OPTIONS),
  variety: z.string(),
  billNo: z.string(),
  saleDate: z.string(),
  soldWeight: z.string(),
  unit: z.string(),
  soldWeightKg: z.string(),
  fromStockWeight: z.string().optional(),
  oversoldWeight: z.string().optional(),
  fromStockWeightKg: z.string().optional(),
  oversoldWeightKg: z.string().optional(),
  saleAmount: z.string(),
  loadingAmount: z.string().optional(),
  loadingPaymentChannel: z.enum(RICE_SALE_PAYMENT_ROUTE).nullable().optional(),
  loadingSarafId: z.string().nullable().optional(),
  loadingSaraf: StoreVarietySaleSarafSchema.nullable().optional(),
  loadingCurrencyId: z.string().nullable().optional(),
  loadingCurrency: StoreVarietySaleCurrencySchema.nullable().optional(),
  riceBagsAmount: z.string().optional(),
  bagsPaymentChannel: z.enum(RICE_SALE_PAYMENT_ROUTE).nullable().optional(),
  bagsSarafId: z.string().nullable().optional(),
  bagsSaraf: StoreVarietySaleSarafSchema.nullable().optional(),
  bagsCurrencyId: z.string().nullable().optional(),
  bagsCurrency: StoreVarietySaleCurrencySchema.nullable().optional(),
  invoiceTotal: z.string().optional(),
  paymentType: z.enum(["paid", "partial_paid", "remaining"]),
  paidAmount: z.string(),
  remainingAmount: z.string(),
  paidInCash: z.boolean(),
  paymentChannel: z.enum(RICE_SALE_PAYMENT_ROUTE),
  sarafId: z.string().nullable().optional(),
  saraf: StoreVarietySaleSarafSchema.nullable().optional(),
  sarafLedgerCurrencyId: z.string().nullable().optional(),
  sarafLedgerCurrency: StoreVarietySaleCurrencySchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  buyerCustomerId: z.string(),
  buyerCustomer: StoreVarietySaleBuyerSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const decimalField = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
  .refine((value) => Number(value) >= 0, "Cannot be negative");

const optionalChargeAmount = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => value?.trim() || "0")
  .pipe(
    z
      .string()
      .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
      .refine((value) => Number(value) >= 0, "Cannot be negative"),
  );

function saleAmountFromValues(values: {
  storeType: (typeof STORE_TYPE_OPTIONS)[number];
  soldWeight: string;
  ratePerSeer?: string;
  totalAmount?: string;
}) {
  if (isPooledStoreType(values.storeType)) {
    const soldWeight = Number(values.soldWeight);
    const ratePerSeer = Number(values.ratePerSeer);
    if (
      Number.isNaN(soldWeight) ||
      Number.isNaN(ratePerSeer) ||
      soldWeight <= 0 ||
      ratePerSeer <= 0
    ) {
      return 0;
    }
    return soldWeight * ratePerSeer;
  }

  return Number(values.totalAmount || 0);
}

function invoiceTotalFromValues(values: {
  storeType: (typeof STORE_TYPE_OPTIONS)[number];
  soldWeight: string;
  ratePerSeer?: string;
  totalAmount?: string;
  loadingAmount?: string;
  riceBagsAmount?: string;
}) {
  return (
    saleAmountFromValues(values) +
    Number(values.loadingAmount || 0) +
    Number(values.riceBagsAmount || 0)
  );
}

export const StoreVarietySaleFormSchema = z
  .object({
    storeType: z.enum(STORE_TYPE_OPTIONS),
    variety: z.string().min(1),
    buyerCustomerId: z.string().min(1),
    soldWeight: decimalField.refine((value) => Number(value) > 0, "Must be greater than 0"),
    unit: z.enum(["seven_kg"]),
    saleDate: z.string().min(1),
    ratePerSeer: z.string().optional().or(z.literal("")),
    totalAmount: z.string().optional().or(z.literal("")),
    loadingAmount: optionalChargeAmount,
    riceBagsAmount: optionalChargeAmount,
    paymentType: z.enum(RICE_PAYMENT_TYPE_OPTIONS).or(z.literal("")),
    paidAmount: decimalField.or(z.literal("")).optional(),
    paymentChannel: z.enum(RICE_SALE_PAYMENT_ROUTE),
    sarafId: z.string().optional().or(z.literal("")),
    sarafLedgerCurrencyId: z.string().optional().or(z.literal("")),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment type is required",
        path: ["paymentType"],
      });
      return;
    }

    const rateBased = isPooledStoreType(data.storeType);

    if (rateBased) {
      const ratePerSeer = Number(data.ratePerSeer);
      if (!data.ratePerSeer?.trim() || Number.isNaN(ratePerSeer) || ratePerSeer <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rate per seer is required",
          path: ["ratePerSeer"],
        });
      }
    } else if (
      !data.totalAmount?.trim() ||
      Number.isNaN(Number(data.totalAmount)) ||
      Number(data.totalAmount) <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sale amount is required",
        path: ["totalAmount"],
      });
    }

    const saleAmount = saleAmountFromValues(data);
    if (saleAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: rateBased
          ? "Enter quantity and rate to calculate sale amount"
          : "Sale amount must be greater than 0",
        path: rateBased ? ["soldWeight"] : ["totalAmount"],
      });
    }

    const invoiceTotal = invoiceTotalFromValues(data);
    const paidAmount = Number(data.paidAmount || 0);

    if (data.paymentType === "partial_paid") {
      if (!(paidAmount > 0 && paidAmount < invoiceTotal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Paid amount must be greater than 0 and less than invoice total",
          path: ["paidAmount"],
        });
      }
    }

    if (data.paymentChannel === "saraf" && data.paymentType === "remaining") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pay to Saraf cannot be used when payment is fully remaining",
        path: ["paymentChannel"],
      });
    }
    if (data.paymentChannel === "saraf") {
      if (!data.sarafId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Saraf is required",
          path: ["sarafId"],
        });
      }
      if (!data.sarafLedgerCurrencyId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Currency is required",
          path: ["sarafLedgerCurrencyId"],
        });
      }
    }
    if (
      data.paymentChannel === "cash" &&
      !data.sarafLedgerCurrencyId?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Currency is required for this sale",
        path: ["sarafLedgerCurrencyId"],
      });
    }
  });

export type StoreVarietySale = z.infer<typeof StoreVarietySaleSchema>;
export type StoreVarietySaleFormValues = z.infer<typeof StoreVarietySaleFormSchema>;

export function getStoreVarietySaleInvoiceTotal(values: {
  storeType: (typeof STORE_TYPE_OPTIONS)[number];
  soldWeight: string;
  ratePerSeer?: string;
  totalAmount?: string;
  loadingAmount?: string;
  riceBagsAmount?: string;
}) {
  return invoiceTotalFromValues(values);
}

export function getStoreVarietySaleAmount(values: {
  storeType: (typeof STORE_TYPE_OPTIONS)[number];
  soldWeight: string;
  ratePerSeer?: string;
  totalAmount?: string;
}) {
  return saleAmountFromValues(values);
}

export function getStoreVarietySaleRemainingBalance(values: {
  storeType: (typeof STORE_TYPE_OPTIONS)[number];
  soldWeight: string;
  ratePerSeer?: string;
  totalAmount?: string;
  loadingAmount?: string;
  riceBagsAmount?: string;
  paymentType: string;
  paidAmount?: string;
}) {
  const invoiceTotal = invoiceTotalFromValues(values);
  const paidAmount = Number(values.paidAmount || 0);

  if (values.paymentType === "remaining") {
    return invoiceTotal;
  }

  if (values.paymentType === "partial_paid") {
    return Math.max(invoiceTotal - paidAmount, 0);
  }

  return 0;
}

export function buildStoreVarietySalePayload(values: StoreVarietySaleFormValues) {
  const saleAmount = saleAmountFromValues(values).toFixed(2);

  return {
    storeType: values.storeType,
    variety: values.variety,
    buyerCustomerId: values.buyerCustomerId,
    soldWeight: values.soldWeight,
    unit: values.unit,
    saleDate: values.saleDate,
    totalAmount: values.totalAmount?.trim() || saleAmount,
    loadingAmount: values.loadingAmount || "0",
    riceBagsAmount: values.riceBagsAmount || "0",
    paymentType: values.paymentType,
    paymentChannel: values.paymentChannel,
    notes: values.notes || undefined,
    ...(values.paymentType === "partial_paid"
      ? { paidAmount: values.paidAmount?.trim() || "0" }
      : {}),
    ...(values.paymentChannel === "saraf"
      ? {
          sarafId: values.sarafId?.trim(),
          sarafLedgerCurrencyId: values.sarafLedgerCurrencyId?.trim(),
        }
      : {}),
    ...(values.paymentChannel === "cash" && values.sarafLedgerCurrencyId?.trim()
      ? { sarafLedgerCurrencyId: values.sarafLedgerCurrencyId.trim() }
      : {}),
  };
}

export function buildStoreVarietySaleUpdatePayload(values: StoreVarietySaleFormValues) {
  const { storeType: _storeType, variety: _variety, ...payload } =
    buildStoreVarietySalePayload(values);

  return payload;
}

export function storeVarietySaleToFormValues(
  sale: StoreVarietySale,
): StoreVarietySaleFormValues {
  const soldWeight = Number(sale.soldWeight);
  const saleAmount = Number(sale.saleAmount);
  const ratePerSeer =
    soldWeight > 0 && isPooledStoreType(sale.storeType)
      ? (saleAmount / soldWeight).toFixed(2)
      : "";

  return {
    storeType: sale.storeType,
    variety: sale.variety,
    buyerCustomerId: sale.buyerCustomerId,
    soldWeight: sale.soldWeight,
    unit: "seven_kg",
    saleDate: sale.saleDate.slice(0, 10),
    ratePerSeer,
    totalAmount: sale.saleAmount,
    loadingAmount: sale.loadingAmount ?? "0",
    riceBagsAmount: sale.riceBagsAmount ?? "0",
    paymentType: sale.paymentType,
    paidAmount: sale.paidAmount,
    paymentChannel: sale.paymentChannel,
    sarafId: sale.sarafId ?? "",
    sarafLedgerCurrencyId:
      sale.sarafLedgerCurrencyId ?? sale.sarafLedgerCurrency?.id ?? "",
    notes: sale.notes ?? "",
  };
}
