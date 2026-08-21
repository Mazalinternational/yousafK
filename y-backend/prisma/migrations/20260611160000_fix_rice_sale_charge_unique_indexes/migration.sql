-- Fix: prior migration used DROP CONSTRAINT but rice_sale_id uniques were created as indexes.

DROP INDEX IF EXISTS "cash_transactions_rice_sale_id_key";
DROP INDEX IF EXISTS "saraf_ledger_entries_rice_sale_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "cash_transactions_rice_sale_charge_key"
  ON "cash_transactions" ("rice_sale_id", "rice_sale_charge_type")
  WHERE "rice_sale_id" IS NOT NULL AND "rice_sale_charge_type" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "saraf_ledger_entries_rice_sale_charge_key"
  ON "saraf_ledger_entries" ("rice_sale_id", "rice_sale_charge_type")
  WHERE "rice_sale_id" IS NOT NULL AND "rice_sale_charge_type" IS NOT NULL;
