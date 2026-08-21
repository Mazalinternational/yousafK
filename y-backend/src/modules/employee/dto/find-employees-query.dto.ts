export class FindEmployeesQueryDto {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  status?: 'active' | 'inactive';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
  seasonId?: string;
}
