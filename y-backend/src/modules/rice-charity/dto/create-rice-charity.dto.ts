export class CreateRiceCharityDto {
  recipientName: string;
  riceVariety: string;
  quantity: string | number;
  unit: string;
  charityDate: string;
  notes?: string;
}
