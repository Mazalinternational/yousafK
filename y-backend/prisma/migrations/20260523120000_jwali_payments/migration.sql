-- CreateTable
CREATE TABLE "jwali_payments" (
    "id" BIGSERIAL NOT NULL,
    "ledger_id" BIGINT NOT NULL,
    "jwali_id" BIGINT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payment_channel" "RiceSalePaymentChannel" NOT NULL DEFAULT 'cash',
    "saraf_id" BIGINT,
    "saraf_ledger_currency_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jwali_payments_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "saraf_ledger_entries" ADD COLUMN "jwali_payment_id" BIGINT;

-- CreateIndex
CREATE INDEX "jwali_payments_ledger_id_idx" ON "jwali_payments"("ledger_id");

-- CreateIndex
CREATE INDEX "jwali_payments_jwali_id_idx" ON "jwali_payments"("jwali_id");

-- CreateIndex
CREATE INDEX "jwali_payments_occurred_at_idx" ON "jwali_payments"("occurred_at");

-- CreateIndex
CREATE INDEX "jwali_payments_saraf_id_idx" ON "jwali_payments"("saraf_id");

-- CreateIndex
CREATE INDEX "jwali_payments_payment_channel_idx" ON "jwali_payments"("payment_channel");

-- CreateIndex
CREATE UNIQUE INDEX "saraf_ledger_entries_jwali_payment_id_key" ON "saraf_ledger_entries"("jwali_payment_id");

-- CreateIndex
CREATE INDEX "saraf_ledger_entries_jwali_payment_id_idx" ON "saraf_ledger_entries"("jwali_payment_id");

-- AddForeignKey
ALTER TABLE "jwali_payments" ADD CONSTRAINT "jwali_payments_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "jwali_ledgers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jwali_payments" ADD CONSTRAINT "jwali_payments_jwali_id_fkey" FOREIGN KEY ("jwali_id") REFERENCES "jwalis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jwali_payments" ADD CONSTRAINT "jwali_payments_saraf_id_fkey" FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jwali_payments" ADD CONSTRAINT "jwali_payments_saraf_ledger_currency_id_fkey" FOREIGN KEY ("saraf_ledger_currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_jwali_payment_id_fkey" FOREIGN KEY ("jwali_payment_id") REFERENCES "jwali_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
