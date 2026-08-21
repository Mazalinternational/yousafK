import { PaginatedSeasonDataDto } from './paginated-season-data.dto.js';

export class SeasonListResponseDto {
  statusCode: number;
  message: string;
  data: PaginatedSeasonDataDto;
}
