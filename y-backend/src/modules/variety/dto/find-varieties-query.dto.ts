export class FindVarietiesQueryDto {
  kind!: string;
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  isActive?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
}
