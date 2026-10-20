import { Prisma } from '@prisma/client';
import {
  compareShamsiMonthKeys,
  currentShamsiMonthKey,
  daysInShamsiMonth,
  gregorianToShamsi,
  parseShamsiMonthKey,
  salaryMonthToShamsiKey,
  shamsiMonthKey,
  shamsiToGregorian,
  todayGregorianDate,
} from '../../common/shamsi-calendar.js';

export type SalaryRevision = {
  monthlySalary: Prisma.Decimal;
  effectiveDate: string;
};

export function salaryRevisionDateKey(value: string | Date) {
  if (value instanceof Date) {
    return todayGregorianDate(value);
  }

  const match = String(value).match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? String(value).slice(0, 10);
}

export function normalizeSalaryRevisions(
  revisions: Array<{
    monthlySalary: Prisma.Decimal | string | number;
    effectiveDate: string | Date;
  }> = [],
): SalaryRevision[] {
  return revisions
    .map((revision) => ({
      monthlySalary: new Prisma.Decimal(revision.monthlySalary),
      effectiveDate: salaryRevisionDateKey(revision.effectiveDate),
    }))
    .filter((revision) => /^\d{4}-\d{2}-\d{2}$/.test(revision.effectiveDate))
    .sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
}

function salaryRateOnDate(
  dateKey: string,
  revisions: SalaryRevision[],
  fallback: Prisma.Decimal,
) {
  if (revisions.length === 0) {
    return fallback;
  }

  // Days before the first recorded rate keep that first rate — never the
  // current employee.monthly_salary, which would rewrite older months.
  let rate = revisions[0].monthlySalary;

  for (const revision of revisions) {
    if (revision.effectiveDate <= dateKey) {
      rate = revision.monthlySalary;
      continue;
    }

    break;
  }

  return rate;
}

function payableBaseSalary(params: {
  monthlySalary: Prisma.Decimal;
  revisions: SalaryRevision[];
  year: number;
  month: number;
  startDay: number;
  endDay: number;
  daysInMonth: number;
}) {
  const payableDays = Math.max(params.endDay - params.startDay + 1, 0);

  if (payableDays <= 0) {
    return new Prisma.Decimal(0);
  }

  const segments: Array<{ rate: Prisma.Decimal; days: number }> = [];

  for (let day = params.startDay; day <= params.endDay; day += 1) {
    const rate = salaryRateOnDate(
      shamsiToGregorian(params.year, params.month, day),
      params.revisions,
      params.monthlySalary,
    );
    const current = segments[segments.length - 1];

    if (current && current.rate.equals(rate)) {
      current.days += 1;
    } else {
      segments.push({ rate, days: 1 });
    }
  }

  if (segments.length === 1 && payableDays === params.daysInMonth) {
    return segments[0].rate;
  }

  return segments
    .reduce(
      (sum, segment) =>
        sum.plus(segment.rate.mul(segment.days).div(params.daysInMonth)),
      new Prisma.Decimal(0),
    )
    .toDecimalPlaces(2);
}

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
 * - Salary revisions apply from their effective date. Earlier days keep the previous rate.
 */
export function calculatePayableForShamsiMonth(
  monthlySalary: Prisma.Decimal,
  joinDate: string | Date,
  salaryMonth: string | Date,
  deductions: Prisma.Decimal,
  asOfDate?: string | Date,
  employmentEndDate?: string | Date | null,
  salaryRevisions: Array<{
    monthlySalary: Prisma.Decimal | string | number;
    effectiveDate: string | Date;
  }> = [],
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
  const revisions = normalizeSalaryRevisions(salaryRevisions);

  const baseSalary = payableBaseSalary({
    monthlySalary,
    revisions,
    year,
    month,
    startDay,
    endDay,
    daysInMonth,
  });

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
