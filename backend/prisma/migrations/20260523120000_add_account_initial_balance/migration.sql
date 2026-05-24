-- AlterTable
ALTER TABLE "Account" ADD COLUMN "initialBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill: treat current balance as the starting snapshot for existing accounts.
UPDATE "Account" SET "initialBalance" = "balance";
