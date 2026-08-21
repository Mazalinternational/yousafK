import type { TFunction } from "i18next";

export function getLocalizedCurrencyName(
  code: string,
  fallbackName: string,
  t: TFunction,
) {
  const normalizedCode = code.trim().toUpperCase();
  return t(`common:currency_name_${normalizedCode}`, {
    defaultValue: fallbackName?.trim() || normalizedCode,
  });
}

export function formatCurrencyLabel(code: string, name: string, t: TFunction) {
  const normalizedCode = code.trim().toUpperCase();
  const localizedName = getLocalizedCurrencyName(normalizedCode, name, t);
  return `${normalizedCode} — ${localizedName}`;
}

export function formatCurrencyTitle(code: string, name: string, t: TFunction) {
  const normalizedCode = code.trim().toUpperCase();
  const localizedName = getLocalizedCurrencyName(normalizedCode, name, t);
  return `${localizedName} (${normalizedCode})`;
}
