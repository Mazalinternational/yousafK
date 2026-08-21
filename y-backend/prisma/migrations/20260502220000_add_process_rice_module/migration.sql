CREATE TABLE "process_rice_entries" (
    "id" BIGSERIAL NOT NULL,
    "source_paddy_process_id" BIGINT NOT NULL,
    "processed_bill_no" TEXT NOT NULL,
    "bill_no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "variety" TEXT NOT NULL,
    "weight" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "processed_weight_kg" DECIMAL(18,2) NOT NULL,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_rice_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "process_rice_entries_source_paddy_process_id_key" ON "process_rice_entries"("source_paddy_process_id");
CREATE INDEX "process_rice_entries_season_id_idx" ON "process_rice_entries"("season_id");
CREATE INDEX "process_rice_entries_processed_bill_no_idx" ON "process_rice_entries"("processed_bill_no");
CREATE INDEX "process_rice_entries_bill_no_idx" ON "process_rice_entries"("bill_no");
CREATE INDEX "process_rice_entries_date_idx" ON "process_rice_entries"("date");
CREATE INDEX "process_rice_entries_variety_idx" ON "process_rice_entries"("variety");

ALTER TABLE "process_rice_entries"
ADD CONSTRAINT "process_rice_entries_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "process_rice_entries"
ADD CONSTRAINT "process_rice_entries_source_paddy_process_id_fkey"
FOREIGN KEY ("source_paddy_process_id") REFERENCES "paddy_processes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
