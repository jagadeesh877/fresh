const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAssignedAssignments = async (req, res) => {
    try {
        const staffId = req.user.id;
        const assignments = await prisma.externalMarkAssignment.findMany({
            where: { staffId },
            include: { subject: true }
        });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllAssignmentsForAdmin = async (req, res) => {
    try {
        const assignments = await prisma.externalMarkAssignment.findMany({
            include: {
                subject: true,
                staff: {
                    select: { fullName: true, username: true }
                }
            }
        });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.assignMarkEntry = async (req, res) => {
    try {
        const { staffId, subjectId, deadline } = req.body;

        // 🧱 VALIDATION ENFORCEMENT
        // 1. Check if dummy numbers exist and are locked for this subject
        const dummyMapping = await prisma.subjectDummyMapping.findFirst({
            where: { subjectId: parseInt(subjectId) }
        });

        if (!dummyMapping) {
            return res.status(400).json({ message: "Dummy numbers not generated for this subject yet" });
        }

        if (!dummyMapping.mappingLocked) {
            return res.status(400).json({ message: "Dummy mapping must be locked before assignment" });
        }

        // 2. Check if already assigned and not completed
        const existingAssignment = await prisma.externalMarkAssignment.findFirst({
            where: {
                subjectId: parseInt(subjectId),
                status: { in: ['PENDING', 'SUBMITTED', 'COMPLETED'] }
            }
        });

        if (existingAssignment) {
            return res.status(400).json({ message: "Subject already assigned or valuation completed" });
        }

        const assignment = await prisma.externalMarkAssignment.create({
            data: {
                staffId: parseInt(staffId),
                subjectId: parseInt(subjectId),
                deadline: new Date(deadline),
                status: 'PENDING'
            }
        });
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAvailableSubjectsForAssignment = async (req, res) => {
    try {
        // Fetch subjects that have LOCKED dummy mappings
        // AND do not have an active/completed assignment
        const subjectsWithLockedDummies = await prisma.subjectDummyMapping.findMany({
            where: { mappingLocked: true },
            select: { subjectId: true },
            distinct: ['subjectId']
        });

        const subjectIds = subjectsWithLockedDummies.map(d => d.subjectId);

        // Filter out subjects already assigned
        const activeAssignments = await prisma.externalMarkAssignment.findMany({
            where: {
                status: { in: ['PENDING', 'SUBMITTED', 'COMPLETED', 'LOCKED'] }
            },
            select: { subjectId: true }
        });

        const assignedIds = activeAssignments.map(a => a.subjectId);
        const availableIds = subjectIds.filter(id => !assignedIds.includes(id));

        const availableSubjects = await prisma.subject.findMany({
            where: { id: { in: availableIds } }
        });

        res.json(availableSubjects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllExternalStaff = async (req, res) => {
    try {
        const staff = await prisma.user.findMany({
            where: { role: 'EXTERNAL_STAFF' },
            select: { id: true, username: true, fullName: true, createdAt: true }
        });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createExternalStaff = async (req, res) => {
    try {
        const { username, password, fullName } = req.body;
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: 'EXTERNAL_STAFF',
                fullName
            }
        });
        res.json({ message: 'External staff created successfully', user: { id: user.id, username: user.username, fullName: user.fullName } });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.deleteExternalStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const staffId = parseInt(id);

        if (isNaN(staffId)) {
            return res.status(400).json({ message: "Invalid staff ID" });
        }

        // Use a transaction to delete all related data first, then the staff member
        await prisma.$transaction([
            prisma.externalMark.deleteMany({
                where: { submittedBy: staffId }
            }),
            prisma.externalMarkAssignment.deleteMany({
                where: { staffId: staffId }
            }),
            prisma.user.delete({
                where: { id: staffId }
            })
        ]);

        res.json({ message: 'Staff and all related data deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const assignmentId = parseInt(id);
        if (isNaN(assignmentId)) {
            return res.status(400).json({ message: "Invalid assignment ID" });
        }
        await prisma.externalMarkAssignment.delete({
            where: { id: assignmentId }
        });
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
