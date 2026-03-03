const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { handleError } = require('../utils/errorUtils');
const markService = require('../services/markService');

const getSubjectMarksForAdmin = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const marks = await prisma.marks.findMany({
            where: { subjectId: parseInt(subjectId) },
            include: { student: true, subject: true },
            orderBy: { student: { rollNo: 'asc' } }
        });
        res.json(marks);
    } catch (error) {
        handleError(res, error, "Error fetching marks");
    }
};

const updateMarksForAdmin = async (req, res) => {
    try {
        const { subjectId, marksData } = req.body;
        const subId = parseInt(subjectId);

        await prisma.$transaction(async (tx) => {
            const ALLOWED_MARK_FIELDS = [
                'cia1_test', 'cia1_assignment', 'cia1_attendance',
                'cia2_test', 'cia2_assignment', 'cia2_attendance',
                'cia3_test', 'cia3_assignment', 'cia3_attendance'
            ];
            for (const m of marksData) {
                const sId = parseInt(m.studentId);
                const currentMark = await tx.marks.findUnique({
                    where: { studentId_subjectId: { studentId: sId, subjectId: subId } }
                });

                // Only allow whitelisted fields to prevent injection
                const safeData = {};
                for (const field of ALLOWED_MARK_FIELDS) {
                    if (m.data[field] !== undefined) safeData[field] = m.data[field];
                }

                const { internal } = markService.calculateInternalMarks(currentMark, safeData);

                await tx.marks.upsert({
                    where: { studentId_subjectId: { studentId: sId, subjectId: subId } },
                    update: {
                        ...safeData,
                        internal,
                        isApproved: true,
                        isApproved_cia1: true,
                        isApproved_cia2: true,
                        isApproved_cia3: true,
                        approvedBy: req.user.id,
                        approvedAt: new Date()
                    },
                    create: {
                        studentId: sId,
                        subjectId: subId,
                        ...safeData,
                        internal,
                        isApproved: true,
                        isApproved_cia1: true,
                        isApproved_cia2: true,
                        isApproved_cia3: true,
                        approvedBy: req.user.id,
                        approvedAt: new Date()
                    }
                });
            }
        });

        res.json({ message: "Marks updated and approved successfully" });
    } catch (error) {
        handleError(res, error, "Error updating marks by Admin");
    }
};

const getPendingMarks = async (req, res) => {
    try {
        const pending = await prisma.marks.findMany({
            where: { isApproved: false },
            include: { student: true, subject: true }
        });
        // Grouping logic would go here if needed as per adminController
        res.json(pending);
    } catch (error) {
        handleError(res, error, "Error fetching pending marks");
    }
};

const getAllSubjectMarksStatus = async (req, res) => {
    try {
        const subjects = await prisma.subject.findMany({
            include: {
                marks: true,
                facultyAssignments: {
                    include: {
                        faculty: true
                    }
                }
            }
        });

        const statusReport = subjects.map(subject => {
            const marks = subject.marks || [];

            // Extract Actual Faculty
            let facultyNames = "Not Assigned";
            if (subject.facultyAssignments && subject.facultyAssignments.length > 0) {
                facultyNames = subject.facultyAssignments
                    .filter(fa => fa.faculty)
                    .map(fa => fa.faculty.fullName || fa.faculty.username)
                    .join(", ");
            }

            // CIA 1 stats
            const pending_cia1 = marks.filter(m => !m.isApproved_cia1 && !m.isLocked_cia1).length;
            const approved_cia1 = marks.filter(m => m.isApproved_cia1 && !m.isLocked_cia1).length;
            const locked_cia1 = marks.filter(m => m.isLocked_cia1).length;

            // CIA 2 stats
            const pending_cia2 = marks.filter(m => !m.isApproved_cia2 && !m.isLocked_cia2).length;
            const approved_cia2 = marks.filter(m => m.isApproved_cia2 && !m.isLocked_cia2).length;
            const locked_cia2 = marks.filter(m => m.isLocked_cia2).length;

            // CIA 3 stats
            const pending_cia3 = marks.filter(m => !m.isApproved_cia3 && !m.isLocked_cia3).length;
            const approved_cia3 = marks.filter(m => m.isApproved_cia3 && !m.isLocked_cia3).length;
            const locked_cia3 = marks.filter(m => m.isLocked_cia3).length;

            // Final Internal stats
            const pending_internal = marks.filter(m => !m.isApproved && !m.isLocked).length;
            const approved_internal = marks.filter(m => m.isApproved && !m.isLocked).length;
            const locked_internal = marks.filter(m => m.isLocked).length;

            return {
                subjectId: subject.id,
                subjectCode: subject.code,
                subjectName: subject.name,
                semester: subject.semester,
                department: subject.department,
                faculty: facultyNames,
                pending_cia1, approved_cia1, locked_cia1,
                pending_cia2, approved_cia2, locked_cia2,
                pending_cia3, approved_cia3, locked_cia3,
                pending_internal, approved_internal, locked_internal
            };
        });

        res.json(statusReport);
    } catch (error) {
        handleError(res, error, "Error fetching status");
    }
};

