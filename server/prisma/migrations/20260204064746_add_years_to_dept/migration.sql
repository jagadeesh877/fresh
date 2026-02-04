-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "hodId" INTEGER,
    "sections" TEXT NOT NULL DEFAULT 'A,B,C',
    "years" TEXT NOT NULL DEFAULT '2,3,4',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Department" ("code", "createdAt", "hodId", "id", "name", "updatedAt") SELECT "code", "createdAt", "hodId", "id", "name", "updatedAt" FROM "Department";
DROP TABLE "Department";
ALTER TABLE "new_Department" RENAME TO "Department";
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
