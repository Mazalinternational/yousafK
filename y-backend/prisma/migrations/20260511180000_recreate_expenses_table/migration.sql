-- The migration `20260503192754_add_jwali_module` dropped `expenses` and never
-- recreated it. Re-create the table so `ExpensesService` raw SQL works again.
-- Safe on databases that already have `expenses` (e.g. never applied the drop).

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" BIGSERIAL PRIMARY KEY,
  "bill_no" TEXT NOT NULL UNIQUE,
  "date" DATE NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "notes" TEXT,
  "season_id" TEXT NOT NULL,
  "season_name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "expenses_season_id_idx" ON "expenses" ("season_id");
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses" ("category");
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses" ("date");

-- FK may be missing if the table was created manually; add only when absent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_season_id_fkey'
  ) THEN
    ALTER TABLE "expenses"
      ADD CONSTRAINT "expenses_season_id_fkey"
      FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