// ... add approveMarks, approveAllMarks, unapproveMarks, unlockMarks ...
// I will populate these with the full logic from adminController shortly.

const approveMarks = async (req, res) => {
    const { subjectId, studentIds, lock, exam } = req.body;
    const adminId = req.user.id;
    try {
        const updateData = {};
        if (exam === 'cia1') {
            updateData.isApproved_cia1 = true;
            if (lock) updateData.isLocked_cia1 = true;
        } else if (exam === 'cia2') {
            updateData.isApproved_cia2 = true;
            if (lock) updateData.isLocked_cia2 = true;
        } else if (exam === 'cia3') {
            updateData.isApproved_cia3 = true;
            if (lock) updateData.isLocked_cia3 = true;
        } else if (exam === 'internal') {
            updateData.isApproved = true;
            updateData.approvedBy = adminId;
            updateData.approvedAt = new Date();
            if (lock) updateData.isLocked = true;
        } else {
            updateData.isApproved_cia1 = true;
            updateData.isApproved_cia2 = true;
            updateData.isApproved_cia3 = true;
            updateData.isApproved = true;
            if (lock) {
                updateData.isLocked_cia1 = true;
                updateData.isLocked_cia2 = true;
                updateData.isLocked_cia3 = true;
                updateData.isLocked = true;
            }
        }
        await prisma.marks.updateMany({
            where: { subjectId: parseInt(subjectId), studentId: { in: studentIds.map(id => parseInt(id)) } },
            data: updateData
        });
        res.json({ message: `Approved marks for ${studentIds.length} students` });
    } catch (error) {
        handleError(res, error, "Error approving marks");
    }
};

const approveAllMarks = async (req, res) => {
    const { subjectId, lock } = req.body;
    const adminId = req.user.id;
    try {
        const updateData = {
            isApproved_cia1: true,
            isApproved_cia2: true,
            isApproved_cia3: true,
            approvedBy: adminId,
            approvedAt: new Date()
        };
        if (lock) {
            updateData.isLocked_cia1 = true;
            updateData.isLocked_cia2 = true;
            updateData.isLocked_cia3 = true;
        }
        // Only approve records that have actual marks entered
        await prisma.marks.updateMany({
            where: { subjectId: parseInt(subjectId), internal: { not: null } },
            data: updateData
        });
        res.json({ message: `Approved all marks for subject` });
    } catch (error) {
        handleError(res, error, "Error approving all marks");
    }
};

const unapproveMarks = async (req, res) => {
    const { subjectId, studentIds, exam } = req.body;
    try {
        const updateData = {};
        if (exam === 'cia1' || exam === 'all') { updateData.isApproved_cia1 = false; updateData.isLocked_cia1 = false; }
        if (exam === 'cia2' || exam === 'all') { updateData.isApproved_cia2 = false; updateData.isLocked_cia2 = false; }
        if (exam === 'cia3' || exam === 'all') { updateData.isApproved_cia3 = false; updateData.isLocked_cia3 = false; }
        if (exam === 'internal' || exam === 'all') { updateData.isApproved = false; updateData.isLocked = false; }
        await prisma.marks.updateMany({
            where: { subjectId: parseInt(subjectId), studentId: { in: studentIds.map(id => parseInt(id)) } },
            data: updateData
        });
        res.json({ message: `Reverted approval for ${studentIds.length} students` });
    } catch (error) {
        handleError(res, error, "Error unapproving marks");
    }
};

const unlockMarks = async (req, res) => {
    const { subjectId, studentIds, exam } = req.body;
    try {
        const updateData = {};
        if (exam === 'cia1' || exam === 'all') updateData.isLocked_cia1 = false;
        if (exam === 'cia2' || exam === 'all') updateData.isLocked_cia2 = false;
        if (exam === 'cia3' || exam === 'all') updateData.isLocked_cia3 = false;
        if (exam === 'internal' || exam === 'all') updateData.isLocked = false;
        await prisma.marks.updateMany({
            where: { subjectId: parseInt(subjectId), studentId: { in: studentIds.map(id => parseInt(id)) } },
            data: updateData
        });
        res.json({ message: `Unlocked marks` });
    } catch (error) {
        handleError(res, error, "Error unlocking marks");
    }
};

const getMarksForApproval = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const marks = await prisma.marks.findMany({
            where: { subjectId: parseInt(subjectId) },
            include: { student: true, subject: true },
            orderBy: { student: { rollNo: 'asc' } }
        });
        res.json(marks);
    } catch (error) {
        handleError(res, error, "Error fetching marks for approval");
    }
};

module.exports = {
    getSubjectMarksForAdmin,
    updateMarksForAdmin,
    getPendingMarks,
    getMarksForApproval,
    getAllSubjectMarksStatus,
    approveMarks,
    approveAllMarks,
    unapproveMarks,
    unlockMarks
};
