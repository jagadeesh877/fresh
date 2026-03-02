const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getDeptCriteria } = require('../utils/deptUtils');

exports.generateMapping = async (req, res) => {
    try {
        const { department, semester, subjectId, startingDummy, boardCode, qpCode, absentStudentIds = [] } = req.body;

        const deptCriteria = await getDeptCriteria(department);

        // 1. Fetch regular students (sorted by registerNumber ASC)
        const regularStudents = await prisma.student.findMany({
            where: { ...deptCriteria, semester: parseInt(semester) },
            orderBy: { registerNumber: 'asc' }
        });

        // 1b. Fetch arrear students who have an active attempt for this subject
        const activeArrearAttempts = await prisma.arrearAttempt.findMany({
            where: {
                arrear: { subjectId: parseInt(subjectId) },
                resultStatus: null // Represents an active, ungraded attempt
            },
            include: {
                arrear: { include: { student: true } }
            }
        });

        const arrearStudents = activeArrearAttempts.map(attempt => attempt.arrear.student);

        // Combine and remove duplicates (just in case)
        const allStudentsMap = new Map();
        [...regularStudents, ...arrearStudents].forEach(s => {
            if (!allStudentsMap.has(s.id)) {
                allStudentsMap.set(s.id, s);
            }
        });

        const students = Array.from(allStudentsMap.values()).sort((a, b) => {
            const regA = a.registerNumber || a.rollNo || '';
            const regB = b.registerNumber || b.rollNo || '';
            return regA.localeCompare(regB);
        });

        if (students.length === 0) {
            return res.status(404).json({ message: "No students or arrear candidates found for given criteria" });
        }

        // 2. Fetch subject
        const subject = await prisma.subject.findUnique({
            where: { id: parseInt(subjectId) }
        });

        if (!subject) return res.status(404).json({ message: "Subject not found" });

        // 3. Check if mapping already exists and is locked
        const existingLocked = await prisma.subjectDummyMapping.findFirst({
            where: { subjectId: parseInt(subjectId), semester: parseInt(semester), mappingLocked: true }
        });

        if (existingLocked) {
            return res.status(400).json({ message: "Mapping is locked and cannot be regenerated" });
        }

        // 4. Process mappings inside a transaction
        let currentDummy = parseInt(startingDummy);
        await prisma.$transaction(async (tx) => {
            for (const student of students) {
                const isAbsent = absentStudentIds.includes(student.id);
                let dummyNumber = null;

                if (!isAbsent) {
                    dummyNumber = currentDummy.toString();
                    currentDummy++;
                }

                await tx.subjectDummyMapping.upsert({
                    where: {
                        studentId_subjectId: {
                            studentId: student.id,
                            subjectId: subject.id
                        }
                    },
                    update: {
                        dummyNumber,
                        isAbsent,
                        boardCode: boardCode || null,
                        qpCode: qpCode || null,
                        department: student.department || department,
                        semester: parseInt(semester),
                        section: student.section || 'A'
                    },
                    create: {
                        studentId: student.id,
                        originalRegisterNo: student.registerNumber || student.rollNo,
                        subjectId: subject.id,
                        subjectCode: subject.code,
                        department: student.department || department,
                        semester: parseInt(semester),
                        section: student.section || 'A',
                        academicYear: process.env.ACADEMIC_YEAR || "2023-24",
                        dummyNumber,
                        isAbsent,
                        boardCode: boardCode || null,
                        qpCode: qpCode || null
                    }
                });
            }
        });

        res.json({ message: "Dummy numbers processed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMapping = async (req, res) => {
    try {
        const { department, semester, subjectId } = req.query;
        const deptCriteria = await getDeptCriteria(department);

        // Fetch all regular students for this group
        const regularStudents = await prisma.student.findMany({
            where: {
                ...deptCriteria,
                semester: parseInt(semester)
            },
            include: {
                dummyMappings: {
                    where: { subjectId: parseInt(subjectId) }
                }
            }
        });

        // Fetch arrear students for this subject
        const activeArrearAttempts = await prisma.arrearAttempt.findMany({
            where: {
                arrear: { subjectId: parseInt(subjectId) },
                resultStatus: null
            },
            include: {
                arrear: {
                    include: {
                        student: {
                            include: {
                                dummyMappings: {
                                    where: { subjectId: parseInt(subjectId) }
                                }
                            }
                        }
                    }
                }
            }
        });

        const arrearStudents = activeArrearAttempts.map(attempt => {
            const student = attempt.arrear.student;
            student.isArrear = true; // flag for frontend if needed
            return student;
        });

        // Combine and deduplicate
        const allStudentsMap = new Map();
        [...regularStudents, ...arrearStudents].forEach(s => {
            if (!allStudentsMap.has(s.id)) {
                allStudentsMap.set(s.id, s);
            }
        });

        const students = Array.from(allStudentsMap.values()).sort((a, b) => {
            const regA = a.registerNumber || a.rollNo || '';
            const regB = b.registerNumber || b.rollNo || '';
            return regA.localeCompare(regB);
        });

        const results = students.map(student => {
            const mapping = student.dummyMappings[0] || null;
            return {
                id: mapping?.id || `temp-${student.id}`,
                studentId: student.id,
                student: { name: student.name },
                originalRegisterNo: student.registerNumber || student.rollNo,
                dummyNumber: mapping?.dummyNumber || null,
                isAbsent: mapping?.isAbsent || false,
                boardCode: mapping?.boardCode || '',
                qpCode: mapping?.qpCode || '',
                marks: mapping?.marks || null,
                mappingLocked: mapping?.mappingLocked || false,
                isTemp: !mapping,
                isArrear: student.isArrear || false
            };
        });

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.lockMapping = async (req, res) => {
    try {
        const { semester, subjectId } = req.body;
        await prisma.subjectDummyMapping.updateMany({
            where: {
                semester: parseInt(semester),
                subjectId: parseInt(subjectId)
            },
            data: { mappingLocked: true }
        });
        res.json({ message: "Mapping locked successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.unlockMapping = async (req, res) => {
    try {
        const { semester, subjectId } = req.body;
        await prisma.subjectDummyMapping.updateMany({
            where: {
                semester: parseInt(semester),
                subjectId: parseInt(subjectId)
            },
            data: { mappingLocked: false }
        });
        res.json({ message: "Mapping unlocked successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.saveMarks = async (req, res) => {
    // Basic fallback for marks entry if done via admin module
    try {
        const { mappings } = req.body; // Array of { id, marks }
        await prisma.$transaction(
            mappings.map(m => prisma.subjectDummyMapping.update({
                where: { id: parseInt(m.id) },
                data: { marks: parseFloat(m.marks) }
            }))
        );
        res.json({ message: "Marks saved successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.approveMarks = async (req, res) => {
    try {
        const { semester, subjectId } = req.body;
        const subIdInt = parseInt(subjectId);

        await prisma.$transaction(async (tx) => {
            // Mark the actual dummy records as approved
            const updated = await tx.externalMark.updateMany({
                where: { subjectId: subIdInt },
                data: { isApproved: true }
            });

            // We also want to stamp the mappings so the front-end knows they were approved
            await tx.subjectDummyMapping.updateMany({
                where: { subjectId: subIdInt, semester: parseInt(semester) },
                data: { mappingLocked: true } // Ensure it's locked too
            });
        });

        res.json({ message: "External marks approved successfully for result generation." });
    } catch (error) {
        console.error("Approval Error:", error);
        res.status(500).json({ message: error.message });
    }
};
