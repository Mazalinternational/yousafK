export class CreateStoreVarietySaleDto {
  storeType: string;
  variety: string;
  buyerCustomerId: string;
  soldWeight: string | number;
  unit?: string;
  saleDate: string;
  /** Product sale value only. */
  totalAmount: string | number;
  loadingAmount?: string | number | null;
  riceBagsAmount?: string | number | null;
  paymentType?: string;
  paidAmount?: string | number | null;
  paymentChannel?: string;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
  notes?: string;
}
