export class FindCurrenciesQueryDto {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  isActive?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
}
