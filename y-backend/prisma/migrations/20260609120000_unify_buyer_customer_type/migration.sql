-- Use a single Buyer customer type for rice sales and store variety sales.
UPDATE customers
SET type = 'buyer'
WHERE type = 'process_production_buyer';

UPDATE customer_ledgers
SET ledger_type = 'company_owned'
WHERE ledger_type = 'process_production_owned';
