const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Correcting Student Department Data...');

    // Update all students created with "Mechanical" to "MECH"
    // to match the Subject data found in DB.

    const updateResult = await prisma.student.updateMany({
        where: {
            department: 'Mechanical',
            semester: 4
        },
        data: {
            department: 'MECH'
        }
    });

    console.log(`✅ Updated ${updateResult.count} students from 'Mechanical' to 'MECH'`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
