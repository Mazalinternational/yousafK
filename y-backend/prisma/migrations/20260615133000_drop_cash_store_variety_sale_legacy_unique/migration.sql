-- Fix: legacy unique index prevented multiple cash transactions per store sale
-- (sale + loading + bags) even though charge type column exists.

DROP INDEX IF EXISTS "cash_transactions_store_variety_sale_id_key";

