-- RedefineTables
PRAGMA defer_foreign_keys=ON;
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
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Marks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Marks_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Marks_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Marks" ("cia1_assignment", "cia1_attendance", "cia1_test", "cia2_assignment", "cia2_attendance", "cia2_test", "cia3_assignment", "cia3_attendance", "cia3_test", "id", "internal", "isLocked", "studentId", "subjectId", "updatedAt") SELECT "cia1_assignment", "cia1_attendance", "cia1_test", "cia2_assignment", "cia2_attendance", "cia2_test", "cia3_assignment", "cia3_attendance", "cia3_test", "id", "internal", "isLocked", "studentId", "subjectId", "updatedAt" FROM "Marks";
DROP TABLE "Marks";
ALTER TABLE "new_Marks" RENAME TO "Marks";
CREATE UNIQUE INDEX "Marks_studentId_subjectId_key" ON "Marks"("studentId", "subjectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
