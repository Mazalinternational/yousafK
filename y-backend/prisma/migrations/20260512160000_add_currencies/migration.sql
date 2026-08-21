CREATE TYPE "CurrencyCode" AS ENUM ('USD', 'PKR', 'AFN');

CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" "CurrencyCode" NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");
CREATE INDEX "currencies_is_active_idx" ON "currencies"("is_active");

INSERT INTO "currencies" ("id", "code", "name", "is_active", "created_at", "updated_at")
VALUES
    ('cmcurrencyseedusd1', 'USD', 'US Dollar', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cmcurrencyseedpkr1', 'PKR', 'Pakistani Rupee', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cmcurrencyseedafn1', 'AFN', 'Afghan Afghani', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
