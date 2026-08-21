-- Add store sale/payment columns and process bill reference
CREATE TYPE "RiceSalePaymentChannel" AS ENUM ('cash', 'saraf');

ALTER TABLE "store_entries"
ADD COLUMN "process_bill_no" TEXT,
ADD COLUMN "sale_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
ADD COLUMN "paid_in_cash" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "payment_channel" "RiceSalePaymentChannel" NOT NULL DEFAULT 'cash',
ADD COLUMN "saraf_id" BIGINT,
ADD COLUMN "saraf_ledger_currency_id" TEXT;

UPDATE "store_entries"
SET "process_bill_no" = "processed_bill_no"
WHERE "process_bill_no" IS NULL;

ALTER TABLE "store_entries"
ALTER COLUMN "process_bill_no" SET NOT NULL;

CREATE INDEX "store_entries_process_bill_no_idx" ON "store_entries"("process_bill_no");
CREATE INDEX "store_entries_saraf_id_idx" ON "store_entries"("saraf_id");
CREATE INDEX "store_entries_payment_channel_idx" ON "store_entries"("payment_channel");

ALTER TABLE "store_entries"
ADD CONSTRAINT "store_entries_saraf_id_fkey"
FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "store_entries"
ADD CONSTRAINT "store_entries_saraf_ledger_currency_id_fkey"
FOREIGN KEY ("saraf_ledger_currency_id") REFERENCES "currencies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link Saraf ledger entries to store sales
ALTER TABLE "saraf_ledger_entries"
ADD COLUMN "store_entry_id" BIGINT;

CREATE UNIQUE INDEX "saraf_ledger_entries_store_entry_id_key"
ON "saraf_ledger_entries"("store_entry_id");

CREATE INDEX "saraf_ledger_entries_store_entry_id_idx"
ON "saraf_ledger_entries"("store_entry_id");

ALTER TABLE "saraf_ledger_entries"
ADD CONSTRAINT "saraf_ledger_entries_store_entry_id_fkey"
FOREIGN KEY ("store_entry_id") REFERENCES "store_entries"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
