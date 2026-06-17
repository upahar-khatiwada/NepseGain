-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionSource" ADD VALUE 'MARKET';
ALTER TYPE "TransactionSource" ADD VALUE 'IPO';
ALTER TYPE "TransactionSource" ADD VALUE 'FPO';
ALTER TYPE "TransactionSource" ADD VALUE 'RIGHT';
ALTER TYPE "TransactionSource" ADD VALUE 'BONUS';
ALTER TYPE "TransactionSource" ADD VALUE 'MERGER';
ALTER TYPE "TransactionSource" ADD VALUE 'DEMAT';
ALTER TYPE "TransactionSource" ADD VALUE 'AUCTION';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "importedFrom" TEXT;
