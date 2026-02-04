const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('Restoring Admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);

    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: adminPassword,
            role: 'ADMIN',
            fullName: 'System Administrator'
        }
    });
    console.log('Admin user restored: admin / admin123');

    // Also run the MECH seed if it exists
    console.log('Running MECH seed...');
    // I will manually include the MECH seed logic here or just run the other file.
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
