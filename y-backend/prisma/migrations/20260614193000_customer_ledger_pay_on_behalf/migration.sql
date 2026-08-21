-- Buyer pay-on-behalf ledger links (used by GET /customers/:id/account).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'buyer_payment'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'buyer_payment';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'buyer_payment_on_behalf'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'buyer_payment_on_behalf';
  END IF;
END $$;

ALTER TABLE "customer_ledger_entries"
  ADD COLUMN IF NOT EXISTS "counterparty_customer_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "linked_ledger_entry_id" BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS "customer_ledger_entries_linked_ledger_entry_id_key"
  ON "customer_ledger_entries"("linked_ledger_entry_id");

CREATE INDEX IF NOT EXISTS "customer_ledger_entries_counterparty_customer_id_idx"
  ON "customer_ledger_entries"("counterparty_customer_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_ledger_entries_counterparty_customer_id_fkey'
  ) THEN
    ALTER TABLE "customer_ledger_entries"
      ADD CONSTRAINT "customer_ledger_entries_counterparty_customer_id_fkey"
      FOREIGN KEY ("counterparty_customer_id") REFERENCES "customers"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_ledger_entries_linked_ledger_entry_id_fkey'
  ) THEN
    ALTER TABLE "customer_ledger_entries"
      ADD CONSTRAINT "customer_ledger_entries_linked_ledger_entry_id_fkey"
      FOREIGN KEY ("linked_ledger_entry_id") REFERENCES "customer_ledger_entries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
