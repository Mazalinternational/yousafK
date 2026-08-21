import z from "zod";

export const InvestorDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.enum(["amount", "count", "percent"]),
});

export const InvestorDashboardSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const InvestorProfitBreakdownSchema = z.object({
  id: z.string(),
  name: z.string(),
  sharePercentage: z.string(),
  investedAmount: z.string(),
  isActive: z.boolean(),
  projectedShareAmount: z.string(),
});

export const InvestorDashboardSchema = z.object({
  season: InvestorDashboardSeasonSchema.nullable(),
  overview: z.array(InvestorDashboardMetricSchema),
  totals: z.object({
    totalSales: z.string(),
    totalExpenses: z.string(),
    totalPurchases: z.string(),
    netProfit: z.string(),
    distributableProfit: z.string(),
  }),
  investors: z.array(InvestorProfitBreakdownSchema),
});

export type InvestorDashboard = z.infer<typeof InvestorDashboardSchema>;
