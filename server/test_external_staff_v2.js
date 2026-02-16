
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function test() {
    let log = '';
    try {
        log += 'Starting tests...\n';

        // Test 1: Staff count
        const staff = await prisma.user.findMany({
            where: { role: 'EXTERNAL_STAFF' },
            select: { id: true, username: true, fullName: true }
        });
        log += `External Staff found: ${staff.length}\n`;
        log += JSON.stringify(staff, null, 2) + '\n';

        // Test 2: Assignments count
        const assignments = await prisma.externalMarkAssignment.findMany({
            include: {
                subject: { select: { id: true, name: true, code: true } },
                staff: { select: { id: true, fullName: true } }
            }
        });
        log += `Assignments found: ${assignments.length}\n`;
        log += JSON.stringify(assignments, null, 2) + '\n';

        // Test 3: Subjects count (for the dropdown)
        const subjects = await prisma.subject.findMany({
            select: { id: true, name: true, code: true }
        });
        log += `Subjects found: ${subjects.length}\n`;

    } catch (error) {
        log += `ERROR: ${error.stack}\n`;
    } finally {
        fs.writeFileSync('test_output.txt', log);
        await prisma.$disconnect();
    }
}

test();
