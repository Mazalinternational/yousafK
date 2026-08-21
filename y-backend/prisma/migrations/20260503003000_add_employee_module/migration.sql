CREATE TABLE IF NOT EXISTS "employees" (
  "id" BIGSERIAL PRIMARY KEY,
  "employee_no" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "phone_no" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "join_date" DATE NOT NULL,
  "monthly_salary" DECIMAL(18, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "season_id" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "season_name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "employee_ledgers" (
  "id" BIGSERIAL PRIMARY KEY,
  "employee_id" BIGINT NOT NULL UNIQUE REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "employee_ledger_entries" (
  "id" BIGSERIAL PRIMARY KEY,
  "ledger_id" BIGINT NOT NULL REFERENCES "employee_ledgers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "employee_id" BIGINT NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "entry_type" TEXT NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "salary_month" DATE NOT NULL,
  "occurred_at" DATE NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "employees_season_id_idx" ON "employees" ("season_id");
CREATE INDEX IF NOT EXISTS "employees_employee_no_idx" ON "employees" ("employee_no");
CREATE INDEX IF NOT EXISTS "employees_name_idx" ON "employees" ("name");
CREATE INDEX IF NOT EXISTS "employees_status_idx" ON "employees" ("status");
CREATE INDEX IF NOT EXISTS "employee_ledgers_employee_id_idx" ON "employee_ledgers" ("employee_id");
CREATE INDEX IF NOT EXISTS "employee_ledger_entries_ledger_id_idx" ON "employee_ledger_entries" ("ledger_id");
CREATE INDEX IF NOT EXISTS "employee_ledger_entries_employee_id_idx" ON "employee_ledger_entries" ("employee_id");
CREATE INDEX IF NOT EXISTS "employee_ledger_entries_entry_type_idx" ON "employee_ledger_entries" ("entry_type");
CREATE INDEX IF NOT EXISTS "employee_ledger_entries_salary_month_idx" ON "employee_ledger_entries" ("salary_month");
CREATE INDEX IF NOT EXISTS "employee_ledger_entries_occurred_at_idx" ON "employee_ledger_entries" ("occurred_at");
