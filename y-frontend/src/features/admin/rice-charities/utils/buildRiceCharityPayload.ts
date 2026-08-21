import type { RiceCharityFormValues } from "../schemas/rice-charity";

export function buildRiceCharityPayload(values: RiceCharityFormValues) {
  return {
    recipientName: values.recipientName.trim(),
    riceVariety: values.riceVariety,
    quantity: values.quantity,
    unit: values.unit,
    charityDate: values.charityDate,
    notes: values.notes || undefined,
  };
}
