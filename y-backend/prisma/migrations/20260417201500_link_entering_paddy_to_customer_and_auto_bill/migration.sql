ALTER TABLE "entering_paddies"
ADD COLUMN "customer_id" BIGINT;

UPDATE "entering_paddies" ep
SET "customer_id" = c."id"
FROM "customers" c
WHERE c."name" = ep."paddy_owner"
  AND c."season_id" = ep."season_id"
  AND ep."customer_id" IS NULL;

CREATE INDEX "entering_paddies_customer_id_idx" ON "entering_paddies"("customer_id");

ALTER TABLE "entering_paddies"
ADD CONSTRAINT "entering_paddies_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
