-- Expense vendor settlement + vendor ledger entry types

CREATE TYPE "ExpenseSettlementMode" AS ENUM ('direct', 'vendor');

ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'vendor_expense';
ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'vendor_payment';

ALTER TABLE "expenses"
  ADD COLUMN "settlement_mode" "ExpenseSettlementMode" NOT NULL DEFAULT 'direct',
  ADD COLUMN "vendor_id" BIGINT,
  ADD COLUMN "payment_type" TEXT,
  ADD COLUMN "paid_amount" DECIMAL(18, 2),
  ADD COLUMN "remaining_amount" DECIMAL(18, 2);

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "expenses_settlement_mode_idx" ON "expenses"("settlement_mode");
CREATE INDEX "expenses_vendor_id_idx" ON "expenses"("vendor_id");

ALTER TABLE "customer_ledger_entries"
  ADD COLUMN "source_expense_id" BIGINT;

ALTER TABLE "customer_ledger_entries"
  ADD CONSTRAINT "customer_ledger_entries_source_expense_id_fkey"
  FOREIGN KEY ("source_expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "customer_ledger_entries_source_expense_id_idx"
  ON "customer_ledger_entries"("source_expense_id");
