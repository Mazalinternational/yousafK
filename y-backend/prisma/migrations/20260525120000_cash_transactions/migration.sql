-- Cash ledger (per currency, manual in/out)
CREATE TYPE "cash_transaction_direction" AS ENUM ('in', 'out');

CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "direction" "cash_transaction_direction" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "season_id" TEXT,
    "season_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cash_transactions_currency_id_idx" ON "cash_transactions"("currency_id");
CREATE INDEX "cash_transactions_season_id_idx" ON "cash_transactions"("season_id");
CREATE INDEX "cash_transactions_occurred_at_idx" ON "cash_transactions"("occurred_at");

ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
