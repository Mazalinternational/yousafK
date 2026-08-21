import z from "zod";
import { ExpenseSeasonSchema } from "./expense";

export const ExpenseDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.enum(["amount", "count"]),
});

export const ExpenseDashboardCategorySchema = z.object({
  categoryId: z.string(),
  categoryCode: z.string(),
  categoryName: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  totalAmount: z.string(),
  entryCount: z.number(),
});

export const ExpenseDashboardCurrencySchema = z.object({
  currencyCode: z.string(),
  currencyName: z.string(),
  totalAmount: z.string(),
  entryCount: z.number(),
});

export const ExpenseDashboardRecentSchema = z.object({
  id: z.string(),
  billNo: z.string(),
  date: z.string(),
  categoryId: z.string(),
  categoryCode: z.string(),
  categoryName: z.string(),
  title: z.string(),
  amount: z.string(),
  currencyId: z.string(),
  currencyCode: z.string(),
  currencyName: z.string(),
  notes: z.string().nullable().optional(),
});

export const ExpenseDashboardSchema = z.object({
  season: ExpenseSeasonSchema.nullable(),
  overview: z.array(ExpenseDashboardMetricSchema),
  categoryBreakdown: z.array(ExpenseDashboardCategorySchema),
  currencyBreakdown: z.array(ExpenseDashboardCurrencySchema),
  recentExpenses: z.array(ExpenseDashboardRecentSchema),
});

export type ExpenseDashboard = z.infer<typeof ExpenseDashboardSchema>;
