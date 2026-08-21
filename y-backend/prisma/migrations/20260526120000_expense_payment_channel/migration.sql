-- Expense: pay in cash vs paid from Saraf; link to cash_transactions and saraf_ledger_entries.

ALTER TABLE "expenses" ADD COLUMN "payment_channel" "RiceSalePaymentChannel" NOT NULL DEFAULT 'cash';
ALTER TABLE "expenses" ADD COLUMN "saraf_id" BIGINT;

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_saraf_id_fkey" FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "expenses_payment_channel_idx" ON "expenses"("payment_channel");
CREATE INDEX "expenses_saraf_id_idx" ON "expenses"("saraf_id");

ALTER TABLE "saraf_ledger_entries" ADD COLUMN "expense_id" BIGINT;
CREATE UNIQUE INDEX "saraf_ledger_entries_expense_id_key" ON "saraf_ledger_entries"("expense_id");
ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "saraf_ledger_entries_expense_id_idx" ON "saraf_ledger_entries"("expense_id");

ALTER TABLE "cash_transactions" ADD COLUMN "expense_id" BIGINT;
CREATE UNIQUE INDEX "cash_transactions_expense_id_key" ON "cash_transactions"("expense_id");
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "cash_transactions_expense_id_idx" ON "cash_transactions"("expense_id");
