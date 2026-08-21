-- Store variety sale loading and bags charges with separate settlement per charge line.

CREATE TYPE "StoreVarietySaleChargeType" AS ENUM ('sale', 'loading', 'bags');

ALTER TABLE "store_variety_sales"
  ADD COLUMN IF NOT EXISTS "loading_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "loading_payment_channel" "RiceSalePaymentChannel",
  ADD COLUMN IF NOT EXISTS "loading_saraf_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "loading_currency_id" TEXT,
  ADD COLUMN IF NOT EXISTS "rice_bags_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bags_payment_channel" "RiceSalePaymentChannel",
  ADD COLUMN IF NOT EXISTS "bags_saraf_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "bags_currency_id" TEXT;

ALTER TABLE "saraf_ledger_entries"
  ADD COLUMN IF NOT EXISTS "store_variety_sale_charge_type" "StoreVarietySaleChargeType";

ALTER TABLE "cash_transactions"
  ADD COLUMN IF NOT EXISTS "store_variety_sale_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "store_variety_sale_charge_type" "StoreVarietySaleChargeType";

UPDATE "saraf_ledger_entries"
SET "store_variety_sale_charge_type" = 'sale'::"StoreVarietySaleChargeType"
WHERE "store_variety_sale_id" IS NOT NULL
  AND "store_variety_sale_charge_type" IS NULL;

DROP INDEX IF EXISTS "saraf_ledger_entries_store_variety_sale_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "saraf_ledger_entries_store_variety_sale_charge_key"
  ON "saraf_ledger_entries" ("store_variety_sale_id", "store_variety_sale_charge_type")
  WHERE "store_variety_sale_id" IS NOT NULL AND "store_variety_sale_charge_type" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "cash_transactions_store_variety_sale_charge_key"
  ON "cash_transactions" ("store_variety_sale_id", "store_variety_sale_charge_type")
  WHERE "store_variety_sale_id" IS NOT NULL AND "store_variety_sale_charge_type" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "store_variety_sales_loading_saraf_id_idx" ON "store_variety_sales" ("loading_saraf_id");
CREATE INDEX IF NOT EXISTS "store_variety_sales_loading_currency_id_idx" ON "store_variety_sales" ("loading_currency_id");
CREATE INDEX IF NOT EXISTS "store_variety_sales_bags_saraf_id_idx" ON "store_variety_sales" ("bags_saraf_id");
CREATE INDEX IF NOT EXISTS "store_variety_sales_bags_currency_id_idx" ON "store_variety_sales" ("bags_currency_id");
CREATE INDEX IF NOT EXISTS "cash_transactions_store_variety_sale_id_idx" ON "cash_transactions" ("store_variety_sale_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_variety_sales_loading_saraf_id_fkey'
  ) THEN
    ALTER TABLE "store_variety_sales"
      ADD CONSTRAINT "store_variety_sales_loading_saraf_id_fkey"
      FOREIGN KEY ("loading_saraf_id") REFERENCES "sarafs"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_variety_sales_loading_currency_id_fkey'
  ) THEN
    ALTER TABLE "store_variety_sales"
      ADD CONSTRAINT "store_variety_sales_loading_currency_id_fkey"
      FOREIGN KEY ("loading_currency_id") REFERENCES "currencies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_variety_sales_bags_saraf_id_fkey'
  ) THEN
    ALTER TABLE "store_variety_sales"
      ADD CONSTRAINT "store_variety_sales_bags_saraf_id_fkey"
      FOREIGN KEY ("bags_saraf_id") REFERENCES "sarafs"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_variety_sales_bags_currency_id_fkey'
  ) THEN
    ALTER TABLE "store_variety_sales"
      ADD CONSTRAINT "store_variety_sales_bags_currency_id_fkey"
      FOREIGN KEY ("bags_currency_id") REFERENCES "currencies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_transactions_store_variety_sale_id_fkey'
  ) THEN
    ALTER TABLE "cash_transactions"
      ADD CONSTRAINT "cash_transactions_store_variety_sale_id_fkey"
      FOREIGN KEY ("store_variety_sale_id") REFERENCES "store_variety_sales"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
