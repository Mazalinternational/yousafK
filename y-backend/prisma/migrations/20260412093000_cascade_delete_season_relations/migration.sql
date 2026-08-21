ALTER TABLE "company_owned_paddy_warehouses"
DROP CONSTRAINT "company_owned_paddy_warehouses_season_id_fkey",
ADD CONSTRAINT "company_owned_paddy_warehouses_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rice_warehouses"
DROP CONSTRAINT "rice_warehouses_season_id_fkey",
ADD CONSTRAINT "rice_warehouses_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "farmer_owned_paddy_warehouses"
DROP CONSTRAINT "farmer_owned_paddy_warehouses_season_id_fkey",
ADD CONSTRAINT "farmer_owned_paddy_warehouses_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
