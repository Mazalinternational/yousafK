export class CreateCreditRepaymentDto {
  amount: string | number;
  paymentDate: string;
  notes?: string | null;
  /** `cash` (default) or `saraf`. `sarafLedgerCurrencyId` is required for both; `sarafId` is required when `saraf`. */
  paymentChannel?: string | null;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
}
