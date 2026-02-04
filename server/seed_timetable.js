const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTimetable() {
    console.log("Seeding Timetable for Faculty ID 6 (E124248 - MECH)...");

    try {
        const FACULTY_ID = 6;
        const DEPARTMENT = 'MECH'; // Based on previous fetching
        const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

        // Ensure Subject Exists
        let subject = await prisma.subject.findFirst({ where: { code: '24ME4101' } });
        if (!subject) {
            console.log("Creating dummy subject...");
            subject = await prisma.subject.create({
                data: {
                    code: '24ME4101',
                    name: 'Thermodynamics',
                    department: DEPARTMENT,
                    semester: 4
                }
            });
        }

        // Clear existing for this faculty to avoid duplicates
        await prisma.timetable.deleteMany({
            where: { facultyId: FACULTY_ID }
        });

        const entries = [];

        // Create 2 classes per day
        for (const day of DAYS) {
            // Period 2: Theory
            entries.push({
                department: DEPARTMENT,
                year: 2,
                semester: 4,
                section: 'A',
                day: day,
                period: 2,
                duration: 1,
                type: 'THEORY',
                subjectName: subject.name,
                subjectId: subject.id,
                facultyName: 'Dr. John Doe', // Filler, ID matters
                facultyId: FACULTY_ID,
                room: 'LH-101'
            });

            // Period 4: Theory
            entries.push({
                department: DEPARTMENT,
                year: 2,
                semester: 4,
                section: 'A',
                day: day,
                period: 4,
                duration: 1,
                type: 'THEORY',
                subjectName: subject.name,
                subjectId: subject.id,
                facultyName: 'Dr. John Doe',
                facultyId: FACULTY_ID,
                room: 'LH-101'
            });
        }

        for (const entry of entries) {
            // Use upsert or create, careful of unique constraints
            // We deleted previous for this faculty, but unique constraint is on (dept, year, sem, sec, day, period)
            // So we must be careful not to clash with *other* faculty? 
            // For now, assuming slot is free.

            // Delete any existing entry at that SLOT (regardless of faculty) to force this one
            await prisma.timetable.deleteMany({
                where: {
                    department: entry.department,
                    year: entry.year,
                    semester: entry.semester,
                    section: entry.section,
                    day: entry.day,
                    period: entry.period
                }
            });

            await prisma.timetable.create({ data: entry });
        }

        console.log(`Successfully scheduled ${entries.length} classes for Faculty ${FACULTY_ID}.`);

    } catch (error) {
        console.error("Seeding Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// seedTimetable();
