const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const markService = require('../services/markService');
const { getDeptCriteria } = require('../utils/deptUtils');

const prisma = new PrismaClient();

// Get subjects assigned to the logged-in faculty
const getAssignedSubjects = async (req, res) => {
    const facultyId = parseInt(req.user.id);
    try {
        const assignments = await prisma.facultyAssignment.findMany({
            where: { facultyId },
            include: {
                subject: true,
            }
        });

        const enhancedAssignments = await Promise.all(assignments.map(async (assignment) => {
            // Count students
            const deptCriteria = await getDeptCriteria(assignment.department || assignment.subject.department);

            const studentCount = await prisma.student.count({
                where: {
                    ...deptCriteria,
                    semester: assignment.subject.semester,
                    section: assignment.section
                }
            });

            // Calculate Avg Marks
            const students = await prisma.student.findMany({
                where: {
                    ...deptCriteria,
                    semester: assignment.subject.semester,
                    section: assignment.section
                },
                include: {
                    marks: { where: { subjectId: assignment.subject.id } }
                }
            });

            const marksData = students
                .map(s => s.marks[0]?.internal)
                .filter(m => m != null);

            const avgMarks = marksData.length > 0
                ? Math.round(marksData.reduce((a, b) => a + b, 0) / marksData.length)
                : 0;

            // Count Weekly Classes
            const weeklyClasses = await prisma.timetable.count({
                where: {
                    facultyId,
                    subjectId: assignment.subject.id,
                }
            });

            return {
                ...assignment,
                studentCount,
                avgMarks,
                weeklyClasses: weeklyClasses || 2
            };
        }));

        res.json(enhancedAssignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClassDetails = async (req, res) => {
    const { subjectId } = req.params;
    const facultyId = parseInt(req.user.id);
    const { section, department } = req.query;
    try {
        const assignment = await prisma.facultyAssignment.findFirst({
            where: {
                subjectId: parseInt(subjectId),
                facultyId,
                ...(section && { section }),
                ...(department && { department })
            },
            include: { subject: true }
        });

        if (!assignment) return res.status(403).json({ message: 'Not authorized for this class' });

        const deptCriteria = await getDeptCriteria(department || assignment.department || assignment.subject.department);

        const studentCount = await prisma.student.count({
            where: {
                ...deptCriteria,
                semester: assignment.subject.semester,
                section: assignment.section
            }
        });

        const attendanceRecords = await prisma.studentAttendance.groupBy({
            by: ['date', 'period'],
            where: {
                subjectId: parseInt(subjectId)
            }
        });
        const classesCompleted = attendanceRecords.length;

        const timetableEntries = await prisma.timetable.findMany({
            where: {
                facultyId,
                subjectId: parseInt(subjectId)
            }
        });

        const weeklyHours = timetableEntries.reduce((sum, entry) => sum + (entry.duration || 1), 0);
        const totalWeeks = 15;
        const totalEstimatedClasses = (weeklyHours * totalWeeks) || 45;

        const percentage = Math.min(Math.round((classesCompleted / totalEstimatedClasses) * 100), 100);

        res.json({
            ...assignment,
            studentCount,
            syllabusCompletion: percentage,
            classesCompleted,
            totalEstimatedClasses
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClassStudents = async (req, res) => {
    const { subjectId } = req.params;
    const facultyId = parseInt(req.user.id);
    const { section, department } = req.query;
    try {
        const assignment = await prisma.facultyAssignment.findFirst({
            where: {
                subjectId: parseInt(subjectId),
                facultyId,
                ...(section && { section }),
                ...(department && { department })
            },
            include: { subject: true }
        });

        if (!assignment) return res.status(403).json({ message: 'Not authorized' });

        const deptCriteria = await getDeptCriteria(department || assignment.department || assignment.subject.department);

        const students = await prisma.student.findMany({
            where: {
                ...deptCriteria,
                semester: assignment.subject.semester,
                section: section || assignment.section
            },
            include: {
                marks: { where: { subjectId: parseInt(subjectId) } },
                attendance: { where: { subjectId: parseInt(subjectId) } }
            },
            orderBy: { rollNo: 'asc' }
        });

        const data = students.map(s => {
            const totalClasses = 40;
            const presentCount = s.attendance.filter(a => a.status === 'PRESENT' || a.status === 'OD').length;
            const percentage = Math.round((presentCount / totalClasses) * 100);
            const mark = s.marks[0];

            const isCiaAbsent = mark ? (mark.cia1_test === -1 && mark.cia1_assignment === -1 && mark.cia1_attendance === -1) &&
                (mark.cia2_test === -1 && mark.cia2_assignment === -1 && mark.cia2_attendance === -1) &&
                (mark.cia3_test === -1 && mark.cia3_assignment === -1 && mark.cia3_attendance === -1) : false;

            return {
                id: s.id,
                rollNo: s.rollNo,
                registerNumber: s.registerNumber,
                name: s.name,
                attendancePercentage: percentage > 100 ? 100 : percentage,
                ciaTotal: mark?.internal || 0,
                isCiaAbsent,
                status: percentage >= 75 ? 'Eligible' : 'Shortage'
            };
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClassAttendance = async (req, res) => {
    const { subjectId } = req.params;
    try {
        const attendance = await prisma.studentAttendance.findMany({
            where: { subjectId: parseInt(subjectId) },
            orderBy: { date: 'desc' }
        });

        const grouped = {};
        attendance.forEach(r => {
            if (!grouped[r.date]) grouped[r.date] = { date: r.date, present: 0, absent: 0, total: 0 };
            grouped[r.date].total++;
            if (r.status === 'PRESENT' || r.status === 'OD') grouped[r.date].present++;
            else grouped[r.date].absent++;
        });

        const result = Object.values(grouped).map(d => ({
            ...d,
            percentage: Math.round((d.present / d.total) * 100)
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSubjectMarks = async (req, res) => {
    const { subjectId } = req.params;
    try {
        const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const assignment = await prisma.facultyAssignment.findFirst({
            where: {
                subjectId: parseInt(subjectId),
                facultyId: parseInt(req.user.id)
            }
        });

        if (!assignment) {
            return res.status(403).json({ message: 'You are not assigned to this subject.' });
        }

        const deptCriteria = await getDeptCriteria(assignment.department || subject.department);

        const students = await prisma.student.findMany({
            where: {
                ...deptCriteria,
                semester: subject.semester,
                section: assignment.section
            },
            include: {
                marks: {
                    where: { subjectId: parseInt(subjectId) }
                }
            },
            orderBy: { rollNo: 'asc' }
        });

        const result = students.map(s => ({
            studentId: s.id,
            rollNo: s.rollNo,
            registerNumber: s.registerNumber,
            name: s.name,
            marks: s.marks[0] || {}
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateMarks = async (req, res) => {
    const { studentId, subjectId } = req.body;
    try {
        const currentMark = await prisma.marks.findUnique({
            where: { studentId_subjectId: { studentId: parseInt(studentId), subjectId: parseInt(subjectId) } }
        });

        const updates = {};
        const allowedFields = ['cia1_test', 'cia1_assignment', 'cia1_attendance', 'cia2_test', 'cia2_assignment', 'cia2_attendance', 'cia3_test', 'cia3_assignment', 'cia3_attendance'];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                const valStr = req.body[field];
                const val = valStr === '' || valStr === null ? null : parseFloat(valStr);
                if (val !== null && (val < -1 || val > 100)) {
                    throw new Error(`Invalid mark value for ${field}: ${val}. Must be between -1 and 100.`);
                }
                updates[field] = val;
            }
        });

        // 🧱 LOCK ENFORCEMENT & CALCULATIONS (via service)
        const lockError = await markService.checkLockStatus(parseInt(studentId), currentMark, Object.keys(updates));
        if (lockError) return res.status(403).json({ message: lockError });

        const { internal, isApproved_cia1, isApproved_cia2, isApproved_cia3 } = markService.calculateInternalMarks(currentMark, updates);
        const finalUpdates = {
            ...updates,
            internal,
            isApproved_cia1,
            isApproved_cia2,
            isApproved_cia3
        };

        const marks = await prisma.marks.upsert({
            where: { studentId_subjectId: { studentId: parseInt(studentId), subjectId: parseInt(subjectId) } },
            update: finalUpdates,
            create: {
                studentId: parseInt(studentId),
                subjectId: parseInt(subjectId),
                ...finalUpdates
            }
        });

        res.json(marks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getFacultyDashboardStats = async (req, res) => {
    try {
        const facultyId = parseInt(req.user.id);
        const assignments = await prisma.facultyAssignment.findMany({
            where: { facultyId },
            include: { subject: true }
        });

        const assignedSubjects = assignments.length;
        let totalStudents = 0;
        const classPerformance = [];

        for (const assignment of assignments) {
            const deptCriteria = await getDeptCriteria(assignment.department || assignment.subject.department);

            const students = await prisma.student.findMany({
                where: {
                    ...deptCriteria,
                    semester: assignment.subject.semester,
                    section: assignment.section
                },
                include: {
                    marks: { where: { subjectId: assignment.subject.id } }
                }
            });

            totalStudents += students.length;
            const marksData = students.map(s => s.marks[0]?.internal).filter(m => m != null);
            const avgMarks = marksData.length > 0 ? Math.round(marksData.reduce((a, b) => a + b, 0) / marksData.length) : 0;

            classPerformance.push({
                subject: assignment.subject.shortName || assignment.subject.name,
                average: avgMarks,
                students: students.length
            });
        }

        const timetable = await prisma.timetable.findMany({ where: { facultyId } });
        const classesThisWeek = timetable.length;

        let allMarks = [];
        for (const assignment of assignments) {
            const marks = await prisma.marks.findMany({
                where: { subjectId: assignment.subject.id, internal: { not: null } },
                select: { internal: true }
            });
            allMarks = [...allMarks, ...marks.map(m => m.internal)];
        }

        const avgPerformance = allMarks.length > 0 ? (allMarks.reduce((a, b) => a + b, 0) / allMarks.length).toFixed(1) : 0;

        let totalMarksEntries = 0;
        let submittedMarksEntries = 0;

        for (const assignment of assignments) {
            const deptCriteriaStats = await getDeptCriteria(assignment.department || assignment.subject.department);
            const studentsCount = await prisma.student.count({
                where: {
                    ...deptCriteriaStats,
                    semester: assignment.subject.semester,
                    section: assignment.section
                }
            });
            const marksCount = await prisma.marks.count({
                where: { subjectId: assignment.subject.id, internal: { not: null } }
            });
            totalMarksEntries += studentsCount;
            submittedMarksEntries += marksCount;
        }

        const submissionPercentage = totalMarksEntries > 0 ? Math.round((submittedMarksEntries / totalMarksEntries) * 100) : 0;

        res.json({
            assignedSubjects,
            totalStudents,
            classesThisWeek,
            avgPerformance,
            classPerformance,
            marksSubmissionStatus: [
                { name: 'Submitted', value: submissionPercentage, color: '#10b981' },
                { name: 'Pending', value: 100 - submissionPercentage, color: '#f59e0b' }
            ],
            attendanceTrend: [
                { week: 'Week 1', rate: 88 }, { week: 'Week 2', rate: 92 },
                { week: 'Week 3', rate: 85 }, { week: 'Week 4', rate: 90 },
                { week: 'Week 5', rate: 87 }
            ]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyTimetable = async (req, res) => {
    try {
        const facultyId = parseInt(req.user.id);
        const { date } = req.query;
        let timetable = await prisma.timetable.findMany({ where: { facultyId }, include: { subject: true } });

        if (date) {
            const dateObj = new Date(date);
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const dayOfWeek = days[dateObj.getUTCDay()];

            const myAbsences = await prisma.facultyAbsence.findMany({ where: { facultyId, date } });
            const isFullDayAbsent = myAbsences.some(a => a.period === 0);
            const mySubstitutedSlots = await prisma.substitution.findMany({
                where: { date, timetable: { facultyId } },
                include: { substituteFaculty: true }
            });

            timetable = timetable.map(t => {
                // We show all days, but only apply "isCovered" flags to the day that matches `selectedDate`.
                if (t.day !== dayOfWeek) return t;

                const specificAbsence = myAbsences.find(a => a.period === t.period);
                const sub = mySubstitutedSlots.find(s => s.timetableId === t.id);
                if (isFullDayAbsent || specificAbsence) {
                    return { ...t, isCovered: true, coveredBy: sub ? sub.substituteFaculty.fullName : 'Faculty Absent' };
                }
                return t;
            });

            const substitutions = await prisma.substitution.findMany({
                where: { substituteFacultyId: facultyId, date },
                include: { timetable: { include: { subject: true } } }
            });

            if (substitutions.length > 0) {
                const subEntries = substitutions.map(sub => ({
                    id: `sub-${sub.id}`,
                    ...sub.timetable,
                    day: dayOfWeek, // Bind the substitute entry to the dayOfWeek of the Selected Date
                    isSubstitute: true,
                    originalFaculty: sub.timetable.facultyName
                }));
                timetable = [...timetable, ...subEntries];
            }
        }
        res.json(timetable);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportClassAttendanceExcel = async (req, res) => {
    const { subjectId } = req.params;
    const facultyId = parseInt(req.user.id);
    const { fromDate, toDate } = req.query;
    try {
        const assignment = await prisma.facultyAssignment.findFirst({
            where: { subjectId: parseInt(subjectId), facultyId },
            include: { subject: true }
        });
        if (!assignment) return res.status(403).json({ message: 'Not authorized' });

        const deptCriteria = await getDeptCriteria(assignment.department || assignment.subject.department);

        // Fetch all attendance for this subject (filter in JS for reliable string date comparison)
        const students = await prisma.student.findMany({
            where: { ...deptCriteria, semester: assignment.subject.semester, section: assignment.section },
            include: { attendance: { where: { subjectId: parseInt(subjectId) } } },
            orderBy: { rollNo: 'asc' }
        });

        // Filter attendance records by date range in JavaScript (safe for String dates)
        const filterByDate = (records) => {
            return records.filter(a => {
                if (fromDate && a.date < fromDate) return false;
                if (toDate && a.date > toDate) return false;
                return true;
            });
        };

        // Calculate total periods conducted in the date range (distinct date+period slots)
        const allAttendanceInRange = students.length > 0 ? filterByDate(students[0].attendance) : [];
        // Collect all distinct date+period slots from ALL students
        const allSlots = new Set();
        students.forEach(s => {
            filterByDate(s.attendance).forEach(a => {
                allSlots.add(`${a.date}_${a.period}`);
            });
        });
        const totalPeriodsConducted = allSlots.size;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        // Use direct cell assignment — 100% guaranteed row order, no ExcelJS auto-header interference
        const headers = ['Roll No', 'Reg No', 'Student Name', 'Department', 'Year', 'Semester', 'Section', 'Presents', 'Absents', 'OD', 'Attendance %', 'Status'];
        const colWidths = [15, 15, 30, 15, 8, 10, 10, 12, 12, 10, 15, 12];

        // Row 1 — Subject
        worksheet.getCell('A1').value = `Subject: ${assignment.subject.name} (${assignment.subject.code})`;
        worksheet.getCell('A1').font = { bold: true, size: 12 };

        // Row 2 — Date range
        worksheet.getCell('A2').value = `Date Range: ${fromDate || 'All'} to ${toDate || 'All'}`;

        // Row 3 — Total periods conducted
        worksheet.getCell('A3').value = `Total Periods Conducted: ${totalPeriodsConducted}`;
        worksheet.getCell('A3').font = { bold: true, color: { argb: 'FF003B73' } };

        // Row 4 — blank separator
        // (leave empty)

        // Row 5 — Column headers
        headers.forEach((h, i) => {
            const cell = worksheet.getCell(5, i + 1);
            cell.value = h;
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });

        // Rows 6+ — Student data
        let rowIndex = 6;
        students.forEach(s => {
            const filtered = filterByDate(s.attendance);
            const total = filtered.length;
            const od = filtered.filter(a => a.status === 'OD').length;
            const presentOnly = filtered.filter(a => a.status === 'PRESENT').length;
            const presentTotal = presentOnly + od;
            const absent = total - presentTotal;
            const percentage = total > 0 ? ((presentTotal / total) * 100).toFixed(2) : '0.00';
            const rowData = [s.rollNo, s.registerNumber || '-', s.name, s.department, s.year, s.semester, s.section, presentOnly, absent, od, percentage, parseFloat(percentage) >= 75 ? 'Eligible' : 'Shortage'];
            rowData.forEach((val, i) => {
                worksheet.getCell(rowIndex, i + 1).value = val;
            });
            rowIndex++;
        });

        // Footer
        worksheet.getCell(rowIndex + 1, 1).value = 'Note: OD (On Duty) is treated as Present for all attendance calculations.';
        worksheet.getCell(rowIndex + 1, 1).font = { italic: true, color: { argb: 'FF666666' } };

        // Set column widths
        colWidths.forEach((w, i) => { worksheet.getColumn(i + 1).width = w; });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Attendance_${subjectId}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = {
    getAssignedSubjects, getSubjectMarks, updateMarks, getFacultyDashboardStats,
    getMyTimetable, getClassDetails, getClassStudents, getClassAttendance, exportClassAttendanceExcel
};
