const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const facultyData = [
    { name: "Dr.K.P.Vasantha Kumar", code: "E124248" },
    { name: "Dr.M.Dandhayuthabani", code: "E112206" },
    { name: "Mr.R.Narayanan", code: "E122201" },
    { name: "Mr.D.Manikandan", code: "MANIKANDAN" }, // Code missing in image
    { name: "Mr.S.Rajaram", code: "E125249" },
    { name: "Mrs.N.Kalaiselvi", code: "E125732" },
    { name: "Dr.M.Vishnu Kumar", code: "E125250" },
    { name: "Dr.G.Pranesh", code: "E121228" },
    { name: "Mr.S.Sathish Kumar", code: "E121235" },
    { name: "Dr.K.Panneer Selvam", code: "E117215" },
    { name: "Mr.A.Aashiq Qul Huq", code: "E125548" },
    { name: "Dr.R.Sudhakar", code: "E125729" }
];

const subjectsData = [
    // Sem 4 (Year 2)
    { code: "24ME4101", name: "Theory of Machines", short: "TOM", sem: 4, facultyCode: "E124248" },
    { code: "24ME4102", name: "Thermal Engineering", short: "TE", sem: 4, facultyCode: "E112206" },
    { code: "24ME4103", name: "Machine Tools and Technology", short: "MTT", sem: 4, facultyCode: "E122201" },
    { code: "24ME4104", name: "Applied Fluid Power Engineering", short: "AFP", sem: 4, facultyCode: "MANIKANDAN" },
    { code: "24ME4105", name: "Computer Aided Design", short: "CAD", sem: 4, facultyCode: "E125249" },
    { code: "24CY4101", name: "Environmental Science and Engineering", short: "EVSE", sem: 4, facultyCode: "E125732" },
    { code: "24ME4201", name: "Kinematics and Dynamics Laboratory", short: "K&D LAB", sem: 4, facultyCode: "E124248" },
    { code: "24ME4202", name: "Manufacturing Processes Laboratory", short: "MP LAB", sem: 4, facultyCode: "E122201" },
    { code: "24GE4201", name: "Technical Seminar", short: "TS", sem: 4, facultyCode: "E125250" },

    // Sem 6 (Year 3)
    { code: "ME3691", name: "Heat and Mass Transfer", short: "HMT", sem: 6, facultyCode: "E121228" },
    { code: "CME333", name: "Renewable Powered Off Highway Vehicles and Emission Control Technology", short: "RPHV", sem: 6, facultyCode: "E121235" },
    { code: "CME387", name: "Non-traditional Machining Processes", short: "NTMP", sem: 6, facultyCode: "E125250" },
    { code: "CME389", name: "Design of Transmission System", short: "DTS", sem: 6, facultyCode: "E117215" },
    { code: "CME364", name: "Energy Storage Devices", short: "ESD", sem: 6, facultyCode: "E122201" },
    { code: "OCS352", name: "IoT Concepts and Applications", short: "IoT", sem: 6, facultyCode: "E125548" },
    { code: "MX3089", name: "Industrial Safety", short: "IS", sem: 6, facultyCode: "E125729" },
    { code: "ME3681", name: "CAD/CAM Laboratory", short: "CAD/CAM LAB", sem: 6, facultyCode: "MANIKANDAN" },
    { code: "ME3682", name: "Heat Transfer Laboratory", short: "HT LAB", sem: 6, facultyCode: "E121228" },

    // Sem 8 (Year 4)
    { code: "ME3811", name: "Project Work/Internship", short: "PROJECT", sem: 8, facultyCode: "E121228" }
];

async function main() {
    console.log('Starting seed...');

    // 1. Upsert Faculty
    for (const f of facultyData) {
        const user = await prisma.user.upsert({
            where: { username: f.code },
            update: { fullName: f.name, department: 'MECH' },
            create: {
                username: f.code,
                password: 'password123', // Default password
                role: 'FACULTY',
                fullName: f.name,
                department: 'MECH'
            }
        });
        console.log(`Upserted Faculty: ${f.name} (${f.code})`);
    }

    // 2. Upsert Subjects
    for (const s of subjectsData) {
        const subject = await prisma.subject.upsert({
            where: { code: s.code },
            update: {
                name: s.name,
                shortName: s.short,
                semester: s.sem,
                department: 'MECH'
            },
            create: {
                code: s.code,
                name: s.name,
                shortName: s.short,
                semester: s.sem,
                department: 'MECH'
            }
        });
        console.log(`Upserted Subject: ${s.name} (${s.code})`);

        // 3. Assign Faculty (FacultyAssignment)
        // Find the faculty user ID first
        const facultyUser = await prisma.user.findUnique({ where: { username: s.facultyCode } });
        if (facultyUser) {
            // Check if assignment exists
            const existingAssignment = await prisma.facultyAssignment.findFirst({
                where: {
                    subjectId: subject.id,
                    section: 'A' // Assuming Section A for all for now
                }
            });

            if (existingAssignment) {
                await prisma.facultyAssignment.update({
                    where: { id: existingAssignment.id },
                    data: { facultyId: facultyUser.id }
                });
                console.log(`Updated Assignment for ${s.code} to ${facultyUser.fullName}`);
            } else {
                await prisma.facultyAssignment.create({
                    data: {
                        subjectId: subject.id,
                        facultyId: facultyUser.id,
                        section: 'A'
                    }
                });
                console.log(`Created Assignment for ${s.code} to ${facultyUser.fullName}`);
            }
        } else {
            console.warn(`Faculty not found for code: ${s.facultyCode}`);
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
