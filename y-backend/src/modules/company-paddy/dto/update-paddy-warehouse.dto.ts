export class UpdatePaddyWarehouseDto {
  enteringPaddyId?: string;
  variety?: string;
  quantity?: string | number;
  unit?: string;
  ownerName?: string;
  rate?: string | number;
  paymentType?: string;
  paidAmount?: string | number;
  paymentChannel?: string;
  sarafId?: string | null;
  sarafLedgerCurrencyId?: string | null;
  receivedDate?: string;
  notes?: string | null;
}
