const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDummyFixMore() {
    const students = await prisma.student.findMany({
        take: 10,
        orderBy: { semester: 'desc' }
    });

    for (const student of students) {
        const subject = await prisma.subject.findFirst({
            where: { semester: student.semester }
        });

        if (subject) {
            console.log(`Found MATCH: Subject ${subject.code} (Sem ${subject.semester}), Student ${student.rollNo}`);

            // MIMIC RE-GENERATION:
            const dummyNumber = "200000";
            await prisma.subjectDummyMapping.upsert({
                where: { studentId_subjectId: { studentId: student.id, subjectId: subject.id } },
                update: { dummyNumber, isAbsent: false, boardCode: "BTEST" },
                create: {
                    studentId: student.id,
                    subjectId: subject.id,
                    dummyNumber,
                    isAbsent: false,
                    originalRegisterNo: student.registerNumber || student.rollNo,
                    subjectCode: subject.code,
                    semester: student.semester,
                    academicYear: "2023-24",
                    department: student.department || "GEN",
                    section: student.section || "A"
                }
            });

            const check = await prisma.subjectDummyMapping.findFirst({
                where: { subjectId: subject.id, studentId: student.id }
            });

            if (check.dummyNumber === "200000") {
                console.log("SUCCESS: Re-generation worked. Number changed to 200000.");
                return;
            }
        }
    }
    console.log("No matches found in first 10 students.");
}

testDummyFixMore().finally(() => prisma.$disconnect());
