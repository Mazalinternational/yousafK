ALTER TABLE "rice_warehouses" ADD COLUMN "bill_no" TEXT;

UPDATE "rice_warehouses"
SET "bill_no" = 'LEGACY-RW-' || "id"::text
WHERE "bill_no" IS NULL;

ALTER TABLE "rice_warehouses" ALTER COLUMN "bill_no" SET NOT NULL;

CREATE UNIQUE INDEX "rice_warehouses_season_id_bill_no_key" ON "rice_warehouses" ("season_id", "bill_no");
