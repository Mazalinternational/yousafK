CREATE TYPE "CustomerType" AS ENUM ('farmer', 'seller');
CREATE TYPE "CustomerLedgerType" AS ENUM ('company_owned', 'farmer_owned');
CREATE TYPE "CustomerLedgerEntryType" AS ENUM (
    'company_receivable',
    'company_payment',
    'farmer_obligation',
    'farmer_rice_return'
);

ALTER TABLE "customers"
ADD COLUMN "type" "CustomerType" NOT NULL DEFAULT 'seller';

CREATE INDEX "customers_type_idx" ON "customers"("type");

CREATE TABLE "customer_ledgers" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "ledger_type" "CustomerLedgerType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_ledgers_customer_id_key" ON "customer_ledgers"("customer_id");
CREATE INDEX "customer_ledgers_customer_id_idx" ON "customer_ledgers"("customer_id");
CREATE INDEX "customer_ledgers_ledger_type_idx" ON "customer_ledgers"("ledger_type");

CREATE TABLE "customer_ledger_entries" (
    "id" BIGSERIAL NOT NULL,
    "ledger_id" BIGINT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "entry_type" "CustomerLedgerEntryType" NOT NULL,
    "source_company_paddy_warehouse_id" BIGINT,
    "source_farmer_paddy_warehouse_id" BIGINT,
    "amount" DECIMAL(18,2),
    "paddy_quantity" DECIMAL(18,2),
    "rice_quantity" DECIMAL(18,2),
    "rice_variety" TEXT,
    "unit" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "scheduled_for" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_ledger_entries_source_company_paddy_warehouse_id_key"
ON "customer_ledger_entries"("source_company_paddy_warehouse_id");

CREATE UNIQUE INDEX "customer_ledger_entries_source_farmer_paddy_warehouse_id_key"
ON "customer_ledger_entries"("source_farmer_paddy_warehouse_id");

CREATE INDEX "customer_ledger_entries_ledger_id_idx" ON "customer_ledger_entries"("ledger_id");
CREATE INDEX "customer_ledger_entries_customer_id_idx" ON "customer_ledger_entries"("customer_id");
CREATE INDEX "customer_ledger_entries_entry_type_idx" ON "customer_ledger_entries"("entry_type");
CREATE INDEX "customer_ledger_entries_occurred_at_idx" ON "customer_ledger_entries"("occurred_at");
CREATE INDEX "customer_ledger_entries_scheduled_for_idx" ON "customer_ledger_entries"("scheduled_for");

ALTER TABLE "customer_ledgers"
ADD CONSTRAINT "customer_ledgers_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_ledger_entries"
ADD CONSTRAINT "customer_ledger_entries_ledger_id_fkey"
FOREIGN KEY ("ledger_id") REFERENCES "customer_ledgers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_ledger_entries"
ADD CONSTRAINT "customer_ledger_entries_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "customer_ledgers" ("customer_id", "ledger_type", "created_at", "updated_at")
SELECT
    "id",
    CASE
        WHEN "type" = 'farmer' THEN 'farmer_owned'::"CustomerLedgerType"
        ELSE 'company_owned'::"CustomerLedgerType"
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "customers";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'customer_account_payments'
    ) THEN
        INSERT INTO "customer_ledger_entries" (
            "ledger_id",
            "customer_id",
            "entry_type",
            "amount",
            "occurred_at",
            "notes",
            "created_at",
            "updated_at"
        )
        SELECT
            cl."id",
            cap."customer_id",
            'company_payment'::"CustomerLedgerEntryType",
            cap."amount",
            cap."payment_date",
            cap."notes",
            cap."created_at",
            cap."updated_at"
        FROM "customer_account_payments" cap
        JOIN "customer_ledgers" cl ON cl."customer_id" = cap."customer_id";

        DROP TABLE "customer_account_payments";
    END IF;
END $$;
