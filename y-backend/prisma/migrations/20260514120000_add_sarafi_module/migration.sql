-- Sarafi (money exchange / saraf) records with per-saraf cash ledger in system currencies.

CREATE TABLE "sarafs" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_no" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sarafs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sarafs_season_id_idx" ON "sarafs"("season_id");
CREATE INDEX "sarafs_name_idx" ON "sarafs"("name");
CREATE INDEX "sarafs_phone_no_idx" ON "sarafs"("phone_no");

ALTER TABLE "sarafs" ADD CONSTRAINT "sarafs_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saraf_ledgers" (
    "id" BIGSERIAL NOT NULL,
    "saraf_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saraf_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saraf_ledgers_saraf_id_key" ON "saraf_ledgers"("saraf_id");
CREATE INDEX "saraf_ledgers_saraf_id_idx" ON "saraf_ledgers"("saraf_id");

ALTER TABLE "saraf_ledgers" ADD CONSTRAINT "saraf_ledgers_saraf_id_fkey" FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "saraf_ledger_entries" (
    "id" BIGSERIAL NOT NULL,
    "ledger_id" BIGINT NOT NULL,
    "saraf_id" BIGINT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saraf_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saraf_ledger_entries_ledger_id_idx" ON "saraf_ledger_entries"("ledger_id");
CREATE INDEX "saraf_ledger_entries_saraf_id_idx" ON "saraf_ledger_entries"("saraf_id");
CREATE INDEX "saraf_ledger_entries_currency_id_idx" ON "saraf_ledger_entries"("currency_id");
CREATE INDEX "saraf_ledger_entries_occurred_at_idx" ON "saraf_ledger_entries"("occurred_at");

ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_ledger_id_fkey" FOREIGN KEY ("ledger_id") REFERENCES "saraf_ledgers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_saraf_id_fkey" FOREIGN KEY ("saraf_id") REFERENCES "sarafs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saraf_ledger_entries" ADD CONSTRAINT "saraf_ledger_entries_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
