-- Salary changes apply from the chosen date. Earlier months keep the previous rate.
CREATE TABLE "employee_salary_revisions" (
    "id" BIGSERIAL NOT NULL,
    "employee_id" BIGINT NOT NULL,
    "monthly_salary" DECIMAL(18,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_salary_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_salary_revisions_employee_id_effective_date_key"
ON "employee_salary_revisions"("employee_id", "effective_date");

CREATE INDEX "employee_salary_revisions_employee_id_idx"
ON "employee_salary_revisions"("employee_id");

ALTER TABLE "employee_salary_revisions"
ADD CONSTRAINT "employee_salary_revisions_employee_id_fkey"
FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "employee_salary_revisions" ("employee_id", "monthly_salary", "effective_date")
SELECT "id", "monthly_salary", "join_date"::date
FROM "employees";
