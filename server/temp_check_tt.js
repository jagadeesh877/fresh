const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimetable() {
    const t = await prisma.timetable.findMany({});
    console.log(`There are ${t.length} Total Timetable Entries in the database.`);

    const byDept = await prisma.timetable.groupBy({ by: ['department'], _count: { _all: true } });
    console.log("Entries by department:", byDept);
}

checkTimetable().finally(() => prisma.$disconnect());
