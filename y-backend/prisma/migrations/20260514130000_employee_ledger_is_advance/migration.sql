-- Track salary paid before the salary calendar month ends (advance / early payroll).
ALTER TABLE "employee_ledger_entries" ADD COLUMN IF NOT EXISTS "is_advance" BOOLEAN NOT NULL DEFAULT false;
