const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncAssignments() {
    console.log("--- Syncing FacultyAssignment from Timetable Grid ---");
    const tt = await prisma.timetable.findMany({});
    const subjects = await prisma.subject.findMany({});
    const faculties = await prisma.user.findMany({ where: { role: 'FACULTY' } });

    let syncCount = 0;
    for (const entry of tt) {
        if (!entry.facultyId || !entry.subjectId) continue;

        // Check if assignment exists
        const exists = await prisma.facultyAssignment.findFirst({
            where: {
                facultyId: entry.facultyId,
                subjectId: entry.subjectId,
                section: entry.section,
                department: entry.department
            }
        });

        if (!exists) {
            await prisma.facultyAssignment.create({
                data: {
                    facultyId: entry.facultyId,
                    subjectId: entry.subjectId,
                    section: entry.section,
                    department: entry.department
                }
            });
            syncCount++;
        }
    }
    console.log(`Synced ${syncCount} assignments.`);
}

syncAssignments().finally(() => prisma.$disconnect());
