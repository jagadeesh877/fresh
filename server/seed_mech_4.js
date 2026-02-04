const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Mechanical Sem 4 Data...');

    const hashedPassword = await bcrypt.hash('123456', 10);
    const departmentName = 'Mechanical';

    // 1. Ensure Department Exists
    await prisma.department.upsert({
        where: { name: departmentName },
        update: {},
        create: { name: departmentName, code: 'MECH' } // Code from table implies ME, using MECH as stored in DB
    });

    const data = [
        { sn: 1, code: '24ME4101', name: 'Theory of Machines', short: 'TOM', faculty: 'Dr.K.P.Vasantha Kumar', facCode: 'E124248', hours: 6 },
        { sn: 2, code: '24ME4102', name: 'Thermal Engineering', short: 'TE', faculty: 'Dr.M.Dandhayuthabani', facCode: 'E112206', hours: 7 },
        { sn: 3, code: '24ME4103', name: 'Machine Tools and Technology', short: 'MTT', faculty: 'Mr.R.Narayanan', facCode: 'E122201', hours: 5 },
        { sn: 4, code: '24ME4104', name: 'Applied Fluid Power Engineering', short: 'AFP', faculty: 'Mr.D.Manikandan', facCode: 'FAC_DMANIKANDAN', hours: 4 }, // No code in image, generated one
        { sn: 5, code: '24ME4105', name: 'Computer Aided Design', short: 'CAD', faculty: 'Mr.S.Rajaram', facCode: 'E125249', hours: 6 },
        { sn: 6, code: '24CY4101', name: 'Environmental Science and Engineering', short: 'EVSE', faculty: 'Mrs.N.Kalaiselvi', facCode: 'E125732', hours: 4 },
        { sn: 7, code: '24ME4201', name: 'Kinematics and Dynamics Laboratory', short: 'K&D LAB', faculty: 'Dr.K.P.Vasantha Kumar', facCode: 'E124248', hours: 3 },
        { sn: 8, code: '24ME4202', name: 'Manufacturing Processes Laboratory', short: 'MP LAB', faculty: 'Mr.R.Narayanan', facCode: 'E122201', hours: 3 },
        { sn: 9, code: '24GE4201', name: 'Technical Seminar', short: 'TS', faculty: 'Dr.M.Vishnu Kumar', facCode: 'E125250', hours: 2 },
    ];

    for (const item of data) {
        // 2. Create/Get Faculty
        // Using FacCode as username
        const faculty = await prisma.user.upsert({
            where: { username: item.facCode },
            update: {},
            create: {
                username: item.facCode,
                password: hashedPassword,
                role: 'FACULTY',
                fullName: item.faculty,
                department: departmentName
            }
        });
        console.log(`👤 Faculty processed: ${item.faculty}`);

        // 3. Create/Update Subject
        const subject = await prisma.subject.upsert({
            where: { code: item.code },
            update: {
                name: item.name,
                shortName: item.short,
                department: departmentName,
                semester: 4
            },
            create: {
                code: item.code,
                name: item.name,
                shortName: item.short,
                department: departmentName,
                semester: 4
            }
        });
        console.log(`📘 Subject processed: ${item.name} (${item.code})`);

        // 4. Assign Faculty to Subject (Section A default)
        // Check if assignment exists
        const existingAssign = await prisma.facultyAssignment.findFirst({
            where: {
                subjectId: subject.id,
                facultyId: faculty.id,
                section: 'A'
            }
        });

        if (!existingAssign) {
            await prisma.facultyAssignment.create({
                data: {
                    subjectId: subject.id,
                    facultyId: faculty.id,
                    section: 'A'
                }
            });
            console.log(`   🔗 Assigned to ${item.faculty}`);
        } else {
            console.log(`   🔗 Assignment already exists`);
        }
    }

    console.log('✅ Seeding Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
