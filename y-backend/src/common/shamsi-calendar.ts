/** Afghan / Persian solar (Shamsi) calendar helpers backed by jalaali-js. */

import {
  isLeapJalaaliYear,
  jalaaliMonthLength,
  toGregorian,
  toJalaali,
} from 'jalaali-js';

export type ShamsiDate = {
  year: number;
  month: number;
  day: number;
};

const SHAMSI_MONTH_NAMES = [
  'حمل',
  'ثور',
  'جوزا',
  'سرطان',
  'اسد',
  'سنبله',
  'میزان',
  'عقرب',
  'قوس',
  'جدی',
  'دلو',
  'حوت',
] as const;

const KABUL_TIMEZONE = 'Asia/Kabul';

/** Gregorian years we accept for salary-month storage (1st day of a Shamsi month). */
const MIN_GREGORIAN_SALARY_YEAR = 1850;
const MAX_GREGORIAN_SALARY_YEAR = 2200;

/** Shamsi years used when the client sends a solar date instead of Gregorian. */
const MIN_SHAMSI_YEAR = 1300;
const MAX_SHAMSI_YEAR = 1500;

/**
 * Legacy corrupt rows stored Shamsi year + 5134 in the Gregorian year field
 * (e.g. Dalw 1404 became 6538-12-05).
 */
const LEGACY_CORRUPT_SHAMSI_YEAR_OFFSET = 5134;

export function todayGregorianDate(referenceDate: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KABUL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate);
}

export function parseGregorianDate(value: string | Date): {
  year: number;
  month: number;
  day: number;
} {
  const normalized =
    value instanceof Date ? todayGregorianDate(value) : String(value).trim();
  const match = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (!match) {
    return { year: Number.NaN, month: Number.NaN, day: Number.NaN };
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function isShamsiYear(year: number) {
  return (
    Number.isFinite(year) && year >= MIN_SHAMSI_YEAR && year <= MAX_SHAMSI_YEAR
  );
}

function recoverShamsiPartsFromSalaryMonthInput(
  year: number,
  month: number,
  day: number,
): ShamsiDate | null {
  if (isShamsiYear(year)) {
    return { year, month, day };
  }

  if (year > MAX_GREGORIAN_SALARY_YEAR) {
    const recoveredYear = year - LEGACY_CORRUPT_SHAMSI_YEAR_OFFSET;

    if (isShamsiYear(recoveredYear)) {
      return { year: recoveredYear, month, day };
    }
  }

  return null;
}

function assertValidSalaryMonthParts(year: number, month: number, day: number) {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new RangeError('salary month must be a valid date');
  }
}

function salaryMonthKeyFromInput(value: string | Date): string {
  const { year, month, day } = parseGregorianDate(value);
  assertValidSalaryMonthParts(year, month, day);

  const shamsiParts = recoverShamsiPartsFromSalaryMonthInput(year, month, day);

  if (shamsiParts) {
    return shamsiMonthKeyFromParts(shamsiParts.year, shamsiParts.month);
  }

  if (year < MIN_GREGORIAN_SALARY_YEAR || year > MAX_GREGORIAN_SALARY_YEAR) {
    throw new RangeError(
      `salary month year ${year} is outside the supported Gregorian range`,
    );
  }

  return shamsiMonthKey(value);
}

export function gregorianToShamsi(value: string | Date): ShamsiDate {
  const { year, month, day } = parseGregorianDate(value);
  const { jy, jm, jd } = toJalaali(year, month, day);
  return { year: jy, month: jm, day: jd };
}

export function shamsiToGregorian(
  year: number,
  month: number,
  day: number,
): string {
  const { gy, gm, gd } = toGregorian(year, month, day);
  return formatGregorianDate(gy, gm, gd);
}

export function formatGregorianDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function shamsiMonthKey(value: string | Date): string {
  const shamsi = gregorianToShamsi(value);
  return `${String(shamsi.year).padStart(4, '0')}-${String(shamsi.month).padStart(2, '0')}`;
}

export function shamsiMonthKeyFromParts(year: number, month: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function parseShamsiMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

export function daysInShamsiMonth(year: number, month: number) {
  return jalaaliMonthLength(year, month);
}

export function isShamsiLeapYear(year: number) {
  return isLeapJalaaliYear(year);
}

export function shamsiMonthStartGregorian(monthKey: string) {
  const { year, month } = parseShamsiMonthKey(monthKey);
  return shamsiToGregorian(year, month, 1);
}

export function shamsiMonthEndGregorian(monthKey: string) {
  const { year, month } = parseShamsiMonthKey(monthKey);
  const lastDay = daysInShamsiMonth(year, month);
  return shamsiToGregorian(year, month, lastDay);
}

export function normalizeSalaryMonthDate(value: string | Date) {
  const monthKey = salaryMonthKeyFromInput(value);
  return shamsiMonthStartGregorian(monthKey);
}

export function salaryMonthToShamsiKey(salaryMonth: string | Date) {
  return salaryMonthKeyFromInput(salaryMonth);
}

export function currentShamsiMonthKey(referenceDate: Date = new Date()) {
  return shamsiMonthKey(todayGregorianDate(referenceDate));
}

export function compareShamsiMonthKeys(left: string, right: string) {
  return left.localeCompare(right);
}

export function nextShamsiMonthKey(monthKey: string) {
  const { year, month } = parseShamsiMonthKey(monthKey);

  if (month >= 12) {
    return shamsiMonthKeyFromParts(year + 1, 1);
  }

  return shamsiMonthKeyFromParts(year, month + 1);
}

/** Inclusive Shamsi month keys from `fromKey` through `toKey` (ascending). */
export function shamsiMonthKeysInclusive(fromKey: string, toKey: string) {
  if (compareShamsiMonthKeys(fromKey, toKey) > 0) {
    return [];
  }

  const keys: string[] = [];
  let cursor = fromKey;

  while (compareShamsiMonthKeys(cursor, toKey) <= 0) {
    keys.push(cursor);
    cursor = nextShamsiMonthKey(cursor);
  }

  return keys;
}

export function formatShamsiMonthLabel(monthKey: string) {
  const { year, month } = parseShamsiMonthKey(monthKey);
  const monthName = SHAMSI_MONTH_NAMES[month - 1] ?? String(month);
  return `${monthName} ${year}`;
}

export function isFutureShamsiMonth(
  monthKey: string,
  referenceDate: Date = new Date(),
) {
  return (
    compareShamsiMonthKeys(monthKey, currentShamsiMonthKey(referenceDate)) > 0
  );
}

export function salaryPaymentIsAdvance(
  paymentDate: string,
  salaryMonthFirstDay: string,
  referenceDate: Date = new Date(),
) {
  const monthKey = salaryMonthToShamsiKey(salaryMonthFirstDay);
  if (isFutureShamsiMonth(monthKey, referenceDate)) {
    return true;
  }
  const monthEnd = shamsiMonthEndGregorian(monthKey);
  return paymentDate < monthEnd;
}
