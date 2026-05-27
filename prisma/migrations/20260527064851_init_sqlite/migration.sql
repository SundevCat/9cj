-- CreateTable
CREATE TABLE "Trade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT NOT NULL,
    "entry" REAL NOT NULL,
    "exit" REAL,
    "size" REAL NOT NULL,
    "pnl" REAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "brokerDealId" TEXT,
    "brokerOrderId" TEXT,
    "fillPrice" REAL,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "instrument" TEXT NOT NULL DEFAULT 'XAU_USD',
    "stopLoss" REAL,
    "takeProfit" REAL
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "threshold" REAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "violations" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "Price" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" REAL,
    "source" TEXT NOT NULL DEFAULT 'gold-api'
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyId" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "taskId" INTEGER
);

-- CreateTable
CREATE TABLE "BrokerSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "broker" TEXT NOT NULL DEFAULT 'capital',
    "accountId" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "unrealizedPL" REAL NOT NULL,
    "realizedPL" REAL NOT NULL,
    "marginUsed" REAL NOT NULL,
    "openTradeCount" INTEGER NOT NULL,
    "raw" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Trade_createdAt_idx" ON "Trade"("createdAt");

-- CreateIndex
CREATE INDEX "Trade_status_idx" ON "Trade"("status");

-- CreateIndex
CREATE INDEX "Memory_createdAt_idx" ON "Memory"("createdAt");

-- CreateIndex
CREATE INDEX "Memory_tag_idx" ON "Memory"("tag");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Price_timestamp_idx" ON "Price"("timestamp");

-- CreateIndex
CREATE INDEX "Violation_ts_idx" ON "Violation"("ts");

-- CreateIndex
CREATE INDEX "Violation_resolved_idx" ON "Violation"("resolved");

-- CreateIndex
CREATE INDEX "BrokerSnapshot_fetchedAt_idx" ON "BrokerSnapshot"("fetchedAt");
