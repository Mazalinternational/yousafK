-- Persisted stock totals by store type and variety (for inventory display and future sales)
CREATE TABLE "store_variety_stocks" (
    "id" BIGSERIAL NOT NULL,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "store_type" "StoreType" NOT NULL,
    "variety" TEXT NOT NULL,
    "total_weight_kg" DECIMAL(18, 2) NOT NULL DEFAULT 0,
    "sold_weight_kg" DECIMAL(18, 2) NOT NULL DEFAULT 0,
    "entry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_variety_stocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_variety_stocks_season_store_variety_key"
ON "store_variety_stocks"("season_id", "store_type", "variety");

CREATE INDEX "store_variety_stocks_season_id_store_type_idx"
ON "store_variety_stocks"("season_id", "store_type");

CREATE INDEX "store_variety_stocks_variety_idx"
ON "store_variety_stocks"("variety");

ALTER TABLE "store_variety_stocks"
ADD CONSTRAINT "store_variety_stocks_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from existing store entries
INSERT INTO "store_variety_stocks" (
    "season_id",
    "season_name",
    "store_type",
    "variety",
    "total_weight_kg",
    "sold_weight_kg",
    "entry_count",
    "updated_at"
)
SELECT
    se."season_id",
    se."season_name",
    se."store_type",
    se."variety",
    COALESCE(SUM(se."processed_weight_kg"), 0),
    COALESCE(SUM(se."sold_weight"), 0),
    COUNT(*)::integer,
    NOW()
FROM "store_entries" se
GROUP BY se."season_id", se."season_name", se."store_type", se."variety";
