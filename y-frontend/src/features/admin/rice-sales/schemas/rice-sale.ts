import z from "zod";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";

export const RICE_SALE_PAYMENT_ROUTE = ["cash", "saraf"] as const;

export const RiceSaleBuyerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  phoneNo: z.string(),
});

export const RiceSaleSarafSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const RiceSaleCurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const RiceSaleSchema = z.object({
  id: z.string(),
  billNo: z.string(),
  buyerCustomerId: z.string(),
  riceVariety: z.string(),
  quantity: z.string(),
  unit: z.string(),
  fromStockWeight: z.string().optional(),
  oversoldWeight: z.string().optional(),
  fromStockWeightKg: z.string().optional(),
  oversoldWeightKg: z.string().optional(),
  saleDate: z.string(),
  totalAmount: z.string(),
  loadingAmount: z.string().optional(),
  loadingPaymentChannel: z.enum(RICE_SALE_PAYMENT_ROUTE).nullable().optional(),
  loadingSarafId: z.string().nullable().optional(),
  loadingSaraf: RiceSaleSarafSchema.nullable().optional(),
  loadingCurrencyId: z.string().nullable().optional(),
  loadingCurrency: RiceSaleCurrencySchema.nullable().optional(),
  riceBagsAmount: z.string().optional(),
  bagsPaymentChannel: z.enum(RICE_SALE_PAYMENT_ROUTE).nullable().optional(),
  bagsSarafId: z.string().nullable().optional(),
  bagsSaraf: RiceSaleSarafSchema.nullable().optional(),
  bagsCurrencyId: z.string().nullable().optional(),
  bagsCurrency: RiceSaleCurrencySchema.nullable().optional(),
  invoiceTotal: z.string().optional(),
  paymentType: z.enum(["paid", "partial_paid", "remaining"]),
  paidAmount: z.string(),
  remainingAmount: z.string(),
  paidInCash: z.boolean(),
  paymentChannel: z.enum(RICE_SALE_PAYMENT_ROUTE).default("cash"),
  sarafId: z.string().nullable().optional(),
  saraf: RiceSaleSarafSchema.nullable().optional(),
  sarafLedgerCurrencyId: z.string().nullable().optional(),
  sarafLedgerCurrency: RiceSaleCurrencySchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  buyerCustomer: RiceSaleBuyerSchema.nullable().optional(),
  season: z
    .object({
      id: z.string(),
      name: z.string(),
      status: z.enum(["ACTIVE", "CLOSED"]),
    })
    .optional(),
});

const amountString = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Must be a positive number");

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

function invoiceTotalFromValues(values: {
  totalAmount?: string;
  loadingAmount?: string;
  riceBagsAmount?: string;
}) {
  return (
    Number(values.totalAmount || 0) +
    Number(values.loadingAmount || 0) +
    Number(values.riceBagsAmount || 0)
  );
}

export const RiceSaleFormSchema = z
  .object({
    buyerCustomerId: z.string().min(1),
    riceVariety: z.string().min(1),
    quantity: decimalField.refine((value) => Number(value) > 0, "Must be greater than 0"),
    unit: z.enum(["seven_kg"]),
    saleDate: z.string().min(1),
    ratePerSeer: amountString,
    /** Auto-calculated from quantity × rate; may be empty while the user is still typing. */
    totalAmount: z.string().optional().or(z.literal("")),
    loadingAmount: optionalChargeAmount,
    riceBagsAmount: optionalChargeAmount,
    paymentType: z.enum(RICE_PAYMENT_TYPE_OPTIONS).or(z.literal("")),
    paidAmount: decimalField.or(z.literal("")).optional(),
    paymentChannel: z.enum(RICE_SALE_PAYMENT_ROUTE),
    sarafId: z.string().optional().or(z.literal("")),
    sarafLedgerCurrencyId: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (values.paymentType === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment type is required",
        path: ["paymentType"],
      });
      return;
    }

    const riceAmount = Number(values.quantity) * Number(values.ratePerSeer);
    if (Number.isNaN(riceAmount) || riceAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter quantity and rate to calculate rice amount",
        path: ["quantity"],
      });
    }

    const invoiceTotal = invoiceTotalFromValues({
      ...values,
      totalAmount: riceAmount > 0 ? riceAmount.toFixed(2) : values.totalAmount,
    });
    const paidAmount = Number(values.paidAmount || 0);

    if (values.paymentType === "partial_paid") {
      if (!(paidAmount > 0 && paidAmount < invoiceTotal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Paid amount must be greater than 0 and less than invoice total",
          path: ["paidAmount"],
        });
      }
    }

    if (values.paymentChannel === "saraf" && values.paymentType === "remaining") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pay to Saraf is not available when nothing has been paid yet",
        path: ["paymentChannel"],
      });
    }

    if (values.paymentChannel === "saraf" && values.paymentType !== "remaining") {
      if (!values.sarafId?.trim() || !values.sarafLedgerCurrencyId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a Saraf and currency when Pay to Saraf is selected",
          path: ["sarafId"],
        });
      }
    }

    if (
      values.paymentChannel === "cash" &&
      !values.sarafLedgerCurrencyId?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a currency for this sale",
        path: ["sarafLedgerCurrencyId"],
      });
    }
  });

export type RiceSale = z.infer<typeof RiceSaleSchema>;
export type RiceSaleFormValues = z.infer<typeof RiceSaleFormSchema>;

export function getRiceSaleInvoiceTotal(values: {
  totalAmount: string;
  loadingAmount?: string;
  riceBagsAmount?: string;
}) {
  return invoiceTotalFromValues(values);
}
