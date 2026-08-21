CREATE TABLE "paddy_processes" (
    "id" BIGSERIAL NOT NULL,
    "source_company_paddy_warehouse_id" BIGINT NOT NULL,
    "bill_no" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "processed_weight_kg" DECIMAL(18,2) NOT NULL,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paddy_processes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "paddy_processes_season_id_idx" ON "paddy_processes"("season_id");
CREATE INDEX "paddy_processes_source_company_paddy_warehouse_id_idx" ON "paddy_processes"("source_company_paddy_warehouse_id");
CREATE INDEX "paddy_processes_bill_no_idx" ON "paddy_processes"("bill_no");
CREATE INDEX "paddy_processes_variety_idx" ON "paddy_processes"("variety");
CREATE INDEX "paddy_processes_date_idx" ON "paddy_processes"("date");

ALTER TABLE "paddy_processes"
ADD CONSTRAINT "paddy_processes_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "paddy_processes"
ADD CONSTRAINT "paddy_processes_source_company_paddy_warehouse_id_fkey"
FOREIGN KEY ("source_company_paddy_warehouse_id") REFERENCES "company_owned_paddy_warehouses"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
