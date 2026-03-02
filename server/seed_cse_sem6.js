const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const subjects = [
    { code: 'CCS356', name: 'Object Oriented Software Engineering', shortName: 'OOSE' },
    { code: 'CS3691', name: 'Embedded Systems and IOT', shortName: 'ESIOT' },
    { code: 'OCE351', name: 'Environmental and Social Impact Assessment', shortName: 'ESIA' },
    { code: 'CCS336', name: 'Cloud Services Management', shortName: 'CSM' },
    { code: 'CCS354', name: 'Network Security', shortName: 'NS' },
    { code: 'CCW332', name: 'Digital Marketing', shortName: 'DM' },
    { code: 'CCS340', name: 'Cyber Security', shortName: 'CS' },
    { code: 'MX3089', name: 'Industrial Safety', shortName: 'IS' }
];

const faculties = [
    { username: 'E123513', fullName: 'Mrs. I. Eswari', subjectCode: 'CCS356' },
    { username: 'E125541', fullName: 'Mrs. G. kalaimathipriya', subjectCode: 'CS3691' },
    { username: 'E125732', fullName: 'Mrs. N. Kalaiselvi', subjectCode: 'OCE351' },
    { username: 'E124528', fullName: 'Ms. V. Bhuvanesvari', subjectCode: 'CCS336' },
    { username: 'E122502', fullName: 'Ms. S. Selvashanthi', subjectCode: 'CCS354' },
    { username: 'E123510', fullName: 'Mrs. S. Sugantha', subjectCode: 'CCW332' },
    { username: 'E124531', fullName: 'Mr. D. Ravichandran', subjectCode: 'CCS340' },
    { username: 'E125729', fullName: 'Dr. R. Sudhakar', subjectCode: 'MX3089' }
];

async function seed() {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const department = 'Computer Science';
        const semester = 6;
        const year = 3;
        const sections = ['A', 'B'];

        console.log('--- Seeding Subjects ---');
        for (const sub of subjects) {
            await prisma.subject.upsert({
                where: { code: sub.code },
                update: { name: sub.name, shortName: sub.shortName, department, semester },
                create: {
                    code: sub.code,
                    name: sub.name,
                    shortName: sub.shortName,
                    department,
                    semester,
                    credits: 3,
                    type: 'DEPARTMENT'
                }
            });
            console.log(`Upserted Subject: ${sub.code} - ${sub.name}`);
        }

        console.log('\n--- Seeding Faculty & Assignments ---');
        for (const fac of faculties) {
            // Upsert Faculty User
            const user = await prisma.user.upsert({
                where: { username: fac.username },
                update: { fullName: fac.fullName, department, role: 'FACULTY' },
                create: {
                    username: fac.username,
                    password: hashedPassword,
                    fullName: fac.fullName,
                    department,
                    role: 'FACULTY',
                    forcePasswordChange: true
                }
            });
            console.log(`Upserted Faculty: ${user.fullName} (${user.username})`);

            // Find the subject ID
            const subject = await prisma.subject.findUnique({ where: { code: fac.subjectCode } });
            if (subject) {
                for (const section of sections) {
                    // Check if assignment exists
                    const existingAssignment = await prisma.facultyAssignment.findFirst({
                        where: {
                            facultyId: user.id,
                            subjectId: subject.id,
                            section,
                            department
                        }
                    });

                    if (!existingAssignment) {
                        await prisma.facultyAssignment.create({
                            data: {
                                facultyId: user.id,
                                subjectId: subject.id,
                                section,
                                department
                            }
                        });
                        console.log(`  -> Assigned to ${subject.code} (${section} Sec)`);
                    } else {
                        console.log(`  -> Already assigned to ${subject.code} (${section} Sec)`);
                    }
                }
            }
        }

        console.log('\nSeeding completed successfully!');
    } catch (error) {
        console.error('Seeding Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
