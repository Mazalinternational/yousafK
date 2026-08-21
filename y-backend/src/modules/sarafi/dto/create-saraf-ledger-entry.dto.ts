export class CreateSarafLedgerEntryDto {
  currencyId: string;
  /** Cash given to the Saraf (`in`) or withdrawn from the Saraf (`out`). Defaults to `in`. */
  direction?: 'in' | 'out';
  amount: number | string;
  occurredAt: string;
  notes?: string | null;
}
