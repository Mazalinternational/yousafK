export class CreateProcessRiceDto {
  sourcePaddyProcessId: string;
  weight: string | number;
  /** Optional override; must be an active RICE variety name/code. */
  riceVariety?: string;
}
