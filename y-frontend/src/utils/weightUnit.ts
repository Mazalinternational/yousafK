import type { TFunction } from "i18next";

/** One Seer = 7 kilograms (fixed app-wide weight unit). */
export const SEER_KG = 7;

export const APP_WEIGHT_UNIT = "seven_kg" as const;

export const APP_WEIGHT_UNIT_OPTIONS = [APP_WEIGHT_UNIT] as const;

export type AppWeightUnit = (typeof APP_WEIGHT_UNIT_OPTIONS)[number];

export function kgToSeer(kilograms: string | number): number {
  return Number(kilograms) / SEER_KG;
}

export function stockValueClassName(kilograms: string | number) {
  return Number(kilograms) < -0.0001 ? "text-red-600 dark:text-red-400" : undefined;
}

export function seerToKg(seer: string | number): number {
  return Number(seer) * SEER_KG;
}

/** Always Western digits + "." so decimals stay visible in Dari/Pashto UI. */
const WEIGHT_NUMBER_LOCALE = "en-US";

export function formatSeerNumber(
  kilograms: string | number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(WEIGHT_NUMBER_LOCALE, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    ...options,
  }).format(kgToSeer(kilograms));
}

/** Format a kilogram-backed API value for display as Seer (7 kg). */
export function formatWeightFromKg(
  kilograms: string | number,
  t: TFunction,
  options?: Intl.NumberFormatOptions,
): string {
  if (options) {
    const seer = kgToSeer(kilograms);
    const formatted = new Intl.NumberFormat(WEIGHT_NUMBER_LOCALE, {
      ...options,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      numberingSystem: "latn",
    }).format(seer);
    return `${formatted} ${t("common:seer_unit_short")}`;
  }
  return formatKilogramsAsSeer(kilograms, t);
}

/**
 * Same as {@link formatWeightFromKg} but floors the seer amount (2 fractional digits by default).
 * Use for remaining / available stock so the UI never shows more seer than can be sold at 7 kg/seer.
 */
export function formatAvailableStockFromKg(
  kilograms: string | number,
  t: TFunction,
  options?: { maxFractionDigits?: number; locale?: string },
): string {
  const maxFd = options?.maxFractionDigits ?? 2;
  // Ignore RTL locales — always Western "." decimals for stock.
  void options?.locale;
  const kg = Number(kilograms);
  if (Number.isNaN(kg)) {
    return `0.00 ${t("common:seer_unit_short")}`;
  }
  if (kg < 0) {
    return formatKilogramsAsSeer(kg, t);
  }
  if (kg === 0) {
    return `0.00 ${t("common:seer_unit_short")}`;
  }
  const seer = kg / SEER_KG;
  const factor = 10 ** maxFd;
  const floored = Math.floor(seer * factor + 1e-9) / factor;
  const formatted = new Intl.NumberFormat(WEIGHT_NUMBER_LOCALE, {
    maximumFractionDigits: maxFd,
    minimumFractionDigits: Math.min(2, maxFd),
  }).format(floored);
  return `${formatted} ${t("common:seer_unit_short")}`;
}

/** Format a quantity field stored on a record (may be legacy kg/ton). */
export function formatQuantityWithUnit(
  quantity: string | number,
  unit: string | undefined,
  t: TFunction,
): string {
  const normalized = unit?.trim().toLowerCase() ?? APP_WEIGHT_UNIT;
  if (normalized === "ton") {
    return formatWeightFromKg(Number(quantity) * 1000, t, { maximumFractionDigits: 0 });
  }
  if (normalized === "kg" || normalized === "one_kg") {
    return formatKilogramsAsSeer(quantity, t);
  }
  return formatSeerQuantity(quantity, t);
}

/** Fields in report/API payloads stored as kilograms. */
export function isKilogramReportFieldKey(key: string): boolean {
  if (key.includes("Amount") || key.includes("Ton") || key === "unit") {
    return false;
  }
  return /Kg$/i.test(key);
}

/** Fields in report/API payloads stored as seer (seven_kg) counts. */
export function isSeerReportFieldKey(key: string): boolean {
  return (
    key === "quantity" ||
    key === "totalQuantity" ||
    key === "weight" ||
    key === "totalWeight" ||
    key === "paddyQuantity" ||
    key === "totalPaddyQuantity" ||
    key === "riceQuantity" ||
    key === "totalRiceQuantity" ||
    key === "soldWeight"
  );
}

/** Display a seer count with exactly 2 decimal places (Western "."). */
export function formatSeerQuantity(
  seer: string | number,
  t: TFunction,
  _locale = WEIGHT_NUMBER_LOCALE,
): string {
  void _locale;
  const n = Number(seer);
  if (Number.isNaN(n)) {
    return "—";
  }
  const rounded = Math.round(n * 100) / 100;
  const formatted = new Intl.NumberFormat(WEIGHT_NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `${formatted} ${t("common:seer_unit_short")}`;
}

/** Convert kilograms from the API to seer for display. */
export function formatKilogramsAsSeer(
  kilograms: string | number,
  t: TFunction,
  locale = WEIGHT_NUMBER_LOCALE,
): string {
  return formatSeerQuantity(kgToSeer(kilograms), t, locale);
}

/** Format one report weight field using the correct unit (seer vs kg-backed). */
export function formatReportWeightValue(
  key: string,
  value: string | number,
  t: TFunction,
  unit?: string,
  locale = "en-US",
): string {
  if (isKilogramReportFieldKey(key)) {
    return formatKilogramsAsSeer(value, t, locale);
  }
  if (isSeerReportFieldKey(key)) {
    return formatQuantityWithUnit(value, unit ?? APP_WEIGHT_UNIT, t);
  }
  return String(value);
}

/**
 * Value to show in quantity inputs when editing (always Seer count).
 */
export function quantityInputFromRecord(
  quantity: string | number,
  unit: string | undefined,
): string {
  const normalized = unit?.trim().toLowerCase() ?? APP_WEIGHT_UNIT;
  const n = Number(quantity);
  if (Number.isNaN(n)) {
    return "";
  }
  if (normalized === "ton") {
    return String(n * (1000 / SEER_KG));
  }
  if (normalized === "kg" || normalized === "one_kg") {
    return String(n / SEER_KG);
  }
  return String(n);
}

export function isKilogramFieldKey(key: string): boolean {
  return /Kg$/i.test(key) || key === "weight" && !key.includes("Unit");
}

export function isWeightQuantityKey(key: string): boolean {
  if (key === "unit" || key === "weightUnit" || key.includes("Amount") || key.includes("Ton")) {
    return false;
  }
  return (
    /Kg$/i.test(key) ||
    key === "weight" ||
    key === "quantity" ||
    key === "processedWeight" ||
    key === "soldWeight" ||
    key === "paddyQuantity" ||
    key === "riceQuantity" ||
    key === "totalWeight"
  );
}
