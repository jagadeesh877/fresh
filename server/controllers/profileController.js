const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                role: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                department: true,
                designation: true,
                lastPasswordChange: true,
                lastLogin: true
            }
        });

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update personal information
const updateProfile = async (req, res) => {
    const { fullName, phoneNumber, email } = req.body;
    const isFaculty = req.user.role === 'FACULTY';
    const isAdmin = req.user.role === 'ADMIN';

    try {
        const updateData = {};

        // Both can update fullName and phoneNumber
        if (fullName) updateData.fullName = fullName;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;

        // Functional requirements:
        // Admin: Email is editable
        // Faculty: Email is read-only (so we don't update it if role is faculty)
        if (isAdmin && email) {
            updateData.email = email;
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: updateData,
            select: {
                id: true,
                username: true,
                role: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                department: true,
                designation: true
            }
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Change Password
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Incorrect current password' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                password: hashed,
                lastPasswordChange: new Date(),
                forcePasswordChange: false
            }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Admin Only Faculty Management ---

const getAllFaculty = async (req, res) => {
    try {
        const faculty = await prisma.user.findMany({
            where: { role: 'FACULTY' },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                department: true,
                designation: true,
                isDisabled: true,
                lastLogin: true
            }
        });
        res.json(faculty);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const resetFacultyPassword = async (req, res) => {
    const { facultyId, newPassword } = req.body;
    try {
        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: parseInt(facultyId) },
            data: {
                password: hashed,
                forcePasswordChange: true
            }
        });

        // Log Action
        await prisma.activityLog.create({
            data: {
                action: 'RESET_PASSWORD',
                description: `Reset password for faculty ID ${facultyId}`,
                performedBy: req.user.id,
                targetId: parseInt(facultyId)
            }
        });

        res.json({ message: 'Faculty password reset successfully. User will be forced to change it on next login.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const toggleFacultyStatus = async (req, res) => {
    const { facultyId, isDisabled } = req.body;
    try {
        await prisma.user.update({
            where: { id: parseInt(facultyId) },
            data: { isDisabled: !!isDisabled }
        });

        // Log Action
        await prisma.activityLog.create({
            data: {
                action: isDisabled ? 'DISABLE_ACCOUNT' : 'ENABLE_ACCOUNT',
                description: `${isDisabled ? 'Disabled' : 'Enabled'} faculty account ID ${facultyId}`,
                performedBy: req.user.id,
                targetId: parseInt(facultyId)
            }
        });

        res.json({ message: `Faculty account ${isDisabled ? 'disabled' : 'enabled'} successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getActivityLogs = async (req, res) => {
    try {
        const logs = await prisma.activityLog.findMany({
            orderBy: { timestamp: 'desc' },
            include: {
                performer: {
                    select: { fullName: true, username: true }
                }
            },
            take: 50
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getAllFaculty,
    resetFacultyPassword,
    toggleFacultyStatus,
    getActivityLogs
};
