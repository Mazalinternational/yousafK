import { Prisma } from '@prisma/client';
import { shamsiToGregorian } from '../../common/shamsi-calendar.js';
import { calculatePayableForShamsiMonth } from './employee-salary.util.js';

describe('calculatePayableForShamsiMonth salary revisions', () => {
  const joinDate = shamsiToGregorian(1405, 1, 1);
  const secondMonth = shamsiToGregorian(1405, 2, 1);
  const raiseDate = shamsiToGregorian(1405, 3, 1);
  const endOfThirdMonth = shamsiToGregorian(1405, 3, 31);
  const revisions = [
    { monthlySalary: '10000', effectiveDate: joinDate },
    { monthlySalary: '12000', effectiveDate: raiseDate },
  ];

  it('keeps the original salary for months before the raise date', () => {
    const firstMonth = calculatePayableForShamsiMonth(
      new Prisma.Decimal(12000),
      joinDate,
      joinDate,
      new Prisma.Decimal(0),
      endOfThirdMonth,
      null,
      revisions,
    );
    const beforeRaise = calculatePayableForShamsiMonth(
      new Prisma.Decimal(12000),
      joinDate,
      secondMonth,
      new Prisma.Decimal(0),
      endOfThirdMonth,
      null,
      revisions,
    );

    expect(firstMonth.baseSalary.toFixed(2)).toBe('10000.00');
    expect(beforeRaise.baseSalary.toFixed(2)).toBe('10000.00');
  });

  it('uses the new salary only from the raise date forward', () => {
    const raisedMonth = calculatePayableForShamsiMonth(
      new Prisma.Decimal(12000),
      joinDate,
      raiseDate,
      new Prisma.Decimal(0),
      endOfThirdMonth,
      null,
      revisions,
    );

    expect(raisedMonth.baseSalary.toFixed(2)).toBe('12000.00');
  });

  it('splits a month when the raise starts partway through', () => {
    const midMonthRaise = shamsiToGregorian(1405, 3, 16);
    const partial = calculatePayableForShamsiMonth(
      new Prisma.Decimal(12000),
      joinDate,
      raiseDate,
      new Prisma.Decimal(0),
      endOfThirdMonth,
      null,
      [
        { monthlySalary: '10000', effectiveDate: joinDate },
        { monthlySalary: '12000', effectiveDate: midMonthRaise },
      ],
    );
    const expected = new Prisma.Decimal(10000)
      .mul(15)
      .div(31)
      .plus(new Prisma.Decimal(12000).mul(16).div(31))
      .toDecimalPlaces(2);

    expect(partial.baseSalary.toFixed(2)).toBe(expected.toFixed(2));
  });

  it('does not use the current salary for months before the first revision', () => {
    const onlyRaiseRevision = calculatePayableForShamsiMonth(
      new Prisma.Decimal(12000),
      joinDate,
      secondMonth,
      new Prisma.Decimal(0),
      endOfThirdMonth,
      null,
      [{ monthlySalary: '10000', effectiveDate: raiseDate }],
    );

    expect(onlyRaiseRevision.baseSalary.toFixed(2)).toBe('10000.00');
  });
});
