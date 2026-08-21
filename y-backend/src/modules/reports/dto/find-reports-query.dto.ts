import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export type ReportPreset = 'day' | 'week' | 'month';

export class FindReportsQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  preset?: ReportPreset;

  /** Anchor calendar date (UTC YYYY-MM-DD). Defaults to today (UTC). */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsString()
  seasonId?: string;
}
