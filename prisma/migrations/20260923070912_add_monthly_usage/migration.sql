-- CreateTable
CREATE TABLE "MonthlyUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "businessId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "aiMessagesUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlyUsage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MonthlyUsage_businessId_idx" ON "MonthlyUsage"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyUsage_businessId_month_key" ON "MonthlyUsage"("businessId", "month");
