export type StoreTypeValue =
  | 'short_green'
  | 'regection'
  | 'broken_rice'
  | 'waste';

/** Store types where all varieties are sold from one combined stock pool. */
export const POOLED_STORE_TYPES: readonly StoreTypeValue[] = [
  'short_green',
  'regection',
  'broken_rice',
] as const;

/** Stored on pooled sales; not shown as a rice variety in the UI. */
export const POOLED_SALE_VARIETY = '__mixed__';

export function isPooledStoreType(
  storeType: StoreTypeValue,
): storeType is (typeof POOLED_STORE_TYPES)[number] {
  return (POOLED_STORE_TYPES as readonly string[]).includes(storeType);
}
