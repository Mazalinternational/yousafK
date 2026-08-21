export class CreateFarmerOwnedPaddyWarehouseDto {
  enteringPaddyId?: string;
  billNo?: string;
  paddyVariety: string;
  paddyQuantity: string | number;
  riceVariety: string;
  riceQuantity: string | number;
  unit: string;
  ownerName: string;
  receivedDate: string;
  notes?: string;
}
