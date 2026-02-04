const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- Checking Timetable Entries for Faculty IDs ---");
        const entries = await prisma.timetable.findMany();

        let missingFacultyId = 0;
        let total = entries.length;

        entries.forEach(e => {
            if (!e.facultyId) {
                missingFacultyId++;
            }
        });

        console.log(`Total Entries: ${total}`);
        console.log(`Entries with MISSING facultyId: ${missingFacultyId}`);

        if (missingFacultyId > 0) {
            console.log("\nAttempting to fix missing IDs based on name...");
            const faculty = await prisma.user.findMany({ where: { role: 'FACULTY' } });
            const facultyMap = {};
            faculty.forEach(f => facultyMap[f.fullName] = f.id);

            let fixed = 0;
            for (const e of entries) {
                if (!e.facultyId && e.facultyName && facultyMap[e.facultyName]) {
                    const newId = facultyMap[e.facultyName];
                    await prisma.timetable.update({
                        where: { id: e.id },
                        data: { facultyId: newId }
                    });
                    fixed++;
                }
            }
            console.log(`Fixed ${fixed} entries.`);
        }

        // Re-fetch entries to see current state
        const currentEntries = await prisma.timetable.findMany();
        const uniqueFacultyIds = [...new Set(currentEntries.map(e => e.facultyId).filter(id => id !== null))];
        console.log("Faculty IDs in Timetable:", uniqueFacultyIds);

        console.log("\n--- Faculty with Classes on FRIDAY (FRI) ---");
        const friClasses = await prisma.timetable.findMany({
            where: { day: 'FRI' },
            select: { facultyId: true, facultyName: true, subjectName: true, period: true }
        });

        const friFaculty = {};
        friClasses.forEach(c => {
            if (c.facultyId) {
                if (!friFaculty[c.facultyId]) friFaculty[c.facultyId] = { name: c.facultyName, periods: [] };
                friFaculty[c.facultyId].periods.push(c.period);
            }
        });

        console.table(Object.entries(friFaculty).map(([id, data]) => ({ id, name: data.name, periods: data.periods.join(', ') })));

        console.log("\n--- Checking Absences ---");
        const absences = await prisma.facultyAbsence.findMany();
        const absentIds = absences.map(a => a.facultyId);
        console.log("Absent IDs:", absentIds);

        for (const facultyId of absentIds) {
            console.log(`\n--- Classes for Faculty ID ${facultyId} on FRIDAY (FRI) ---`);
            const classes = await prisma.timetable.findMany({
                where: {
                    facultyId: facultyId,
                    day: 'FRI'
                }
            });
            if (classes.length === 0) {
                console.log("NO CLASSES FOUND ON FRIDAY!");
            } else {
                classes.forEach(c => {
                    console.log(`Dept: ${c.department}, Year: ${c.year}, Sem: ${c.semester}, Sec: ${c.section}, Day: ${c.day}, Period: ${c.period}, Subject: ${c.subjectName}`);
                });
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
