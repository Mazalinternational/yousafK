ALTER TYPE "CustomerType" ADD VALUE IF NOT EXISTS 'debtor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'debtor_disbursement'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'debtor_disbursement';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'debtor_repayment'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'debtor_repayment';
  END IF;
END $$;
