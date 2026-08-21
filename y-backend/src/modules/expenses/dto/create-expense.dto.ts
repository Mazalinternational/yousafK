export class CreateExpenseDto {
  date: string;
  categoryId: string;
  title: string;
  amount: string | number;
  currencyId: string;
  /** `direct` (default) or `vendor`. When `vendor`, `vendorId` and `paymentType` are required. */
  settlementMode?: string;
  vendorId?: string;
  paymentType?: string;
  paidAmount?: string | number;
  /** `cash` (default) or `saraf`. When `saraf`, `sarafId` is required for settled amounts. */
  paymentChannel?: string;
  sarafId?: string;
  notes?: string | null;
}
