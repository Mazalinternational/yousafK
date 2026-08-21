-- CreateEnum
CREATE TYPE "StoreEntryStatus" AS ENUM ('stock', 'sold');

-- AlterTable
ALTER TABLE "store_entries"
ADD COLUMN "status" "StoreEntryStatus" NOT NULL DEFAULT 'stock';

UPDATE "store_entries"
SET "status" = 'sold'
WHERE "sale_amount" > 0;

CREATE INDEX "store_entries_status_idx" ON "store_entries"("status");
