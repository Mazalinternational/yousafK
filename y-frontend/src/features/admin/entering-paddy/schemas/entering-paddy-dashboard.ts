import z from "zod";

export const EnteringPaddyDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.enum(["seven_kg", "kg", "ton", "count"]),
});

export const EnteringPaddyDashboardSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const EnteringPaddyDashboardSourceSummarySchema = z.object({
  farmerCount: z.number(),
  sellerCount: z.number(),
});

export const EnteringPaddyDashboardUnitSummarySchema = z.object({
  oneKgCount: z.number(),
  sevenKgCount: z.number(),
  tonCount: z.number(),
});

export const EnteringPaddyDashboardRecentEntrySchema = z.object({
  id: z.string(),
  billNo: z.string(),
  paddyOwner: z.string(),
  variety: z.string(),
  date: z.string(),
  totalWeightKg: z.string(),
  receivedFrom: z.enum(["farmer", "seller"]),
  driverName: z.string(),
  carPlate: z.string(),
});

export const EnteringPaddyDashboardSchema = z.object({
  season: EnteringPaddyDashboardSeasonSchema.nullable(),
  overview: z.array(EnteringPaddyDashboardMetricSchema),
  sourceSummary: EnteringPaddyDashboardSourceSummarySchema,
  unitSummary: EnteringPaddyDashboardUnitSummarySchema,
  recentEntries: z.array(EnteringPaddyDashboardRecentEntrySchema),
});

export type EnteringPaddyDashboard = z.infer<typeof EnteringPaddyDashboardSchema>;
