export class CreateJwaliLedgerEntryDto {
  bagCount: number | string;
  ratePerBag: number | string;
  currencyId: string;
  occurredAt: string;
  notes?: string | null;
}
