const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanData() {
    try {
        console.log("Searching for 'John Doe' timetable entries...");

        // Find them first to count
        const entries = await prisma.timetable.findMany({
            where: {
                OR: [
                    { facultyName: { contains: 'John Doe' } },
                    { facultyId: 6 } // Based on seed_timetable.js
                ]
            }
        });

        console.log(`Found ${entries.length} entries to delete.`);

        if (entries.length > 0) {
            const { count } = await prisma.timetable.deleteMany({
                where: {
                    id: { in: entries.map(e => e.id) }
                }
            });
            console.log(`Successfully deleted ${count} entries.`);
        }

    } catch (error) {
        console.error("Cleanup failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanData();
