export class UpdateRiceSaleDto {
  buyerCustomerId: string;
  riceVariety: string;
  quantity: string | number;
  unit: string;
  saleDate: string;
  /** Rice value only (quantity × rate). */
  totalAmount: string | number;
  loadingAmount?: string | number | null;
  riceBagsAmount?: string | number | null;
  /** Same semantics as rice warehouse: `paid`, `partial_paid`, or `remaining`. */
  paymentType: string;
  /** Required when paymentType is `partial_paid`. */
  paidAmount?: string | number | null;
  paymentChannel?: string;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
  notes?: string;
}
