export class CreateSellerBalanceTransferDto {
  toCustomerId: string;
  amount: string;
  currencyId: string;
  paymentDate: string;
  notes?: string;
}
