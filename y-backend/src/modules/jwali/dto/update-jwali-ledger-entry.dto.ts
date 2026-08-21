export class UpdateJwaliLedgerEntryDto {
  bagCount?: number | string;
  ratePerBag?: number | string;
  currencyId?: string | null;
  occurredAt?: string;
  notes?: string | null;
}
