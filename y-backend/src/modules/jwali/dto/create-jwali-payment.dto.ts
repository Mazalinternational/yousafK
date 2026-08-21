export class CreateJwaliPaymentDto {
  amount: string | number;
  paymentDate: string;
  notes?: string | null;
  /** `cash` (default) or `saraf`. When `saraf`, `sarafId` is required. */
  paymentChannel?: string | null;
  /** Required for all payments. For saraf, also accepted as `sarafLedgerCurrencyId`. */
  currencyId?: string | null;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
}
