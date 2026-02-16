const express = require('express');
const {
    getAllFaculty, createFaculty, deleteFaculty,
    createStudent, updateStudent, getStudents,
    createSubject, getSubjects, deleteSubject, assignFaculty, removeFacultyAssignment, getDashboardStats,
    getSubjectMarksForAdmin, updateMarksForAdmin, getTimetable, saveTimetable,
    deleteStudent, getDepartments, createDepartment, updateDepartment, deleteDepartment,
    getAbsences, markFacultyAbsent, removeFacultyAbsence, getSubstitutions, assignSubstitute, deleteSubstitution,
    getPendingMarks, getMarksForApproval, approveMarks, approveAllMarks,
    unapproveMarks, unlockMarks, getAllSubjectMarksStatus,
    exportAttendanceExcel, promoteStudents
} = require('../controllers/adminController');
const {
    getSessions, createSession, getHalls, addHall, deleteHall,
    generateAllocations, getSessionAllocations, toggleSessionLock,
    exportConsolidatedPlan, updateSessionSubjects, deleteSession
} = require('../controllers/hallAllocationController');
const { getAttendanceReport } = require('../controllers/attendanceController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { validateStudent, validateFaculty, validateSubject, validateMarks } = require('../middleware/validation');

const router = express.Router();

router.use(verifyToken);
router.use(isAdmin);

router.get('/stats', getDashboardStats);

router.get('/timetable', getTimetable);
router.post('/timetable', saveTimetable);

router.get('/faculty', getAllFaculty);
router.post('/faculty', validateFaculty, createFaculty);
router.delete('/faculty/:id', deleteFaculty);

router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

router.get('/students', getStudents);
router.post('/students', validateStudent, createStudent);
router.put('/students/:id', validateStudent, updateStudent);
router.delete('/students/:id', deleteStudent);

router.get('/subjects', getSubjects);
router.post('/subjects', validateSubject, createSubject);
router.delete('/subjects/:id', deleteSubject);

router.post('/assign-faculty', assignFaculty);
router.delete('/assign-faculty/:id', removeFacultyAssignment);

// Faculty Absence & Substitution Routes
router.get('/faculty-absences', getAbsences);
router.post('/faculty-absences', markFacultyAbsent);
router.options('/faculty-absences', (req, res) => res.sendStatus(200)); // Explicit OPTIONS handling
router.delete('/faculty-absences', removeFacultyAbsence);

router.get('/substitutions', getSubstitutions);
router.post('/substitutions', assignSubstitute);
router.delete('/substitutions/:id', deleteSubstitution);

// Admin Marks Management
router.get('/marks/:subjectId', getSubjectMarksForAdmin);
router.post('/marks', validateMarks, updateMarksForAdmin);

// Marks Approval System
router.get('/marks-approval/pending', getPendingMarks);
router.get('/marks-approval/status', getAllSubjectMarksStatus);
router.get('/marks-approval/:subjectId', getMarksForApproval);
router.post('/marks-approval/approve', approveMarks);
router.post('/marks-approval/approve-all', approveAllMarks);
router.post('/marks-approval/unlock', unlockMarks);
router.post('/marks-approval/unapprove', unapproveMarks);

// Attendance Reports
router.get('/attendance/report', getAttendanceReport);
router.get('/attendance/export-excel', exportAttendanceExcel);

router.post('/students/promote', promoteStudents);

// Hall Allocation Routes
router.get('/hall-allocation/sessions', getSessions);
router.post('/hall-allocation/sessions', createSession);
router.delete('/hall-allocation/sessions/:id', deleteSession);
router.put('/hall-allocation/sessions/:id/subjects', updateSessionSubjects);
router.patch('/hall-allocation/sessions/:id/lock', toggleSessionLock);
router.get('/hall-allocation/sessions/:id/allocations', getSessionAllocations);
router.get('/hall-allocation/halls', getHalls);
router.post('/hall-allocation/halls', addHall);
router.delete('/hall-allocation/halls/:id', deleteHall);
router.post('/hall-allocation/generate', generateAllocations);
router.get('/hall-allocation/sessions/:id/export', exportConsolidatedPlan);

module.exports = router;
