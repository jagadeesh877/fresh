const express = require('express');
const { getAssignedSubjects, getSubjectMarks, updateMarks, getFacultyDashboardStats, getMyTimetable, getClassDetails, getClassStudents, getClassAttendance, exportClassAttendanceExcel } = require('../controllers/facultyController');
const { getStudentsForAttendance, submitAttendance, getAttendanceReport } = require('../controllers/attendanceController');
const { verifyToken, isFaculty } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);
router.use(isFaculty);

router.get('/stats', getFacultyDashboardStats);
router.get('/assignments', getAssignedSubjects);
router.get('/marks/:subjectId', getSubjectMarks);
router.get('/timetable', getMyTimetable);
router.get('/class/:subjectId/details', getClassDetails);
router.get('/class/:subjectId/students', getClassStudents);
router.get('/class/:subjectId/attendance', getClassAttendance);
router.get('/class/:subjectId/attendance/export-excel', exportClassAttendanceExcel);
router.post('/marks', updateMarks);

// Attendance Routes
router.get('/attendance/students', getStudentsForAttendance);
router.post('/attendance', submitAttendance);
router.get('/attendance/report', getAttendanceReport);

module.exports = router;
