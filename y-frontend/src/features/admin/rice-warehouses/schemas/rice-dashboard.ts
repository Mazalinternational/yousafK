import z from "zod";

export const RiceDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.enum(["seven_kg", "kg", "ton", "amount", "count"]),
});

export const RiceDashboardSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const RiceDashboardSummarySchema = z.object({
  totalInKg: z.string(),
  totalInTon: z.string(),
  totalOutKg: z.string(),
  totalOutTon: z.string(),
  currentStockKg: z.string(),
  currentStockTon: z.string(),
  entryCount: z.number(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  remainingAmount: z.string(),
  unpaidEntryCount: z.number(),
  buyerSalesTotalAmount: z.string(),
  buyerSalesPaidAmount: z.string(),
  buyerSalesRemainingAmount: z.string(),
  combinedRemainingAmount: z.string(),
  charityOutKg: z.string(),
  totalFarmerRiceObligationKg: z.string(),
  totalFarmerRiceReturnedKg: z.string(),
  totalFarmerRiceToIssueKg: z.string(),
});

export const RiceDashboardMovementPointSchema = z.object({
  date: z.string(),
  riceInKg: z.string(),
  riceOutKg: z.string(),
  netStockKg: z.string(),
});

export const RiceDashboardVarietyStockSchema = z.object({
  variety: z.string(),
  stockFromProcessKg: z.string(),
  warehouseInKg: z.string().optional(),
  totalInKg: z.string(),
  totalOutKg: z.string(),
  currentStockKg: z.string(),
  currentStockTon: z.string(),
  sellableStockKg: z.string().optional(),
  entryCount: z.number(),
  farmerRiceObligationKg: z.string(),
  farmerRiceReturnedKg: z.string(),
  farmerRiceToIssueKg: z.string(),
});

export const RiceDashboardRecentMovementSchema = z.object({
  id: z.string(),
  type: z.enum(["rice_entry", "process_rice_in", "farmer_exchange_issue", "buyer_sale", "rice_charity"]),
  ownerName: z.string(),
  date: z.string(),
  variety: z.string(),
  quantityKg: z.string(),
  quantityTon: z.string(),
  totalAmount: z.string().nullable().optional(),
  paidAmount: z.string().nullable().optional(),
  remainingAmount: z.string().nullable().optional(),
  paymentType: z.string().nullable().optional(),
  paidInCash: z.boolean().nullable().optional(),
  paymentChannel: z.enum(["cash", "saraf"]).nullable().optional(),
  sarafName: z.string().nullable().optional(),
  billNo: z.string().nullable().optional(),
});

export const RiceDashboardSchema = z.object({
  season: RiceDashboardSeasonSchema.nullable(),
  overview: z.array(RiceDashboardMetricSchema),
  summary: RiceDashboardSummarySchema,
  movementSeries: z.array(RiceDashboardMovementPointSchema),
  varietyBreakdown: z.array(RiceDashboardVarietyStockSchema),
  recentMovements: z.array(RiceDashboardRecentMovementSchema),
});

export type RiceDashboard = z.infer<typeof RiceDashboardSchema>;
