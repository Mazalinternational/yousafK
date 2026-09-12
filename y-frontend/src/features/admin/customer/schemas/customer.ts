import z from "zod";
import type { TFunction } from "i18next";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";

export const COMPANY_SELLER_PAYMENT_ROUTE = ["cash", "saraf"] as const;

const createDecimalField = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(1, { message: t("common:expense_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: t("common:expense_validation_positive_amount"),
    });

export const createCustomerFormSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    type: z.enum([
      "paddy_farmer",
      "paddy_seller",
      "rice_seller",
      "buyer",
      "vendor",
      "debtor",
    ]),
    phoneNo: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    address: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    notes: z.string().optional().or(z.literal("")),
  });

export const CustomerSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum([
    "paddy_farmer",
    "paddy_seller",
    "rice_seller",
    "buyer",
    "vendor",
    "debtor",
  ]),
  phoneNo: z.string().min(1),
  address: z.string().min(1),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: CustomerSeasonSchema,
});

export const CUSTOMER_TYPE_OPTIONS = [
  "paddy_farmer",
  "paddy_seller",
  "rice_seller",
  "buyer",
  "vendor",
  "debtor",
] as const;

export const CustomerLedgerEntrySchema = z.object({
  id: z.string(),
  entryType: z.enum([
    "company_receivable",
    "company_payment",
    "company_payment_on_behalf",
    "company_payment_received_on_behalf",
    "farmer_obligation",
    "farmer_rice_return",
    "buyer_rice_sale",
    "buyer_payment",
    "buyer_payment_on_behalf",
    "buyer_payment_received_on_behalf",
    "buyer_debit",
    "buyer_credit",
    "seller_debit",
    "seller_credit",
    "process_production_store_sale",
    "buyer_sale_oversell",
    "vendor_expense",
    "vendor_payment",
    "debtor_disbursement",
    "debtor_repayment",
  ]),
  counterpartyCustomerId: z.string().nullable().optional(),
  counterpartyCustomerName: z.string().nullable().optional(),
  counterpartyCustomerType: z.string().nullable().optional(),
  linkedLedgerEntryId: z.string().nullable().optional(),
  sourceCompanyPaddyWarehouseId: z.string().nullable().optional(),
  sourceFarmerPaddyWarehouseId: z.string().nullable().optional(),
  sourceRiceWarehouseId: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  paymentType: z.enum(RICE_PAYMENT_TYPE_OPTIONS).nullable().optional(),
  paidAmount: z.string().nullable().optional(),
  remainingAmount: z.string().nullable().optional(),
  paymentChannel: z.enum(COMPANY_SELLER_PAYMENT_ROUTE).nullable().optional(),
  sarafId: z.string().nullable().optional(),
  sarafName: z.string().nullable().optional(),
  currencyId: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  currencyName: z.string().nullable().optional(),
  paddyQuantity: z.string().nullable().optional(),
  paddyVariety: z.string().nullable().optional(),
  riceQuantity: z.string().nullable().optional(),
  fromStockQuantity: z.string().nullable().optional(),
  oversoldQuantity: z.string().nullable().optional(),
  riceVariety: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  occurredAt: z.string(),
  scheduledFor: z.string().nullable().optional(),
  riceStockFulfilledAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  billNo: z.string().nullable().optional(),
  isEditable: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SellerCurrencyBalanceSchema = z.object({
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  totalPurchaseAmount: z.string(),
  totalPaidAmount: z.string(),
  amountWeOweSeller: z.string(),
  amountSellerOwesUs: z.string(),
});

export const BuyerTransferByCurrencySchema = z.object({
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  paidOnBehalfTotal: z.string(),
  receivedOnBehalfTotal: z.string(),
});

export const SellerTransferByCurrencySchema = BuyerTransferByCurrencySchema;

export const BuyerCurrencyBalanceSchema = z.object({
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  totalSaleAmount: z.string(),
  totalPaidAmount: z.string(),
  outstandingAmount: z.string(),
  amountBuyerOverpaid: z.string(),
});

export const VendorCurrencyBalanceSchema = z.object({
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  totalExpenseAmount: z.string(),
  totalPaidAmount: z.string(),
  amountWeOweVendor: z.string(),
  amountVendorOwesUs: z.string(),
});

export const DebtorCurrencyBalanceSchema = z.object({
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  totalDisbursedAmount: z.string(),
  totalRepaidAmount: z.string(),
  outstandingAmount: z.string(),
  debtorOverpaidAmount: z.string(),
});

export const CustomerAccountSummarySchema = z.object({
  totalReceivableAmount: z.string().nullable().optional(),
  totalPaidAmount: z.string().nullable().optional(),
  outstandingAmount: z.string().nullable().optional(),
  sellerOwesUsAmount: z.string().nullable().optional(),
  buyerOverpaidAmount: z.string().nullable().optional(),
  totalExpenseAmount: z.string().nullable().optional(),
  vendorOwesUsAmount: z.string().nullable().optional(),
  totalDisbursedAmount: z.string().nullable().optional(),
  totalRepaidAmount: z.string().nullable().optional(),
  debtorOverpaidAmount: z.string().nullable().optional(),
  byCurrency: z.array(SellerCurrencyBalanceSchema).optional(),
  vendorByCurrency: z.array(VendorCurrencyBalanceSchema).optional(),
  debtorByCurrency: z.array(DebtorCurrencyBalanceSchema).optional(),
  buyerByCurrency: z.array(BuyerCurrencyBalanceSchema).optional(),
  buyerTransfersByCurrency: z.array(BuyerTransferByCurrencySchema).optional(),
  sellerTransfersByCurrency: z.array(SellerTransferByCurrencySchema).optional(),
  totalPaddyReceived: z.string().optional(),
  totalRiceObligation: z.string().optional(),
  totalRiceReturned: z.string().optional(),
  remainingRiceToReturn: z.string().optional(),
  riceSaleCount: z.string().optional(),
  totalRicePurchasedKg: z.string().optional(),
  storeSaleCount: z.string().optional(),
  totalStoreWeightSoldKg: z.string().optional(),
  totalOversoldKg: z.string().optional(),
  totalSaleAmount: z.string().nullable().optional(),
});

export const CustomerAccountSchema = z.object({
  customer: CustomerSchema,
  ledger: z.object({
    id: z.string(),
    ledgerType: z.enum([
      "company_owned",
      "farmer_owned",
      "rice_owned",
      "process_production_owned",
    ]),
    createdAt: z.string(),
    updatedAt: z.string(),
    summary: CustomerAccountSummarySchema,
    entries: z.array(CustomerLedgerEntrySchema),
  }),
});

export const createCompanyPaymentFormSchema = (t: TFunction) => {
  const decimalField = createDecimalField(t);

  return z
    .object({
      amount: decimalField,
      paymentType: z.enum(RICE_PAYMENT_TYPE_OPTIONS),
      paidAmount: decimalField.or(z.literal("")).optional(),
      paymentChannel: z.enum(COMPANY_SELLER_PAYMENT_ROUTE),
      sarafId: z.string().optional().or(z.literal("")),
      currencyId: z.string().optional().or(z.literal("")),
      paymentDate: z.string().min(1, { message: t("common:expense_validation_required") }),
      notes: z.string().optional().or(z.literal("")),
    })
    .refine(
      (values) => {
        const totalAmount = Number(values.amount);
        const paidAmount = Number(values.paidAmount || 0);

        if (values.paymentType === "paid" || values.paymentType === "remaining") {
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
        if (values.paymentType === "remaining") {
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
        if (values.paymentChannel !== "saraf" || values.paymentType === "remaining") {
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

const optionalPositiveAmount = (t: TFunction) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) > 0),
      { message: t("common:buyer_payment_validation_positive_amount") },
    );

export const createBuyerPaymentFormSchema = (t: TFunction) =>
  z
    .object({
      amount: optionalPositiveAmount(t),
      paymentChannel: z.enum(COMPANY_SELLER_PAYMENT_ROUTE),
      sarafId: z.string().optional().or(z.literal("")),
      currencyId: z.string().optional().or(z.literal("")),
      paymentDate: z.string().min(1),
      notes: z.string().optional().or(z.literal("")),
      payOnBehalf: z.boolean(),
      onBehalfCustomerId: z.string().optional().or(z.literal("")),
      onBehalfAmount: optionalPositiveAmount(t).optional(),
      onBehalfCurrencyId: z.string().optional().or(z.literal("")),
    })
    .superRefine((values, ctx) => {
      const hasSelf = Boolean(values.amount?.trim());
      const hasOnBehalf = values.payOnBehalf;
      const hasOnBehalfAmount = Boolean(values.onBehalfAmount?.trim());

      if (!hasSelf && !(hasOnBehalf && hasOnBehalfAmount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("common:buyer_payment_validation_self_or_on_behalf"),
          path: ["amount"],
        });
      }

      if (hasOnBehalf) {
        if (!values.onBehalfCustomerId?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("common:buyer_payment_validation_select_buyer"),
            path: ["onBehalfCustomerId"],
          });
        }
        if (!hasOnBehalfAmount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("common:buyer_payment_validation_on_behalf_amount_required"),
            path: ["onBehalfAmount"],
          });
        }
        if (!values.onBehalfCurrencyId?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("common:buyer_payment_validation_on_behalf_currency_required"),
            path: ["onBehalfCurrencyId"],
          });
        }

        const sameCurrency =
          Boolean(values.currencyId?.trim()) &&
          values.currencyId === values.onBehalfCurrencyId;

        if (hasSelf && hasOnBehalfAmount && sameCurrency) {
          const gross = Number(values.amount);
          const onBehalf = Number(values.onBehalfAmount);
          if (
            !Number.isNaN(gross) &&
            !Number.isNaN(onBehalf) &&
            onBehalf > gross
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("common:buyer_payment_validation_on_behalf_exceeds_total"),
              path: ["onBehalfAmount"],
            });
          }
        }
      }

      const netSelfCollection = (() => {
        if (!hasSelf) {
          return 0;
        }
        const gross = Number(values.amount);
        if (Number.isNaN(gross) || gross <= 0) {
          return 0;
        }
        if (!hasOnBehalf || !hasOnBehalfAmount) {
          return gross;
        }
        const sameCurrency =
          Boolean(values.currencyId?.trim()) &&
          values.currencyId === values.onBehalfCurrencyId;
        if (!sameCurrency) {
          return gross;
        }
        const onBehalf = Number(values.onBehalfAmount);
        if (Number.isNaN(onBehalf) || onBehalf <= 0) {
          return gross;
        }
        return Math.max(gross - onBehalf, 0);
      })();

      if (hasSelf && !values.currencyId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("common:buyer_payment_validation_self_currency_required"),
          path: ["currencyId"],
        });
      }

      if (
        netSelfCollection > 0 &&
        values.paymentChannel === "saraf" &&
        !values.sarafId?.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("common:buyer_payment_validation_saraf_required"),
          path: ["sarafId"],
        });
      }
    });

