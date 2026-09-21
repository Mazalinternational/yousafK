/** Maps app language codes to Intl locales for numbers and dates. */
export function getDisplayLocale(language: string): string {
  if (language === "dr") return "fa-AF";
  if (language === "ps") return "ps-AF";
  return "en-US";
}

/** Western digits in PDFs avoid react-pdf bidi crashes with RTL labels (ps/dr). */
export const PDF_NUMBER_LOCALE = "en-US";

const EASTERN_DIGIT_MAP: Record<string, string> = {};

for (let index = 0; index <= 9; index += 1) {
  EASTERN_DIGIT_MAP[String.fromCharCode(0x0660 + index)] = String(index);
  EASTERN_DIGIT_MAP[String.fromCharCode(0x06f0 + index)] = String(index);
}

export function hasEasternArabicDigits(value: string) {
  return /[\u0660-\u0669\u06F0-\u06F9]/.test(value);
}

export function normalizeEasternDigitsToLatin(value: string) {
  return value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => EASTERN_DIGIT_MAP[ch] ?? ch);
}

/** True for en-US-style grouping like 3,000 or 1,234,567 (not EU decimals like 3,5). */
function hasAsciiThousandsGrouping(value: string) {
  return /^-?\d{1,3}(,\d{3})+$/.test(value);
}

export function parseLocalizedNumberString(value: string): number | null {
  let normalized = normalizeEasternDigitsToLatin(value).trim();
  if (!normalized) {
    return null;
  }

  normalized = normalized.replace(/[\s\u066C\u066B\u060C]/g, "");

  const commaCount = (normalized.match(/,/g) ?? []).length;
  const dotCount = (normalized.match(/\./g) ?? []).length;

  if (commaCount > 0 && dotCount >= 1) {
    // Mixed separators: treat the rightmost mark as the decimal separator.
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastDot > lastComma) {
      // en-US: 3,000.50
      normalized = normalized.replace(/,/g, "");
    } else {
      // e.g. 3.000,50
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    }
  } else if (commaCount > 0 && dotCount === 0) {
    // Thousands (3,000 / 1,234,567) vs EU decimal (3,5 / 3,50).
    if (commaCount > 1 || hasAsciiThousandsGrouping(normalized)) {
      normalized = normalized.replace(/,/g, "");
    } else {
      normalized = normalized.replace(",", ".");
    }
  }

  normalized = normalized.replace(/[^\d.-]/g, "");
  if (!normalized || !/^-?\d*(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Normalize UI-formatted amounts/quantities for PDF output (not phones / IDs / bill Nos.). */
export function formatPdfFieldValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "—";
  }

  const currencyMatch = trimmed.match(/^(.+?)\s+([A-Z]{3})$/);
  if (currencyMatch) {
    const parsed = parseLocalizedNumberString(currencyMatch[1]);
    if (parsed !== null) {
      return formatPdfAmount(parsed);
    }
  }

  const numberUnitMatch = trimmed.match(/^(.+?)\s+(\S+)$/);
  if (numberUnitMatch) {
    const unit = numberUnitMatch[2];
    // Reject phone-like groups ("0799 123 456") where the "unit" is only digits.
    if (!/^\d+$/.test(unit)) {
      const parsed = parseLocalizedNumberString(numberUnitMatch[1]);
      if (parsed !== null) {
        return `${formatPdfAmount(parsed)} ${unit}`;
      }
    }
  }

  // Leave bare numbers / IDs / phones unchanged aside from digit script.
  return normalizeEasternDigitsToLatin(trimmed);
}

export function formatDisplayAmount(
  value: string | number | null | undefined,
  locale: string,
) {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }
  // Prefer Western digits + "." decimal so amounts stay readable in Dari/Pashto
  // (fa-AF/ps-AF use Arabic decimal separator ٫ which often looks "missing").
  const numberLocale =
    locale === "fa-AF" || locale === "ps-AF" ? "en-US" : locale;
  return new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDisplayNumber(
  value: string | number | null | undefined,
  locale: string,
) {
  if (value === null || value === undefined || value === "") {
    return "0";
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatPdfAmount(value: string | number | null | undefined) {
  return formatDisplayAmount(value, PDF_NUMBER_LOCALE);
}

export function formatPdfNumber(value: string | number | null | undefined) {
  return formatDisplayNumber(value, PDF_NUMBER_LOCALE);
}
