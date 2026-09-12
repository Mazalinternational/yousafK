-- Track how much of each sale came from physical stock vs extra sold beyond stock.

ALTER TABLE "rice_sales"
  ADD COLUMN "from_stock_weight_kg" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "oversold_weight_kg" DECIMAL(18, 2) NOT NULL DEFAULT 0;

UPDATE "rice_sales"
SET "from_stock_weight_kg" = CASE
  WHEN LOWER(TRIM("unit")) = 'ton' THEN "quantity" * 1000
  WHEN LOWER(TRIM("unit")) IN ('kg', 'one_kg') THEN "quantity"
  ELSE "quantity" * 7
END;

ALTER TABLE "store_variety_sales"
  ADD COLUMN "from_stock_weight_kg" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "oversold_weight_kg" DECIMAL(18, 2) NOT NULL DEFAULT 0;

UPDATE "store_variety_sales"
SET "from_stock_weight_kg" = "sold_weight_kg";
