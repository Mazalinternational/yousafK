import z from "zod";
import { STORE_TYPE_OPTIONS } from "./store";

export const StoreVarietyStockItemSchema = z.object({
  variety: z.string(),
  entryCount: z.number(),
  totalWeightKg: z.string(),
  availableWeightKg: z.string(),
  remainingWeightKg: z.string().optional(),
});

export const StoreDashboardOverviewSchema = z.object({
  storeType: z.enum(STORE_TYPE_OPTIONS),
  label: z.string(),
  entryCount: z.number(),
  totalWeightKg: z.string(),
  remainingWeightKg: z.string().optional(),
});

export const StoreDashboardRecentSchema = z.object({
  id: z.string(),
  storeType: z.string(),
  billNo: z.string(),
  variety: z.string(),
  weight: z.string(),
  unit: z.string(),
  updatedAt: z.string(),
});

export const StoreDashboardSchema = z.object({
  season: z
    .object({
      id: z.string(),
      name: z.string(),
      status: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
    })
    .nullable(),
  overview: z.array(StoreDashboardOverviewSchema),
  varietyByStoreType: z.array(
    z.object({
      storeType: z.string(),
      varieties: z.array(StoreVarietyStockItemSchema),
    }),
  ),
  recentEntries: z.array(StoreDashboardRecentSchema),
});

export const StoreVarietyStockResponseSchema = z.object({
  seasonId: z.string(),
  storeType: z.enum(STORE_TYPE_OPTIONS),
  pooled: z.boolean().optional(),
  varieties: z.array(StoreVarietyStockItemSchema),
});

export type StoreDashboard = z.infer<typeof StoreDashboardSchema>;
export type StoreVarietyStockItem = z.infer<typeof StoreVarietyStockItemSchema>;
export type StoreVarietyStockResponse = z.infer<typeof StoreVarietyStockResponseSchema>;
