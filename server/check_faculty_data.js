const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        console.log('\n--- MAPPED COUNTS PER FACULTY ID ---');
        const counts = await prisma.timetable.groupBy({
            by: ['facultyId', 'facultyName'],
            _count: {
                id: true
            },
            where: {
                facultyId: { not: null }
            }
        });
        console.table(counts);

        console.log('\n--- UNMAPPED ENTRIES ---');
        const unmapped = await prisma.timetable.findMany({
            where: { facultyId: null },
            select: { id: true, facultyName: true }
        });
        console.table(unmapped);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
