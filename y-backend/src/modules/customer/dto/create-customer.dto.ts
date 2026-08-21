export class CreateCustomerDto {
  name: string;
  type:
    | 'paddy_farmer'
    | 'paddy_seller'
    | 'rice_seller'
    | 'buyer'
    | 'vendor'
    | 'debtor';
  phoneNo: string;
  address: string;
  notes?: string;
}
