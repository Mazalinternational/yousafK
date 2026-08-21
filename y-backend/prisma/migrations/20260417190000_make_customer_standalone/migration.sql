ALTER TABLE "customers" DROP CONSTRAINT "customers_season_id_fkey";

DROP INDEX "customers_season_id_idx";

ALTER TABLE "customers"
DROP COLUMN "season_id",
DROP COLUMN "season_name";
