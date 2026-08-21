export type SeasonsFilter = {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
  status?: "ACTIVE" | "CLOSED";
};
