ALTER TABLE "rice_warehouses"
ADD COLUMN "customer_id" BIGINT;

CREATE INDEX "rice_warehouses_customer_id_idx"
ON "rice_warehouses"("customer_id");

ALTER TABLE "rice_warehouses"
ADD CONSTRAINT "rice_warehouses_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
