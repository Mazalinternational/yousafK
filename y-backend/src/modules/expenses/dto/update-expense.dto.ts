export class UpdateExpenseDto {
  date?: string;
  categoryId?: string;
  title?: string;
  amount?: string | number;
  currencyId?: string;
  settlementMode?: string;
  vendorId?: string;
  paymentType?: string;
  paidAmount?: string | number;
  paymentChannel?: string;
  sarafId?: string;
  notes?: string | null;
}
