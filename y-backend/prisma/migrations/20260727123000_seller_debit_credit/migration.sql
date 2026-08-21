DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'seller_debit'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'seller_debit';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'seller_credit'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'seller_credit';
  END IF;
END $$;
