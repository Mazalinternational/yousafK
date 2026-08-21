-- Rice sale: pay in cash vs pay to Saraf; optional Saraf + currency; link Saraf ledger entry to sale.

DO $$ BEGIN
    CREATE TYPE "RiceSalePaymentChannel" AS ENUM ('cash', 'saraf');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "rice_sales" ADD COLUMN "payment_channel" "RiceSalePaymentChannel" NOT NULL DEFAULT 'cash';
ALTER TABLE "rice_sales" ADD COLUMN "saraf_id" BIGINT;
ALTER TABLE "rice_sales" ADD COLUMN "saraf_ledger_currency_id" TEXT;

ALTER TABLE "rice_sales" ADD CONSTRAINT "rice_sales_saraf_id_fkey" FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rice_sales" ADD CONSTRAINT "rice_sales_saraf_ledger_currency_id_fkey" FOREIGN KEY ("saraf_ledger_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "rice_sales_saraf_id_idx" ON "rice_sales"("saraf_id");
CREATE INDEX "rice_sales_payment_channel_idx" ON "rice_sales"("payment_channel");

ALTER TABLE "saraf_ledger_entries" ADD COLUMN "rice_sale_id" BIGINT;
CREATE UNIQUE INDEX "saraf_ledger_entries_rice_sale_id_key" ON "saraf_ledger_entries"("rice_sale_id");
ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_rice_sale_id_fkey" FOREIGN KEY ("rice_sale_id") REFERENCES "rice_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "saraf_ledger_entries_rice_sale_id_idx" ON "saraf_ledger_entries"("rice_sale_id");
