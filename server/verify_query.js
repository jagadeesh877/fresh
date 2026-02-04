const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyQueryLogic() {
    console.log("Verifying Timetable Fetch Logic...");

    try {
        // 1. Find a faculty
        const faculty = await prisma.user.findFirst({
            where: { role: 'FACULTY' }
        });

        if (!faculty) {
            console.log("No faculty found to test.");
            return;
        }

        console.log(`Testing with Faculty: ${faculty.fullName} (ID: ${faculty.id})`);

        // 2. Mock parameters
        const facultyId = faculty.id;
        const day = 'MON'; // Just test Monday

        // 3. Logic from adminController.js
        const where = {};
        // Simulate query params
        if (facultyId) where.facultyId = parseInt(facultyId);
        if (day) where.day = day;

        console.log("Generated WHERE clause:", JSON.stringify(where, null, 2));

        // 4. Run Query
        const timetable = await prisma.timetable.findMany({
            where
        });

        console.log(`Found ${timetable.length} entries for Faculty on ${day}.`);
        if (timetable.length > 0) {
            console.log("Sample Entry:", timetable[0]);
        }

        console.log("Verification Logic Successful: Syntax is correct and query runs.");

    } catch (error) {
        console.error("Verification Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyQueryLogic();
