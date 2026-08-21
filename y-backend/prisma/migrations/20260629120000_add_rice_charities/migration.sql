-- CreateTable
CREATE TABLE "rice_charities" (
    "id" BIGSERIAL NOT NULL,
    "bill_no" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "rice_variety" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "charity_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rice_charities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rice_charities_rice_variety_idx" ON "rice_charities"("rice_variety");

-- CreateIndex
CREATE INDEX "rice_charities_season_id_idx" ON "rice_charities"("season_id");

-- CreateIndex
CREATE INDEX "rice_charities_charity_date_idx" ON "rice_charities"("charity_date");

-- CreateIndex
CREATE UNIQUE INDEX "rice_charities_season_id_bill_no_key" ON "rice_charities"("season_id", "bill_no");

-- AddForeignKey
ALTER TABLE "rice_charities" ADD CONSTRAINT "rice_charities_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
