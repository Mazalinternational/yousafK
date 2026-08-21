-- AlterTable
ALTER TABLE "company_owned_paddy_warehouses" ADD COLUMN     "entering_paddy_id" BIGINT;

-- AlterTable
ALTER TABLE "entering_paddies" ADD COLUMN     "tracked_at" TIMESTAMP(3),
ADD COLUMN     "tracked_in_warehouse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tracked_stock_type" "PaddyStockType";

-- AlterTable
ALTER TABLE "farmer_owned_paddy_warehouses" ADD COLUMN     "entering_paddy_id" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "company_owned_paddy_warehouses_entering_paddy_id_key" ON "company_owned_paddy_warehouses"("entering_paddy_id");

-- CreateIndex
CREATE INDEX "company_owned_paddy_warehouses_entering_paddy_id_idx" ON "company_owned_paddy_warehouses"("entering_paddy_id");

-- CreateIndex
CREATE INDEX "entering_paddies_tracked_in_warehouse_idx" ON "entering_paddies"("tracked_in_warehouse");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_owned_paddy_warehouses_entering_paddy_id_key" ON "farmer_owned_paddy_warehouses"("entering_paddy_id");

-- CreateIndex
CREATE INDEX "farmer_owned_paddy_warehouses_entering_paddy_id_idx" ON "farmer_owned_paddy_warehouses"("entering_paddy_id");

-- AddForeignKey
ALTER TABLE "company_owned_paddy_warehouses" ADD CONSTRAINT "company_owned_paddy_warehouses_entering_paddy_id_fkey" FOREIGN KEY ("entering_paddy_id") REFERENCES "entering_paddies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_owned_paddy_warehouses" ADD CONSTRAINT "farmer_owned_paddy_warehouses_entering_paddy_id_fkey" FOREIGN KEY ("entering_paddy_id") REFERENCES "entering_paddies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
