export class UpdateCashTransactionDto {
  currencyId?: string;
  direction?: 'in' | 'out';
  amount?: string | number;
  occurredAt?: string;
  notes?: string | null;
  seasonId?: string | null;
}
