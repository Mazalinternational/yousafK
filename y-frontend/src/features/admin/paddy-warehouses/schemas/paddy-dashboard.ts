import z from "zod";

export const PaddyDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.enum(["seven_kg", "kg", "ton", "amount", "count"]),
});

export const PaddyDashboardSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const PaddyDashboardCompanySummarySchema = z.object({
  totalQuantityKg: z.string(),
  totalQuantityTon: z.string(),
  entryCount: z.number(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  remainingAmount: z.string(),
  unpaidEntryCount: z.number(),
  processedQuantityKg: z.string(),
  processedQuantityTon: z.string(),
  availableQuantityKg: z.string(),
  availableQuantityTon: z.string(),
  processEntryCount: z.number(),
});

export const PaddyDashboardFarmerSummarySchema = z.object({
  totalQuantityKg: z.string(),
  totalQuantityTon: z.string(),
  entryCount: z.number(),
  totalRiceOutKg: z.string(),
  totalRiceOutTon: z.string(),
  processedQuantityKg: z.string(),
  processedQuantityTon: z.string(),
  availableQuantityKg: z.string(),
  availableQuantityTon: z.string(),
  exchangeBalanceKg: z.string(),
  exchangeBalanceTon: z.string(),
});

export const PaddyDashboardVarietyStockSchema = z.object({
  variety: z.string(),
  companyWeightKg: z.string(),
  processedQuantityKg: z.string(),
  companyAvailableKg: z.string(),
  farmerWeightKg: z.string(),
  farmerRiceOutKg: z.string(),
  farmerExchangeBalanceKg: z.string(),
  currentStockKg: z.string(),
  totalWeightKg: z.string(),
  totalWeightTon: z.string(),
  entryCount: z.number(),
});

export const PaddyDashboardMovementPointSchema = z.object({
  date: z.string(),
  companyPaddyInKg: z.string(),
  processOutKg: z.string(),
  farmerPaddyInKg: z.string(),
  riceOutKg: z.string(),
});

export const PaddyDashboardRecentMovementSchema = z.object({
  id: z.string(),
  type: z.enum(["company_purchase", "farmer_exchange", "process"]),
  ownerName: z.string(),
  date: z.string(),
  paddyVariety: z.string(),
  paddyQuantityKg: z.string(),
  paddyQuantityTon: z.string(),
  riceVariety: z.string().nullable().optional(),
  riceQuantityKg: z.string().nullable().optional(),
  riceQuantityTon: z.string().nullable().optional(),
  totalAmount: z.string().nullable().optional(),
  paymentType: z.string().nullable().optional(),
  paymentChannel: z.enum(["cash", "saraf"]).nullable().optional(),
  sarafName: z.string().nullable().optional(),
});

export const PaddyDashboardSchema = z.object({
  season: PaddyDashboardSeasonSchema.nullable(),
  overview: z.array(PaddyDashboardMetricSchema),
  companyOwned: PaddyDashboardCompanySummarySchema,
  farmerOwned: PaddyDashboardFarmerSummarySchema,
  varietyBreakdown: z.array(PaddyDashboardVarietyStockSchema),
  movementSeries: z.array(PaddyDashboardMovementPointSchema),
  recentMovements: z.array(PaddyDashboardRecentMovementSchema),
});

export type PaddyDashboard = z.infer<typeof PaddyDashboardSchema>;
