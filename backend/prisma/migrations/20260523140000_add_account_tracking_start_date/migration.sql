-- AlterTable
ALTER TABLE "Account" ADD COLUMN "trackingStartDate" DATE NOT NULL DEFAULT CURRENT_DATE;

-- Backfill from account creation date (UTC).
UPDATE "Account" SET "trackingStartDate" = ("createdAt" AT TIME ZONE 'UTC')::date;
