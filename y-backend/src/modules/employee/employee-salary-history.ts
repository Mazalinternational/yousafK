import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { todayGregorianDate } from '../../common/shamsi-calendar.js';
import {
  normalizeSalaryRevisions,
  salaryRevisionDateKey,
  type SalaryRevision,
} from './employee-salary.util.js';

type SqlClient = {
  $queryRaw: <T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ) => Promise<T>;
  $executeRaw: (
    query: TemplateStringsArray | Prisma.Sql,
    ...values: unknown[]
  ) => Promise<number>;
};

export async function listSalaryRevisionsByEmployee(
  db: SqlClient,
  employeeIds: bigint[],
) {
  const revisionsByEmployee = new Map<string, SalaryRevision[]>();

  if (employeeIds.length === 0) {
    return revisionsByEmployee;
  }

  const rows = await db.$queryRaw<
    Array<{
      employeeId: string;
      monthlySalary: string;
      effectiveDate: Date | string;
    }>
  >(Prisma.sql`
    SELECT
      "employee_id"::text AS "employeeId",
      "monthly_salary"::text AS "monthlySalary",
      "effective_date" AS "effectiveDate"
    FROM "employee_salary_revisions"
    WHERE "employee_id" IN (${Prisma.join(employeeIds)})
    ORDER BY "employee_id" ASC, "effective_date" ASC, "id" ASC
  `);

  const grouped = new Map<
    string,
    Array<{ monthlySalary: string; effectiveDate: Date | string }>
  >();

  for (const row of rows) {
    const current = grouped.get(row.employeeId) ?? [];
    current.push({
      monthlySalary: row.monthlySalary,
      effectiveDate: row.effectiveDate,
    });
    grouped.set(row.employeeId, current);
  }

  for (const [employeeId, revisions] of grouped) {
    revisionsByEmployee.set(employeeId, normalizeSalaryRevisions(revisions));
  }

  return revisionsByEmployee;
}

export async function upsertSalaryRevision(
  db: SqlClient,
  employeeId: bigint,
  effectiveDate: string,
  monthlySalary: Prisma.Decimal,
) {
  const dateKey = salaryRevisionDateKey(effectiveDate);
  const updated = await db.$executeRaw(Prisma.sql`
    UPDATE "employee_salary_revisions"
    SET "monthly_salary" = ${monthlySalary}
    WHERE "employee_id" = ${employeeId}
      AND "effective_date" = ${dateKey}::date
  `);

  if (Number(updated) > 0) {
    return;
  }

  await db.$executeRaw(Prisma.sql`
    INSERT INTO "employee_salary_revisions" (
      "employee_id",
      "monthly_salary",
      "effective_date"
    )
    VALUES (
      ${employeeId},
      ${monthlySalary},
      ${dateKey}::date
    )
  `);
}

async function syncCurrentSalaryFromLatestRevision(
  db: SqlClient,
  employeeId: bigint,
) {
  await db.$executeRaw(Prisma.sql`
    UPDATE "employees"
    SET "monthly_salary" = latest."monthly_salary"
    FROM (
      SELECT "monthly_salary"
      FROM "employee_salary_revisions"
      WHERE "employee_id" = ${employeeId}
      ORDER BY "effective_date" DESC, "id" DESC
      LIMIT 1
    ) AS latest
    WHERE "employees"."id" = ${employeeId}
  `);
}

/**
 * Keep salary history so a raise/cut starts on the chosen date.
 * Months/days before that date keep the previous rate.
 */
export async function syncEmployeeSalaryHistory(
  db: SqlClient,
  employeeId: bigint,
  params: {
    joinDate: string;
    previousJoinDate: string;
    storedSalary: Prisma.Decimal;
    newSalary: Prisma.Decimal;
    salaryEffectiveDate?: string | null;
    earlierMonthlySalary?: Prisma.Decimal | null;
  },
) {
  const joinDate = salaryRevisionDateKey(params.joinDate);
  const previousJoinDate = salaryRevisionDateKey(params.previousJoinDate);

  if (previousJoinDate !== joinDate) {
    await db.$executeRaw(Prisma.sql`
      UPDATE "employee_salary_revisions"
      SET "effective_date" = ${joinDate}::date
      WHERE "employee_id" = ${employeeId}
        AND "effective_date" = ${previousJoinDate}::date
        AND NOT EXISTS (
          SELECT 1
          FROM "employee_salary_revisions" existing
          WHERE existing."employee_id" = ${employeeId}
            AND existing."effective_date" = ${joinDate}::date
        )
    `);
  }

  const revisionsByEmployee = await listSalaryRevisionsByEmployee(db, [
    employeeId,
  ]);
  const revisions = revisionsByEmployee.get(String(employeeId)) ?? [];
  const salaryChanged = !params.newSalary.equals(params.storedSalary);
  const earlier = params.earlierMonthlySalary ?? null;
  const joinRevision = revisions.find(
    (revision) => revision.effectiveDate === joinDate,
  );
  const joinAmount = joinRevision?.monthlySalary ?? params.storedSalary;
  const previousRate = earlier ?? params.storedSalary;
  const needsHistoryCorrection =
    earlier != null && !earlier.equals(joinAmount);

  if (!salaryChanged && !needsHistoryCorrection) {
    if (revisions.length === 0) {
      await upsertSalaryRevision(db, employeeId, joinDate, params.newSalary);
      await syncCurrentSalaryFromLatestRevision(db, employeeId);
    }
    return;
  }

  const appliesFrom = salaryRevisionDateKey(
    params.salaryEffectiveDate || todayGregorianDate(),
  );

  if (appliesFrom < joinDate) {
    throw new BadRequestException(
      'salaryEffectiveDate cannot be before the hire date',
    );
  }

  // Raise/cut from hire day: only one rate exists.
  if (appliesFrom === joinDate) {
    await upsertSalaryRevision(db, employeeId, joinDate, params.newSalary);
    await syncCurrentSalaryFromLatestRevision(db, employeeId);
    return;
  }

  // Keep the old rate from hire until the day before the change, then apply
  // the new rate from the chosen date forward.
  await upsertSalaryRevision(db, employeeId, joinDate, previousRate);
  await upsertSalaryRevision(db, employeeId, appliesFrom, params.newSalary);
  await syncCurrentSalaryFromLatestRevision(db, employeeId);
}
