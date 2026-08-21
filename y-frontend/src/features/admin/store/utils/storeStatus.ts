import type { StoreEntry } from "../schemas/store";

export type StoreDisplayStatus = "stock" | "partial" | "sold";

export function getStoreDisplayStatus(entry: Pick<StoreEntry, "soldWeight" | "remainingWeight">): StoreDisplayStatus {
  const remaining = Number(entry.remainingWeight);
  const sold = Number(entry.soldWeight);

  if (remaining <= 0) {
    return "sold";
  }

  if (sold > 0) {
    return "partial";
  }

  return "stock";
}

export function hasRemainingStock(entry: Pick<StoreEntry, "remainingWeight">) {
  return Number(entry.remainingWeight) > 0;
}
