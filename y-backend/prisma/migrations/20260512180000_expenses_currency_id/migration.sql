-- Link each expense to a currency (FK to `currencies`). Existing rows default to USD.

ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "currency_id" TEXT;

UPDATE "expenses"
SET "currency_id" = (SELECT "id" FROM "currencies" WHERE "code" = 'USD' LIMIT 1)
WHERE "currency_id" IS NULL;

ALTER TABLE "expenses" ALTER COLUMN "currency_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "expenses_currency_id_idx" ON "expenses" ("currency_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_currency_id_fkey'
  ) THEN
    ALTER TABLE "expenses"
      ADD CONSTRAINT "expenses_currency_id_fkey"
      FOREIGN KEY ("currency_id") REFERENCES "currencies"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
