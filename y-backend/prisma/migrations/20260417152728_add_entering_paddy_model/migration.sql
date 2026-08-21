/*
  Warnings:

  - You are about to drop the column `profit_loss` on the `seasons` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "company_owned_paddy_warehouses" ALTER COLUMN "remaining_amount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "seasons" DROP COLUMN "profit_loss";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "Role";
