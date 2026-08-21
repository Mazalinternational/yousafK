/*
  Warnings:

  - You are about to drop the `expenses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_season_id_fkey";

-- DropIndex
DROP INDEX "paddy_processes_status_idx";

-- AlterTable
ALTER TABLE "employee_ledger_entries" ALTER COLUMN "salary_month" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "occurred_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employee_ledgers" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "join_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "expenses";

-- CreateTable
CREATE TABLE "jwalis" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_no" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jwalis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jwali_ledgers" (
    "id" BIGSERIAL NOT NULL,
    "jwali_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jwali_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jwali_ledger_entries" (
    "id" BIGSERIAL NOT NULL,
    "ledger_id" BIGINT NOT NULL,
    "jwali_id" BIGINT NOT NULL,
    "bag_count" INTEGER NOT NULL,
    "rate_per_bag" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jwali_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jwalis_season_id_idx" ON "jwalis"("season_id");

-- CreateIndex
CREATE INDEX "jwalis_name_idx" ON "jwalis"("name");

-- CreateIndex
CREATE INDEX "jwalis_phone_no_idx" ON "jwalis"("phone_no");

-- CreateIndex
CREATE UNIQUE INDEX "jwali_ledgers_jwali_id_key" ON "jwali_ledgers"("jwali_id");

-- CreateIndex
CREATE INDEX "jwali_ledgers_jwali_id_idx" ON "jwali_ledgers"("jwali_id");

-- CreateIndex
CREATE INDEX "jwali_ledger_entries_ledger_id_idx" ON "jwali_ledger_entries"("ledger_id");

-- CreateIndex
CREATE INDEX "jwali_ledger_entries_jwali_id_idx" ON "jwali_ledger_entries"("jwali_id");

-- CreateIndex
CREATE INDEX "jwali_ledger_entries_occurred_at_idx" ON "jwali_ledger_entries"("occurred_at");

-- AddForeignKey
ALTER TABLE "jwalis" ADD CONSTRAINT "jwalis_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jwali_ledgers" ADD CONSTRAINT "jwali_ledgers_jwali_id_fkey" FOREIGN KEY ("jwali_id") REFERENCES "jwalis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jwali_ledger_entries" ADD CONSTRAINT "jwali_ledger_entries_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "jwali_ledgers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jwali_ledger_entries" ADD CONSTRAINT "jwali_ledger_entries_jwali_id_fkey" FOREIGN KEY ("jwali_id") REFERENCES "jwalis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
