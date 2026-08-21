import type { TFunction } from "i18next";
import z from "zod";

export const RiceCharitySchema = z.object({
  id: z.string(),
  billNo: z.string(),
  recipientName: z.string(),
  riceVariety: z.string(),
  quantity: z.string(),
  unit: z.string(),
  charityDate: z.string(),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: z
    .object({
      id: z.string(),
      name: z.string(),
      status: z.enum(["ACTIVE", "CLOSED"]),
    })
    .optional(),
});

export const createRiceCharityFormSchema = (t: TFunction) => {
  const decimalField = z
    .string()
    .min(1, { message: t("common:rice_charity_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)), {
      message: t("common:rice_charity_validation_valid_number"),
    })
    .refine((value) => Number(value) > 0, {
      message: t("common:rice_charity_validation_positive_quantity"),
    });

  return z.object({
    recipientName: z
      .string()
      .trim()
      .min(1, { message: t("common:rice_charity_validation_recipient_required") }),
    riceVariety: z
      .string()
      .min(1, { message: t("common:rice_charity_validation_variety_required") }),
    quantity: decimalField,
    unit: z.enum(["seven_kg"]),
    charityDate: z
      .string()
      .min(1, { message: t("common:rice_charity_validation_date_required") }),
    notes: z.string().optional().or(z.literal("")),
  });
};

export type RiceCharity = z.infer<typeof RiceCharitySchema>;
export type RiceCharityFormValues = z.infer<ReturnType<typeof createRiceCharityFormSchema>>;
