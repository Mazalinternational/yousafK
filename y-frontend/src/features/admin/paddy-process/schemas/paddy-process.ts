import z from "zod";
import type { TFunction } from "i18next";

export const PADDY_PROCESS_UNIT_OPTIONS = ["seven_kg"] as const;

export const PADDY_WAREHOUSE_STOCK_SOURCE_TYPES = ["company", "farmer"] as const;

export const PADDY_PROCESS_FROM_STORE_TYPES = [
  "short_green",
  "regection",
  "broken_rice",
] as const;

export const PADDY_PROCESS_STOCK_SOURCE_TYPES = [
  ...PADDY_WAREHOUSE_STOCK_SOURCE_TYPES,
  ...PADDY_PROCESS_FROM_STORE_TYPES,
] as const;

export const PaddyProcessSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const PaddyProcessStoreOutputsSchema = z.object({
  regection: z.boolean(),
  short_green: z.boolean(),
  broken_rice: z.boolean(),
  waste: z.boolean(),
});

export const PaddyProcessSourceSchema = z.object({
  id: z.string(),
  billNo: z.string(),
  variety: z.string(),
  quantity: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(PADDY_PROCESS_UNIT_OPTIONS),
  ownerName: z.string(),
  receivedDate: z.string(),
});

export const PaddyProcessSchema = z.object({
  id: z.string(),
  stockSourceType: z.enum(PADDY_PROCESS_STOCK_SOURCE_TYPES),
  sourceCompanyPaddyWarehouseId: z.string().nullable().optional(),
  sourceFarmerPaddyWarehouseId: z.string().nullable().optional(),
  sourceWarehouseKey: z.string().optional(),
  billNo: z.string(),
  status: z.enum(["under_process", "process_completed"]).optional(),
  riceExtracted: z.boolean().optional(),
  storeOutputs: PaddyProcessStoreOutputsSchema.optional(),
  variety: z.string(),
  date: z.string(),
  endDate: z.string().nullable().optional(),
  weight: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(PADDY_PROCESS_UNIT_OPTIONS),
  processedWeightKg: z.union([z.string(), z.number()]).transform(String),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: PaddyProcessSeasonSchema,
  sourceCompanyPaddyWarehouse: PaddyProcessSourceSchema.nullable().optional(),
  sourceFarmerPaddyWarehouse: PaddyProcessSourceSchema.nullable().optional(),
});

const createPositiveDecimalField = (t: TFunction) =>
  z
    .string()
    .min(1, { message: t("common:expense_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)), {
      message: t("common:expense_validation_valid_number"),
    })
    .refine((value) => Number(value) > 0, {
      message: t("common:expense_validation_positive_amount"),
    });

export const createPaddyProcessFormSchema = (t: TFunction) =>
  z.object({
    stockSourceType: z.enum(PADDY_WAREHOUSE_STOCK_SOURCE_TYPES),
    billNo: z.string().optional().or(z.literal("")),
    variety: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    date: z.string().min(1, { message: t("common:expense_validation_required") }),
    weight: createPositiveDecimalField(t),
    unit: z.enum(PADDY_PROCESS_UNIT_OPTIONS),
  });

export const createPaddyProcessFromStoreFormSchema = (t: TFunction) =>
  z.object({
    stockSourceType: z.enum(PADDY_PROCESS_FROM_STORE_TYPES),
    billNo: z.string().optional().or(z.literal("")),
    date: z.string().min(1, { message: t("common:expense_validation_required") }),
    weight: createPositiveDecimalField(t),
    unit: z.enum(PADDY_PROCESS_UNIT_OPTIONS),
  });

/** @deprecated Use createPaddyProcessFormSchema(t) for localized validation */
export const PaddyProcessFormSchema = z.object({
  stockSourceType: z.enum(["company", "farmer"]),
  billNo: z.string().optional().or(z.literal("")),
  variety: z.string().trim().min(1),
  date: z.string().min(1),
  weight: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
    .refine((value) => Number(value) > 0, "Must be greater than 0"),
  unit: z.enum(PADDY_PROCESS_UNIT_OPTIONS),
});

export const PaddyProcessAvailabilitySourceSchema = z.object({
  stockSourceType: z.enum(["company", "farmer"]),
  sourceWarehouseKey: z.string(),
  sourceCompanyPaddyWarehouseId: z.string().nullable(),
  sourceFarmerPaddyWarehouseId: z.string().nullable(),
  billNo: z.string(),
  ownerName: z.string(),
  variety: z.string(),
  date: z.string(),
  quantity: z.string(),
  unit: z.enum(PADDY_PROCESS_UNIT_OPTIONS),
  sourceQuantityKg: z.string(),
  availableQuantityKg: z.string(),
  availableQuantityTon: z.string(),
});

export const PaddyProcessAvailabilitySchema = z.object({
  seasonId: z.string(),
  variety: z.string().nullable().optional(),
  varietyCompanyStockAvailableKg: z.string().nullable().optional(),
  varietyFarmerStockAvailableKg: z.string().nullable().optional(),
  varietyStockAvailableKg: z.string().nullable().optional(),
  totalAvailableQuantityKg: z.string(),
  totalAvailableQuantityTon: z.string(),
  sources: z.array(PaddyProcessAvailabilitySourceSchema),
});

export const PaddyProcessStoreAvailabilitySchema = z.object({
  seasonId: z.string(),
  storeType: z.enum(PADDY_PROCESS_FROM_STORE_TYPES),
  availableWeightKg: z.string(),
});

export type PaddyProcess = z.infer<typeof PaddyProcessSchema>;
export type PaddyProcessFormValues = z.infer<ReturnType<typeof createPaddyProcessFormSchema>>;
export type PaddyProcessFromStoreFormValues = z.infer<
  ReturnType<typeof createPaddyProcessFromStoreFormSchema>
>;
export type PaddyProcessAvailability = z.infer<typeof PaddyProcessAvailabilitySchema>;
export type PaddyProcessStoreAvailability = z.infer<typeof PaddyProcessStoreAvailabilitySchema>;
