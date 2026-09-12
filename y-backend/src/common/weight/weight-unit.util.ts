import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** One Seer = 7 kilograms (fixed app-wide weight unit). */
export const SEER_KG = 7;

export const APP_WEIGHT_UNIT = 'seven_kg' as const;

export type AppWeightUnit = typeof APP_WEIGHT_UNIT;

export function normalizeWeightUnit(unit?: string): AppWeightUnit {
  const normalized = unit?.trim().toLowerCase();

  if (
    !normalized ||
    normalized === APP_WEIGHT_UNIT ||
    normalized === 'seer' ||
    normalized === '7kg'
  ) {
    return APP_WEIGHT_UNIT;
  }

  throw new BadRequestException(
    `unit must be ${APP_WEIGHT_UNIT} (7 kg Seer). Received: ${unit}`,
  );
}

/**
 * Converts a stored quantity + unit to kilograms for aggregation.
 * Legacy `kg` / `ton` / `one_kg` are still accepted when reading old records.
 */
export function toKilograms(
  quantity: Prisma.Decimal | string | number,
  unit?: string,
): Prisma.Decimal {
  const q = new Prisma.Decimal(quantity);
  const normalized = unit?.trim().toLowerCase() ?? APP_WEIGHT_UNIT;

  if (normalized === 'ton') {
    return q.times(1000);
  }

  if (normalized === 'kg' || normalized === 'one_kg') {
    return q;
  }

  return q.times(SEER_KG);
}

export function kilogramsToSeer(
  kilograms: Prisma.Decimal | string | number,
): Prisma.Decimal {
  return new Prisma.Decimal(kilograms).dividedBy(SEER_KG);
}

export function fromKilograms(
  kilograms: Prisma.Decimal | string | number,
  unit?: string,
): Prisma.Decimal {
  const kg = new Prisma.Decimal(kilograms);
  const normalized = unit?.trim().toLowerCase() ?? APP_WEIGHT_UNIT;

  if (normalized === 'ton') {
    return kg.dividedBy(1000);
  }

  if (normalized === 'kg' || normalized === 'one_kg') {
    return kg;
  }

  return kilogramsToSeer(kg);
}

export function splitQuantityAgainstStock(
  requestedKg: Prisma.Decimal,
  availableKg: Prisma.Decimal,
) {
  const fromStockWeightKg = Prisma.Decimal.min(
    requestedKg,
    Prisma.Decimal.max(availableKg, 0),
  );
  const oversoldWeightKg = Prisma.Decimal.max(
    requestedKg.minus(fromStockWeightKg),
    0,
  );

  return {
    fromStockWeightKg,
    oversoldWeightKg,
  };
}

export function resolveFromStockWeightKg(params: {
  fromStockWeightKg?: Prisma.Decimal | string | number | null;
  fallbackSoldWeightKg?: Prisma.Decimal | string | number | null;
  fallbackQuantity?: Prisma.Decimal | string | number | null;
  fallbackUnit?: string;
}): Prisma.Decimal {
  if (params.fromStockWeightKg != null) {
    return new Prisma.Decimal(params.fromStockWeightKg);
  }

  if (params.fallbackSoldWeightKg != null) {
    return new Prisma.Decimal(params.fallbackSoldWeightKg);
  }

  if (params.fallbackQuantity != null) {
    return toKilograms(params.fallbackQuantity, params.fallbackUnit);
  }

  return new Prisma.Decimal(0);
}
