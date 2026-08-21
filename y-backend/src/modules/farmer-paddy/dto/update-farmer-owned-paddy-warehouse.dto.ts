export class UpdateFarmerOwnedPaddyWarehouseDto {
  enteringPaddyId?: string;
  paddyVariety?: string;
  paddyQuantity?: string | number;
  riceVariety?: string;
  riceQuantity?: string | number;
  unit?: string;
  ownerName?: string;
  receivedDate?: string;
  notes?: string | null;
}
