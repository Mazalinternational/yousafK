-- Track when an admin last edited role permissions via the API so seed/sync
-- services never overwrite customized grants on backend restart.
ALTER TABLE "roles" ADD COLUMN "permissions_customized_at" TIMESTAMP(3);

-- Protect existing manager/staff grants on production until an admin saves again.
UPDATE "roles"
SET "permissions_customized_at" = NOW()
WHERE slug IN ('manager', 'staff') AND "permissions_customized_at" IS NULL;
