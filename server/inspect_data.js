const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting DB Data ---');

    const subject = await prisma.subject.findFirst({
        where: { code: '24ME4101' }
    });
    console.log('Subject (24ME4101):', subject);

    const student = await prisma.student.findFirst({
        where: { registerNumber: '24ME001' }
    });
    console.log('Student (24ME001):', student);
}

main()
    .finally(async () => {
        await prisma.$disconnect()
    })
