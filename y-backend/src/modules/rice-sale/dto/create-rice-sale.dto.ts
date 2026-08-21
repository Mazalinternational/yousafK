export class CreateRiceSaleDto {
  buyerCustomerId: string;
  riceVariety: string;
  quantity: string | number;
  unit: string;
  saleDate: string;
  /** Rice value only (quantity × rate). */
  totalAmount: string | number;
  loadingAmount?: string | number | null;
  loadingPaymentChannel?: string | null;
  loadingSarafId?: string | null;
  loadingCurrencyId?: string | null;
  riceBagsAmount?: string | number | null;
  bagsPaymentChannel?: string | null;
  bagsSarafId?: string | null;
  bagsCurrencyId?: string | null;
  /** Same semantics as rice warehouse: `paid`, `partial_paid`, or `remaining`. */
  paymentType: string;
  /** Required when paymentType is `partial_paid`: amount received now (must be less than invoice total). */
  paidAmount?: string | number | null;
  /**
   * `cash` (default): rice charge collected via cash-in.
   * `saraf`: rice charge collected via Saraf ledger.
   */
  paymentChannel?: string;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
  notes?: string;
}
