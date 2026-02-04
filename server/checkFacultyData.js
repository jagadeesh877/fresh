const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFacultyData() {
    try {
        console.log('=== Checking Faculty Dashboard Data ===\n');

        // Check faculty user
        const faculty = await prisma.user.findUnique({
            where: { id: 12 }
        });
        console.log('Faculty User:', faculty ? `${faculty.fullName} (ID: ${faculty.id})` : 'NOT FOUND');

        // Check assignments
        const assignments = await prisma.facultyAssignment.findMany({
            where: { facultyId: 12 },
            include: { subject: true }
        });
        console.log('\nAssignments:', assignments.length);
        assignments.forEach(a => {
            console.log(`  - ${a.subject.name} (${a.subject.code}) - Section ${a.section}`);
        });

        // Check students
        const totalStudents = await prisma.student.count();
        console.log('\nTotal Students in DB:', totalStudents);

        // Check subjects
        const totalSubjects = await prisma.subject.count();
        console.log('Total Subjects in DB:', totalSubjects);

        // Check if there are students for the assigned subjects
        if (assignments.length > 0) {
            console.log('\nStudents per assignment:');
            for (const assignment of assignments) {
                const students = await prisma.student.count({
                    where: {
                        department: assignment.subject.department,
                        semester: assignment.subject.semester,
                        section: assignment.section
                    }
                });
                console.log(`  - ${assignment.subject.name}: ${students} students`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkFacultyData();
