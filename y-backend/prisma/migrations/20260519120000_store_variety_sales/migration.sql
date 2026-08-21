-- Store variety sales (sell from variety stock panel)
CREATE TABLE "store_variety_sales" (
    "id" BIGSERIAL NOT NULL,
    "store_type" "StoreType" NOT NULL,
    "variety" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "buyer_customer_id" BIGINT NOT NULL,
    "bill_no" TEXT NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "sold_weight" DECIMAL(18, 2) NOT NULL,
    "unit" TEXT NOT NULL,
    "sold_weight_kg" DECIMAL(18, 2) NOT NULL,
    "sale_amount" DECIMAL(18, 2) NOT NULL,
    "payment_type" "PaddyPaymentType" NOT NULL DEFAULT 'paid',
    "paid_amount" DECIMAL(18, 2) NOT NULL,
    "remaining_amount" DECIMAL(18, 2) NOT NULL DEFAULT 0,
    "paid_in_cash" BOOLEAN NOT NULL DEFAULT false,
    "payment_channel" "RiceSalePaymentChannel" NOT NULL DEFAULT 'cash',
    "saraf_id" BIGINT,
    "saraf_ledger_currency_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_variety_sales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_variety_sales_season_bill_no_key"
ON "store_variety_sales"("season_id", "bill_no");

CREATE INDEX "store_variety_sales_season_store_type_idx"
ON "store_variety_sales"("season_id", "store_type");

CREATE INDEX "store_variety_sales_variety_idx"
ON "store_variety_sales"("variety");

CREATE INDEX "store_variety_sales_buyer_customer_id_idx"
ON "store_variety_sales"("buyer_customer_id");

CREATE INDEX "store_variety_sales_sale_date_idx"
ON "store_variety_sales"("sale_date");

ALTER TABLE "store_variety_sales"
ADD CONSTRAINT "store_variety_sales_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_variety_sales"
ADD CONSTRAINT "store_variety_sales_buyer_customer_id_fkey"
FOREIGN KEY ("buyer_customer_id") REFERENCES "customers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "store_variety_sales"
ADD CONSTRAINT "store_variety_sales_saraf_id_fkey"
FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "store_variety_sales"
ADD CONSTRAINT "store_variety_sales_saraf_ledger_currency_id_fkey"
FOREIGN KEY ("saraf_ledger_currency_id") REFERENCES "currencies"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "saraf_ledger_entries"
ADD COLUMN "store_variety_sale_id" BIGINT;

CREATE UNIQUE INDEX "saraf_ledger_entries_store_variety_sale_id_key"
ON "saraf_ledger_entries"("store_variety_sale_id");

CREATE INDEX "saraf_ledger_entries_store_variety_sale_id_idx"
ON "saraf_ledger_entries"("store_variety_sale_id");

ALTER TABLE "saraf_ledger_entries"
ADD CONSTRAINT "saraf_ledger_entries_store_variety_sale_id_fkey"
FOREIGN KEY ("store_variety_sale_id") REFERENCES "store_variety_sales"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
