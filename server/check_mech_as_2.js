const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllMechAss() {
    const as = await prisma.facultyAssignment.findMany({
        where: { department: 'MECH' },
        include: { subject: true, faculty: true }
    });
    console.log(`MECH has ${as.length} assignments.`);
    for (const a of as) {
        console.log(`Subj: ${a.subject.name} | Sec: ${a.section} | Fac: ${a.faculty?.fullName}`);
    }
}

checkAllMechAss().finally(() => prisma.$disconnect());
