import type { TFunction } from "i18next";
import z from "zod";

export const InvestorSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
});

export const InvestorSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  phoneNo: z.string().min(1),
  address: z.string().min(1),
  sharePercentage: z.string(),
  investedAmount: z.string(),
  isActive: z.boolean(),
  notes: z.string().nullable().optional(),
  seasonId: z.string(),
  seasonName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  season: InvestorSeasonSchema.nullable().optional(),
});

const createNumberField = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(1, { message: t("common:investor_validation_required") })
    .refine((value) => !Number.isNaN(Number(value)), {
      message: t("common:investor_validation_valid_number"),
    });

export const createInvestorFormSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, { message: t("common:investor_validation_required") }),
    phoneNo: z.string().trim().min(1, { message: t("common:investor_validation_required") }),
    address: z.string().trim().min(1, { message: t("common:investor_validation_required") }),
    sharePercentage: createNumberField(t).refine(
      (value) => Number(value) > 0 && Number(value) <= 100,
      { message: t("common:investor_validation_share_percentage_range") },
    ),
    investedAmount: createNumberField(t).refine((value) => Number(value) >= 0, {
      message: t("common:investor_validation_invested_amount_non_negative"),
    }),
    isActive: z.boolean().default(true),
    notes: z.string().optional().or(z.literal("")),
  });

export type Investor = z.infer<typeof InvestorSchema>;
export type InvestorFormValues = z.infer<ReturnType<typeof createInvestorFormSchema>>;
