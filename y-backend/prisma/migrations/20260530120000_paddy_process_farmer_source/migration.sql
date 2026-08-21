ALTER TABLE "paddy_processes"
  ALTER COLUMN "source_company_paddy_warehouse_id" DROP NOT NULL;

ALTER TABLE "paddy_processes"
  ADD COLUMN "source_farmer_paddy_warehouse_id" BIGINT;

CREATE INDEX "paddy_processes_source_farmer_paddy_warehouse_id_idx"
  ON "paddy_processes"("source_farmer_paddy_warehouse_id");

ALTER TABLE "paddy_processes"
  ADD CONSTRAINT "paddy_processes_source_farmer_paddy_warehouse_id_fkey"
  FOREIGN KEY ("source_farmer_paddy_warehouse_id")
  REFERENCES "farmer_owned_paddy_warehouses"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "paddy_processes"
  ADD CONSTRAINT "paddy_processes_single_source_check"
  CHECK (
    (
      "source_company_paddy_warehouse_id" IS NOT NULL
      AND "source_farmer_paddy_warehouse_id" IS NULL
    )
    OR (
      "source_company_paddy_warehouse_id" IS NULL
      AND "source_farmer_paddy_warehouse_id" IS NOT NULL
    )
  );
