const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
    try {
        console.log("Fetching marks...");
        const allMarks = await prisma.marks.findMany({
            include: {
                subject: {
                    select: { id: true, code: true, name: true, department: true, semester: true }
                },
                student: {
                    select: { id: true }
                }
            }
        });

        console.log(`Found ${allMarks.length} marks entries.`);

        const subjectMap = {};

        allMarks.forEach(mark => {
            const sId = mark.subject.id;
            if (!subjectMap[sId]) {
                subjectMap[sId] = {
                    subjectId: sId,
                    subjectCode: mark.subject.code,
                    subjectName: mark.subject.name,
                    department: mark.subject.department,
                    semester: mark.subject.semester,
                    total: 0,
                    pending_cia1: 0,
                    locked_cia1: 0,
                    approved_cia1: 0
                };
            }
            const s = subjectMap[sId];
            s.total++;

            // Check CIA1 status
            if (mark.isLocked_cia1) s.locked_cia1++;
            else if (mark.isApproved_cia1) s.approved_cia1++;
            else s.pending_cia1++;
        });

        const result = Object.values(subjectMap);
        console.log("Grouped Subjects:", result.length);
        if (result.length > 0) {
            console.log("First Subject Sample:", JSON.stringify(result[0], null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStatus();
