const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTimetableData() {
    try {
        console.log('Starting Timetable Fix...');

        // 1. Fetch all faculty users
        const facultyUsers = await prisma.user.findMany({
            where: { role: 'FACULTY' }
        });

        console.log(`Found ${facultyUsers.length} faculty members.`);

        // Map Name -> ID
        const facultyMap = {};
        facultyUsers.forEach(f => {
            if (f.fullName) {
                facultyMap[f.fullName] = f.id;
            }
        });

        // 2. Fetch Timetable entries missing facultyId but having facultyName
        const entries = await prisma.timetable.findMany({
            where: {
                facultyId: null,
                facultyName: { not: null }
            }
        });

        console.log(`Found ${entries.length} timetable entries missing facultyId.`);

        // 3. Update them
        let updatedCount = 0;
        for (const entry of entries) {
            const fName = entry.facultyName;
            // Try exact match
            let fId = facultyMap[fName];

            // Try lenient match if exact fails (e.g. "Dr. Name" vs "Name")
            if (!fId) {
                // Simple verify: check if any faculty fullname includes this name or vice versa?
                // Let's stick to strict first, or maybe the map keys need normalization.
                // In this system, names seem to come from dropdowns populated by users, so they should match.
            }

            if (fId) {
                await prisma.timetable.update({
                    where: { id: entry.id },
                    data: { facultyId: fId }
                });
                updatedCount++;
                process.stdout.write('.');
            } else {
                console.log(`\nCould not find Faculty ID for name: "${fName}"`);
            }
        }

        console.log(`\nSuccessfully updated ${updatedCount} entries.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixTimetableData();
