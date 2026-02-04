const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Faculty Assignments and Student Lists ---');

    // 1. Get all faculty assignments
    const assignments = await prisma.facultyAssignment.findMany({
        include: {
            subject: true
        }
    });

    console.log(`Found ${assignments.length} assignments.`);

    for (const assignment of assignments) {
        // Fetch Faculty Name manually since no relation exists
        const faculty = await prisma.user.findUnique({ where: { id: assignment.facultyId } });
        const facultyName = faculty ? faculty.fullName : `Unknown (ID: ${assignment.facultyId})`;

        console.log(`\nChecking Assignment: Faculty=${facultyName}, Subject=${assignment.subject.name} (${assignment.subject.code}), Section=${assignment.section}`);

        // 2. Query students using the SAME logic as facultyController.js
        const students = await prisma.student.findMany({
            where: {
                department: assignment.subject.department,
                semester: assignment.subject.semester,
                section: assignment.section
            }
        });

        console.log(`Criteria: Dept=${assignment.subject.department}, Sem=${assignment.subject.semester}, Sec=${assignment.section}`);
        console.log(`Students Found: ${students.length}`);

        if (students.length === 0) {
            console.log('!!! WARNING: No students found for this assignment. Checking partial matches...');

            // Debug: Check if any students exist for this Dept/Sem
            const deptSemStudents = await prisma.student.count({
                where: {
                    department: assignment.subject.department,
                    semester: assignment.subject.semester
                }
            });
            console.log(`  - Students in Dept ${assignment.subject.department} / Sem ${assignment.subject.semester} (any section): ${deptSemStudents}`);

            if (deptSemStudents > 0) {
                // Check what sections exist
                const distinctSections = await prisma.student.groupBy({
                    by: ['section'],
                    where: {
                        department: assignment.subject.department,
                        semester: assignment.subject.semester
                    }
                });
                console.log(`  - Sections present in DB for this Dept/Sem: ${distinctSections.map(s => `'${s.section}'`).join(', ')}`);
                console.log(`  - Assignment Section: '${assignment.section}' (Check for mismatch spaces or case)`);
            }
        }
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
