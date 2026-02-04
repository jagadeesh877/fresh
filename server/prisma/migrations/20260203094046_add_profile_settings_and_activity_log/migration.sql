/*
  Warnings:

  - Added the required column `updatedAt` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performedBy" INTEGER NOT NULL,
    "targetId" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentAttendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "facultyId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "period" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentAttendance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentAttendance_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "hodId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Department" ("id", "name") SELECT "id", "name" FROM "Department";
DROP TABLE "Department";
ALTER TABLE "new_Department" RENAME TO "Department";
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE TABLE "new_FacultyAbsence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "facultyId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "period" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FacultyAbsence_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FacultyAbsence" ("createdAt", "date", "facultyId", "id", "reason") SELECT "createdAt", "date", "facultyId", "id", "reason" FROM "FacultyAbsence";
DROP TABLE "FacultyAbsence";
ALTER TABLE "new_FacultyAbsence" RENAME TO "FacultyAbsence";
CREATE UNIQUE INDEX "FacultyAbsence_facultyId_date_period_key" ON "FacultyAbsence"("facultyId", "date", "period");
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
    "isLocked_cia1" BOOLEAN NOT NULL DEFAULT false,
    "isLocked_cia2" BOOLEAN NOT NULL DEFAULT false,
    "isLocked_cia3" BOOLEAN NOT NULL DEFAULT false,
    "isApproved_cia1" BOOLEAN NOT NULL DEFAULT false,
    "isApproved_cia2" BOOLEAN NOT NULL DEFAULT false,
    "isApproved_cia3" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" INTEGER,
    "approvedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Marks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Marks_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Marks_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Marks" ("approvedAt", "approvedBy", "cia1_assignment", "cia1_attendance", "cia1_test", "cia2_assignment", "cia2_attendance", "cia2_test", "cia3_assignment", "cia3_attendance", "cia3_test", "id", "internal", "isApproved", "isLocked", "studentId", "subjectId", "updatedAt") SELECT "approvedAt", "approvedBy", "cia1_assignment", "cia1_attendance", "cia1_test", "cia2_assignment", "cia2_attendance", "cia2_test", "cia3_assignment", "cia3_attendance", "cia3_test", "id", "internal", "isApproved", "isLocked", "studentId", "subjectId", "updatedAt" FROM "Marks";
DROP TABLE "Marks";
ALTER TABLE "new_Marks" RENAME TO "Marks";
CREATE UNIQUE INDEX "Marks_studentId_subjectId_key" ON "Marks"("studentId", "subjectId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "lastPasswordChange" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "department", "fullName", "id", "password", "role", "username") SELECT "createdAt", "department", "fullName", "id", "password", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StudentAttendance_studentId_subjectId_date_period_key" ON "StudentAttendance"("studentId", "subjectId", "date", "period");
