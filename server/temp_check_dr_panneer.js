const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDrPanneerTimetable() {
    const user = await prisma.user.findFirst({
        where: { fullName: { contains: 'Panneer' } }
    });

    if (!user) {
        console.log("Dr. K. Panneer Selvam not found.");
        return;
    }

    console.log(`Found user: ${user.fullName} ID: ${user.id}`);

    const tt = await prisma.timetable.findMany({
        where: { facultyId: user.id },
        include: { subject: true }
    });

    console.log(`Timetable entries for ${user.fullName}:`, tt);
}

checkDrPanneerTimetable().finally(() => prisma.$disconnect());
