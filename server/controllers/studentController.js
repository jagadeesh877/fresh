const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { handleError } = require('../utils/errorUtils');

const createStudent = async (req, res) => {
    let { rollNo, registerNumber, name, department, year, section, semester, regulation, batch } = req.body;
    try {
        const parsedYear = parseInt(year);
        // Requirement: First Year students must NOT be assigned to any department.
        if (parsedYear === 1) {
            department = null;
        }

        const student = await prisma.student.create({
            data: {
                rollNo,
                registerNumber,
                name,
                department,
                year: parsedYear,
                section,
                semester: parseInt(semester),
                regulation: regulation || "2021",
                batch
            }
        });
        res.status(201).json(student);
    } catch (error) {
        handleError(res, error, "Error creating student");
    }
};

const updateStudent = async (req, res) => {
    const { id } = req.params;
    let { rollNo, registerNumber, name, department, year, section, semester, regulation, batch } = req.body;
    try {
        const studentId = parseInt(id);
        const parsedYear = parseInt(year);

        if (parsedYear === 1) {
            department = null;
        }

        const student = await prisma.student.update({
            where: { id: studentId },
            data: {
                rollNo,
                registerNumber,
                name,
                department,
                year: parsedYear,
                section,
                semester: parseInt(semester),
                regulation,
                batch
            }
        });
        res.json(student);
    } catch (error) {
        handleError(res, error, "Error updating student");
    }
};

const deleteStudent = async (req, res) => {
    const { id } = req.params;
    try {
        const studentId = parseInt(id);

        const publishedResults = await prisma.endSemMarks.findFirst({
            where: {
                marks: { studentId },
                OR: [{ isPublished: true }, { isLocked: true }]
            }
        });

        if (publishedResults) {
            return res.status(403).json({
                message: 'CRITICAL: Cannot delete student with published or locked results.'
            });
        }

        const dummyMappings = await prisma.subjectDummyMapping.findMany({
            where: { studentId }
        });
        const dummyNumbers = dummyMappings.map(m => m.dummyNumber);

        await prisma.$transaction([
            prisma.externalMark.deleteMany({ where: { dummyNumber: { in: dummyNumbers } } }),
            prisma.endSemMarks.deleteMany({ where: { marks: { studentId } } }),
            prisma.marks.deleteMany({ where: { studentId } }),
            prisma.studentAttendance.deleteMany({ where: { studentId } }),
            prisma.subjectDummyMapping.deleteMany({ where: { studentId } }),
            prisma.semesterResult.deleteMany({ where: { studentId } }),
            prisma.hallAllocation.deleteMany({ where: { studentId } }),
            prisma.arrearAttempt.deleteMany({ where: { arrear: { studentId } } }),
            prisma.arrear.deleteMany({ where: { studentId } }),
            prisma.student.delete({ where: { id: studentId } })
        ]);

        res.json({ message: 'Student and related records deleted' });
    } catch (error) {
        handleError(res, error, "Failed to delete student");
    }
};

const getStudents = async (req, res) => {
    try {
        const students = await prisma.student.findMany({
            orderBy: { rollNo: 'asc' }
        });
        res.json(students);
    } catch (error) {
        handleError(res, error, "Error fetching students");
    }
};

const promoteStudents = async (req, res) => {
    const { studentIds, department, section, semester, year } = req.body;
    try {
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: "No students selected for promotion" });
        }

        const students = await prisma.student.findMany({
            where: { id: { in: studentIds.map(id => parseInt(id)) } },
            select: { id: true, registerNumber: true, rollNo: true }
        });

        const ineligible = students.filter(s => !s.registerNumber);
        if (ineligible.length > 0) {
            return res.status(400).json({
                message: "Register Number must be assigned before promotion.",
                details: `Students missing Register Number: ${ineligible.map(s => s.rollNo).join(', ')}`
            });
        }

        const result = await prisma.student.updateMany({
            where: { id: { in: studentIds.map(id => parseInt(id)) } },
            data: {
                department: department,
                section: section,
                semester: parseInt(semester),
                year: parseInt(year)
            }
        });

        res.json({ message: `Successfully promoted ${result.count} students`, count: result.count });
    } catch (error) {
        handleError(res, error, "Error promoting students");
    }
};

const bulkUploadStudents = async (req, res) => {
    const { students } = req.body;
    try {
        if (!students || !Array.isArray(students)) {
            return res.status(400).json({ message: 'Invalid student data format' });
        }

        let createdCount = 0;
        let updatedCount = 0;
        let errors = [];

        for (const s of students) {
            let { rollNo, registerNumber, name, department, year, section, semester, regulation, batch } = s;

            if (!rollNo) {
                errors.push({ rollNo: 'MISSING', error: 'Roll Number is mandatory' });
                continue;
            }

            // Removed strict regex validation that was blocking roll numbers like 'E1225001'
            // Ensure no spaces are accidentally included
            rollNo = String(rollNo).trim();

            try {
                const existing = await prisma.student.findUnique({ where: { rollNo } });

                if (existing) {
                    await prisma.student.update({
                        where: { rollNo },
                        data: {
                            registerNumber: registerNumber || existing.registerNumber,
                            name: name || existing.name,
                            department: department || existing.department,
                            year: parseInt(year) || existing.year,
                            section: section || existing.section,
                            semester: parseInt(semester) || existing.semester,
                            regulation: regulation || existing.regulation,
                            batch: batch || existing.batch
                        }
                    });
                    updatedCount++;
                } else {
                    await prisma.student.create({
                        data: {
                            rollNo,
                            registerNumber: registerNumber || null,
                            name: name || 'Unknown',
                            department: department || null,
                            year: parseInt(year) || 1,
                            section: section || 'A',
                            semester: parseInt(semester) || 1,
                            regulation: regulation || "2021",
                            batch: batch || null
                        }
                    });
                    createdCount++;
                }
            } catch (err) {
                errors.push({ rollNo, error: err.message });
            }
        }

        res.json({
            message: `Bulk processing complete. Created: ${createdCount}, Updated: ${updatedCount}`,
            created: createdCount,
            updated: updatedCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        handleError(res, error, "Bulk upload failed");
    }
};

module.exports = {
    createStudent,
    updateStudent,
    deleteStudent,
    getStudents,
    promoteStudents,
    bulkUploadStudents
};
