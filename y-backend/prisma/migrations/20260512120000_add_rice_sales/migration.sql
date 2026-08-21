CREATE TABLE "rice_sales" (
    "id" BIGSERIAL NOT NULL,
    "bill_no" TEXT NOT NULL,
    "buyer_customer_id" BIGINT NOT NULL,
    "rice_variety" TEXT NOT NULL,
    "quantity" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "season_id" TEXT NOT NULL,
    "season_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rice_sales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rice_sales_season_id_bill_no_key" ON "rice_sales"("season_id", "bill_no");
CREATE INDEX "rice_sales_buyer_customer_id_idx" ON "rice_sales"("buyer_customer_id");
CREATE INDEX "rice_sales_rice_variety_idx" ON "rice_sales"("rice_variety");
CREATE INDEX "rice_sales_season_id_idx" ON "rice_sales"("season_id");
CREATE INDEX "rice_sales_sale_date_idx" ON "rice_sales"("sale_date");

ALTER TABLE "rice_sales" ADD CONSTRAINT "rice_sales_buyer_customer_id_fkey" FOREIGN KEY ("buyer_customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rice_sales" ADD CONSTRAINT "rice_sales_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
