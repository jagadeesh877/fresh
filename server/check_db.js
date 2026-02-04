const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log('Users in DB:', users.map(u => ({ id: u.id, username: u.username, role: u.role })));

        // Check for specific columns
        const user = await prisma.user.findFirst();
        if (user) {
            console.log('Sample User Columns:', Object.keys(user));
        }
    } catch (err) {
        console.error('Error checking DB:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
