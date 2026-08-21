export class CreateBuyerPaymentDto {
  amount?: string;
  paymentType?: string;
  paidAmount?: string;
  paymentChannel?: string;
  currencyId?: string;
  sarafId?: string;
  paymentDate: string;
  notes?: string;
  payOnBehalf?: boolean;
  onBehalfCustomerId?: string;
  onBehalfPaymentType?: string;
  onBehalfAmount?: string;
  onBehalfPaidAmount?: string;
  onBehalfCurrencyId?: string;
}
