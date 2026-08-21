-- Partial store sales: track sold weight per entry
ALTER TABLE "store_entries"
ADD COLUMN "sold_weight" DECIMAL(18, 2) NOT NULL DEFAULT 0;

UPDATE "store_entries"
SET "sold_weight" = "weight"
WHERE "status" = 'sold';

-- Allow multiple Saraf ledger rows per store entry (partial sales)
DROP INDEX IF EXISTS "saraf_ledger_entries_store_entry_id_key";
