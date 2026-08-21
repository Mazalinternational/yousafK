-- Company paddy warehouse: cash settlement (mirrors rice warehouse).

ALTER TABLE "cash_transactions" ADD COLUMN "company_owned_paddy_warehouse_id" BIGINT;
CREATE UNIQUE INDEX "cash_transactions_company_owned_paddy_warehouse_id_key" ON "cash_transactions"("company_owned_paddy_warehouse_id");
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_company_owned_paddy_warehouse_id_fkey" FOREIGN KEY ("company_owned_paddy_warehouse_id") REFERENCES "company_owned_paddy_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "cash_transactions_company_owned_paddy_warehouse_id_idx" ON "cash_transactions"("company_owned_paddy_warehouse_id");
