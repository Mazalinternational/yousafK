import z from "zod";
import type { TFunction } from "i18next";

export const ENTERING_PADDY_RECEIVED_FROM_OPTIONS = [
  "farmer",
  "seller",
] as const;
export const ENTERING_PADDY_WEIGHT_UNIT_OPTIONS = ["seven_kg"] as const;
export const EnteringPaddySeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const EnteringPaddyCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneNo: z.string().min(1),
  seasonId: z.string(),
  seasonName: z.string(),
});

export const EnteringPaddySchema = z.object({
  id: z.string(),
  customerId: z.string().nullable().optional(),
  paddyOwner: z.string().min(1),
  billNo: z.string().min(1),
  variety: z.string().trim().min(1),
  date: z.string(),
  weight: z.union([z.string(), z.number()]).transform(String),
  weightUnit: z.enum(ENTERING_PADDY_WEIGHT_UNIT_OPTIONS),
  totalWeightKg: z.union([z.string(), z.number()]).transform(String),
  driverName: z.string().min(1),
  carPlate: z.string().min(1),
  phoneNo: z.string().min(1),
  address: z.string().min(1),
  receivedFrom: z.enum(ENTERING_PADDY_RECEIVED_FROM_OPTIONS),
  trackedInWarehouse: z.boolean().default(false),
  trackedStockType: z.enum(["company", "farmer"]).nullable().optional(),
  trackedAt: z.string().nullable().optional(),
  trackedQuantityKg: z.union([z.string(), z.number()]).transform(String).optional(),
  remainingQuantityKg: z.union([z.string(), z.number()]).transform(String).optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: EnteringPaddySeasonSchema,
  customer: EnteringPaddyCustomerSchema.nullable().optional(),
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

export const createEnteringPaddyFormSchema = (t: TFunction) =>
  z.object({
    customerId: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    variety: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    date: z.string().min(1, { message: t("common:expense_validation_required") }),
    weight: createDecimalField(t),
    weightUnit: z.enum(ENTERING_PADDY_WEIGHT_UNIT_OPTIONS),
    driverName: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    carPlate: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    phoneNo: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    address: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    receivedFrom: z.enum(ENTERING_PADDY_RECEIVED_FROM_OPTIONS),
  });

/** @deprecated Use createEnteringPaddyFormSchema(t) for localized validation */
export const EnteringPaddyFormSchema = z.object({
  customerId: z.string().trim().min(1),
  variety: z.string().trim().min(1),
  date: z.string().min(1),
  weight: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
    .refine((value) => Number(value) > 0, "Must be greater than 0"),
  weightUnit: z.enum(ENTERING_PADDY_WEIGHT_UNIT_OPTIONS),
  driverName: z.string().trim().min(1),
  carPlate: z.string().trim().min(1),
  phoneNo: z.string().trim().min(1),
  address: z.string().trim().min(1),
  receivedFrom: z.enum(ENTERING_PADDY_RECEIVED_FROM_OPTIONS),
});

export type EnteringPaddy = z.infer<typeof EnteringPaddySchema>;
export type EnteringPaddyFormValues = z.infer<ReturnType<typeof createEnteringPaddyFormSchema>>;
