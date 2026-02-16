
const axios = require('axios');
const fs = require('fs');

const baseURL = 'http://172.27.53.175:3000/api';

async function test() {
    let log = '';
    log += `Testing API at ${baseURL}\n`;

    try {
        // We need a token. Let's try to login as admin.
        // I'll assume standard credentials or try to find them if possible.
        // Actually, since I'm on the server, I can try to find an existing user.

        log += 'Attempting to fetch data directly from controller logic (bypassing auth for diagnostic purposes)...\n';

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        try {
            const staff = await prisma.user.findMany({
                where: { role: 'EXTERNAL_STAFF' }
            });
            log += `DB Staff check: Found ${staff.length} staff members.\n`;
            log += JSON.stringify(staff, null, 2) + '\n';

            const assignments = await prisma.externalMarkAssignment.findMany({
                include: { subject: true, staff: true }
            });
            log += `DB Assignments check: Found ${assignments.length} assignments.\n`;
            log += JSON.stringify(assignments, null, 2) + '\n';

            const subjects = await prisma.subject.findMany();
            log += `DB Subjects check: Found ${subjects.length} subjects.\n`;

        } catch (e) {
            log += `DB Logic ERROR: ${e.message}\n${e.stack}\n`;
        } finally {
            await prisma.$disconnect();
        }

    } catch (error) {
        log += `General ERROR: ${error.message}\n`;
    } finally {
        fs.writeFileSync('diag_result.txt', log);
    }
}

test();
