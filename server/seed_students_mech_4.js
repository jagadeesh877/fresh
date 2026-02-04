const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Students for Mechanical Sem 4...');

    const students = [
        { name: 'Arun Kumar', reg: '24ME001' },
        { name: 'Balaji S', reg: '24ME002' },
        { name: 'Chandru M', reg: '24ME003' },
        { name: 'Dinesh K', reg: '24ME004' },
        { name: 'Ezhil R', reg: '24ME005' },
        { name: 'Gokul P', reg: '24ME006' },
        { name: 'Hari B', reg: '24ME007' },
        { name: 'Imran H', reg: '24ME008' },
        { name: 'Jayanth V', reg: '24ME009' },
        { name: 'Karthik S', reg: '24ME010' },
    ];

    const department = 'Mechanical';
    const semester = 4;
    const year = 2;
    const section = 'A';

    for (const s of students) {
        const student = await prisma.student.upsert({
            where: { registerNumber: s.reg },
            update: {
                department,
                semester,
                section, // Ensure section matches assignment
                year
            },
            create: {
                name: s.name,
                registerNumber: s.reg,
                department,
                year,
                semester,
                section
            }
        });
        console.log(`✅ Student processed: ${s.name} (${s.reg}) - Sec ${section}`);
    }

    console.log(`\n🎉 Successfully seeded ${students.length} students for ${department} Sem ${semester} Sec ${section}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
