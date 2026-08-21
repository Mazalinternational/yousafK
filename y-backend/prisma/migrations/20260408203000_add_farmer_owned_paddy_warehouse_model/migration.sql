-- AlterEnum
ALTER TYPE "PaddyStockType" ADD VALUE 'farmer';

COMMIT;

-- CreateTable
CREATE TABLE "farmer_owned_paddy_warehouses" (
    "id" BIGSERIAL NOT NULL,
    "stock_type" "PaddyStockType" NOT NULL DEFAULT 'farmer',
    "paddy_variety" TEXT NOT NULL,
    "paddy_quantity" DECIMAL(18,2) NOT NULL,
    "rice_variety" TEXT NOT NULL,
    "rice_quantity" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farmer_owned_paddy_warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farmer_owned_paddy_warehouses_season_id_idx" ON "farmer_owned_paddy_warehouses"("season_id");

-- CreateIndex
CREATE INDEX "farmer_owned_paddy_warehouses_received_date_idx" ON "farmer_owned_paddy_warehouses"("received_date");

-- CreateIndex
CREATE INDEX "farmer_owned_paddy_warehouses_owner_name_idx" ON "farmer_owned_paddy_warehouses"("owner_name");

-- CreateIndex
CREATE INDEX "farmer_owned_paddy_warehouses_paddy_variety_idx" ON "farmer_owned_paddy_warehouses"("paddy_variety");

-- CreateIndex
CREATE INDEX "farmer_owned_paddy_warehouses_rice_variety_idx" ON "farmer_owned_paddy_warehouses"("rice_variety");

-- AddForeignKey
ALTER TABLE "farmer_owned_paddy_warehouses"
ADD CONSTRAINT "farmer_owned_paddy_warehouses_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
