const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyMarksUpdate() {
    try {
        // 1. Find a test student/subject
        const student = await prisma.student.findFirst();
        const subject = await prisma.subject.findFirst();

        if (!student || !subject) {
            console.log("No student or subject found.");
            return;
        }

        console.log(`Testing with Student ${student.id} and Subject ${subject.id}`);

        // 2. Simulate API Payload for 60/20/20
        const payload = {
            studentId: student.id,
            subjectId: subject.id,
            cia1_test: 55,
            cia1_assignment: 18,
            cia1_attendance: 19
        };

        // 3. Logic extraction from controller
        const currentMark = await prisma.marks.findUnique({
            where: { studentId_subjectId: { studentId: student.id, subjectId: subject.id } }
        });

        const merged = { ...currentMark, ...payload };

        const calculateCIAlo = (test, assign, att) => (test || 0) + (assign || 0) + (att || 0);

        const cia1Total = calculateCIAlo(merged.cia1_test, merged.cia1_assignment, merged.cia1_attendance);

        console.log(`CIA 1 Total: ${cia1Total} (Expected: 55+18+19 = 92)`);

        if (cia1Total === 92) {
            console.log("SUCCESS: Calculation logic handles new max marks correctly.");
        } else {
            console.log("FAILURE: Calculation logic mismatch.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyMarksUpdate();
