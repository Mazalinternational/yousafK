export class FindCustomersQueryDto {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  type?:
    | 'paddy_farmer'
    | 'paddy_seller'
    | 'rice_seller'
    | 'buyer'
    | 'vendor'
    | 'debtor';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
  seasonId?: string;
}
