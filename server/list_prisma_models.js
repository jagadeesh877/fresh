
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('Available Prisma models:');
    const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
    console.log(JSON.stringify(models, null, 2));
    await prisma.$disconnect();
}

test();
