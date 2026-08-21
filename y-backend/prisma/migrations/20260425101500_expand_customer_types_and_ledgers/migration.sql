ALTER TYPE "CustomerType" RENAME VALUE 'farmer' TO 'paddy_farmer';
ALTER TYPE "CustomerType" RENAME VALUE 'seller' TO 'paddy_seller';
ALTER TYPE "CustomerType" ADD VALUE 'rice_seller';

ALTER TYPE "CustomerLedgerType" ADD VALUE 'rice_owned';
