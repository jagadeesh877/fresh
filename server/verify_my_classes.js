const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMyClassesLogic() {
    try {
        console.log("finding faculty assignment...");
        const assignment = await prisma.facultyAssignment.findFirst({
            include: { subject: true }
        });

        if (!assignment) {
            console.log("No assignments found. Cannot verify.");
            return;
        }

        console.log(`Found Assigment: ${assignment.subject.name} (ID: ${assignment.subject.id}) for Faculty ID ${assignment.facultyId}`);

        console.log("Fetching students with marks and attendance...");

        const subjectId = assignment.subject.id;

        const students = await prisma.student.findMany({
            where: {
                department: assignment.subject.department,
                semester: assignment.subject.semester,
                section: assignment.section
            },
            include: {
                marks: { where: { subjectId: subjectId } },
                attendance: { where: { subjectId: subjectId } }
            },
            take: 5
        });

        console.log(`Found ${students.length} students.`);

        const data = students.map(s => {
            const totalClasses = 40;
            const presentCount = s.attendance.filter(a => a.status === 'PRESENT').length;
            const percentage = Math.round((presentCount / totalClasses) * 100);

            const mark = s.marks[0];
            const ciaTotal = (mark?.cia1_test || 0) + (mark?.cia1_assignment || 0) + (mark?.cia1_attendance || 0);

            return {
                id: s.id,
                name: s.name,
                attendance: s.attendance.length,
                percentage,
                ciaTotal
            };
        });

        console.table(data);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkMyClassesLogic();
