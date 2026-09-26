-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Business" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "services" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'TRIALING',
    "trialStartedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" DATETIME,
    "subscriptionStartedAt" DATETIME,
    "subscriptionEndsAt" DATETIME,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "aiName" TEXT NOT NULL DEFAULT 'Empleado IA',
    "aiPersonality" TEXT NOT NULL DEFAULT 'amigable',
    "aiWelcome" TEXT NOT NULL DEFAULT '¡Hola! 👋 Soy el empleado de IA de tu negocio. ¿En qué puedo ayudarte?',
    "aiCanBook" BOOLEAN NOT NULL DEFAULT true,
    "aiCanCancel" BOOLEAN NOT NULL DEFAULT true,
    "aiCanReschedule" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,
    CONSTRAINT "Business_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Business" ("aiCanBook", "aiCanCancel", "aiCanReschedule", "aiName", "aiPersonality", "aiWelcome", "createdAt", "description", "hours", "id", "name", "services", "userId") SELECT "aiCanBook", "aiCanCancel", "aiCanReschedule", "aiName", "aiPersonality", "aiWelcome", "createdAt", "description", "hours", "id", "name", "services", "userId" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
CREATE UNIQUE INDEX "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");
CREATE UNIQUE INDEX "Business_stripeSubscriptionId_key" ON "Business"("stripeSubscriptionId");
CREATE UNIQUE INDEX "Business_userId_key" ON "Business"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
