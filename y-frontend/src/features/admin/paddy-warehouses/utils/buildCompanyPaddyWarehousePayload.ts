import type { PaddyWarehouseFormValues } from "../schemas/paddy-warehouse";

/**
 * Build the company-paddy create/update body.
 * When linked to an entering-paddy row, omit ownerName/variety/quantity/date —
 * the API copies those from the source. That also avoids host WAF false
 * positives on Pashto/Dari text in JSON bodies.
 */
export function buildCompanyPaddyWarehousePayload(values: PaddyWarehouseFormValues) {
  const enteringPaddyId = values.enteringPaddyId?.trim() || "";
  const payload: Record<string, unknown> = {
    rate: values.rate,
    paymentType: values.paymentType,
    paymentChannel: values.paymentChannel,
  };

  if (enteringPaddyId) {
    payload.enteringPaddyId = enteringPaddyId;
  } else {
    payload.variety = values.variety;
    payload.quantity = values.quantity;
    payload.unit = values.unit;
    payload.ownerName = values.ownerName;
    payload.receivedDate = values.receivedDate;
  }

  if (values.paymentType === "partial_paid") {
    payload.paidAmount = values.paidAmount?.trim() || "0";
  }

  if (values.paymentChannel === "saraf") {
    payload.sarafId = values.sarafId?.trim();
    payload.sarafLedgerCurrencyId = values.sarafLedgerCurrencyId?.trim();
  } else if (values.sarafLedgerCurrencyId?.trim()) {
    payload.sarafLedgerCurrencyId = values.sarafLedgerCurrencyId.trim();
  }

  const notes = values.notes?.trim();
  if (notes) {
    payload.notes = notes;
  }

  return payload;
}
