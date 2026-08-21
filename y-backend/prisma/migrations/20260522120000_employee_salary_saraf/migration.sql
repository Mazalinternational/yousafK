-- Salary payment route (cash vs Saraf) and linked Saraf ledger row for Saraf-settled pay.
ALTER TABLE "employee_ledger_entries"
  ADD COLUMN "payment_channel" "RiceSalePaymentChannel" NOT NULL DEFAULT 'cash',
  ADD COLUMN "saraf_id" BIGINT,
  ADD COLUMN "saraf_ledger_currency_id" TEXT;

ALTER TABLE "employee_ledger_entries"
  ADD CONSTRAINT "employee_ledger_entries_saraf_id_fkey"
  FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_ledger_entries"
  ADD CONSTRAINT "employee_ledger_entries_saraf_ledger_currency_id_fkey"
  FOREIGN KEY ("saraf_ledger_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "employee_ledger_entries_saraf_id_idx" ON "employee_ledger_entries" ("saraf_id");
CREATE INDEX "employee_ledger_entries_payment_channel_idx" ON "employee_ledger_entries" ("payment_channel");

ALTER TABLE "saraf_ledger_entries"
  ADD COLUMN "employee_ledger_entry_id" BIGINT;

CREATE UNIQUE INDEX "saraf_ledger_entries_employee_ledger_entry_id_key"
  ON "saraf_ledger_entries" ("employee_ledger_entry_id");

ALTER TABLE "saraf_ledger_entries"
  ADD CONSTRAINT "saraf_ledger_entries_employee_ledger_entry_id_fkey"
  FOREIGN KEY ("employee_ledger_entry_id") REFERENCES "employee_ledger_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
