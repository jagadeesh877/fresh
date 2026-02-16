
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function test() {
    let result = '';
    result += `User model: ${typeof prisma.user}\n`;
    result += `ExternalMarkAssignment model: ${typeof prisma.externalMarkAssignment}\n`;
    result += `ExternalMark model: ${typeof prisma.externalMark}\n`;

    if (typeof prisma.externalMarkAssignment !== 'undefined') {
        result += 'SUCCESS: externalMarkAssignment is available!\n';
    } else {
        result += 'FAILURE: externalMarkAssignment is still missing.\n';
    }

    fs.writeFileSync('verify_models.txt', result);
    await prisma.$disconnect();
}

test();
