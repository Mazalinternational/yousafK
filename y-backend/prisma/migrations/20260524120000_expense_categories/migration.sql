-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_code_key" ON "expense_categories"("code");

-- CreateIndex
CREATE INDEX "expense_categories_is_active_idx" ON "expense_categories"("is_active");

-- Seed legacy categories (stable ids for backfill)
INSERT INTO "expense_categories" ("id", "code", "name", "is_active", "updated_at") VALUES
('expense_cat_kitchen', 'kitchen', 'Kitchen', true, CURRENT_TIMESTAMP),
('expense_cat_electricity', 'electricity', 'Electricity', true, CURRENT_TIMESTAMP),
('expense_cat_fuel', 'fuel', 'Fuel', true, CURRENT_TIMESTAMP),
('expense_cat_suplies', 'suplies', 'Supplies', true, CURRENT_TIMESTAMP),
('expense_cat_machinery', 'machinery', 'Machinery', true, CURRENT_TIMESTAMP),
('expense_cat_general', 'general', 'General', true, CURRENT_TIMESTAMP),
('expense_cat_salaries', 'salaries', 'Salaries', true, CURRENT_TIMESTAMP),
('expense_cat_construction', 'construction', 'Construction', true, CURRENT_TIMESTAMP),
('expense_cat_charity', 'charity', 'Charity', true, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "category_id" TEXT;

-- Backfill from legacy text category
UPDATE "expenses" e
SET "category_id" = ec."id"
FROM "expense_categories" ec
WHERE ec."code" = e."category";

-- Default any orphan rows to general
UPDATE "expenses"
SET "category_id" = 'expense_cat_general'
WHERE "category_id" IS NULL;

ALTER TABLE "expenses" ALTER COLUMN "category_id" SET NOT NULL;

DROP INDEX IF EXISTS "expenses_category_idx";
ALTER TABLE "expenses" DROP COLUMN "category";

CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
