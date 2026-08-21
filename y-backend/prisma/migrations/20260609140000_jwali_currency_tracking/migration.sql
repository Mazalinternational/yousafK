-- Per-currency Jwali ledger charges and payments (no mixed-currency totals).

ALTER TABLE "jwali_ledger_entries" ADD COLUMN IF NOT EXISTS "currency_id" TEXT;

ALTER TABLE "jwali_payments" ADD COLUMN IF NOT EXISTS "currency_id" TEXT;

UPDATE "jwali_payments"
SET "currency_id" = "saraf_ledger_currency_id"
WHERE "currency_id" IS NULL
  AND "saraf_ledger_currency_id" IS NOT NULL;

UPDATE "jwali_payments"
SET "currency_id" = (SELECT "id" FROM "currencies" WHERE "code" = 'USD' LIMIT 1)
WHERE "currency_id" IS NULL;

UPDATE "jwali_ledger_entries"
SET "currency_id" = (SELECT "id" FROM "currencies" WHERE "code" = 'USD' LIMIT 1)
WHERE "currency_id" IS NULL;

CREATE INDEX IF NOT EXISTS "jwali_ledger_entries_currency_id_idx"
  ON "jwali_ledger_entries" ("currency_id");

CREATE INDEX IF NOT EXISTS "jwali_payments_currency_id_idx"
  ON "jwali_payments" ("currency_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jwali_ledger_entries_currency_id_fkey'
  ) THEN
    ALTER TABLE "jwali_ledger_entries"
      ADD CONSTRAINT "jwali_ledger_entries_currency_id_fkey"
      FOREIGN KEY ("currency_id") REFERENCES "currencies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jwali_payments_currency_id_fkey'
  ) THEN
    ALTER TABLE "jwali_payments"
      ADD CONSTRAINT "jwali_payments_currency_id_fkey"
      FOREIGN KEY ("currency_id") REFERENCES "currencies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
