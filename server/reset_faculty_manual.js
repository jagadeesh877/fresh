const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
    try {
        const username = 'E122201';
        const newPassword = '123456';

        const hashed = await bcrypt.hash(newPassword, 10);
        const user = await prisma.user.update({
            where: { username: username },
            data: {
                password: hashed,
                forcePasswordChange: true
            }
        });

        console.log(`Successfully reset password for: ${user.fullName} (${user.username})`);
        console.log(`New password: ${newPassword}`);
        console.log(`User will be forced to change password on next login.`);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

reset();
