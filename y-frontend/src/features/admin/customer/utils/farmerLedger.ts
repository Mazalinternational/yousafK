import type { CustomerLedgerEntry } from "../schemas/customer";
import { seerToKg } from "@/utils/weightUnit";

export type FarmerLedgerEntryTypeFilter =
  | "all"
  | "farmer_obligation"
  | "farmer_rice_return";

export type FarmerLedgerReturnStatusFilter = "all" | "returned" | "pending";

export type FarmerLedgerFilters = {
  entryType: FarmerLedgerEntryTypeFilter;
  returnStatus: FarmerLedgerReturnStatusFilter;
  paddyVariety: string;
  riceVariety: string;
};

export const DEFAULT_FARMER_LEDGER_FILTERS: FarmerLedgerFilters = {
  entryType: "all",
  returnStatus: "all",
  paddyVariety: "all",
  riceVariety: "all",
};

function entryRiceKg(entry: CustomerLedgerEntry) {
  if (!entry.riceQuantity) {
    return 0;
  }

  return seerToKg(entry.riceQuantity);
}

export function computeFarmerRiceRemainingByVariety(
  entries: CustomerLedgerEntry[],
) {
  const obligationByVariety = new Map<string, number>();
  const returnedByVariety = new Map<string, number>();

  for (const entry of entries) {
    if (!entry.riceVariety?.trim() || !entry.riceQuantity) {
      continue;
    }

    const kg = entryRiceKg(entry);

    if (entry.entryType === "farmer_obligation") {
      obligationByVariety.set(
        entry.riceVariety,
        (obligationByVariety.get(entry.riceVariety) ?? 0) + kg,
      );
      continue;
    }

    if (entry.entryType === "farmer_rice_return") {
      returnedByVariety.set(
        entry.riceVariety,
        (returnedByVariety.get(entry.riceVariety) ?? 0) + kg,
      );
    }
  }

  const remainingByVariety = new Map<string, number>();

  for (const [variety, obligationKg] of obligationByVariety) {
    const returnedKg = returnedByVariety.get(variety) ?? 0;
    const remainingKg = Math.max(obligationKg - returnedKg, 0);

    if (remainingKg > 0) {
      remainingByVariety.set(variety, remainingKg);
    }
  }

  return remainingByVariety;
}

export function collectFarmerLedgerVarietyOptions(entries: CustomerLedgerEntry[]) {
  const paddyVarieties = new Set<string>();
  const riceVarieties = new Set<string>();

  for (const entry of entries) {
    if (entry.paddyVariety?.trim()) {
      paddyVarieties.add(entry.paddyVariety.trim());
    }
    if (entry.riceVariety?.trim()) {
      riceVarieties.add(entry.riceVariety.trim());
    }
  }

  return {
    paddyVarieties: [...paddyVarieties].sort((a, b) => a.localeCompare(b)),
    riceVarieties: [...riceVarieties].sort((a, b) => a.localeCompare(b)),
  };
}

export function hasActiveFarmerLedgerFilters(filters: FarmerLedgerFilters) {
  return (
    filters.entryType !== "all" ||
    filters.returnStatus !== "all" ||
    filters.paddyVariety !== "all" ||
    filters.riceVariety !== "all"
  );
}

export function filterFarmerLedgerEntries(
  entries: CustomerLedgerEntry[],
  filters: FarmerLedgerFilters,
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

    if (filters.returnStatus !== "all") {
      if (entry.entryType !== "farmer_rice_return") {
        return false;
      }

      const isReturned = Boolean(entry.riceStockFulfilledAt);
      if (filters.returnStatus === "returned" && !isReturned) {
        return false;
      }
      if (filters.returnStatus === "pending" && isReturned) {
        return false;
      }
    }

    return true;
  });
}
