export class PaddyDashboardSeasonDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  startDate: Date;
  endDate?: Date | null;
}

export class PaddyDashboardMetricDto {
  label: string;
  value: string;
  unit: 'kg' | 'ton' | 'seven_kg' | 'amount' | 'count';
}

export class PaddyDashboardStockSummaryDto {
  totalQuantityKg: string;
  totalQuantityTon: string;
  entryCount: number;
}

export class PaddyDashboardCompanySummaryDto extends PaddyDashboardStockSummaryDto {
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  unpaidEntryCount: number;
  processedQuantityKg: string;
  processedQuantityTon: string;
  availableQuantityKg: string;
  availableQuantityTon: string;
  processEntryCount: number;
}

export class PaddyDashboardFarmerSummaryDto extends PaddyDashboardStockSummaryDto {
  totalRiceOutKg: string;
  totalRiceOutTon: string;
  processedQuantityKg: string;
  processedQuantityTon: string;
  availableQuantityKg: string;
  availableQuantityTon: string;
  exchangeBalanceKg: string;
  exchangeBalanceTon: string;
}

export class PaddyDashboardVarietyStockDto {
  variety: string;
  companyWeightKg: string;
  processedQuantityKg: string;
  companyAvailableKg: string;
  farmerWeightKg: string;
  farmerRiceOutKg: string;
  farmerExchangeBalanceKg: string;
  currentStockKg: string;
  totalWeightKg: string;
  totalWeightTon: string;
  entryCount: number;
}

export class PaddyDashboardMovementPointDto {
  date: string;
  companyPaddyInKg: string;
  processOutKg: string;
  farmerPaddyInKg: string;
  riceOutKg: string;
}

export class PaddyDashboardRecentMovementDto {
  id: string;
  type: 'company_purchase' | 'farmer_exchange' | 'process';
  ownerName: string;
  date: Date;
  paddyVariety: string;
  paddyQuantityKg: string;
  paddyQuantityTon: string;
  riceVariety?: string | null;
  riceQuantityKg?: string | null;
  riceQuantityTon?: string | null;
  totalAmount?: string | null;
  paymentType?: string | null;
  paymentChannel?: 'cash' | 'saraf' | null;
  sarafName?: string | null;
}

export class PaddyDashboardDto {
  season: PaddyDashboardSeasonDto | null;
  overview: PaddyDashboardMetricDto[];
  companyOwned: PaddyDashboardCompanySummaryDto;
  farmerOwned: PaddyDashboardFarmerSummaryDto;
  varietyBreakdown: PaddyDashboardVarietyStockDto[];
  movementSeries: PaddyDashboardMovementPointDto[];
  recentMovements: PaddyDashboardRecentMovementDto[];
}
