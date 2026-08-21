import type { StoreType } from "../schemas/store";

export const POOLED_STORE_TYPES: readonly StoreType[] = [
  "short_green",
  "regection",
  "broken_rice",
] as const;

/** Must match backend `POOLED_SALE_VARIETY`. */
export const POOLED_SALE_VARIETY = "__mixed__";

export function isPooledStoreType(storeType: StoreType): boolean {
  return (POOLED_STORE_TYPES as readonly string[]).includes(storeType);
}

export function isPooledSaleVariety(variety: string): boolean {
  return variety === POOLED_SALE_VARIETY;
}
