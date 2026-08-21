ALTER TABLE "paddy_warehouses" RENAME TO "company_owned_paddy_warehouses";

ALTER INDEX "paddy_warehouses_pkey" RENAME TO "company_owned_paddy_warehouses_pkey";
ALTER INDEX "paddy_warehouses_season_id_idx" RENAME TO "company_owned_paddy_warehouses_season_id_idx";
ALTER INDEX "paddy_warehouses_received_date_idx" RENAME TO "company_owned_paddy_warehouses_received_date_idx";
ALTER INDEX "paddy_warehouses_owner_name_idx" RENAME TO "company_owned_paddy_warehouses_owner_name_idx";
ALTER INDEX "paddy_warehouses_variety_idx" RENAME TO "company_owned_paddy_warehouses_variety_idx";
ALTER INDEX "paddy_warehouses_payment_type_idx" RENAME TO "company_owned_paddy_warehouses_payment_type_idx";

ALTER TABLE "company_owned_paddy_warehouses"
RENAME CONSTRAINT "paddy_warehouses_season_id_fkey"
TO "company_owned_paddy_warehouses_season_id_fkey";
