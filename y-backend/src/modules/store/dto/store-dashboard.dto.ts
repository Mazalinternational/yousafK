export type StoreVarietyStockItem = {
  variety: string;
  entryCount: number;
  totalWeightKg: string;
  /** Remaining after sales (total − sold); ready for future sell flows */
  availableWeightKg: string;
};

export type StoreDashboardOverviewItem = {
  storeType: 'short_green' | 'regection' | 'broken_rice' | 'waste';
  label: string;
  entryCount: number;
  totalWeightKg: string;
};

export type StoreDashboardRecentItem = {
  id: string;
  storeType: string;
  billNo: string;
  variety: string;
  weight: string;
  unit: string;
  updatedAt: string;
};

export class StoreDashboardDto {
  season: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string | null;
  } | null;
  overview: StoreDashboardOverviewItem[];
  varietyByStoreType: Array<{
    storeType: string;
    varieties: StoreVarietyStockItem[];
  }>;
  recentEntries: StoreDashboardRecentItem[];
}
