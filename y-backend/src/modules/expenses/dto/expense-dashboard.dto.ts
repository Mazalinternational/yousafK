export class ExpenseDashboardMetricDto {
  label: string;
  value: string;
  unit: 'amount' | 'count';
}

export class ExpenseDashboardSeasonDto {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  startDate: Date;
  endDate?: Date | null;
}

export class ExpenseDashboardCategoryDto {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  currencyCode: string;
  currencyName: string;
  totalAmount: string;
  entryCount: number;
}

export class ExpenseDashboardCurrencyDto {
  currencyCode: string;
  currencyName: string;
  totalAmount: string;
  entryCount: number;
}

export class ExpenseDashboardRecentDto {
  id: string;
  billNo: string;
  date: Date;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  title: string;
  amount: string;
  currencyId: string;
  currencyCode: string;
  currencyName: string;
  notes?: string | null;
}

export class ExpenseDashboardDto {
  season: ExpenseDashboardSeasonDto | null;
  overview: ExpenseDashboardMetricDto[];
  categoryBreakdown: ExpenseDashboardCategoryDto[];
  currencyBreakdown: ExpenseDashboardCurrencyDto[];
  recentExpenses: ExpenseDashboardRecentDto[];
}
