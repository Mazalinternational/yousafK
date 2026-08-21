import { SeasonDataDto } from './season-data.dto.js';

export class SeasonSingleResponseDto {
  statusCode: number;
  message: string;
  data: SeasonDataDto;
}
