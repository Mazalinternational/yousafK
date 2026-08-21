import z from "zod";
import type { TFunction } from "i18next";

export const PROCESS_RICE_UNIT_OPTIONS = ["seven_kg"] as const;

export const ProcessRiceSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const ProcessRiceSourceSchema = z.object({
  id: z.string(),
  billNo: z.string(),
  variety: z.string(),
  date: z.string(),
  weight: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(PROCESS_RICE_UNIT_OPTIONS),
  processedWeightKg: z.union([z.string(), z.number()]).transform(String),
});

export const ProcessRiceSchema = z.object({
  id: z.string(),
  sourcePaddyProcessId: z.string(),
  processedBillNo: z.string(),
  billNo: z.string(),
  date: z.string(),
  variety: z.string(),
  weight: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(PROCESS_RICE_UNIT_OPTIONS),
  processedWeightKg: z.union([z.string(), z.number()]).transform(String),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: ProcessRiceSeasonSchema,
  sourcePaddyProcess: ProcessRiceSourceSchema.nullable().optional(),
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

export const createProcessRiceFormSchema = (t: TFunction) =>
  z.object({
    sourcePaddyProcessId: z
      .string()
      .trim()
      .min(1, { message: t("common:expense_validation_required") }),
    processedBillNo: z.string().optional().or(z.literal("")),
    billNo: z.string().optional().or(z.literal("")),
    date: z.string().optional().or(z.literal("")),
    riceVariety: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    weight: createPositiveDecimalField(t),
    unit: z.string().optional().or(z.literal("")),
  });

/** @deprecated Use createProcessRiceFormSchema(t) for localized validation */
export const ProcessRiceFormSchema = z.object({
  sourcePaddyProcessId: z.string().trim().min(1),
  processedBillNo: z.string().optional().or(z.literal("")),
  billNo: z.string().optional().or(z.literal("")),
  date: z.string().optional().or(z.literal("")),
  riceVariety: z.string().trim().min(1),
  weight: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Number(value)), "Must be a valid number")
    .refine((value) => Number(value) > 0, "Must be greater than 0"),
  unit: z.string().optional().or(z.literal("")),
});

export const ProcessRiceOptionSchema = z.object({
  sourcePaddyProcessId: z.string(),
  billNo: z.string(),
  variety: z.string(),
  date: z.string(),
  weight: z.union([z.string(), z.number()]).transform(String),
  unit: z.enum(PROCESS_RICE_UNIT_OPTIONS),
  processedWeightKg: z.union([z.string(), z.number()]).transform(String),
});

export const ProcessRiceOptionsSchema = z.object({
  seasonId: z.string(),
  sources: z.array(ProcessRiceOptionSchema),
});

export type ProcessRice = z.infer<typeof ProcessRiceSchema>;
export type ProcessRiceFormValues = z.infer<ReturnType<typeof createProcessRiceFormSchema>>;
export type ProcessRiceOptions = z.infer<typeof ProcessRiceOptionsSchema>;
