export class FindStoreVarietySalesQueryDto {
  storeType?: string;
  seasonId?: string;
  variety?: string;
  query?: string;
  pageNumber?: string | number;
  pageSize?: string | number;
  sortBy?: string;
  sortByAction?: string;
  sortDirection?: string;
}
