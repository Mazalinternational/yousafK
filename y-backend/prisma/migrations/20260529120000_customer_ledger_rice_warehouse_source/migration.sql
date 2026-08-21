-- Link customer ledger receivables to rice warehouse purchases.

ALTER TABLE "customer_ledger_entries"
ADD COLUMN IF NOT EXISTS "source_rice_warehouse_id" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS "customer_ledger_entries_source_rice_warehouse_id_key"
ON "customer_ledger_entries"("source_rice_warehouse_id");

DO $$ BEGIN
  ALTER TABLE "customer_ledger_entries"
  ADD CONSTRAINT "customer_ledger_entries_source_rice_warehouse_id_fkey"
  FOREIGN KEY ("source_rice_warehouse_id") REFERENCES "rice_warehouses"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "customer_ledger_entries" (
  "ledger_id",
  "customer_id",
  "entry_type",
  "source_rice_warehouse_id",
  "amount",
  "payment_type",
  "paid_amount",
  "remaining_amount",
  "payment_channel",
  "saraf_id",
  "currency_id",
  "rice_quantity",
  "rice_variety",
  "unit",
  "occurred_at",
  "notes",
  "created_at",
  "updated_at"
)
SELECT
  cl."id",
  rw."customer_id",
  'company_receivable',
  rw."id",
  rw."total_amount",
  rw."payment_type"::text,
  rw."paid_amount",
  rw."remaining_amount",
  rw."payment_channel",
  rw."saraf_id",
  rw."saraf_ledger_currency_id",
  rw."quantity",
  rw."variety",
  rw."unit",
  rw."received_date",
  rw."notes",
  NOW(),
  NOW()
FROM "rice_warehouses" rw
INNER JOIN "customer_ledgers" cl ON cl."customer_id" = rw."customer_id"
WHERE rw."customer_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "customer_ledger_entries" cle
    WHERE cle."source_rice_warehouse_id" = rw."id"
  );
