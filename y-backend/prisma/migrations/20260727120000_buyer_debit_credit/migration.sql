DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'buyer_debit'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'buyer_debit';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'buyer_credit'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'buyer_credit';
  END IF;
END $$;
