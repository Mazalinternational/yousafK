export class CreateCompanyPaymentDto {
  amount: string;
  paymentType: string;
  paidAmount?: string;
  paymentChannel?: string;
  currencyId?: string;
  sarafId?: string;
  paymentDate: string;
  notes?: string;
}
