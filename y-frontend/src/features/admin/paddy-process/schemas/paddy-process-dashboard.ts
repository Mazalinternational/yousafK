import z from "zod";
import { PaddyProcessSchema } from "./paddy-process";

export const PaddyProcessDashboardMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.enum(["seven_kg", "kg", "ton", "count"]),
});

export const PaddyProcessDashboardSeasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["ACTIVE", "CLOSED"]),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
});

export const PaddyProcessDashboardSchema = z.object({
  season: PaddyProcessDashboardSeasonSchema.nullable(),
  overview: z.array(PaddyProcessDashboardMetricSchema),
  recentProcesses: z.array(PaddyProcessSchema),
});

export type PaddyProcessDashboard = z.infer<typeof PaddyProcessDashboardSchema>;
