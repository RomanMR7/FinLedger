-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "amountRub" DECIMAL(65,30) NOT NULL,
    "clientRate" DECIMAL(65,30) NOT NULL,
    "actualRate" DECIMAL(65,30) NOT NULL,
    "payoutUsdt" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tariffProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "exchangeProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
