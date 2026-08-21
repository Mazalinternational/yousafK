export class CreatePaddyWarehouseDto {
  enteringPaddyId?: string;
  billNo?: string;
  variety: string;
  quantity: string | number;
  unit: string;
  ownerName: string;
  rate: string | number;
  paymentType: string;
  paidAmount?: string | number;
  /** `cash` (default): seller payment on paddy dashboard only. `saraf`: also posts to Saraf ledger (negative amount). */
  paymentChannel?: string;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
  receivedDate: string;
  notes?: string;
}
