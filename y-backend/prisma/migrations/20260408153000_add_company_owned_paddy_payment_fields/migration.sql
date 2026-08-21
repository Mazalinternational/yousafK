CREATE TYPE "PaddyPaymentType" AS ENUM ('paid', 'partial_paid', 'remaining');

ALTER TABLE "paddy_warehouses"
ADD COLUMN "payment_type" "PaddyPaymentType" NOT NULL DEFAULT 'remaining',
ADD COLUMN "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "remaining_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;

UPDATE "paddy_warehouses"
SET
  "paid_amount" = 0,
  "remaining_amount" = "total_amount",
  "payment_type" = 'remaining';

DROP INDEX IF EXISTS "paddy_warehouses_status_idx";
ALTER TABLE "paddy_warehouses" DROP COLUMN "status";
DROP TYPE IF EXISTS "PaddyWarehouseStatus";

CREATE INDEX "paddy_warehouses_payment_type_idx" ON "paddy_warehouses"("payment_type");
