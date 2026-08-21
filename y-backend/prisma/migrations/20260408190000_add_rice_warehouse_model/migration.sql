CREATE TABLE "rice_warehouses" (
    "id" BIGSERIAL NOT NULL,
    "stock_type" "PaddyStockType" NOT NULL DEFAULT 'company',
    "variety" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "rate" DECIMAL(18,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "payment_type" "PaddyPaymentType" NOT NULL DEFAULT 'remaining',
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(18,2) NOT NULL,
    "received_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rice_warehouses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rice_warehouses_season_id_idx" ON "rice_warehouses"("season_id");
CREATE INDEX "rice_warehouses_received_date_idx" ON "rice_warehouses"("received_date");
CREATE INDEX "rice_warehouses_owner_name_idx" ON "rice_warehouses"("owner_name");
CREATE INDEX "rice_warehouses_variety_idx" ON "rice_warehouses"("variety");
CREATE INDEX "rice_warehouses_payment_type_idx" ON "rice_warehouses"("payment_type");

ALTER TABLE "rice_warehouses"
ADD CONSTRAINT "rice_warehouses_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
