ALTER TABLE "paddy_processes"
  DROP CONSTRAINT IF EXISTS "paddy_processes_single_source_check";

ALTER TABLE "paddy_processes"
  ADD COLUMN "stock_source_type" TEXT;

UPDATE "paddy_processes"
SET "stock_source_type" = CASE
  WHEN "source_farmer_paddy_warehouse_id" IS NOT NULL THEN 'farmer'
  ELSE 'company'
END;

ALTER TABLE "paddy_processes"
  ALTER COLUMN "stock_source_type" SET NOT NULL;

ALTER TABLE "paddy_processes"
  ALTER COLUMN "stock_source_type" SET DEFAULT 'company';
