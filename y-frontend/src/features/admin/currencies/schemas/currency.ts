import type { TFunction } from "i18next";
import z from "zod";

const createCurrencyCodeField = (t: TFunction) =>
  z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(
      z.string().regex(/^[A-Z]{3}$/, {
        message: t("common:currency_validation_code_format"),
      }),
    );

export const CurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createCurrencyCreateFormSchema = (t: TFunction) =>
  z.object({
    code: createCurrencyCodeField(t),
    name: z.string().optional().or(z.literal("")),
  });

export const createCurrencyUpdateFormSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: t("common:currency_validation_name_required") }),
    isActive: z.boolean(),
  });

export type Currency = z.infer<typeof CurrencySchema>;
export type CurrencyCreateFormValues = z.infer<
  ReturnType<typeof createCurrencyCreateFormSchema>
>;
export type CurrencyUpdateFormValues = z.infer<
  ReturnType<typeof createCurrencyUpdateFormSchema>
>;
