export class PaddyProcessDashboardMetricDto {
  label: string;
  value: string;
  unit: 'kg' | 'ton' | 'seven_kg' | 'count';
}

export class PaddyProcessDashboardSeasonDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  startDate: Date;
  endDate?: Date | null;
}

export class PaddyProcessDashboardDto {
  season: PaddyProcessDashboardSeasonDto | null;
  overview: PaddyProcessDashboardMetricDto[];
  recentProcesses: Record<string, unknown>[];
}
