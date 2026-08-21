export class UpdateLedgerEntryDto {
  amount?: string;
  paymentType?: string;
  paidAmount?: string;
  paymentChannel?: string;
  currencyId?: string;
  sarafId?: string;
  paymentDate?: string;
  notes?: string;
  riceQuantity?: string;
  riceVariety?: string;
  unit?: string;
  returnDate?: string;
  scheduledFor?: string | null;
}
