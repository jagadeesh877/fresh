/*
  Warnings:

  - You are about to drop the column `rollNumber` on the `Student` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "registerNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Student" ("createdAt", "department", "id", "name", "registerNumber", "section", "semester", "year") SELECT "createdAt", "department", "id", "name", "registerNumber", "section", "semester", "year" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_registerNumber_key" ON "Student"("registerNumber");
CREATE TABLE "new_Timetable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "department" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT,
    "subjectName" TEXT,
    "facultyName" TEXT,
    "room" TEXT,
    "subjectId" INTEGER,
    "facultyId" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Timetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Timetable_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Timetable" ("day", "department", "facultyId", "facultyName", "id", "period", "room", "section", "semester", "subjectId", "subjectName", "type", "updatedAt", "year") SELECT "day", "department", "facultyId", "facultyName", "id", "period", "room", "section", "semester", "subjectId", "subjectName", "type", "updatedAt", "year" FROM "Timetable";
DROP TABLE "Timetable";
ALTER TABLE "new_Timetable" RENAME TO "Timetable";
CREATE UNIQUE INDEX "Timetable_department_year_semester_section_day_period_key" ON "Timetable"("department", "year", "semester", "section", "day", "period");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
