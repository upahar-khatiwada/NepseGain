-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('PRIMARY', 'SECONDARY');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "avgBuyCostPerUnit" DOUBLE PRECISION,
ADD COLUMN     "source" "TransactionSource" NOT NULL DEFAULT 'SECONDARY';
