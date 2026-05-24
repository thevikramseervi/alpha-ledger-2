-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "cleared" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Transaction_cleared_idx" ON "Transaction"("cleared");
