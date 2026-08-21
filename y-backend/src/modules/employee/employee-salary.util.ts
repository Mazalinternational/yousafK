import { Prisma } from '@prisma/client';
import {
  compareShamsiMonthKeys,
  daysInShamsiMonth,
  gregorianToShamsi,
  parseShamsiMonthKey,
  salaryMonthToShamsiKey,
  shamsiMonthKey,
  todayGregorianDate,
} from '../../common/shamsi-calendar.js';

/**
 * Day-based Shamsi salary for one month.
 *
 * - No pay before the hire (join) Shamsi day.
 * - Hire month: from join day through month end (or through as-of day if same month).
 * - Completed months after hire: full month.
 * - Current (as-of) month: from month start (or join day) through today's Shamsi day.
 * - Future months (for advance preview): full planned month after hire.
 */
export function calculatePayableForShamsiMonth(
  monthlySalary: Prisma.Decimal,
  joinDate: string | Date,
  salaryMonth: string | Date,
  deductions: Prisma.Decimal,
  asOfDate: string | Date = todayGregorianDate(),
) {
  const joinShamsi = gregorianToShamsi(joinDate);
  const asOfShamsi = gregorianToShamsi(asOfDate);
  const monthKey = salaryMonthToShamsiKey(salaryMonth);
  const joinMonthKey = shamsiMonthKey(joinDate);
  const asOfMonthKey = shamsiMonthKey(asOfDate);
  const { year, month } = parseShamsiMonthKey(monthKey);
  const daysInMonth = daysInShamsiMonth(year, month);

  if (compareShamsiMonthKeys(joinMonthKey, monthKey) > 0) {
    return {
      payableAmount: new Prisma.Decimal(0),
      baseSalary: new Prisma.Decimal(0),
      payableDays: 0,
      daysInMonth,
      isHireMonth: false,
      isPartialMonth: false,
      shamsiMonthKey: monthKey,
    };
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
