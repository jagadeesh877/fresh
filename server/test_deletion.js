
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const staff = await prisma.user.findFirst({
            where: { role: 'EXTERNAL_STAFF' }
        });

        if (!staff) {
            console.log('No external staff found to test deletion');
            return;
        }

        console.log(`Attempting to delete staff member with transactional logic: ${staff.fullName} (ID: ${staff.id})`);

        await prisma.$transaction([
            prisma.externalMark.deleteMany({
                where: { submittedBy: staff.id }
            }),
            prisma.externalMarkAssignment.deleteMany({
                where: { staffId: staff.id }
            }),
            prisma.user.delete({
                where: { id: staff.id }
            })
        ]);

        console.log('Deletion successful with transactional logic!');
    } catch (error) {
        console.error('Deletion FAILED:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

test();
