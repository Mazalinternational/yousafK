CREATE TABLE IF NOT EXISTS "expenses" (
  "id" BIGSERIAL PRIMARY KEY,
  "bill_no" TEXT NOT NULL UNIQUE,
  "date" DATE NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "notes" TEXT,
  "season_id" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "season_name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "expenses_season_id_idx" ON "expenses" ("season_id");
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses" ("category");
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses" ("date");
