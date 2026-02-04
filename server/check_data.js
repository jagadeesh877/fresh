const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🔍 DIAGNOSTIC START");

    // 1. Check Faculty
    const faculty = await prisma.user.findFirst({ where: { username: 'cse_staff' } });
    if (!faculty) { console.log("❌ Demo Faculty 'cse_staff' NOT FOUND"); return; }
    console.log(`✅ Faculty Found: ${faculty.fullName} (ID: ${faculty.id})`);

    // 2. Check Subject
    const subject = await prisma.subject.findFirst({ where: { code: 'CS301' } });
    if (!subject) { console.log("❌ Demo Subject 'CS301' NOT FOUND"); return; }
    console.log(`✅ Subject Found: ${subject.name} (ID: ${subject.id}, Dept: ${subject.department}, Sem: ${subject.semester})`);

    // 3. Check Assignment
    const assignment = await prisma.facultyAssignment.findFirst({
        where: { facultyId: faculty.id, subjectId: subject.id }
    });
    if (!assignment) {
        console.log("❌ No Assignment found for this Faculty + Subject");
    } else {
        console.log(`✅ Assignment Found: Section '${assignment.section}'`);
    }

    // 4. Check Students with Exact Match
    if (assignment) {
        const exactStudents = await prisma.student.findMany({
            where: {
                department: subject.department,
                semester: subject.semester,
                section: assignment.section
            }
        });
        console.log(`📊 Students matching [Dept: ${subject.department}, Sem: ${subject.semester}, Sec: ${assignment.section}]: ${exactStudents.length}`);

        if (exactStudents.length === 0) {
            console.log("⚠️ No students match strictly. Checking relaxed criteria...");

            // 4b. Check matching Dept + Sem (Ignore Section)
            const deptSemStudents = await prisma.student.findMany({
                where: { department: subject.department, semester: subject.semester }
            });
            console.log(`   - Students in [Dept: ${subject.department}, Sem: ${subject.semester} (Any Sec)]: ${deptSemStudents.length}`);
            if (deptSemStudents.length > 0) {
                console.log("   -> CONCLUSION: Section Mismatch. Students exist in dept/sem but not this section.");
                console.log(`   -> Sample Student Section: '${deptSemStudents[0].section}' vs Assignment: '${assignment.section}'`);
            } else {
                console.log("   -> CONCLUSION: Dept/Sem Mismatch. No students in this Semester.");
            }
        } else {
            console.log("✅ Data Chain matches. Students should be visible.");
        }
    }
}

main().finally(() => prisma.$disconnect());
