export type StoreVarietyStockItem = {
  variety: string;
  entryCount: number;
  totalWeightKg: string;
  /** Physical remaining after stock taken for sales; used when selling. */
  availableWeightKg: string;
  /** Book remaining including extra sold beyond stock; can be negative. */
  remainingWeightKg: string;
};

export type StoreDashboardOverviewItem = {
  storeType: 'short_green' | 'regection' | 'broken_rice' | 'waste';
  label: string;
  entryCount: number;
  totalWeightKg: string;
  remainingWeightKg: string;
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
