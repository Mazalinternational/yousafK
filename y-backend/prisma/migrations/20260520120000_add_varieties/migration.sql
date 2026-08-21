-- CreateEnum
CREATE TYPE "variety_kind" AS ENUM ('RICE', 'PADDY', 'PROCESS_PRODUCTION');

-- CreateTable
CREATE TABLE "varieties" (
    "id" TEXT NOT NULL,
    "kind" "variety_kind" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "varieties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "varieties_kind_idx" ON "varieties"("kind");

-- CreateIndex
CREATE INDEX "varieties_is_active_idx" ON "varieties"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "varieties_kind_code_key" ON "varieties"("kind", "code");
