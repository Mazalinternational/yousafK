export class CreateRiceWarehouseDto {
  customerId: string;
  variety: string;
  quantity: string | number;
  unit: string;
  ownerName: string;
  rate: string | number;
  paymentType: string;
  paidAmount?: string | number;
  /** `cash`: deduct paid amount from cash for the selected currency. `saraf`: deduct from Saraf ledger. */
  paymentChannel?: string;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
  receivedDate: string;
  notes?: string;
}
