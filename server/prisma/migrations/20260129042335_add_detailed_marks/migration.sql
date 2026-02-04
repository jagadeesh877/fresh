/*
  Warnings:

  - You are about to drop the column `cia1` on the `Marks` table. All the data in the column will be lost.
  - You are about to drop the column `cia2` on the `Marks` table. All the data in the column will be lost.
  - You are about to drop the column `cia3` on the `Marks` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Marks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "cia1_test" REAL,
    "cia1_assignment" REAL,
    "cia1_attendance" REAL,
    "cia2_test" REAL,
    "cia2_assignment" REAL,
    "cia2_attendance" REAL,
    "cia3_test" REAL,
    "cia3_assignment" REAL,
    "cia3_attendance" REAL,
    "internal" REAL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Marks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Marks_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Marks" ("id", "internal", "isLocked", "studentId", "subjectId", "updatedAt") SELECT "id", "internal", "isLocked", "studentId", "subjectId", "updatedAt" FROM "Marks";
DROP TABLE "Marks";
ALTER TABLE "new_Marks" RENAME TO "Marks";
CREATE UNIQUE INDEX "Marks_studentId_subjectId_key" ON "Marks"("studentId", "subjectId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
