-- Rice sale: link cash-in transactions when payment is collected in cash.

ALTER TABLE "cash_transactions" ADD COLUMN IF NOT EXISTS "rice_sale_id" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS "cash_transactions_rice_sale_id_key"
  ON "cash_transactions"("rice_sale_id");

DO $$ BEGIN
  ALTER TABLE "cash_transactions"
    ADD CONSTRAINT "cash_transactions_rice_sale_id_fkey"
    FOREIGN KEY ("rice_sale_id") REFERENCES "rice_sales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "cash_transactions_rice_sale_id_idx"
  ON "cash_transactions"("rice_sale_id");
