import type { FarmerOwnedPaddyWarehouseFormValues } from "../schemas/farmer-owned-paddy-warehouse";

/**
 * When linked to entering paddy, omit ownerName / paddy quantity fields that the
 * API resolves from the source — reduces WAF false positives on Dari/Pashto text.
 */
export function buildFarmerOwnedPaddyWarehousePayload(
  values: FarmerOwnedPaddyWarehouseFormValues,
) {
  const enteringPaddyId = values.enteringPaddyId?.trim() || "";
  const payload: Record<string, unknown> = {
    riceVariety: values.riceVariety,
    riceQuantity: values.riceQuantity,
    unit: values.unit,
  };

  if (enteringPaddyId) {
    payload.enteringPaddyId = enteringPaddyId;
  } else {
    payload.paddyVariety = values.paddyVariety;
    payload.paddyQuantity = values.paddyQuantity;
    payload.ownerName = values.ownerName;
    payload.receivedDate = values.receivedDate;
  }

  const notes = values.notes?.trim();
  if (notes) {
    payload.notes = notes;
  }

  return payload;
}
