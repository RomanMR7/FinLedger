-- AlterTable
ALTER TABLE "Operation" ADD COLUMN     "actualExchangeRate" DECIMAL(65,30),
ADD COLUMN     "clientRate" DECIMAL(65,30),
ADD COLUMN     "exchangeProfit" DECIMAL(65,30),
ADD COLUMN     "totalProfit" DECIMAL(65,30);
