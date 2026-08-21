-- CreateTable
CREATE TABLE "investors" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_no" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "share_percentage" DECIMAL(5,2) NOT NULL,
    "invested_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investors_season_id_idx" ON "investors"("season_id");

-- CreateIndex
CREATE INDEX "investors_name_idx" ON "investors"("name");

-- CreateIndex
CREATE INDEX "investors_phone_no_idx" ON "investors"("phone_no");

-- CreateIndex
CREATE INDEX "investors_is_active_idx" ON "investors"("is_active");

-- AddForeignKey
ALTER TABLE "investors" ADD CONSTRAINT "investors_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
