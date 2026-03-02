const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimetableFacultyIds() {
    console.log("--- Linking Timetable entries to Faculty IDs ---");

    const timetableEntries = await prisma.timetable.findMany({
        where: { facultyId: null }
    });

    console.log(`Found ${timetableEntries.length} entries with null facultyId.`);

    const faculties = await prisma.user.findMany({
        where: { role: 'FACULTY' }
    });

    let updatedCount = 0;
    for (const entry of timetableEntries) {
        if (!entry.facultyName) continue;

        // Exact match
        const faculty = faculties.find(f => f.fullName === entry.facultyName);
        if (faculty) {
            await prisma.timetable.update({
                where: { id: entry.id },
                data: { facultyId: faculty.id }
            });
            updatedCount++;
        }
    }

    console.log(`Updated ${updatedCount} entries with correct facultyId.`);
}

fixTimetableFacultyIds().finally(() => prisma.$disconnect());
