import z from "zod";

export const SeasonStatusSchema = z.enum(["ACTIVE", "CLOSED"]);

export const SeasonSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  code: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  status: SeasonStatusSchema,
  closingNotes: z.string().nullable().optional(),
  totalSales: z.union([z.string(), z.number()]).transform(String),
  totalExpenses: z.union([z.string(), z.number()]).transform(String),
  totalPurchases: z.union([z.string(), z.number()]).transform(String),
  closedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SeasonFormSchema = SeasonSchema.pick({
  name: true,
  code: true,
  startDate: true,
  closingNotes: true,
}).extend({
  code: z.string().optional().or(z.literal("")),
  closingNotes: z.string().optional().or(z.literal("")),
});

export type Season = z.infer<typeof SeasonSchema>;
export type SeasonFormValues = z.infer<typeof SeasonFormSchema>;
