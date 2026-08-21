export class FindStoreEntriesQueryDto {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
  seasonId?: string;
  storeType?: 'short_green' | 'regection' | 'broken_rice' | 'waste';
}
