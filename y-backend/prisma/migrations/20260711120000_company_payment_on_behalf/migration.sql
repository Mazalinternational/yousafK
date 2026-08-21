DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'company_payment_on_behalf'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'company_payment_on_behalf';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'company_payment_received_on_behalf'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'company_payment_received_on_behalf';
  END IF;
END $$;
