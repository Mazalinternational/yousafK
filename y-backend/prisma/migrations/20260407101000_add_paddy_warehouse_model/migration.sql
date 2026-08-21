CREATE TABLE "paddy_warehouses" (
    "id" TEXT NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "seller_name" TEXT NOT NULL,
    "seller_phone" TEXT,
    "seller_address" TEXT,
    "vehicle_number" TEXT,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "due_amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paddy_warehouses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "paddy_warehouses_season_id_idx" ON "paddy_warehouses"("season_id");
CREATE INDEX "paddy_warehouses_purchase_date_idx" ON "paddy_warehouses"("purchase_date");
CREATE INDEX "paddy_warehouses_seller_name_idx" ON "paddy_warehouses"("seller_name");

ALTER TABLE "paddy_warehouses"
ADD CONSTRAINT "paddy_warehouses_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
