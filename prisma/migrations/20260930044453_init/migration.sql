-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('pending', 'won', 'lost', 'void');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('deposit', 'withdrawal');

-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "placedAt" TIMESTAMP(3) NOT NULL,
    "matchId" TEXT,
    "matchLabel" TEXT NOT NULL,
    "competition" TEXT,
    "marketKey" TEXT,
    "selection" TEXT NOT NULL,
    "odds" DECIMAL(10,3) NOT NULL,
    "stake" DECIMAL(14,2) NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'pending',
    "modelProbability" DECIMAL(6,5),
    "notes" TEXT,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bankroll_transactions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,

    CONSTRAINT "bankroll_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bets_placedAt_idx" ON "bets"("placedAt");

-- CreateIndex
CREATE INDEX "bankroll_transactions_date_idx" ON "bankroll_transactions"("date");
