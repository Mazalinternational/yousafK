-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "closing_notes" TEXT,
    "total_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_expenses" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_purchases" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profit_loss" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seasons_code_key" ON "seasons"("code");

-- CreateIndex
CREATE INDEX "seasons_status_idx" ON "seasons"("status");

-- CreateIndex
CREATE INDEX "seasons_start_date_idx" ON "seasons"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_single_active_idx" ON "seasons" ("status") WHERE "status" = 'ACTIVE';
