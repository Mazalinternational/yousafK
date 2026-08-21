DROP TABLE IF EXISTS "paddy_warehouses";

CREATE TYPE "PaddyStockType" AS ENUM ('company');
CREATE TYPE "PaddyWarehouseStatus" AS ENUM ('available', 'used', 'damaged');

CREATE TABLE "paddy_warehouses" (
    "id" BIGSERIAL NOT NULL,
    "stock_type" "PaddyStockType" NOT NULL DEFAULT 'company',
    "variety" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL,
    "status" "PaddyWarehouseStatus" NOT NULL DEFAULT 'available',
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paddy_warehouses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "paddy_warehouses_season_id_idx" ON "paddy_warehouses"("season_id");
CREATE INDEX "paddy_warehouses_received_date_idx" ON "paddy_warehouses"("received_date");
CREATE INDEX "paddy_warehouses_owner_name_idx" ON "paddy_warehouses"("owner_name");
CREATE INDEX "paddy_warehouses_variety_idx" ON "paddy_warehouses"("variety");
CREATE INDEX "paddy_warehouses_status_idx" ON "paddy_warehouses"("status");

ALTER TABLE "paddy_warehouses"
ADD CONSTRAINT "paddy_warehouses_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
