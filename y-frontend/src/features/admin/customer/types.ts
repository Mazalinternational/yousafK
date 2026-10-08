export type CustomersFilter = {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  type?: "paddy_farmer" | "paddy_seller" | "rice_seller" | "buyer" | "vendor" | "debtor";
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  sortByAction?: "asc" | "desc";
  seasonId?: string;
};
