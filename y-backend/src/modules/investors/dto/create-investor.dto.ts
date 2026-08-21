export class CreateInvestorDto {
  name: string;
  phoneNo: string;
  address: string;
  sharePercentage: string | number;
  investedAmount?: string | number;
  isActive?: boolean;
  notes?: string | null;
}
