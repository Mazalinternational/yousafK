-- Rice sale payment: total, payment type, paid/remaining, cash flag (full payment in cash).

ALTER TABLE "rice_sales" ADD COLUMN "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "rice_sales" ADD COLUMN "payment_type" "PaddyPaymentType" NOT NULL DEFAULT 'paid';
ALTER TABLE "rice_sales" ADD COLUMN "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "rice_sales" ADD COLUMN "remaining_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "rice_sales" ADD COLUMN "paid_in_cash" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "rice_sales_payment_type_idx" ON "rice_sales"("payment_type");
