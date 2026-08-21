-- Track when a farmer rice return ledger entry has been physically issued from rice stock.
ALTER TABLE "customer_ledger_entries"
ADD COLUMN "rice_stock_fulfilled_at" TIMESTAMP(3);

CREATE INDEX "customer_ledger_entries_rice_stock_fulfilled_at_idx"
ON "customer_ledger_entries"("rice_stock_fulfilled_at");
