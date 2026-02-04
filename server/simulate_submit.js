const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Simulating attendance submission...");

        // 1. Get a student and subject
        const student = await prisma.student.findFirst();
        const subject = await prisma.subject.findFirst();
        const faculty = await prisma.user.findFirst({ where: { role: 'FACULTY' } });

        if (!student || !subject || !faculty) {
            console.error("Missing data to test (student, subject, or faculty).");
            return;
        }

        const date = new Date().toISOString().split('T')[0];
        const period = null; // As sent by frontend now

        console.log(`Testing Upsert for Student ${student.id}, Subject ${subject.id}, Date ${date}, Period ${period}`);

        // Try upsert
        const res = await prisma.studentAttendance.upsert({
            where: {
                studentId_subjectId_date_period: {
                    studentId: student.id,
                    subjectId: subject.id,
                    date: date,
                    period: period
                }
            },
            update: { status: 'PRESENT', facultyId: faculty.id },
            create: {
                studentId: student.id,
                subjectId: subject.id,
                date: date,
                period: period,
                status: 'PRESENT',
                facultyId: faculty.id
            }
        });

        console.log("Upsert Success:", res);

    } catch (error) {
        console.error("Simulation Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
