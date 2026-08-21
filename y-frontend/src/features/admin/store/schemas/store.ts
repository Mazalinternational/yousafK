import z from "zod";

export const STORE_TYPE_OPTIONS = [
  "short_green",
  "regection",
  "broken_rice",
  "waste",
] as const;

export const STORE_ENTRY_STATUS_OPTIONS = ["stock", "sold"] as const;
export const STORE_UNIT_OPTIONS = ["seven_kg"] as const;
export const STORE_PAYMENT_CHANNEL_OPTIONS = ["cash", "saraf"] as const;

export const StoreSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const StoreSourcePaddyProcessSchema = z.object({
  id: z.string(),
  billNo: z.string(),
  variety: z.string(),
  date: z.string(),
  weight: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(STORE_UNIT_OPTIONS),
  processedWeightKg: z.union([z.string(), z.number()]).transform(String),
  sourceCompanyPaddyWarehouse: z
    .object({
      id: z.string(),
      billNo: z.string(),
      ownerName: z.string(),
    })
    .nullable()
    .optional(),
});

export const StoreEntrySchema = z.object({
  id: z.string(),
  storeType: z.enum(STORE_TYPE_OPTIONS),
  sourcePaddyProcessId: z.string(),
  processedBillNo: z.string(),
  processBillNo: z.string(),
  billNo: z.string(),
  date: z.string(),
  variety: z.string(),
  weight: z.union([z.string(), z.number()]).transform(String),
  soldWeight: z.union([z.string(), z.number()]).transform(String).optional(),
  remainingWeight: z.union([z.string(), z.number()]).transform(String).optional(),
  unit: z.enum(STORE_UNIT_OPTIONS),
  processedWeightKg: z.union([z.string(), z.number()]).transform(String),
  status: z.enum(STORE_ENTRY_STATUS_OPTIONS).optional(),
  saleAmount: z.union([z.string(), z.number()]).transform(String).optional(),
  paidInCash: z.boolean().optional(),
  paymentChannel: z.enum(STORE_PAYMENT_CHANNEL_OPTIONS).optional(),
  sarafId: z.string().nullable().optional(),
  sarafLedgerCurrencyId: z.string().nullable().optional(),
  sarafName: z.string().nullable().optional(),
  sarafCurrencyCode: z.string().nullable().optional(),
  sarafCurrencyName: z.string().nullable().optional(),
  ownerName: z.string(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: StoreSeasonSchema,
  sourcePaddyProcess: StoreSourcePaddyProcessSchema.nullable().optional(),
});

const decimalField = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
  .refine((value) => Number(value) > 0, "Must be greater than 0");

export const StoreStockFormSchema = z.object({
  storeType: z.enum(STORE_TYPE_OPTIONS),
  sourcePaddyProcessId: z.string().trim().min(1),
  billNo: z.string().optional().or(z.literal("")),
  date: z.string().optional().or(z.literal("")),
  variety: z.string().optional().or(z.literal("")),
  weight: decimalField,
  unit: z.enum(STORE_UNIT_OPTIONS).optional().or(z.literal("")),
  ownerName: z.string().optional().or(z.literal("")),
  paddyWarehouseBillNo: z.string().optional().or(z.literal("")),
});

export function createStoreSaleFormSchema(maxSoldWeight: number) {
  return z
    .object({
      soldWeight: decimalField.refine(
        (value) => Number(value) <= maxSoldWeight,
        `Cannot exceed remaining stock (${maxSoldWeight})`,
      ),
      saleAmount: decimalField,
      paymentChannel: z.enum(STORE_PAYMENT_CHANNEL_OPTIONS),
      sarafId: z.string().optional().or(z.literal("")),
      sarafLedgerCurrencyId: z.string().optional().or(z.literal("")),
    })
    .refine(
      (values) =>
        values.paymentChannel !== "saraf" ||
        (Boolean(values.sarafId?.trim()) && Boolean(values.sarafLedgerCurrencyId?.trim())),
      {
        message: "Select a Saraf and currency when Pay to Saraf is selected",
        path: ["sarafId"],
      },
    );
}

export type StoreSaleFormValues = z.infer<ReturnType<typeof createStoreSaleFormSchema>>;

export const StoreProcessOptionSchema = z.object({
  sourcePaddyProcessId: z.string(),
  billNo: z.string(),
  variety: z.string(),
  date: z.string(),
  weight: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(STORE_UNIT_OPTIONS),
  processedWeightKg: z.union([z.string(), z.number()]).transform(String),
  ownerName: z.string(),
  paddyWarehouseBillNo: z.string(),
});

export const StoreProcessOptionsSchema = z.object({
  seasonId: z.string(),
  storeType: z.enum(STORE_TYPE_OPTIONS),
  sources: z.array(StoreProcessOptionSchema),
});

export type StoreType = z.infer<typeof StoreEntrySchema>["storeType"];
export type StoreEntryStatus = z.infer<typeof StoreEntrySchema>["status"];
export type StoreEntry = z.infer<typeof StoreEntrySchema>;
export type StoreStockFormValues = z.infer<typeof StoreStockFormSchema>;
export type StoreProcessOptions = z.infer<typeof StoreProcessOptionsSchema>;

/** @deprecated Use StoreStockFormValues for add-from-process */
export type StoreEntryFormValues = StoreStockFormValues;
