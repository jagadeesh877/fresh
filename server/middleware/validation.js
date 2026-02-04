const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Student validation
const validateStudent = [
    body('registerNumber').notEmpty().isString().trim(),
    body('name').notEmpty().isString().trim().isLength({ min: 2, max: 100 }),
    body('department').optional({ nullable: true, checkFalsy: true }).isString(),
    body('year').isInt({ min: 1, max: 4 }),
    body('section').notEmpty().isString().isLength({ min: 1, max: 1 }),
    body('semester').isInt({ min: 1, max: 8 }),
    validate
];

// Faculty validation
const validateFaculty = [
    body('username').notEmpty().isString().trim().isLength({ min: 3, max: 50 }),
    body('password').isString().isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
    body('fullName').notEmpty().isString().trim(),
    body('department').optional({ nullable: true, checkFalsy: true }).isString(),
    validate
];

// Subject validation
const validateSubject = [
    body('code').notEmpty().isString().trim(),
    body('name').notEmpty().isString().trim(),
    body('department').optional({ nullable: true, checkFalsy: true }).isString(),
    body('semester').isInt({ min: 1, max: 8 }),
    validate
];

// Marks validation
const validateMarks = [
    body('studentId').isInt(),
    body('subjectId').isInt(),
    body('cia1_test').optional().isFloat({ min: 0, max: 50 }),
    body('cia1_assignment').optional().isFloat({ min: 0, max: 25 }),
    body('cia1_attendance').optional().isFloat({ min: 0, max: 25 }),
    body('cia2_test').optional().isFloat({ min: 0, max: 50 }),
    body('cia2_assignment').optional().isFloat({ min: 0, max: 25 }),
    body('cia2_attendance').optional().isFloat({ min: 0, max: 25 }),
    body('cia3_test').optional().isFloat({ min: 0, max: 50 }),
    body('cia3_assignment').optional().isFloat({ min: 0, max: 25 }),
    body('cia3_attendance').optional().isFloat({ min: 0, max: 25 }),
    validate
];

// Timetable validation
const validateTimetable = [
    body('entries').isArray().withMessage('Entries must be an array'),
    body('department').notEmpty().isString(),
    body('year').isInt({ min: 1, max: 4 }),
    body('semester').isInt({ min: 1, max: 8 }),
    body('section').notEmpty().isString(),
    validate
];

// Attendance validation
const validateAttendance = [
    body('subjectId').isInt(),
    body('date').notEmpty().isString().matches(/^\d{4}-\d{2}-\d{2}$/),
    body('attendanceData').isArray().withMessage('Attendance data must be an array'),
    validate
];

module.exports = {
    validateStudent,
    validateFaculty,
    validateSubject,
    validateMarks,
    validateTimetable,
    validateAttendance,
    validate
};
