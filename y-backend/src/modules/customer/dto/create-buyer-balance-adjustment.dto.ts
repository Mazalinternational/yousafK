export class CreateBuyerBalanceAdjustmentDto {
  /** Increases what the buyer owes (collection outstanding). */
  direction: 'debit' | 'credit';
  amount: string;
  currencyId: string;
  paymentDate: string;
  notes?: string;
}
