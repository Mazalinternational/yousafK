ALTER TABLE "customers"
ADD COLUMN "season_id" TEXT,
ADD COLUMN "season_name" TEXT;

UPDATE "customers"
SET
  "season_id" = season_data.id,
  "season_name" = season_data.name
FROM (
  SELECT "id", "name"
  FROM "seasons"
  WHERE "status" = 'ACTIVE'
  ORDER BY "created_at" DESC
  LIMIT 1
) AS season_data
WHERE "customers"."season_id" IS NULL;

ALTER TABLE "customers"
ALTER COLUMN "season_id" SET NOT NULL,
ALTER COLUMN "season_name" SET NOT NULL;

CREATE INDEX "customers_season_id_idx" ON "customers"("season_id");

ALTER TABLE "customers"
ADD CONSTRAINT "customers_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
