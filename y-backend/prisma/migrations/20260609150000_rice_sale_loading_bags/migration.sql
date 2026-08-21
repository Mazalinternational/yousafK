-- Rice sale loading and bags charges with separate settlement per charge line.

CREATE TYPE "RiceSaleChargeType" AS ENUM ('rice', 'loading', 'bags');

ALTER TABLE "rice_sales"
  ADD COLUMN IF NOT EXISTS "loading_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "loading_payment_channel" "RiceSalePaymentChannel",
  ADD COLUMN IF NOT EXISTS "loading_saraf_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "loading_currency_id" TEXT,
  ADD COLUMN IF NOT EXISTS "rice_bags_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bags_payment_channel" "RiceSalePaymentChannel",
  ADD COLUMN IF NOT EXISTS "bags_saraf_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "bags_currency_id" TEXT;

ALTER TABLE "cash_transactions"
  ADD COLUMN IF NOT EXISTS "rice_sale_charge_type" "RiceSaleChargeType";

ALTER TABLE "saraf_ledger_entries"
  ADD COLUMN IF NOT EXISTS "rice_sale_charge_type" "RiceSaleChargeType";

UPDATE "cash_transactions"
SET "rice_sale_charge_type" = 'rice'::"RiceSaleChargeType"
WHERE "rice_sale_id" IS NOT NULL
  AND "rice_sale_charge_type" IS NULL;

UPDATE "saraf_ledger_entries"
SET "rice_sale_charge_type" = 'rice'::"RiceSaleChargeType"
WHERE "rice_sale_id" IS NOT NULL
  AND "rice_sale_charge_type" IS NULL;

DROP INDEX IF EXISTS "cash_transactions_rice_sale_id_key";
DROP INDEX IF EXISTS "saraf_ledger_entries_rice_sale_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "cash_transactions_rice_sale_charge_key"
  ON "cash_transactions" ("rice_sale_id", "rice_sale_charge_type")
  WHERE "rice_sale_id" IS NOT NULL AND "rice_sale_charge_type" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "saraf_ledger_entries_rice_sale_charge_key"
  ON "saraf_ledger_entries" ("rice_sale_id", "rice_sale_charge_type")
  WHERE "rice_sale_id" IS NOT NULL AND "rice_sale_charge_type" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "rice_sales_loading_saraf_id_idx" ON "rice_sales" ("loading_saraf_id");
CREATE INDEX IF NOT EXISTS "rice_sales_loading_currency_id_idx" ON "rice_sales" ("loading_currency_id");
CREATE INDEX IF NOT EXISTS "rice_sales_bags_saraf_id_idx" ON "rice_sales" ("bags_saraf_id");
CREATE INDEX IF NOT EXISTS "rice_sales_bags_currency_id_idx" ON "rice_sales" ("bags_currency_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rice_sales_loading_saraf_id_fkey'
  ) THEN
    ALTER TABLE "rice_sales"
      ADD CONSTRAINT "rice_sales_loading_saraf_id_fkey"
      FOREIGN KEY ("loading_saraf_id") REFERENCES "sarafs"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rice_sales_loading_currency_id_fkey'
  ) THEN
    ALTER TABLE "rice_sales"
      ADD CONSTRAINT "rice_sales_loading_currency_id_fkey"
      FOREIGN KEY ("loading_currency_id") REFERENCES "currencies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rice_sales_bags_saraf_id_fkey'
  ) THEN
    ALTER TABLE "rice_sales"
      ADD CONSTRAINT "rice_sales_bags_saraf_id_fkey"
      FOREIGN KEY ("bags_saraf_id") REFERENCES "sarafs"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rice_sales_bags_currency_id_fkey'
  ) THEN
    ALTER TABLE "rice_sales"
      ADD CONSTRAINT "rice_sales_bags_currency_id_fkey"
      FOREIGN KEY ("bags_currency_id") REFERENCES "currencies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
