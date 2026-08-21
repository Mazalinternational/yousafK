-- Rice warehouse: seller settlement via cash or Saraf (mirrors company-owned paddy).

ALTER TABLE "rice_warehouses" ADD COLUMN "payment_channel" "RiceSalePaymentChannel" NOT NULL DEFAULT 'cash';
ALTER TABLE "rice_warehouses" ADD COLUMN "saraf_id" BIGINT;
ALTER TABLE "rice_warehouses" ADD COLUMN "saraf_ledger_currency_id" TEXT;

ALTER TABLE "rice_warehouses" ADD CONSTRAINT "rice_warehouses_saraf_id_fkey" FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rice_warehouses" ADD CONSTRAINT "rice_warehouses_saraf_ledger_currency_id_fkey" FOREIGN KEY ("saraf_ledger_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "rice_warehouses_saraf_id_idx" ON "rice_warehouses"("saraf_id");
CREATE INDEX "rice_warehouses_payment_channel_idx" ON "rice_warehouses"("payment_channel");

ALTER TABLE "saraf_ledger_entries" ADD COLUMN "rice_warehouse_id" BIGINT;
CREATE UNIQUE INDEX "saraf_ledger_entries_rice_warehouse_id_key" ON "saraf_ledger_entries"("rice_warehouse_id");
ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_rice_warehouse_id_fkey" FOREIGN KEY ("rice_warehouse_id") REFERENCES "rice_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "saraf_ledger_entries_rice_warehouse_id_idx" ON "saraf_ledger_entries"("rice_warehouse_id");

ALTER TABLE "cash_transactions" ADD COLUMN "rice_warehouse_id" BIGINT;
CREATE UNIQUE INDEX "cash_transactions_rice_warehouse_id_key" ON "cash_transactions"("rice_warehouse_id");
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_rice_warehouse_id_fkey" FOREIGN KEY ("rice_warehouse_id") REFERENCES "rice_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "cash_transactions_rice_warehouse_id_idx" ON "cash_transactions"("rice_warehouse_id");
