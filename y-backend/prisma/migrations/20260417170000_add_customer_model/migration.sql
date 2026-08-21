CREATE TABLE "customers" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_no" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customers_season_id_idx" ON "customers"("season_id");
CREATE INDEX "customers_name_idx" ON "customers"("name");
CREATE INDEX "customers_phone_no_idx" ON "customers"("phone_no");

ALTER TABLE "customers"
ADD CONSTRAINT "customers_season_id_fkey"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
