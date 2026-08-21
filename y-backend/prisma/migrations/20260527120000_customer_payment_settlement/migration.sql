-- Customer ledger payments (seller): cash vs Saraf; link to cash_transactions and saraf_ledger_entries.

ALTER TABLE "customer_ledger_entries" ADD COLUMN "payment_channel" "RiceSalePaymentChannel";
ALTER TABLE "customer_ledger_entries" ADD COLUMN "payment_type" TEXT;
ALTER TABLE "customer_ledger_entries" ADD COLUMN "saraf_id" BIGINT;
ALTER TABLE "customer_ledger_entries" ADD COLUMN "currency_id" TEXT;
ALTER TABLE "customer_ledger_entries" ADD COLUMN "paid_amount" DECIMAL(18, 2);
ALTER TABLE "customer_ledger_entries" ADD COLUMN "remaining_amount" DECIMAL(18, 2);

ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_saraf_id_fkey" FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "customer_ledger_entries_payment_channel_idx" ON "customer_ledger_entries"("payment_channel");
CREATE INDEX "customer_ledger_entries_saraf_id_idx" ON "customer_ledger_entries"("saraf_id");

ALTER TABLE "saraf_ledger_entries" ADD COLUMN "customer_ledger_entry_id" BIGINT;
CREATE UNIQUE INDEX "saraf_ledger_entries_customer_ledger_entry_id_key" ON "saraf_ledger_entries"("customer_ledger_entry_id");
ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_customer_ledger_entry_id_fkey" FOREIGN KEY ("customer_ledger_entry_id") REFERENCES "customer_ledger_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "saraf_ledger_entries_customer_ledger_entry_id_idx" ON "saraf_ledger_entries"("customer_ledger_entry_id");

ALTER TABLE "cash_transactions" ADD COLUMN "customer_ledger_entry_id" BIGINT;
CREATE UNIQUE INDEX "cash_transactions_customer_ledger_entry_id_key" ON "cash_transactions"("customer_ledger_entry_id");
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_customer_ledger_entry_id_fkey" FOREIGN KEY ("customer_ledger_entry_id") REFERENCES "customer_ledger_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "cash_transactions_customer_ledger_entry_id_idx" ON "cash_transactions"("customer_ledger_entry_id");
