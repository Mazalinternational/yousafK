export class EnteringPaddyDashboardSeasonDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  startDate: Date;
  endDate?: Date | null;
}

export class EnteringPaddyDashboardMetricDto {
  label: string;
  value: string;
  unit: 'kg' | 'ton' | 'seven_kg' | 'count';
}

export class EnteringPaddyDashboardSourceSummaryDto {
  farmerCount: number;
  sellerCount: number;
}

export class EnteringPaddyDashboardUnitSummaryDto {
  oneKgCount: number;
  sevenKgCount: number;
  tonCount: number;
}

export class EnteringPaddyDashboardRecentEntryDto {
  id: string;
  billNo: string;
  paddyOwner: string;
  variety: string;
  date: Date;
  totalWeightKg: string;
  receivedFrom: 'farmer' | 'seller';
  driverName: string;
  carPlate: string;
}

export class EnteringPaddyDashboardDto {
  season: EnteringPaddyDashboardSeasonDto | null;
  overview: EnteringPaddyDashboardMetricDto[];
  sourceSummary: EnteringPaddyDashboardSourceSummaryDto;
  unitSummary: EnteringPaddyDashboardUnitSummaryDto;
  recentEntries: EnteringPaddyDashboardRecentEntryDto[];
}
