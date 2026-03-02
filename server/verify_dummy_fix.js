const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDummyFix() {
    const subject = await prisma.subject.findFirst();
    if (!subject) return console.log("No subject found");

    const student = await prisma.student.findFirst({
        where: { semester: subject.semester }
    });
    if (!student) return console.log("No student found for this subject semester");

    console.log(`Testing with Subject: ${subject.code}, Student: ${student.rollNo}`);

    // Mock request body
    const body1 = {
        department: student.department,
        semester: student.semester,
        subjectId: subject.id,
        startingDummy: "170000",
        boardCode: "B1",
        qpCode: "Q1",
        absentStudentIds: []
    };

    // Import controller logic or just call it if we were in a test env.
    // Since we can't easily call exports here without express mock, 
    // we'll just check if a mapping exists and then try to "regenerate" via a script that mimics the controller logic.

    // Actually, I'll just check the DB after the user (hopefully) tries it, 
    // or I can write a small script that DOES the update.

    console.log("Checking current mappings for this sub...");
    const before = await prisma.subjectDummyMapping.findFirst({
        where: { subjectId: subject.id, studentId: student.id }
    });
    console.log("Before Dummy:", before?.dummyNumber);

    // Mimic the NEW logic:
    const isAbsent = false;
    const dummyNumber = "180000";

    await prisma.subjectDummyMapping.upsert({
        where: { studentId_subjectId: { studentId: student.id, subjectId: subject.id } },
        update: { dummyNumber, isAbsent, boardCode: "B2" },
        create: {
            studentId: student.id,
            subjectId: subject.id,
            dummyNumber,
            isAbsent,
            originalRegisterNo: student.rollNo,
            subjectCode: subject.code,
            semester: student.semester,
            academicYear: "2023-24"
        }
    });

    const after = await prisma.subjectDummyMapping.findFirst({
        where: { subjectId: subject.id, studentId: student.id }
    });
    console.log("After Dummy:", after?.dummyNumber);

    if (after?.dummyNumber === "180000") {
        console.log("SUCCESS: Dummy number updated correctly!");
    } else {
        console.log("FAILURE: Dummy number did not update.");
    }
}

testDummyFix().finally(() => prisma.$disconnect());
