ALTER TABLE "paddy_processes"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'under_process',
ADD COLUMN "end_date" TIMESTAMP(3);

CREATE INDEX "paddy_processes_status_idx" ON "paddy_processes"("status");
