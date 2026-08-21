-- Link cash ledger rows to employee salary payments (cash settlement path).

ALTER TABLE "cash_transactions"
  ADD COLUMN IF NOT EXISTS "employee_ledger_entry_id" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS "cash_transactions_employee_ledger_entry_id_key"
  ON "cash_transactions"("employee_ledger_entry_id");

CREATE INDEX IF NOT EXISTS "cash_transactions_employee_ledger_entry_id_idx"
  ON "cash_transactions"("employee_ledger_entry_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cash_transactions_employee_ledger_entry_id_fkey'
  ) THEN
    ALTER TABLE "cash_transactions"
      ADD CONSTRAINT "cash_transactions_employee_ledger_entry_id_fkey"
      FOREIGN KEY ("employee_ledger_entry_id") REFERENCES "employee_ledger_entries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
