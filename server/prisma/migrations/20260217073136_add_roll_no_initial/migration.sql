/*
  Warnings:

  - You are about to drop the `ExternalStaffTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "EndSemMarks" ADD COLUMN "attendanceSnapshot" REAL;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExternalStaffTask";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Announcement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "department" TEXT,
    "year" INTEGER,
    "semester" INTEGER,
    "section" TEXT,
    "postedBy" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Announcement_postedBy_fkey" FOREIGN KEY ("postedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Material" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "subjectId" INTEGER NOT NULL,
    "instructorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Material_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Material_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalMarkAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staffId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalMarkAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExternalMarkAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubjectDummyMapping" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "originalRegisterNo" TEXT NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "dummyNumber" TEXT NOT NULL,
    "mappingLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectDummyMapping_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SubjectDummyMapping_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalMark" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subjectId" INTEGER NOT NULL,
    "dummyNumber" TEXT NOT NULL,
    "rawExternal100" REAL NOT NULL,
    "convertedExternal60" REAL NOT NULL,
    "submittedBy" INTEGER NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ExternalMark_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExternalMark_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examName" TEXT NOT NULL,
    "examDate" DATETIME NOT NULL,
    "session" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamSession_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamSessionSubjects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examSessionId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    CONSTRAINT "ExamSessionSubjects_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "ExamSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExamSessionSubjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hall" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hallName" TEXT NOT NULL,
    "blockName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "benchesPerRow" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HallAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examSessionId" INTEGER NOT NULL,
    "hallId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "columnNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HallAllocation_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "ExamSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HallAllocation_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HallAllocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HallAllocation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rollNo" TEXT,
    "registerNumber" TEXT,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "year" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Student" ("createdAt", "department", "id", "name", "registerNumber", "section", "semester", "year") SELECT "createdAt", "department", "id", "name", "registerNumber", "section", "semester", "year" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_rollNo_key" ON "Student"("rollNo");
CREATE UNIQUE INDEX "Student_registerNumber_key" ON "Student"("registerNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SubjectDummyMapping_dummyNumber_key" ON "SubjectDummyMapping"("dummyNumber");

-- CreateIndex
CREATE INDEX "SubjectDummyMapping_dummyNumber_idx" ON "SubjectDummyMapping"("dummyNumber");

-- CreateIndex
CREATE INDEX "SubjectDummyMapping_studentId_idx" ON "SubjectDummyMapping"("studentId");

-- CreateIndex
CREATE INDEX "SubjectDummyMapping_subjectId_idx" ON "SubjectDummyMapping"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectDummyMapping_studentId_subjectId_key" ON "SubjectDummyMapping"("studentId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectDummyMapping_subjectId_dummyNumber_key" ON "SubjectDummyMapping"("subjectId", "dummyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalMark_dummyNumber_key" ON "ExternalMark"("dummyNumber");

-- CreateIndex
CREATE INDEX "ExternalMark_dummyNumber_idx" ON "ExternalMark"("dummyNumber");

-- CreateIndex
CREATE INDEX "ExternalMark_subjectId_idx" ON "ExternalMark"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSessionSubjects_examSessionId_subjectId_key" ON "ExamSessionSubjects"("examSessionId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "HallAllocation_examSessionId_studentId_key" ON "HallAllocation"("examSessionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "HallAllocation_examSessionId_hallId_seatNumber_key" ON "HallAllocation"("examSessionId", "hallId", "seatNumber");

-- CreateIndex
CREATE INDEX "EndSemMarks_marksId_idx" ON "EndSemMarks"("marksId");

-- CreateIndex
CREATE INDEX "Marks_studentId_idx" ON "Marks"("studentId");

-- CreateIndex
CREATE INDEX "Marks_subjectId_idx" ON "Marks"("subjectId");
