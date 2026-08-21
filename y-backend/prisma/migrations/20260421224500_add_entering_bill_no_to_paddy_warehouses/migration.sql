ALTER TABLE "company_owned_paddy_warehouses"
ADD COLUMN "entering_bill_no" TEXT;

ALTER TABLE "farmer_owned_paddy_warehouses"
ADD COLUMN "entering_bill_no" TEXT;

UPDATE "company_owned_paddy_warehouses"
SET "entering_bill_no" = "bill_no"
WHERE "entering_paddy_id" IS NOT NULL;

UPDATE "farmer_owned_paddy_warehouses"
SET "entering_bill_no" = "bill_no"
WHERE "entering_paddy_id" IS NOT NULL;

CREATE INDEX "company_owned_paddy_warehouses_entering_bill_no_idx"
ON "company_owned_paddy_warehouses"("entering_bill_no");

CREATE INDEX "farmer_owned_paddy_warehouses_entering_bill_no_idx"
ON "farmer_owned_paddy_warehouses"("entering_bill_no");
