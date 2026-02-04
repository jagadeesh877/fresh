const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addFacultyAssignments() {
    try {
        console.log('Adding faculty assignments...');

        // Get the faculty user (ID: 12)
        const faculty = await prisma.user.findUnique({
            where: { id: 12 }
        });

        if (!faculty) {
            console.log('Faculty user with ID 12 not found');
            return;
        }

        console.log(`Found faculty: ${faculty.fullName}`);

        // Get some subjects
        const subjects = await prisma.subject.findMany({
            take: 3
        });

        console.log(`Found ${subjects.length} subjects`);

        // Create assignments for each subject
        for (const subject of subjects) {
            const existing = await prisma.facultyAssignment.findFirst({
                where: {
                    facultyId: faculty.id,
                    subjectId: subject.id,
                    section: 'A'
                }
            });

            if (!existing) {
                await prisma.facultyAssignment.create({
                    data: {
                        facultyId: faculty.id,
                        subjectId: subject.id,
                        section: 'A'
                    }
                });
                console.log(`Created assignment: ${subject.name} - Section A`);
            } else {
                console.log(`Assignment already exists: ${subject.name} - Section A`);
            }
        }

        console.log('Done!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addFacultyAssignments();
