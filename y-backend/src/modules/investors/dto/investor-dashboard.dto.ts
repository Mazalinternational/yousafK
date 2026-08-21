export class InvestorDashboardMetricDto {
  label: string;
  value: string;
  unit: 'amount' | 'count' | 'percent';
}

export class InvestorDashboardSeasonDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  startDate: Date;
  endDate?: Date | null;
}

export class InvestorProfitBreakdownDto {
  id: string;
  name: string;
  sharePercentage: string;
  investedAmount: string;
  isActive: boolean;
  projectedShareAmount: string;
}

export class InvestorDashboardDto {
  season: InvestorDashboardSeasonDto | null;
  overview: InvestorDashboardMetricDto[];
  totals: {
    totalSales: string;
    totalExpenses: string;
    totalPurchases: string;
    netProfit: string;
    distributableProfit: string;
  };
  investors: InvestorProfitBreakdownDto[];
}
