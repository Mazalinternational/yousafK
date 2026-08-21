CREATE TYPE "EnteringPaddyWeightUnit_new" AS ENUM ('one_kg', 'seven_kg', 'ton');

ALTER TABLE "entering_paddies"
ALTER COLUMN "weight_unit" TYPE "EnteringPaddyWeightUnit_new"
USING (
  CASE
    WHEN "weight_unit"::text = 'seer' THEN 'seven_kg'
    ELSE "weight_unit"::text
  END
)::"EnteringPaddyWeightUnit_new";

DROP TYPE "EnteringPaddyWeightUnit";

ALTER TYPE "EnteringPaddyWeightUnit_new" RENAME TO "EnteringPaddyWeightUnit";
