export class CreateSellerBalanceAdjustmentDto {
  /** Debit increases what we owe the seller; credit treats amount as already paid. */
  direction: 'debit' | 'credit';
  amount: string;
  currencyId: string;
  paymentDate: string;
  notes?: string;
}
