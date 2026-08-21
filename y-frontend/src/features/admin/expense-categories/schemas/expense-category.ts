import z from "zod";

const categoryCodeField = z
  .string()
  .trim()
  .transform((v) =>
    v
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, ""),
  )
  .pipe(
    z
      .string()
      .min(2, { message: "Must be at least 2 characters" })
      .max(32, { message: "Must be at most 32 characters" }),
  );

export const ExpenseCategorySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ExpenseCategoryCreateFormSchema = z.object({
  code: categoryCodeField,
  name: z.string().optional().or(z.literal("")),
});

export const ExpenseCategoryUpdateFormSchema = z.object({
  name: z.string().trim().min(1),
  isActive: z.boolean(),
});

export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
export type ExpenseCategoryCreateFormValues = z.infer<
  typeof ExpenseCategoryCreateFormSchema
>;
export type ExpenseCategoryUpdateFormValues = z.infer<
  typeof ExpenseCategoryUpdateFormSchema
>;