export const createFarmerRiceReturnFormSchema = (t: TFunction) =>
  z.object({
    riceQuantity: z
      .string()
      .trim()
      .min(1, { message: t("common:expense_validation_required") }),
    riceVariety: z
      .string()
      .trim()
      .min(1, { message: t("common:expense_validation_required") }),
    unit: z.enum(["seven_kg"]),
    returnDate: z.string().min(1, { message: t("common:expense_validation_required") }),
    scheduledFor: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  });

/** @deprecated Use createFarmerRiceReturnFormSchema(t) for localized validation */
export const FarmerRiceReturnFormSchema = z.object({
  riceQuantity: z.string().trim().min(1),
  riceVariety: z.string().trim().min(1),
  unit: z.enum(["seven_kg"]),
  returnDate: z.string().min(1),
  scheduledFor: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerFormValues = z.infer<ReturnType<typeof createCustomerFormSchema>>;
export type CustomerAccount = z.infer<typeof CustomerAccountSchema>;
export type CustomerLedgerEntry = z.infer<typeof CustomerLedgerEntrySchema>;
export type CompanyPaymentFormValues = z.infer<
  ReturnType<typeof createCompanyPaymentFormSchema>
>;
export type BuyerPaymentFormValues = z.infer<
  ReturnType<typeof createBuyerPaymentFormSchema>
>;
export const createBuyerBalanceTransferFormSchema = (t: TFunction) =>
  z.object({
    toCustomerId: z
      .string()
      .trim()
      .min(1, { message: t("common:buyer_payment_validation_select_buyer") }),
    amount: z
      .string()
      .trim()
      .min(1, { message: t("common:buyer_payment_validation_on_behalf_amount_required") })
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
        message: t("common:buyer_payment_validation_positive_amount"),
      }),
    currencyId: z
      .string()
      .trim()
      .min(1, {
        message: t("common:buyer_payment_validation_on_behalf_currency_required"),
      }),
    paymentDate: z.string().min(1),
    notes: z.string().optional().or(z.literal("")),
  });
