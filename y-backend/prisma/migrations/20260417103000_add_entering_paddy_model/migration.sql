CREATE TYPE "EnteringPaddyReceivedFrom" AS ENUM ('farmer', 'seller');
CREATE TYPE "EnteringPaddyWeightUnit" AS ENUM ('seer', 'seven_kg');

CREATE TABLE "entering_paddies" (
    "id" BIGSERIAL NOT NULL,
    "paddy_owner" TEXT NOT NULL,
    "bill_no" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weight" DECIMAL(18,2) NOT NULL,
    "weight_unit" "EnteringPaddyWeightUnit" NOT NULL,
    "total_weight_kg" DECIMAL(18,2) NOT NULL,
    "driver_name" TEXT NOT NULL,
    "car_plate" TEXT NOT NULL,
    "phone_no" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "received_from" "EnteringPaddyReceivedFrom" NOT NULL,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entering_paddies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "entering_paddies_season_id_idx" ON "entering_paddies"("season_id");
CREATE INDEX "entering_paddies_date_idx" ON "entering_paddies"("date");
CREATE INDEX "entering_paddies_paddy_owner_idx" ON "entering_paddies"("paddy_owner");
CREATE INDEX "entering_paddies_bill_no_idx" ON "entering_paddies"("bill_no");
CREATE INDEX "entering_paddies_variety_idx" ON "entering_paddies"("variety");
CREATE INDEX "entering_paddies_received_from_idx" ON "entering_paddies"("received_from");

ALTER TABLE "entering_paddies"
ADD CONSTRAINT "entering_paddies_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
