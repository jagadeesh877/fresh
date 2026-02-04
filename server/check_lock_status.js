const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLockStatus() {
    try {
        console.log("Fetching marks lock status...");
        const marks = await prisma.marks.findMany({
            take: 5,
            select: {
                id: true,
                studentId: true,
                subjectId: true,
                isLocked: true,
                isLocked_cia1: true,
                isLocked_cia2: true,
                isLocked_cia3: true,
                isApproved_cia1: true
            }
        });

        console.log("Marks Lock Status Sample:");
        console.table(marks);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkLockStatus();
