export class FindRiceWarehousesQueryDto {
  pageNumber?: number | string;
  pageSize?: number | string;
  query?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
  seasonId?: string;
}
