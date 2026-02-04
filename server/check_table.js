const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking if StudentAttendance model works...');
        // Try to count, which should fail if table doesn't exist
        const count = await prisma.studentAttendance.count();
        console.log(`Table exists. Count: ${count}`);
    } catch (error) {
        console.error('Error accessing StudentAttendance table:', error.message);
        if (error.message.includes('no such table')) {
            console.log('DIAGNOSIS: Table missing. Need to run "npx prisma db push".');
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
