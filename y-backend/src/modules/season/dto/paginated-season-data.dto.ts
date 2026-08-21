import { SeasonDataDto } from './season-data.dto.js';

export class PaginatedSeasonDataDto {
  items: SeasonDataDto[];
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
