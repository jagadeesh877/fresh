const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

const facultyData = [
    // Year 2 Faculty
    { name: 'Dr.K.P.Vasantha Kumar', code: 'E124248', dept: 'MECH' },
    { name: 'Dr.M.Dandhayuthabani', code: 'E112206', dept: 'MECH' },
    { name: 'Mr.R.Narayanan', code: 'E122201', dept: 'MECH' },
    { name: 'Mr.D.Manikandan', code: 'MECH001', dept: 'MECH' }, // Manual Code
    { name: 'Mr.S.Rajaram', code: 'E125249', dept: 'MECH' },
    { name: 'Mrs.N.Kalaiselvi', code: 'E125732', dept: 'MECH' },
    { name: 'Dr.M.Vishnu Kumar', code: 'E125250', dept: 'MECH' },

    // Year 3 Faculty
    { name: 'Dr.G.Pranesh', code: 'E121228', dept: 'MECH' },
    { name: 'Mr.S.Sathish Kumar', code: 'E121235', dept: 'MECH' },
    { name: 'Dr.K.Panneer Selvam', code: 'E117215', dept: 'MECH' },
    { name: 'Mr.A.Aashiq Qul Huq', code: 'E125548', dept: 'MECH' },
    { name: 'Dr.R.Sudhakar', code: 'E125729', dept: 'MECH' },
];

const subjectsData = [
    // Year 2 (Sem 4)
    { code: '24ME4101', name: 'Theory of Machines', short: 'TOM', dept: 'MECH', year: 2, sem: 4, facultyCode: 'E124248' },
    { code: '24ME4102', name: 'Thermal Engineering', short: 'TE', dept: 'MECH', year: 2, sem: 4, facultyCode: 'E112206' },
    { code: '24ME4103', name: 'Machine Tools and Technology', short: 'MTT', dept: 'MECH', year: 2, sem: 4, facultyCode: 'E122201' },
    { code: '24ME4104', name: 'Applied Fluid Power Engineering', short: 'AFP', dept: 'MECH', year: 2, sem: 4, facultyCode: 'MECH001' },
    { code: '24ME4105', name: 'Computer Aided Design', short: 'CAD', dept: 'MECH', year: 2, sem: 4, facultyCode: 'E125249' },
    { code: '24CY4101', name: 'Environmental Science and Engineering', short: 'EVSE', dept: 'MECH', year: 2, sem: 4, facultyCode: 'E125732' },
    { code: '24ME4201', name: 'Kinematics and Dynamics Laboratory', short: 'K&D LAB', dept: 'MECH', year: 2, sem: 4, facultyCode: 'E124248' },
    { code: '24ME4202', name: 'Manufacturing Processes Laboratory', short: 'MP LAB', dept: 'MECH', year: 2, sem: 4, facultyCode: 'E122201' },
    { code: '24GE4201', name: 'Technical Seminar', short: 'TS', dept: 'MECH', year: 2, sem: 4, facultyCode: 'E125250' },

    // Year 3 (Sem 6)
    { code: 'ME3691', name: 'Heat and Mass Transfer', short: 'HMT', dept: 'MECH', year: 3, sem: 6, facultyCode: 'E121228' },
    { code: 'CME333', name: 'Renewable Powered Off Highway Vehicles and Emission Control Technology', short: 'RPHV', dept: 'MECH', year: 3, sem: 6, facultyCode: 'E121235' },
    { code: 'CME387', name: 'Non-traditional Machining Processes', short: 'NTMP', dept: 'MECH', year: 3, sem: 6, facultyCode: 'E125250' },
    { code: 'CME389', name: 'Design of Transmission System', short: 'DTS', dept: 'MECH', year: 3, sem: 6, facultyCode: 'E117215' },
    { code: 'CME364', name: 'Energy Storage Devices', short: 'ESD', dept: 'MECH', year: 3, sem: 6, facultyCode: 'E122201' },
    { code: 'OCS352', name: 'IoT Concepts and Applications', short: 'IoT', dept: 'MECH', year: 3, sem: 6, facultyCode: 'E125548' },
    { code: 'MX3089', name: 'Industrial Safety', short: 'IS', dept: 'MECH', year: 3, sem: 6, facultyCode: 'E125729' },
    { code: 'ME3681', name: 'CAD/CAM Laboratory', short: 'CAD/CAM LAB', dept: 'MECH', year: 3, sem: 6, facultyCode: 'MECH001' },
    { code: 'ME3682', name: 'Heat Transfer Laboratory', short: 'HT LAB', dept: 'MECH', year: 3, sem: 6, facultyCode: 'E121228' },

    // Year 4 (Sem 8)
    { code: 'ME3811', name: 'Project Work/Internship', short: 'PROJECT', dept: 'MECH', year: 4, sem: 8, facultyCode: 'E121228' },
];

async function main() {
    console.log('Starting migration...');

    // 1. Ensure Department
    try {
        await prisma.department.upsert({
            where: { name: 'MECH' },
            create: { name: 'MECH' },
            update: {},
        });
        console.log('Department MECH verified.');
    } catch (e) {
        console.log('Dept error or already exists');
    }

    // 2. Upsert Faculty
    const hashedPassword = await bcrypt.hash('password123', 10);
    for (const f of facultyData) {
        try {
            await prisma.user.upsert({
                where: { username: f.code },
                update: { fullName: f.name, department: f.dept },
                create: {
                    username: f.code,
                    role: 'FACULTY',
                    password: hashedPassword,
                    fullName: f.name,
                    department: f.dept
                }
            });
            console.log(`Faculty ${f.name} synced.`);
        } catch (e) {
            console.error(`Error syncing faculty ${f.name}:`, e.message);
        }
    }

    // 3. Upsert Subjects and Assign
    for (const s of subjectsData) {
        try {
            // Upsert Subject
            const subject = await prisma.subject.upsert({
                where: { code: s.code },
                update: {
                    name: s.name,
                    shortName: s.short,
                    department: s.dept,
                    semester: s.sem,
                },
                create: {
                    code: s.code,
                    name: s.name,
                    shortName: s.short,
                    department: s.dept,
                    semester: s.sem,
                }
            });
            console.log(`Subject ${s.code} synced.`);

            // Assign Faculty (To Section A and B for completeness, or just A as default)
            // Assuming Section 'A' for now.
            const faculty = await prisma.user.findUnique({ where: { username: s.facultyCode } });

            if (faculty) {
                // Check if assignment exists
                const existing = await prisma.facultyAssignment.findFirst({
                    where: {
                        subjectId: subject.id,
                        facultyId: faculty.id,
                        section: 'A'
                    }
                });

                if (!existing) {
                    await prisma.facultyAssignment.create({
                        data: {
                            subjectId: subject.id,
                            facultyId: faculty.id,
                            section: 'A'
                        }
                    });
                    console.log(`Assigned ${faculty.username} to ${s.code} (Sec A)`);
                }
            }

        } catch (e) {
            console.error(`Error syncing subject ${s.code}:`, e.message);
        }
    }

    console.log('Migration completed.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
