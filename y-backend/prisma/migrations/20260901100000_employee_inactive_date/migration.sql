-- AlterTable
ALTER TABLE "employees" ADD COLUMN "inactive_date" TIMESTAMP(3);

-- Backfill inactive employees so salary accrual stops from their last update time.
UPDATE "employees"
SET "inactive_date" = "updated_at"
WHERE "status" = 'inactive';
