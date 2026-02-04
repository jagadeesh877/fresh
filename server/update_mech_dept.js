const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Renaming Department: Mechanical -> MECH');

    // 1. Update Department Table
    // specific check to avoid unique constraint if MECH already exists (though unlikely given context)
    const mechDept = await prisma.department.findUnique({ where: { name: 'Mechanical' } });
    if (mechDept) {
        await prisma.department.update({
            where: { name: 'Mechanical' },
            data: { name: 'MECH' }
        });
        console.log('✅ Department table updated.');
    } else {
        console.log('⚠️ Department "Mechanical" not found (maybe already renamed).');
    }

    // 2. Update Users (Faculty)
    const facultyUpdate = await prisma.user.updateMany({
        where: { department: 'Mechanical' },
        data: { department: 'MECH' }
    });
    console.log(`✅ Updated ${facultyUpdate.count} Faculty/Users.`);

    // 3. Update Students
    const studentUpdate = await prisma.student.updateMany({
        where: { department: 'Mechanical' },
        data: { department: 'MECH' }
    });
    console.log(`✅ Updated ${studentUpdate.count} Students.`);

    // 4. Update Subjects
    const subjectUpdate = await prisma.subject.updateMany({
        where: { department: 'Mechanical' },
        data: { department: 'MECH' }
    });
    console.log(`✅ Updated ${subjectUpdate.count} Subjects.`);

    // 5. Update Timetable
    const timetableUpdate = await prisma.timetable.updateMany({
        where: { department: 'Mechanical' },
        data: { department: 'MECH' }
    });
    console.log(`✅ Updated ${timetableUpdate.count} Timetable entries.`);

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
