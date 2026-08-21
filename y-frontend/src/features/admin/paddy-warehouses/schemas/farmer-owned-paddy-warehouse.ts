import z from "zod";
import type { TFunction } from "i18next";
import { PADDY_UNIT_OPTIONS } from "./paddy-warehouse";

export const FARMER_PADDY_STOCK_TYPE = "farmer" as const;

export const FarmerOwnedPaddyWarehouseSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const FarmerOwnedPaddyEnteringSummarySchema = z.object({
  id: z.string(),
  billNo: z.string(),
  paddyOwner: z.string(),
  receivedFrom: z.enum(["farmer", "seller"]),
  trackedInWarehouse: z.boolean(),
  trackedStockType: z.enum(["company", "farmer"]).nullable().optional(),
});

export const FarmerOwnedPaddyWarehouseSchema = z.object({
  id: z.string(),
  enteringPaddyId: z.string().nullable().optional(),
  billNo: z.string().min(1),
  enteringBillNo: z.string().nullable().optional(),
  stockType: z.literal(FARMER_PADDY_STOCK_TYPE),
  paddyVariety: z.string().min(1),
  paddyQuantity: z.union([z.string(), z.number()]).transform(String),
  riceVariety: z.string().min(1),
  riceQuantity: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(PADDY_UNIT_OPTIONS),
  ownerName: z.string().min(1),
  receivedDate: z.string(),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: FarmerOwnedPaddyWarehouseSeasonSchema,
  enteringPaddy: FarmerOwnedPaddyEnteringSummarySchema.nullable().optional(),
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

export const createFarmerOwnedPaddyWarehouseFormSchema = (t: TFunction) =>
  z
    .object({
      enteringPaddyId: z.string().trim().optional().or(z.literal("")),
      billNo: z.string().trim().optional().or(z.literal("")),
      enteringBillNo: z.string().trim().optional().or(z.literal("")),
      paddyVariety: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      paddyQuantity: createPositiveDecimalField(t),
      riceVariety: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      riceQuantity: createPositiveDecimalField(t),
      unit: z.enum(PADDY_UNIT_OPTIONS),
      ownerName: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
      receivedDate: z.string().min(1, { message: t("common:expense_validation_required") }),
      notes: z.string().optional().or(z.literal("")),
    })
    .superRefine((values, ctx) => {
      if (!values.paddyQuantity || !values.riceQuantity) {
        return;
      }

      const paddyQuantity = Number(values.paddyQuantity);
      const riceQuantity = Number(values.riceQuantity);

      if (Number.isNaN(paddyQuantity) || Number.isNaN(riceQuantity)) {
        return;
      }

      if (paddyQuantity <= riceQuantity) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("common:farmer_owned_paddy_validation_rice_exceeds_paddy"),
          path: ["riceQuantity"],
        });
      }
    });

/** @deprecated Use createFarmerOwnedPaddyWarehouseFormSchema(t) for localized validation */
export const FarmerOwnedPaddyWarehouseFormSchema = z
  .object({
    enteringPaddyId: z.string().trim().optional().or(z.literal("")),
    billNo: z.string().trim().optional().or(z.literal("")),
    enteringBillNo: z.string().trim().optional().or(z.literal("")),
    paddyVariety: z.string().trim().min(1),
    paddyQuantity: z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
      .refine((value) => Number(value) > 0, "Must be greater than 0"),
    riceVariety: z.string().trim().min(1),
    riceQuantity: z
      .string()
      .min(1)
      .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
      .refine((value) => Number(value) > 0, "Must be greater than 0"),
    unit: z.enum(PADDY_UNIT_OPTIONS),
    ownerName: z.string().trim().min(1),
    receivedDate: z.string().min(1),
    notes: z.string().optional().or(z.literal("")),
  })
  .superRefine((values, ctx) => {
    if (!values.paddyQuantity || !values.riceQuantity) {
      return;
    }

    const paddyQuantity = Number(values.paddyQuantity);
    const riceQuantity = Number(values.riceQuantity);

    if (Number.isNaN(paddyQuantity) || Number.isNaN(riceQuantity)) {
      return;
    }

    if (paddyQuantity <= riceQuantity) {
      ctx.addIssue({
        code: "custom",
        message: "Paddy quantity must be greater than rice quantity",
        path: ["riceQuantity"],
      });
    }
  });

export type FarmerOwnedPaddyWarehouse = z.infer<
  typeof FarmerOwnedPaddyWarehouseSchema
>;
export type FarmerOwnedPaddyWarehouseFormValues = z.infer<
  ReturnType<typeof createFarmerOwnedPaddyWarehouseFormSchema>
>;

export type RiceAvailability = {
  seasonId: string;
  variety: string;
  availableQuantityKg: string;
  availableQuantityTon: string;
};
