import type { CustomerLedgerEntry } from "../schemas/customer";
import { RICE_PAYMENT_TYPE_OPTIONS } from "../../rice-warehouses/schemas/rice-warehouse";

export type SellerLedgerEntryTypeFilter =
  | "all"
  | "company_receivable"
  | "company_payment"
  | "company_payment_on_behalf"
  | "company_payment_received_on_behalf"
  | "seller_debit"
  | "seller_credit";

export type SellerLedgerPaymentTypeFilter =
  | "all"
  | (typeof RICE_PAYMENT_TYPE_OPTIONS)[number];

export type SellerLedgerFilters = {
  entryType: SellerLedgerEntryTypeFilter;
  paddyVariety: string;
  riceVariety: string;
  currency: string;
  paymentType: SellerLedgerPaymentTypeFilter;
};

export const DEFAULT_SELLER_LEDGER_FILTERS: SellerLedgerFilters = {
  entryType: "all",
  paddyVariety: "all",
  riceVariety: "all",
  currency: "all",
  paymentType: "all",
};

export function collectSellerLedgerFilterOptions(entries: CustomerLedgerEntry[]) {
  const paddyVarieties = new Set<string>();
  const riceVarieties = new Set<string>();
  const currencies = new Map<string, { id: string; code: string; name: string }>();

  for (const entry of entries) {
    if (entry.paddyVariety?.trim()) {
      paddyVarieties.add(entry.paddyVariety.trim());
    }
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
    paddyVarieties: [...paddyVarieties].sort((a, b) => a.localeCompare(b)),
    riceVarieties: [...riceVarieties].sort((a, b) => a.localeCompare(b)),
    currencies: [...currencies.values()].sort((a, b) =>
      a.code.localeCompare(b.code),
    ),
  };
}

export function hasActiveSellerLedgerFilters(filters: SellerLedgerFilters) {
  return (
    filters.entryType !== "all" ||
    filters.paddyVariety !== "all" ||
    filters.riceVariety !== "all" ||
    filters.currency !== "all" ||
    filters.paymentType !== "all"
  );
}

export function filterSellerLedgerEntries(
  entries: CustomerLedgerEntry[],
  filters: SellerLedgerFilters,
) {
  return entries.filter((entry) => {
    if (filters.entryType !== "all" && entry.entryType !== filters.entryType) {
      return false;
    }

    if (filters.paddyVariety !== "all") {
      if ((entry.paddyVariety ?? "") !== filters.paddyVariety) {
        return false;
      }
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
