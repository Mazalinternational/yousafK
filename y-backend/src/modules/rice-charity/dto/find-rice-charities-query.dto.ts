export class FindRiceCharitiesQueryDto {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  seasonId?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
}
