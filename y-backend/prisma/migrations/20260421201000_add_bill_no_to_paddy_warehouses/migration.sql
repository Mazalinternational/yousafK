-- AlterTable
ALTER TABLE "company_owned_paddy_warehouses" ADD COLUMN "bill_no" TEXT;

-- AlterTable
ALTER TABLE "farmer_owned_paddy_warehouses" ADD COLUMN "bill_no" TEXT;

-- Backfill from linked entering paddy when available
UPDATE "company_owned_paddy_warehouses" cpw
SET "bill_no" = ep."bill_no"
FROM "entering_paddies" ep
WHERE cpw."entering_paddy_id" = ep."id"
  AND cpw."bill_no" IS NULL;

UPDATE "farmer_owned_paddy_warehouses" fpw
SET "bill_no" = ep."bill_no"
FROM "entering_paddies" ep
WHERE fpw."entering_paddy_id" = ep."id"
  AND fpw."bill_no" IS NULL;

-- Fallback for existing manual records
UPDATE "company_owned_paddy_warehouses"
SET "bill_no" = CONCAT('CPW-', "id"::text)
WHERE "bill_no" IS NULL;

UPDATE "farmer_owned_paddy_warehouses"
SET "bill_no" = CONCAT('FPW-', "id"::text)
WHERE "bill_no" IS NULL;

-- Enforce not null
ALTER TABLE "company_owned_paddy_warehouses" ALTER COLUMN "bill_no" SET NOT NULL;
ALTER TABLE "farmer_owned_paddy_warehouses" ALTER COLUMN "bill_no" SET NOT NULL;

-- Index
CREATE INDEX "company_owned_paddy_warehouses_bill_no_idx" ON "company_owned_paddy_warehouses"("bill_no");
CREATE INDEX "farmer_owned_paddy_warehouses_bill_no_idx" ON "farmer_owned_paddy_warehouses"("bill_no");
