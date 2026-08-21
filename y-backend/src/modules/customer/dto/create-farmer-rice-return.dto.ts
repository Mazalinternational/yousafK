export class CreateFarmerRiceReturnDto {
  riceQuantity: string;
  riceVariety: string;
  unit: string;
  returnDate: string;
  scheduledFor?: string | null;
  notes?: string;
}
