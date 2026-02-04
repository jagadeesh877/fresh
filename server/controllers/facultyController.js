const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

// Get subjects assigned to the logged-in faculty
const getAssignedSubjects = async (req, res) => {
    const facultyId = req.user.id;
    try {
        const assignments = await prisma.facultyAssignment.findMany({
            where: { facultyId },
            include: {
                subject: true,
            }
        });

        const enhancedAssignments = await Promise.all(assignments.map(async (assignment) => {
            // Count students
            const studentCount = await prisma.student.count({
                where: {
                    department: assignment.subject.department,
                    semester: assignment.subject.semester,
                    section: assignment.section
                }
            });

            // Calculate Avg Marks
            const students = await prisma.student.findMany({
                where: {
                    department: assignment.subject.department,
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
                    subjectId: assignment.subject.id, // Optional: if timetable links to subject
                    // section: assignment.section // Ideally check section too, but let's keep simple
                }
            });

            return {
                ...assignment,
                studentCount,
                avgMarks,
                weeklyClasses: weeklyClasses || 2 // Default or actual
            };
        }));

        res.json(enhancedAssignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getClassDetails = async (req, res) => {
    const { subjectId } = req.params;
    const facultyId = req.user.id;
    try {
        const assignment = await prisma.facultyAssignment.findFirst({
            where: { subjectId: parseInt(subjectId), facultyId },
            include: { subject: true }
        });

        if (!assignment) return res.status(403).json({ message: 'Not authorized for this class' });

        const studentCount = await prisma.student.count({
            where: {
                department: assignment.subject.department,
                semester: assignment.subject.semester,
                section: assignment.section
            }
        });

        // --- Real-time Progress Logic ---

        // 1. Count completed classes (based on attendance records)
        // We count distinct date+period entries for this subject in StudentAttendance
        const attendanceRecords = await prisma.studentAttendance.groupBy({
            by: ['date', 'period'],
            where: {
                subjectId: parseInt(subjectId)
            }
        });
        const classesCompleted = attendanceRecords.length;

        // 2. Estimate Total Classes for Semester
        // Count weekly classes from Timetable
        const weeklyClasses = await prisma.timetable.count({
            where: {
                facultyId,
                subjectId: parseInt(subjectId)
            }
        });

        // Assume 15 weeks per semester as standard
        const totalWeeks = 15;
        const totalEstimatedClasses = (weeklyClasses * totalWeeks) || 45; // Default to 45 if no timetable

        // 3. Calculate Percentage
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
    const facultyId = req.user.id;
    try {
        const assignment = await prisma.facultyAssignment.findFirst({
            where: { subjectId: parseInt(subjectId), facultyId },
            include: { subject: true }
        });

        if (!assignment) return res.status(403).json({ message: 'Not authorized' });

        const students = await prisma.student.findMany({
            where: {
                department: assignment.subject.department,
                semester: assignment.subject.semester,
                section: assignment.section
            },
            include: {
                marks: { where: { subjectId: parseInt(subjectId) } },
                attendance: { where: { subjectId: parseInt(subjectId) } }
            },
            orderBy: { registerNumber: 'asc' }
        });

        const data = students.map(s => {
            const totalClasses = 40; // Mock total classes so far, or calculate from timetable * weeks
            const presentCount = s.attendance.filter(a => a.status === 'PRESENT' || a.status === 'OD').length;
            const percentage = Math.round((presentCount / totalClasses) * 100);

            const mark = s.marks[0];
            const ciaTotal = (mark?.cia1_test || 0) + (mark?.cia1_assignment || 0) + (mark?.cia1_attendance || 0); // Simplified total of latest CIA? Or sum of all?
            // Let's just return raw needed for table: CIA Total (maybe just Internal if available)

            return {
                id: s.id,
                registerNumber: s.registerNumber,
                name: s.name,
                attendancePercentage: percentage > 100 ? 100 : percentage, // Mock cap
                ciaTotal: mark?.internal || 0,
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

        // Group by Date
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

// Get students and their marks for a specific subject assignment
const getSubjectMarks = async (req, res) => {
    const { subjectId } = req.params;
    // const facultyId = req.user.id; // Could verify assignment here for extra security

    try {
        // finding students who match the department/year/semester of the subject? 
        // OR better: The admin assigns faculty to a Subject + Section.
        // We need to find students in that Section + Subject's Dept/Year/Sem.

        // 1. Get the assignment details to know the section
        // Note: Ideally we pass assignmentId, but subjectId is okay if unique per faculty/section (simplified)
        // Let's assume we fetch marks for all students in the subject's scope.

        // But wait, the schema links Marks to Student and Subject.
        // We need to fetch all students eligible for this subject.
        const subject = await prisma.subject.findUnique({ where: { id: parseInt(subjectId) } });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        // 1. Find the assignment for this faculty and subject to get the SECTION
        console.log(`[DEBUG] Fetching marks for Subject: ${subjectId}, Faculty: ${req.user.id}`);

        const assignment = await prisma.facultyAssignment.findFirst({
            where: {
                subjectId: parseInt(subjectId),
                facultyId: req.user.id
            }
        });

        if (!assignment) {
            console.log(`[DEBUG] No assignment found for Faculty ${req.user.id} on Subject ${subjectId}`);
            return res.status(403).json({ message: 'You are not assigned to this subject.' });
        }

        console.log(`[DEBUG] Found Assignment: Section ${assignment.section}`);

        // 2. Fetch students matching Department, Semester AND Section
        const students = await prisma.student.findMany({
            where: {
                department: subject.department,
                semester: subject.semester,
                section: assignment.section
            },
            include: {
                marks: {
                    where: { subjectId: parseInt(subjectId) }
                }
            }
        });

        console.log(`[DEBUG] Found ${students.length} students matching criteria: Dept ${subject.department}, Sem ${subject.semester}, Sec ${assignment.section}`);

        // Transform for easier frontend consumption
        const result = students.map(s => ({
            studentId: s.id,
            registerNumber: s.registerNumber,
            name: s.name,
            marks: s.marks[0] || {} // The single mark entry for this subject if exists
        }));

        res.json(result);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update Marks
const updateMarks = async (req, res) => {
    const { studentId, subjectId } = req.body;
    // req.body: { studentId, subjectId, cia1_test, ... }

    try {
        // 1. Fetch current marks and status
        const currentMark = await prisma.marks.findUnique({
            where: { studentId_subjectId: { studentId: parseInt(studentId), subjectId: parseInt(subjectId) } }
        });

        // 2. Granular Lock Check
        // We identify which "block" of exams the user is trying to update.
        // If they try to update any field belonging to CIA1, we check isLocked_cia1.

        const cia1Fields = ['cia1_test', 'cia1_assignment', 'cia1_attendance'];
        const cia2Fields = ['cia2_test', 'cia2_assignment', 'cia2_attendance'];
        const cia3Fields = ['cia3_test', 'cia3_assignment', 'cia3_attendance'];

        const updates = req.body;
        const keys = Object.keys(updates);

        const touchingCia1 = keys.some(k => cia1Fields.includes(k));
        const touchingCia2 = keys.some(k => cia2Fields.includes(k));
        const touchingCia3 = keys.some(k => cia3Fields.includes(k));

        if (currentMark) {
            if (touchingCia1 && currentMark.isLocked_cia1) {
                return res.status(403).json({ message: 'CIA 1 marks are locked.' });
            }
            if (touchingCia2 && currentMark.isLocked_cia2) {
                return res.status(403).json({ message: 'CIA 2 marks are locked.' });
            }
            if (touchingCia3 && currentMark.isLocked_cia3) {
                return res.status(403).json({ message: 'CIA 3 marks are locked.' });
            }
            // Fallback for global lock (legacy support)
            if (currentMark.isLocked && (touchingCia1 || touchingCia2 || touchingCia3)) {
                return res.status(403).json({ message: 'Marks are globally locked.' });
            }
        }

        // 3. Prepare update data
        const fieldsToUpdate = {};
        const allowedFields = [...cia1Fields, ...cia2Fields, ...cia3Fields];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                fieldsToUpdate[field] = req.body[field] === '' ? null : parseFloat(req.body[field]);
            }
        });

        // 4. Calculate Internal
        const merged = { ...currentMark, ...fieldsToUpdate };

        const calculateCIAlo = (test, assign, att) => {
            return (test || 0) + (assign || 0) + (att || 0);
        };

        const cia1Total = calculateCIAlo(merged.cia1_test, merged.cia1_assignment, merged.cia1_attendance);
        const cia2Total = calculateCIAlo(merged.cia2_test, merged.cia2_assignment, merged.cia2_attendance);
        const cia3Total = calculateCIAlo(merged.cia3_test, merged.cia3_assignment, merged.cia3_attendance);

        const totals = [cia1Total, cia2Total, cia3Total];
        totals.sort((a, b) => b - a);
        const internal = (totals[0] + totals[1]) / 2;

        fieldsToUpdate.internal = internal;

        // Reset approval status ONLY for the specific exam modified?
        // Or specific flags?
        // To allow re-approval flow, we should reset the specific approval flag.
        if (touchingCia1) { fieldsToUpdate.isApproved_cia1 = false; }
        if (touchingCia2) { fieldsToUpdate.isApproved_cia2 = false; }
        if (touchingCia3) { fieldsToUpdate.isApproved_cia3 = false; }

        const marks = await prisma.marks.upsert({
            where: {
                studentId_subjectId: {
                    studentId: parseInt(studentId),
                    subjectId: parseInt(subjectId)
                }
            },
            update: fieldsToUpdate,
            create: {
                studentId: parseInt(studentId),
                subjectId: parseInt(subjectId),
                // Initial state for new records
                isApproved_cia1: false,
                isApproved_cia2: false,
                isApproved_cia3: false,
                ...fieldsToUpdate
            }
        });

        res.json(marks);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getFacultyDashboardStats = async (req, res) => {
    try {
        const facultyId = req.user.id;
        console.log(`[FACULTY STATS] Faculty ID: ${facultyId}`);

        // Get assigned subjects
        const assignments = await prisma.facultyAssignment.findMany({
            where: { facultyId },
            include: { subject: true }
        });

        console.log(`[FACULTY STATS] Assignments found: ${assignments.length}`);
        const assignedSubjects = assignments.length;

        // Get total students across all assigned subjects
        let totalStudents = 0;
        const classPerformance = [];

        for (const assignment of assignments) {
            const students = await prisma.student.findMany({
                where: {
                    department: assignment.subject.department,
                    semester: assignment.subject.semester,
                    section: assignment.section
                },
                include: {
                    marks: {
                        where: { subjectId: assignment.subject.id }
                    }
                }
            });

            totalStudents += students.length;

            // Calculate average marks for this subject
            const marksData = students
                .map(s => s.marks[0]?.internal)
                .filter(m => m != null);

            const avgMarks = marksData.length > 0
                ? Math.round(marksData.reduce((a, b) => a + b, 0) / marksData.length)
                : 0;

            classPerformance.push({
                subject: assignment.subject.shortName || assignment.subject.name,
                average: avgMarks,
                students: students.length
            });
        }

        // Get classes this week from timetable
        const timetable = await prisma.timetable.findMany({
            where: { facultyId }
        });
        const classesThisWeek = timetable.length; // Simplified - count all periods

        // Calculate average performance across all subjects
        let allMarks = [];
        for (const assignment of assignments) {
            const marks = await prisma.marks.findMany({
                where: {
                    subjectId: assignment.subject.id,
                    internal: { not: null }
                },
                select: { internal: true }
            });
            allMarks = [...allMarks, ...marks.map(m => m.internal)];
        }

        const avgPerformance = allMarks.length > 0
            ? (allMarks.reduce((a, b) => a + b, 0) / allMarks.length).toFixed(1)
            : 0;

        // Marks submission status
        let totalMarksEntries = 0;
        let submittedMarksEntries = 0;

        for (const assignment of assignments) {
            const students = await prisma.student.count({
                where: {
                    department: assignment.subject.department,
                    semester: assignment.subject.semester,
                    section: assignment.section
                }
            });

            const marksCount = await prisma.marks.count({
                where: {
                    subjectId: assignment.subject.id,
                    internal: { not: null }
                }
            });

            totalMarksEntries += students;
            submittedMarksEntries += marksCount;
        }

        const submissionPercentage = totalMarksEntries > 0
            ? Math.round((submittedMarksEntries / totalMarksEntries) * 100)
            : 0;

        const marksSubmissionStatus = [
            { name: 'Submitted', value: submissionPercentage, color: '#10b981' },
            { name: 'Pending', value: 100 - submissionPercentage, color: '#f59e0b' }
        ];

        // Attendance trend (placeholder - will be real when attendance module is added)
        const attendanceTrend = [
            { week: 'Week 1', rate: 88 },
            { week: 'Week 2', rate: 92 },
            { week: 'Week 3', rate: 85 },
            { week: 'Week 4', rate: 90 },
            { week: 'Week 5', rate: 87 }
        ];

        const responseData = {
            assignedSubjects,
            totalStudents,
            classesThisWeek,
            avgPerformance,
            classPerformance,
            marksSubmissionStatus,
            attendanceTrend
        };
        console.log('[FACULTY STATS] Response:', JSON.stringify(responseData, null, 2));
        res.json(responseData);

    } catch (error) {
        console.error('Faculty dashboard stats error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getMyTimetable = async (req, res) => {
    try {
        const facultyId = parseInt(req.user.id);
        const { date } = req.query; // Expect YYYY-MM-DD

        console.log(`[DEBUG] getMyTimetable called. User: ${facultyId}, Date: ${date}`);

        // 1. Fetch Standard Timetable (Base)
        let timetable = await prisma.timetable.findMany({
            where: { facultyId: facultyId }
        });

        // If date is provided, we apply overrides for that day
        if (date) {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({ message: 'Invalid date format' });
            }
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const dayOfWeek = days[dateObj.getUTCDay()]; // Use getUTCDay for YYYY-MM-DD input

            // 2. Fetch all absences for this faculty on this day
            const myAbsences = await prisma.facultyAbsence.findMany({
                where: { facultyId, date }
            });

            const isFullDayAbsent = myAbsences.some(a => a.period === 0);

            // 3. Mark regular slots as Covered or Absent
            const mySubstitutedSlots = await prisma.substitution.findMany({
                where: {
                    date: date,
                    timetable: { facultyId: facultyId }
                },
                include: {
                    substituteFaculty: true
                }
            });

            timetable = timetable.map(t => {
                // Only act on slots for the current day of week
                if (t.day !== dayOfWeek) return t;

                const specificAbsence = myAbsences.find(a => a.period === t.period);
                const sub = mySubstitutedSlots.find(s => s.timetableId === t.id);

                if (isFullDayAbsent || specificAbsence) {
                    if (sub) {
                        return {
                            ...t,
                            isCovered: true,
                            coveredBy: sub.substituteFaculty.fullName
                        };
                    }
                    return { ...t, isCovered: true, coveredBy: 'Faculty Absent' };
                }
                return t;
            });

            // 4. Check Substitutions (Where I am the substitute)
            // I need to fetch substitutions for ME on this DATE
            const substitutions = await prisma.substitution.findMany({
                where: {
                    substituteFacultyId: facultyId,
                    date: date
                },
                include: {
                    timetable: true // Get the original slot details
                }
            });

            if (substitutions.length > 0) {
                console.log(`[DEBUG] Found ${substitutions.length} substitutions for faculty on ${date}`);

                // Map substitutions to "Timetable" like objects
                const subEntries = substitutions.map(sub => {
                    const original = sub.timetable;
                    return {
                        id: `sub-${sub.id}`, // Unique temp ID
                        department: original.department,
                        year: original.year,
                        semester: original.semester,
                        section: original.section,
                        day: dayOfWeek,
                        period: original.period,
                        type: original.type,
                        subjectName: original.subjectName,
                        facultyName: original.facultyName,
                        room: original.room,
                        isSubstitute: true,
                        originalFaculty: original.facultyName
                    };
                });

                timetable = [...timetable, ...subEntries];
            }
        }

        res.json(timetable);
    } catch (error) {
        console.error(`[ERROR] getMyTimetable failed:`, error);
        res.status(500).json({ message: error.message });
    }
}

// --- Excel Export for Class Attendance ---

const exportClassAttendanceExcel = async (req, res) => {
    const { subjectId } = req.params;
    const facultyId = req.user.id;

    try {
        // Verify faculty is assigned to this subject
        const assignment = await prisma.facultyAssignment.findFirst({
            where: { subjectId: parseInt(subjectId), facultyId },
            include: { subject: true }
        });

        if (!assignment) {
            return res.status(403).json({ message: 'Not authorized for this subject' });
        }

        // Fetch students with attendance
        const students = await prisma.student.findMany({
            where: {
                department: assignment.subject.department,
                semester: assignment.subject.semester,
                section: assignment.section
            },
            include: {
                attendance: {
                    where: { subjectId: parseInt(subjectId) }
                }
            },
            orderBy: { registerNumber: 'asc' }
        });

        // Prepare Excel data
        const excelData = students.map(s => {
            const total = s.attendance.length;
            const presentOnly = s.attendance.filter(a => a.status === 'PRESENT').length;
            const od = s.attendance.filter(a => a.status === 'OD').length;
            const effectivePresent = presentOnly + od;
            const absent = total - effectivePresent;
            const percentage = total > 0 ? ((effectivePresent / total) * 100).toFixed(2) : '0.00';
            const status = parseFloat(percentage) >= 75 ? 'Eligible' : 'Shortage';

            return {
                'Reg No': s.registerNumber,
                'Student Name': s.name,
                'Department': s.department,
                'Year': s.year,
                'Semester': s.semester,
                'Section': s.section,
                'Subject Code': assignment.subject.code,
                'Subject Name': assignment.subject.name,
                'Total Classes': total,
                'Present': presentOnly,
                'OD': od,
                'Absent': absent,
                'Effective Present': effectivePresent,
                'Attendance %': percentage,
                'Status': status
            };
        });

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        // Add columns
        worksheet.columns = [
            { header: 'Reg No', key: 'regNo', width: 15 },
            { header: 'Student Name', key: 'name', width: 25 },
            { header: 'Department', key: 'dept', width: 15 },
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Semester', key: 'sem', width: 10 },
            { header: 'Section', key: 'sec', width: 10 },
            { header: 'Subject Code', key: 'code', width: 15 },
            { header: 'Subject Name', key: 'subject', width: 30 },
            { header: 'Total Classes', key: 'total', width: 15 },
            { header: 'Present', key: 'present', width: 10 },
            { header: 'OD', key: 'od', width: 10 },
            { header: 'Absent', key: 'absent', width: 10 },
            { header: 'Effective Present', key: 'effective', width: 15 },
            { header: 'Attendance %', key: 'percentage', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        // Add rows
        excelData.forEach(data => {
            worksheet.addRow({
                regNo: data['Reg No'],
                name: data['Student Name'],
                dept: data['Department'],
                year: data['Year'],
                sem: data['Semester'],
                sec: data['Section'],
                code: data['Subject Code'],
                subject: data['Subject Name'],
                total: data['Total Classes'],
                present: data['Present'],
                od: data['OD'],
                absent: data['Absent'],
                effective: data['Effective Present'],
                percentage: data['Attendance %'],
                status: data['Status']
            });
        });

        // Add footer note
        if (excelData.length > 0) {
            worksheet.addRow([]);
            worksheet.addRow(['Note: OD (On Duty) is treated as Present for all attendance calculations.']);
        }

        // Set headers and send file
        const filename = `Attendance_${assignment.subject.code}_${assignment.section}_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export Excel Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAssignedSubjects,
    getSubjectMarks,
    updateMarks,
    getFacultyDashboardStats,
    getMyTimetable,
    getClassDetails,
    getClassStudents,
    getClassAttendance,
    exportClassAttendanceExcel
};
