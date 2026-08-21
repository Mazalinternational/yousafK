export class FindExpenseCategoriesQueryDto {
  pageNumber?: string | number;
  pageSize?: string | number;
  query?: string;
  isActive?: string;
  sortBy?: string;
  sortDirection?: string;
  sortByAction?: string;
}
