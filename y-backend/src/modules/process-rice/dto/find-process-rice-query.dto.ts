export class FindProcessRiceQueryDto {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
  seasonId?: string;
}
