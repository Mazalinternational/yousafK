-- Store currency codes as plain text so new ISO-style codes can be added beyond the original enum.

ALTER TABLE "currencies" ALTER COLUMN "code" TYPE TEXT USING ("code"::text);

DROP TYPE IF EXISTS "CurrencyCode";
