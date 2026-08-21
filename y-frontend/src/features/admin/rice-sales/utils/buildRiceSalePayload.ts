import type { RiceSaleFormValues } from "../schemas/rice-sale";

export function buildRiceSalePayload(values: RiceSaleFormValues) {
  const payload: Record<string, unknown> = {
    buyerCustomerId: values.buyerCustomerId,
    riceVariety: values.riceVariety,
    quantity: values.quantity,
    unit: values.unit,
    saleDate: values.saleDate,
    totalAmount:
      values.totalAmount?.trim() ||
      (Number(values.quantity) * Number(values.ratePerSeer)).toFixed(2),
    loadingAmount: values.loadingAmount || "0",
    riceBagsAmount: values.riceBagsAmount || "0",
    paymentType: values.paymentType,
    paymentChannel: values.paymentChannel,
    notes: values.notes || undefined,
  };

  if (values.paymentType === "partial_paid") {
    payload.paidAmount = values.paidAmount?.trim() || "0";
  }

  if (values.paymentChannel === "saraf") {
    payload.sarafId = values.sarafId?.trim();
    payload.sarafLedgerCurrencyId = values.sarafLedgerCurrencyId?.trim();
  }

  if (
    values.paymentChannel === "cash" &&
    values.sarafLedgerCurrencyId?.trim()
  ) {
    payload.sarafLedgerCurrencyId = values.sarafLedgerCurrencyId.trim();
  }

  return payload;
}
