
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

console.log('Prisma Client resolving from:', require.resolve('@prisma/client'));
console.log('prisma.user type:', typeof prisma.user);
console.log('prisma.externalMarkAssignment type:', typeof prisma.externalMarkAssignment);
console.log('prisma.externalMark type:', typeof prisma.externalMark);
console.log('Keys on prisma:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
prisma.$disconnect();
