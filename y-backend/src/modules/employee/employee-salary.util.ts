import { Prisma } from '@prisma/client';
import {
  compareShamsiMonthKeys,
  currentShamsiMonthKey,
  daysInShamsiMonth,
  gregorianToShamsi,
  parseShamsiMonthKey,
  salaryMonthToShamsiKey,
  shamsiMonthKey,
  todayGregorianDate,
} from '../../common/shamsi-calendar.js';

export function resolveEmploymentEndDate(
  status: string,
  inactiveDate?: string | Date | null,
  fallbackDate?: string | Date | null,
) {
  if (status?.trim().toLowerCase() !== 'inactive') {
    return null;
  }

  return inactiveDate ?? fallbackDate ?? null;
}

/**
 * Day-based Shamsi salary for one month.
 *
 * - No pay before the hire (join) Shamsi day.
 * - Hire month: from join day through month end (or through as-of day if same month).
 * - Completed months after hire: full month.
 * - Current (as-of) month: from month start (or join day) through today's Shamsi day.
 * - Employment end date: pay through that Shamsi day only; later months are zero.
 * - Future months (for advance preview on active staff): full planned month after hire.
 */
export function calculatePayableForShamsiMonth(
  monthlySalary: Prisma.Decimal,
  joinDate: string | Date,
  salaryMonth: string | Date,
  deductions: Prisma.Decimal,
  asOfDate?: string | Date,
  employmentEndDate?: string | Date | null,
) {
  const effectiveAsOfDate = employmentEndDate ?? asOfDate ?? todayGregorianDate();
  const joinShamsi = gregorianToShamsi(joinDate);
  const asOfShamsi = gregorianToShamsi(effectiveAsOfDate);
  const monthKey = salaryMonthToShamsiKey(salaryMonth);
  const joinMonthKey = shamsiMonthKey(joinDate);
  const asOfMonthKey = shamsiMonthKey(effectiveAsOfDate);
  const { year, month } = parseShamsiMonthKey(monthKey);
  const daysInMonth = daysInShamsiMonth(year, month);
  const zeroResult = {
    payableAmount: new Prisma.Decimal(0),
    baseSalary: new Prisma.Decimal(0),
    payableDays: 0,
    daysInMonth,
    isHireMonth: false,
    isPartialMonth: false,
    shamsiMonthKey: monthKey,
  };

  if (compareShamsiMonthKeys(joinMonthKey, monthKey) > 0) {
    return zeroResult;
  }

  if (
    employmentEndDate &&
    compareShamsiMonthKeys(monthKey, asOfMonthKey) > 0
  ) {
    return zeroResult;
  }

  let startDay = 1;
  let endDay = daysInMonth;

  if (joinMonthKey === monthKey) {
    startDay = joinShamsi.day;
  }

  if (monthKey === asOfMonthKey) {
    endDay = Math.min(asOfShamsi.day, daysInMonth);
  }

  const payableDays = Math.max(endDay - startDay + 1, 0);
  const isPartialMonth = payableDays > 0 && payableDays < daysInMonth;
  const isHireMonth = joinMonthKey === monthKey;

  const baseSalary =
    payableDays <= 0
      ? new Prisma.Decimal(0)
      : payableDays === daysInMonth
        ? monthlySalary
        : monthlySalary.mul(payableDays).div(daysInMonth).toDecimalPlaces(2);

  const adjustedSalary = baseSalary.minus(deductions);
  return {
    payableAmount: adjustedSalary.greaterThan(0)
      ? adjustedSalary
      : new Prisma.Decimal(0),
    baseSalary,
    payableDays,
    daysInMonth,
    isHireMonth,
    isPartialMonth,
    shamsiMonthKey: monthKey,
  };
}

export function calculateOutstandingPayable(
  grossPayable: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
) {
  return Prisma.Decimal.max(grossPayable.minus(paidAmount), 0);
}

export function resolvePaymentStatus(
  grossPayableThisMonth: Prisma.Decimal,
  paidThisMonth: Prisma.Decimal,
): 'paid' | 'partial_paid' | 'remaining' {
  if (grossPayableThisMonth.lessThanOrEqualTo(0)) {
    return 'paid';
  }

  if (paidThisMonth.lessThanOrEqualTo(0)) {
    return 'remaining';
  }

  if (paidThisMonth.greaterThanOrEqualTo(grossPayableThisMonth)) {
    return 'paid';
  }

  return 'partial_paid';
}

export function resolveAccrualEndMonthKey(
  status: string,
  inactiveDate: string | Date | null | undefined,
  referenceDate: Date = new Date(),
  fallbackDate?: string | Date | null,
) {
  const currentMonthKey = currentShamsiMonthKey(referenceDate);
  const employmentEndDate = resolveEmploymentEndDate(
    status,
    inactiveDate,
    fallbackDate,
  );

  if (!employmentEndDate) {
    return currentMonthKey;
  }

  const inactiveMonthKey = shamsiMonthKey(employmentEndDate);

  return compareShamsiMonthKeys(inactiveMonthKey, currentMonthKey) <= 0
    ? inactiveMonthKey
    : currentMonthKey;
}
