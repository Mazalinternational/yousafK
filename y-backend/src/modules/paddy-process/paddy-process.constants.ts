/** Store types that can be used as a paddy process input source. */
export const PROCESS_STORE_SOURCE_TYPES = [
  'short_green',
  'regection',
  'broken_rice',
] as const;

export type ProcessStoreSourceType =
  (typeof PROCESS_STORE_SOURCE_TYPES)[number];

export type PaddyProcessStockSourceType =
  | 'company'
  | 'farmer'
  | ProcessStoreSourceType;

export function isProcessStoreSourceType(
  value: string,
): value is ProcessStoreSourceType {
  return (PROCESS_STORE_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isPaddyWarehouseStockSourceType(
  value: string,
): value is 'company' | 'farmer' {
  return value === 'company' || value === 'farmer';
}

export type PaddyProcessWarehouseBucket = 'company' | 'farmer' | 'store';

/** Classifies which paddy warehouse bucket a process deducts from. */
export function resolvePaddyProcessWarehouseBucket(process: {
  stockSourceType?: string | null;
  sourceCompanyPaddyWarehouseId?: bigint | string | number | null;
  sourceFarmerPaddyWarehouseId?: bigint | string | number | null;
}): PaddyProcessWarehouseBucket | null {
  const stockSourceType = process.stockSourceType?.trim() ?? '';

  if (stockSourceType) {
    if (isProcessStoreSourceType(stockSourceType)) {
      return 'store';
    }

    if (stockSourceType === 'farmer') {
      return 'farmer';
    }

    if (stockSourceType === 'company') {
      return 'company';
    }
  }

  if (process.sourceFarmerPaddyWarehouseId) {
    return 'farmer';
  }

  if (process.sourceCompanyPaddyWarehouseId) {
    return 'company';
  }

  return 'company';
}
