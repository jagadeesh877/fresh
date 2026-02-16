
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function test() {
    const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
    fs.writeFileSync('prisma_models.txt', JSON.stringify(models, null, 2));
    await prisma.$disconnect();
}

test();
