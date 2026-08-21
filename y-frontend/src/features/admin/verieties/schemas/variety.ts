import z from "zod";
import type { TFunction } from "i18next";

export const ApiVarietyKindSchema = z.enum(["RICE", "PADDY", "PROCESS_PRODUCTION"]);
export type ApiVarietyKind = z.infer<typeof ApiVarietyKindSchema>;

const createVarietyCodeField = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(1, { message: t("common:expense_validation_required") })
    .max(64)
    .regex(/^[A-Za-z0-9._\- ]+$/, {
      message: t("common:veriety_validation_code_format"),
    });

export const VarietySchema = z.object({
  id: z.string(),
  kind: ApiVarietyKindSchema,
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createVarietyCreateFormSchema = (t: TFunction) =>
  z.object({
    code: createVarietyCodeField(t),
    name: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
  });

export const createVarietyUpdateFormSchema = (t: TFunction) =>
  z.object({
    name: z.string().trim().min(1, { message: t("common:expense_validation_required") }),
    isActive: z.boolean(),
  });

/** @deprecated Use createVarietyCreateFormSchema(t) for localized validation */
export const VarietyCreateFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, { message: "Code is required" })
    .max(64)
    .regex(/^[A-Za-z0-9._\- ]+$/, {
      message: "Use letters, digits, spaces, dot, underscore, or hyphen only",
    }),
  name: z.string().trim().min(1, { message: "Name is required" }),
});

/** @deprecated Use createVarietyUpdateFormSchema(t) for localized validation */
export const VarietyUpdateFormSchema = z.object({
  name: z.string().trim().min(1),
  isActive: z.boolean(),
});

export type Variety = z.infer<typeof VarietySchema>;
export type VarietyCreateFormValues = z.infer<ReturnType<typeof createVarietyCreateFormSchema>>;
export type VarietyUpdateFormValues = z.infer<ReturnType<typeof createVarietyUpdateFormSchema>>;
