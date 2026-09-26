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
    "aiName" TEXT NOT NULL DEFAULT 'Empleado IA',
    "aiPersonality" TEXT NOT NULL DEFAULT 'amigable',
    "aiWelcome" TEXT NOT NULL DEFAULT '¡Hola! 👋 Soy el empleado de IA de tu negocio. ¿En qué puedo ayudarte?',
    "aiCanBook" BOOLEAN NOT NULL DEFAULT true,
    "aiCanCancel" BOOLEAN NOT NULL DEFAULT true,
    "aiCanReschedule" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,
    CONSTRAINT "Business_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Business" ("createdAt", "description", "hours", "id", "name", "services", "userId") SELECT "createdAt", "description", "hours", "id", "name", "services", "userId" FROM "Business";
DROP TABLE "Business";
ALTER TABLE "new_Business" RENAME TO "Business";
CREATE UNIQUE INDEX "Business_userId_key" ON "Business"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
