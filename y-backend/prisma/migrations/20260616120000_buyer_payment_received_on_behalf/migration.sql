DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CustomerLedgerEntryType'
      AND e.enumlabel = 'buyer_payment_received_on_behalf'
  ) THEN
    ALTER TYPE "CustomerLedgerEntryType" ADD VALUE 'buyer_payment_received_on_behalf';
  END IF;
END $$;
