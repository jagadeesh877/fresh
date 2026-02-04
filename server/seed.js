const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seeding...');

    // 1. Create Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            password: hashedPassword // Ensure password is reset to known value
        },
        create: {
            username: 'admin',
            password: hashedPassword,
            role: 'ADMIN',
            fullName: 'System Admin',
        },
    });
    console.log('✅ Admin user created');

    // 2. Create Departments
    const deptData = [
        { name: 'First Year (General)', code: 'GEN', years: '1' },
        { name: 'Computer Science', code: 'CSE', years: '2,3,4' },
        { name: 'Electronics', code: 'ECE', years: '2,3,4' },
        { name: 'Mechanical', code: 'MECH', years: '2,3,4' },
        { name: 'Civil Engineering', code: 'CIVIL', years: '2,3,4' }
    ];

    const departments = [];
    for (const d of deptData) {
        const dept = await prisma.department.upsert({
            where: { name: d.name },
            update: {
                code: d.code,
                years: d.years || '2,3,4'
            },
            create: {
                name: d.name,
                code: d.code,
                years: d.years || '2,3,4'
            }
        });
        departments.push(dept);
    }
    console.log('✅ Departments created');

    // 3. Create Faculty & Assign HOD
    for (const dept of departments) {
        const username = `hod_${dept.code.toLowerCase()}`;
        const facultyName = `Prof. ${dept.code} Head`;

        const facultyUser = await prisma.user.upsert({
            where: { username: username },
            update: {
                fullName: facultyName,
                department: dept.name
            },
            create: {
                username: username,
                password: hashedPassword,
                role: 'FACULTY',
                fullName: facultyName,
                department: dept.name
            }
        });

        // Update Dept with HOD
        await prisma.department.update({
            where: { id: dept.id },
            data: { hodId: facultyUser.id }
        });
    }
    console.log('✅ Faculty & HODs created');

    // 4. Create Subjects & Students
    const subjectsData = [
        { name: 'Data Structures', code: 'CS201', dept: 'Computer Science', sem: 3 },
        { name: 'Algorithms', code: 'CS202', dept: 'Computer Science', sem: 3 },
        { name: 'Circuits', code: 'EC201', dept: 'Electronics', sem: 3 },
        { name: 'Thermodynamics', code: 'ME201', dept: 'Mechanical', sem: 3 }
    ];

    for (const sub of subjectsData) {
        await prisma.subject.upsert({
            where: { code: sub.code },
            update: {},
            create: {
                name: sub.name,
                code: sub.code,
                department: sub.dept,
                semester: sub.sem
            }
        });
    }
    console.log('✅ Subjects created');

    // 5. Create Students & Marks
    const students = [
        { name: 'John Doe', reg: '2023CS001', dept: 'Computer Science' },
        { name: 'Jane Smith', reg: '2023CS002', dept: 'Computer Science' },
        { name: 'Mike Ross', reg: '2023EC001', dept: 'Electronics' }
    ];

    for (const s of students) {
        const student = await prisma.student.upsert({
            where: { registerNumber: s.reg },
            update: {},
            create: {
                name: s.name,
                registerNumber: s.reg,
                department: s.dept,
                year: 2,
                semester: 3,
                section: 'A'
            }
        });

        // Add some random marks for Data Structures (assuming it's first subject)
        const dsSubject = await prisma.subject.findUnique({ where: { code: 'CS201' } });
        if (dsSubject && s.dept === 'Computer Science') {
            // Check if marks exist
            const existingMark = await prisma.marks.findFirst({
                where: { studentId: student.id, subjectId: dsSubject.id }
            });

            if (!existingMark) {
                await prisma.marks.create({
                    data: {
                        studentId: student.id,
                        subjectId: dsSubject.id,
                        cia1_test: 35,
                        cia1_assignment: 9,
                        cia1_attendance: 5,
                        internal: 49,
                        isApproved: true
                    }
                });
            }
        }
    }
    console.log('✅ Students & Marks seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
