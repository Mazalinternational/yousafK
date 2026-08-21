-- Company-owned paddy: seller settlement cash vs Saraf; Saraf ledger link (negative amount = paid from Saraf).

ALTER TABLE "company_owned_paddy_warehouses" ADD COLUMN "payment_channel" "RiceSalePaymentChannel" NOT NULL DEFAULT 'cash';
ALTER TABLE "company_owned_paddy_warehouses" ADD COLUMN "saraf_id" BIGINT;
ALTER TABLE "company_owned_paddy_warehouses" ADD COLUMN "saraf_ledger_currency_id" TEXT;

ALTER TABLE "company_owned_paddy_warehouses" ADD CONSTRAINT "company_owned_paddy_warehouses_saraf_id_fkey" FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_owned_paddy_warehouses" ADD CONSTRAINT "company_owned_paddy_warehouses_saraf_ledger_currency_id_fkey" FOREIGN KEY ("saraf_ledger_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "company_owned_paddy_warehouses_saraf_id_idx" ON "company_owned_paddy_warehouses"("saraf_id");
CREATE INDEX "company_owned_paddy_warehouses_payment_channel_idx" ON "company_owned_paddy_warehouses"("payment_channel");

ALTER TABLE "saraf_ledger_entries" ADD COLUMN "company_owned_paddy_warehouse_id" BIGINT;
CREATE UNIQUE INDEX "saraf_ledger_entries_company_owned_paddy_warehouse_id_key" ON "saraf_ledger_entries"("company_owned_paddy_warehouse_id");
ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_company_owned_paddy_warehouse_id_fkey" FOREIGN KEY ("company_owned_paddy_warehouse_id") REFERENCES "company_owned_paddy_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "saraf_ledger_entries_company_owned_paddy_warehouse_id_idx" ON "saraf_ledger_entries"("company_owned_paddy_warehouse_id");
