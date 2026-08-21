CREATE TABLE "paddy_variety_stocks" (
  "id" BIGSERIAL NOT NULL,
  "season_id" TEXT NOT NULL,
  "season_name" TEXT NOT NULL,
  "variety" TEXT NOT NULL,
  "company_weight_kg" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "farmer_weight_kg" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "total_weight_kg" DECIMAL(18,2) NOT NULL,
  "entry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "paddy_variety_stocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rice_variety_stocks" (
  "id" BIGSERIAL NOT NULL,
  "season_id" TEXT NOT NULL,
  "season_name" TEXT NOT NULL,
  "variety" TEXT NOT NULL,
  "total_weight_kg" DECIMAL(18,2) NOT NULL,
  "entry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rice_variety_stocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paddy_variety_stocks_season_variety_key"
  ON "paddy_variety_stocks"("season_id", "variety");
CREATE INDEX "paddy_variety_stocks_season_id_idx"
  ON "paddy_variety_stocks"("season_id");
CREATE INDEX "paddy_variety_stocks_variety_idx"
  ON "paddy_variety_stocks"("variety");

CREATE UNIQUE INDEX "rice_variety_stocks_season_variety_key"
  ON "rice_variety_stocks"("season_id", "variety");
CREATE INDEX "rice_variety_stocks_season_id_idx"
  ON "rice_variety_stocks"("season_id");
CREATE INDEX "rice_variety_stocks_variety_idx"
  ON "rice_variety_stocks"("variety");

ALTER TABLE "paddy_variety_stocks"
  ADD CONSTRAINT "paddy_variety_stocks_season_id_fkey"
  FOREIGN KEY ("season_id")
  REFERENCES "seasons"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "rice_variety_stocks"
  ADD CONSTRAINT "rice_variety_stocks_season_id_fkey"
  FOREIGN KEY ("season_id")
  REFERENCES "seasons"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

INSERT INTO "paddy_variety_stocks" (
  "season_id",
  "season_name",
  "variety",
  "company_weight_kg",
  "farmer_weight_kg",
  "total_weight_kg",
  "entry_count",
  "updated_at"
)
SELECT
  agg."season_id",
  agg."season_name",
  agg."variety",
  agg."company_weight_kg",
  agg."farmer_weight_kg",
  (agg."company_weight_kg" + agg."farmer_weight_kg")::DECIMAL(18,2) AS "total_weight_kg",
  agg."entry_count",
  NOW()
FROM (
  SELECT
    base."season_id",
    MAX(base."season_name") AS "season_name",
    base."variety",
    SUM(base."company_kg")::DECIMAL(18,2) AS "company_weight_kg",
    SUM(base."farmer_kg")::DECIMAL(18,2) AS "farmer_weight_kg",
    SUM(base."entry_count")::INTEGER AS "entry_count"
  FROM (
    SELECT
      cpw."season_id",
      cpw."season_name",
      cpw."variety",
      CASE WHEN LOWER(TRIM(cpw."unit")) = 'ton' THEN cpw."quantity" * 1000 ELSE cpw."quantity" END AS "company_kg",
      0::DECIMAL(18,2) AS "farmer_kg",
      1 AS "entry_count"
    FROM "company_owned_paddy_warehouses" cpw
    UNION ALL
    SELECT
      fpw."season_id",
      fpw."season_name",
      fpw."paddy_variety" AS "variety",
      0::DECIMAL(18,2) AS "company_kg",
      CASE WHEN LOWER(TRIM(fpw."unit")) = 'ton' THEN fpw."paddy_quantity" * 1000 ELSE fpw."paddy_quantity" END AS "farmer_kg",
      1 AS "entry_count"
    FROM "farmer_owned_paddy_warehouses" fpw
  ) base
  GROUP BY base."season_id", base."variety"
) agg
WHERE (agg."company_weight_kg" + agg."farmer_weight_kg") > 0;

INSERT INTO "rice_variety_stocks" (
  "season_id",
  "season_name",
  "variety",
  "total_weight_kg",
  "entry_count",
  "updated_at"
)
SELECT
  pre."season_id",
  pre."season_name",
  pre."variety",
  pre."total_weight_kg",
  pre."entry_count",
  NOW()
FROM (
  SELECT
    pre_raw."season_id",
    MAX(pre_raw."season_name") AS "season_name",
    pre_raw."variety",
    SUM(pre_raw."weight_kg")::DECIMAL(18,2) AS "total_weight_kg",
    COUNT(*)::INTEGER AS "entry_count"
  FROM (
    SELECT
      pre_inner."season_id",
      pre_inner."season_name",
      pre_inner."variety",
      CASE WHEN LOWER(TRIM(pre_inner."unit")) = 'ton' THEN pre_inner."weight" * 1000 ELSE pre_inner."weight" END AS "weight_kg"
    FROM "process_rice_entries" pre_inner
  ) pre_raw
  GROUP BY pre_raw."season_id", pre_raw."variety"
) pre
WHERE pre."total_weight_kg" > 0;
