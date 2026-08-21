CREATE TYPE "StoreType" AS ENUM ('short_green', 'regection', 'broken_rice', 'waste');

CREATE TABLE "store_entries" (
    "id" BIGSERIAL NOT NULL,
    "store_type" "StoreType" NOT NULL,
    "source_paddy_process_id" BIGINT NOT NULL,
    "processed_bill_no" TEXT NOT NULL,
    "bill_no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "variety" TEXT NOT NULL,
    "weight" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "processed_weight_kg" DECIMAL(18,2) NOT NULL,
    "owner_name" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "store_entries_store_type_idx" ON "store_entries"("store_type");
CREATE INDEX "store_entries_season_id_idx" ON "store_entries"("season_id");
CREATE INDEX "store_entries_source_paddy_process_id_idx" ON "store_entries"("source_paddy_process_id");
CREATE INDEX "store_entries_processed_bill_no_idx" ON "store_entries"("processed_bill_no");
CREATE INDEX "store_entries_bill_no_idx" ON "store_entries"("bill_no");
CREATE INDEX "store_entries_date_idx" ON "store_entries"("date");
CREATE INDEX "store_entries_variety_idx" ON "store_entries"("variety");
CREATE INDEX "store_entries_owner_name_idx" ON "store_entries"("owner_name");
CREATE UNIQUE INDEX "store_entries_store_type_source_paddy_process_id_key" ON "store_entries"("store_type", "source_paddy_process_id");

ALTER TABLE "store_entries"
ADD CONSTRAINT "store_entries_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_entries"
ADD CONSTRAINT "store_entries_source_paddy_process_id_fkey"
FOREIGN KEY ("source_paddy_process_id") REFERENCES "paddy_processes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
