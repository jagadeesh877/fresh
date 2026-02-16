
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const staff = await prisma.user.findMany({
            where: { role: 'EXTERNAL_STAFF' }
        });
        console.log('External Staff Count:', staff.length);
        console.log('External Staff:', JSON.stringify(staff, null, 2));

        const assignments = await prisma.externalMarkAssignment.findMany({
            include: { subject: true, staff: true }
        });
        console.log('Assignments Count:', assignments.length);
    } catch (error) {
        console.error('TRAPPED ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
