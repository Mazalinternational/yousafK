export class UpdateSeasonDto {
  name?: string;
  code?: string;
  startDate?: string;
  endDate?: string | null;
  closingNotes?: string | null;
}
