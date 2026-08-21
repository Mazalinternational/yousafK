import type { CustomerLedgerEntry } from "../schemas/customer";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";

export type BuyerLedgerEntryTypeFilter =
  | "all"
  | "buyer_rice_sale"
  | "process_production_store_sale"
  | "buyer_payment"
  | "buyer_payment_on_behalf"
  | "buyer_payment_received_on_behalf"
  | "buyer_debit"
  | "buyer_credit";

export type BuyerLedgerPaymentTypeFilter =
  | "all"
  | (typeof RICE_PAYMENT_TYPE_OPTIONS)[number];

export type BuyerLedgerFilters = {
  entryType: BuyerLedgerEntryTypeFilter;
  riceVariety: string;
  currency: string;
  paymentType: BuyerLedgerPaymentTypeFilter;
};

export const DEFAULT_BUYER_LEDGER_FILTERS: BuyerLedgerFilters = {
  entryType: "all",
  riceVariety: "all",
  currency: "all",
  paymentType: "all",
};

export function collectBuyerLedgerFilterOptions(entries: CustomerLedgerEntry[]) {
  const riceVarieties = new Set<string>();
  const currencies = new Map<string, { id: string; code: string; name: string }>();

  for (const entry of entries) {
    if (entry.riceVariety?.trim()) {
      riceVarieties.add(entry.riceVariety.trim());
    }
    if (entry.currencyId?.trim()) {
      const id = entry.currencyId.trim();
      if (!currencies.has(id)) {
        currencies.set(id, {
          id,
          code: entry.currencyCode?.trim() || id,
          name: entry.currencyName?.trim() || entry.currencyCode?.trim() || id,
        });
      }
    }
  }

  return {
    riceVarieties: [...riceVarieties].sort((a, b) => a.localeCompare(b)),
    currencies: [...currencies.values()].sort((a, b) =>
      a.code.localeCompare(b.code),
    ),
  };
}

export function hasActiveBuyerLedgerFilters(filters: BuyerLedgerFilters) {
  return (
    filters.entryType !== "all" ||
    filters.riceVariety !== "all" ||
    filters.currency !== "all" ||
    filters.paymentType !== "all"
  );
}

export function filterBuyerLedgerEntries(
  entries: CustomerLedgerEntry[],
  filters: BuyerLedgerFilters,
) {
  return entries.filter((entry) => {
    if (filters.entryType !== "all" && entry.entryType !== filters.entryType) {
      return false;
    }

    if (filters.riceVariety !== "all") {
      if ((entry.riceVariety ?? "") !== filters.riceVariety) {
        return false;
      }
    }

    if (filters.currency !== "all") {
      if ((entry.currencyId ?? "") !== filters.currency) {
        return false;
      }
    }

    if (filters.paymentType !== "all") {
      if (entry.paymentType !== filters.paymentType) {
        return false;
      }
    }

    return true;
  });
}
