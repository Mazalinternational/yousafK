export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  firstPageNumber: number;
  lastPageNumber: number;
}
