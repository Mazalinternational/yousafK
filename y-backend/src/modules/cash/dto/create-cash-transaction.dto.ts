export class CreateCashTransactionDto {
  currencyId: string;
  direction: 'in' | 'out';
  amount: string | number;
  occurredAt: string;
  notes?: string;
  seasonId?: string;
}
