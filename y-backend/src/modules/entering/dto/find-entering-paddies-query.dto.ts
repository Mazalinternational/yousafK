export class FindEnteringPaddiesQueryDto {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortByAction?: 'asc' | 'desc';
  seasonId?: string;
  receivedFrom?: 'farmer' | 'seller';
  trackedInWarehouse?: boolean | 'true' | 'false';
}
