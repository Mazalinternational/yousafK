-- Align database objects with prisma/schema.prisma (indexes, defaults, names).
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS throughout.

CREATE INDEX IF NOT EXISTS "customer_ledger_entries_source_rice_warehouse_id_idx"
  ON "customer_ledger_entries"("source_rice_warehouse_id");

CREATE INDEX IF NOT EXISTS "customer_ledger_entries_linked_ledger_entry_id_idx"
  ON "customer_ledger_entries"("linked_ledger_entry_id");

CREATE INDEX IF NOT EXISTS "saraf_ledger_entries_employee_ledger_entry_id_idx"
  ON "saraf_ledger_entries"("employee_ledger_entry_id");

DROP INDEX IF EXISTS "customer_ledger_entries_payment_channel_idx";
DROP INDEX IF EXISTS "customer_ledger_entries_saraf_id_idx";
DROP INDEX IF EXISTS "saraf_ledger_entries_store_variety_sale_id_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'store_variety_sales_season_bill_no_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'store_variety_sales_season_id_bill_no_key'
  ) THEN
    ALTER INDEX "store_variety_sales_season_bill_no_key"
      RENAME TO "store_variety_sales_season_id_bill_no_key";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'store_variety_sales_season_store_type_idx'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'store_variety_sales_season_id_store_type_idx'
  ) THEN
    ALTER INDEX "store_variety_sales_season_store_type_idx"
      RENAME TO "store_variety_sales_season_id_store_type_idx";
  END IF;
END $$;

ALTER TABLE "rice_sales" ALTER COLUMN "total_amount" DROP DEFAULT;
ALTER TABLE "rice_sales" ALTER COLUMN "payment_type" DROP DEFAULT;
ALTER TABLE "rice_sales" ALTER COLUMN "paid_amount" DROP DEFAULT;
ALTER TABLE "rice_sales" ALTER COLUMN "remaining_amount" DROP DEFAULT;

ALTER TABLE "store_variety_stocks" ALTER COLUMN "total_weight_kg" DROP DEFAULT;

ALTER TABLE "expenses" ALTER COLUMN "updated_at" DROP DEFAULT;