export type BuyerBalanceTransferFormValues = z.infer<
  ReturnType<typeof createBuyerBalanceTransferFormSchema>
>;
export const createBuyerBalanceAdjustmentFormSchema = (t: TFunction) =>
  z.object({
    direction: z.enum(["debit", "credit"], {
      required_error: t("common:buyer_adjustment_validation_direction"),
    }),
    amount: z
      .string()
      .trim()
      .min(1, { message: t("common:buyer_payment_validation_on_behalf_amount_required") })
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
        message: t("common:buyer_payment_validation_positive_amount"),
      }),
    currencyId: z
      .string()
      .trim()
      .min(1, {
        message: t("common:buyer_payment_validation_on_behalf_currency_required"),
      }),
    paymentDate: z.string().min(1),
    notes: z.string().optional().or(z.literal("")),
  });
export type BuyerBalanceAdjustmentFormValues = z.infer<
  ReturnType<typeof createBuyerBalanceAdjustmentFormSchema>
>;
export const createSellerBalanceTransferFormSchema = (t: TFunction) =>
  z.object({
    toCustomerId: z
      .string()
      .trim()
      .min(1, { message: t("common:seller_payment_validation_select_seller") }),
    amount: z
      .string()
      .trim()
      .min(1, { message: t("common:buyer_payment_validation_on_behalf_amount_required") })
      .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
        message: t("common:buyer_payment_validation_positive_amount"),
      }),
    currencyId: z
      .string()
      .trim()
      .min(1, {
        message: t("common:buyer_payment_validation_on_behalf_currency_required"),
      }),
    paymentDate: z.string().min(1),
    notes: z.string().optional().or(z.literal("")),
  });
export type SellerBalanceTransferFormValues = z.infer<
  ReturnType<typeof createSellerBalanceTransferFormSchema>
>;
export type FarmerRiceReturnFormValues = z.infer<
  ReturnType<typeof createFarmerRiceReturnFormSchema>
>;
