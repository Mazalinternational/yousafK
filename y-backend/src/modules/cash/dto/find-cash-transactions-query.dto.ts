export class FindCashTransactionsQueryDto {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  currencyId?: string;
  direction?: string;
  seasonId?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
}
