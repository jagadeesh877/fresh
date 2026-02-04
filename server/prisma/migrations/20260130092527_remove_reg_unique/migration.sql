-- DropIndex
DROP INDEX "Student_registerNumber_key";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "rollNumber" TEXT;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "shortName" TEXT;

-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Timetable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "department" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "period" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "FacultyAbsence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "facultyId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FacultyAbsence_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Substitution" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timetableId" INTEGER NOT NULL,
    "substituteFacultyId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Substitution_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Substitution_substituteFacultyId_fkey" FOREIGN KEY ("substituteFacultyId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Timetable_department_year_semester_section_day_period_key" ON "Timetable"("department", "year", "semester", "section", "day", "period");

-- CreateIndex
CREATE UNIQUE INDEX "FacultyAbsence_facultyId_date_key" ON "FacultyAbsence"("facultyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Substitution_timetableId_date_key" ON "Substitution"("timetableId", "date");
