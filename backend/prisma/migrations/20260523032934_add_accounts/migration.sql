-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'OTHER');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'BANK',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

-- Seed default accounts
INSERT INTO "Account" ("id", "name", "type", "balance", "color", "createdAt", "updatedAt")
VALUES
  ('acct_seed_cash', 'Cash', 'CASH', 0, '#10b981', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acct_seed_kotak', 'Kotak Savings Account', 'BANK', 0, '#3b82f6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('acct_seed_hdfc', 'HDFC Savings Account', 'BANK', 0, '#8b5cf6', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add nullable account reference first
ALTER TABLE "Transaction" ADD COLUMN "accountId" TEXT;

-- Assign existing transactions to Cash
UPDATE "Transaction"
SET "accountId" = 'acct_seed_cash'
WHERE "accountId" IS NULL;

-- Enforce required account on transactions
ALTER TABLE "Transaction" ALTER COLUMN "accountId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recalculate balances from existing transactions
UPDATE "Account" AS a
SET "balance" = COALESCE(
  (
    SELECT SUM(
      CASE
        WHEN t."type" = 'INCOME' THEN t."amount"
        ELSE -t."amount"
      END
    )
    FROM "Transaction" AS t
    WHERE t."accountId" = a."id"
  ),
  0
);
