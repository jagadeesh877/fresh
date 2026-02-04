const express = require('express');
const {
    getProfile,
    updateProfile,
    changePassword,
    getAllFaculty,
    resetFacultyPassword,
    toggleFacultyStatus,
    getActivityLogs
} = require('../controllers/profileController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Common Profile Routes
router.get('/', verifyToken, getProfile);
router.put('/', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);

// Admin Only - Faculty Management
router.get('/faculty', verifyToken, isAdmin, getAllFaculty);
router.post('/faculty/reset-password', verifyToken, isAdmin, resetFacultyPassword);
router.post('/faculty/toggle-status', verifyToken, isAdmin, toggleFacultyStatus);
router.get('/activity-logs', verifyToken, isAdmin, getActivityLogs);

module.exports = router;
