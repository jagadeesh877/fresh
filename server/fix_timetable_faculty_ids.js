const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimetableFacultyIds() {
    console.log("Starting Timetable Faculty ID Fix...");

    try {
        // 1. Fetch all Timetable entries
        const timetables = await prisma.timetable.findMany();
        console.log(`Found ${timetables.length} timetable entries.`);

        let updatedCount = 0;

        for (const entry of timetables) {
            if (!entry.subjectName) continue;

            // 2. Find the subject by name (since we might rely on names in existing dirty data)
            // or subjectId if present
            let subject = null;
            if (entry.subjectId) {
                subject = await prisma.subject.findUnique({ where: { id: entry.subjectId }, include: { facultyAssignments: true } });
            } else {
                subject = await prisma.subject.findFirst({
                    where: { name: entry.subjectName },
                    include: { facultyAssignments: true }
                });
            }

            if (!subject) {
                console.log(`Subject not found for timetable entry: ${entry.subjectName}`);
                continue;
            }

            // 3. Find the assignment for the section
            const assignment = subject.facultyAssignments.find(a => a.section === entry.section);

            if (assignment) {
                // 4. Update the timetable entry
                if (entry.facultyId !== assignment.facultyId) {
                    await prisma.timetable.update({
                        where: { id: entry.id },
                        data: {
                            facultyId: assignment.facultyId,
                            subjectId: subject.id // Ensure subjectId is linked too
                        }
                    });
                    console.log(`Updated Timetable ${entry.id}: Set Faculty ID to ${assignment.facultyId} for ${entry.subjectName} (${entry.section})`);
                    updatedCount++;
                }
            } else {
                console.log(`No Faculty Assignment found for ${entry.subjectName} Section ${entry.section}`);
            }
        }

        console.log(`Fix Complete. Updated ${updatedCount} entries.`);

    } catch (error) {
        console.error("Error fixing timetable:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixTimetableFacultyIds();
