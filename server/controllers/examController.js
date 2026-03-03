const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const pdfService = require('../services/pdfService');
const { getDeptCriteria } = require('../utils/deptUtils');

// --- End Semester Mark Entry ---

exports.getEndSemMarks = async (req, res) => {
    try {
        const { department, year, semester, section, subjectId, page = 1, limit = 50 } = req.query;
        const subIdInt = parseInt(subjectId);
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // 1. Fetch students for the criteria
        // We include regular students in the current semester AND any students who have dummy mappings for this subject (Arrears)
        const deptFilter = await getDeptCriteria(department);
        const students = await prisma.student.findMany({
            where: {
                OR: [
                    {
                        ...deptFilter,
                        year: parseInt(year),
                        semester: parseInt(semester),
                        section
                    },
                    {
                        dummyMappings: {
                            some: { subjectId: subIdInt }
                        }
                    }
                ]
            },
            include: {
                marks: {
                    where: { subjectId: subIdInt },
                    include: { endSemMarks: true }
                },
                dummyMappings: {
                    where: { subjectId: subIdInt }
                }
            }
        });

        // 2. Fetch external marks for this subject
        const externalMarks = await prisma.externalMark.findMany({
            where: { subjectId: subIdInt, isApproved: true }
        });

        const extMarksMap = {};
        externalMarks.forEach(em => {
            extMarksMap[em.dummyNumber] = em;
        });

        // 3. Consolidate data
        const consolidated = students.map(student => {
            const ciaRecord = student.marks[0] || {};
            const dummyMapping = student.dummyMappings[0] || {};
            const extRecord = extMarksMap[dummyMapping.dummyNumber] || {};

            // Internal conversion (40%)
            // Requirement: Only use internal marks IF they are approved by Admin
            const internal40 = (ciaRecord.internal && ciaRecord.isApproved)
                ? Math.round(ciaRecord.internal * 0.4)
                : 0;

            const isAbsent = dummyMapping.isAbsent || false;
            const external60 = isAbsent ? 'AB' : (extRecord.convertedExternal60 ? Math.round(extRecord.convertedExternal60) : 0);
            const total100 = isAbsent ? 'AB' : (internal40 + (typeof external60 === 'number' ? external60 : 0));

            return {
                id: student.id,
                name: student.name,
                registerNumber: student.registerNumber,
                rollNo: student.rollNo,
                internal40,
                external60,
                total100,
                dummyNumber: dummyMapping.dummyNumber,
                isLocked: ciaRecord.endSemMarks?.isLocked || false,
                isPublished: ciaRecord.endSemMarks?.isPublished || false,
                grade: ciaRecord.endSemMarks?.grade || 'N/A',
                resultStatus: ciaRecord.endSemMarks?.resultStatus || 'N/A'
            };
        });

        res.json(consolidated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateEndSemMarks = async (req, res) => {
    try {
        const { subjectId, semester, regulation = '2021' } = req.body;
        const subIdInt = parseInt(subjectId);

        // Run in transaction for atomicity
        const resultCount = await prisma.$transaction(async (tx) => {
            // 1. Fetch all data for this subject context
            const students = await tx.student.findMany({
                where: {
                    marks: { some: { subjectId: subIdInt } },
                    dummyMappings: { some: { subjectId: subIdInt } }
                },
                include: {
                    marks: { where: { subjectId: subIdInt }, include: { endSemMarks: true } },
                    dummyMappings: { where: { subjectId: subIdInt } },
                    attendance: { where: { subjectId: subIdInt } }
                }
            });

            const externalMarks = await tx.externalMark.findMany({
                where: { subjectId: subIdInt, isApproved: true }
            });

            const extMarksMap = {};
            externalMarks.forEach(em => {
                extMarksMap[em.dummyNumber] = em;
            });

            const grades = await tx.gradeSettings.findMany({ where: { regulation } });

            let count = 0;
            const skipped = [];
            for (const student of students) {
                const ciaRecord = student.marks[0];
                const dummyMapping = student.dummyMappings[0];
                if (!ciaRecord || !dummyMapping) {
                    skipped.push({ studentId: student.id, name: student.name, reason: !ciaRecord ? 'No CIA marks' : 'No dummy mapping' });
                    continue;
                }

                const extRecord = extMarksMap[dummyMapping.dummyNumber];

                // If they are not absent, but no external mark is found (meaning it's not approved or not entered yet), skip them
                if (!dummyMapping.isAbsent && !extRecord) continue;

                // 🧱 IDEMPOTENCY & LOCK CHECK
                if (ciaRecord.endSemMarks?.isLocked || ciaRecord.endSemMarks?.isPublished) {
                    continue; // Skip locked/published results
                }

                // 🧱 ROUNDING BIAS FIX & ABSENTEE LOGIC
                const internalVal = (ciaRecord.internal && ciaRecord.isApproved) ? ciaRecord.internal * 0.4 : 0;
                let externalVal = 0;
                let rawExternal100 = 0;
                let finalResultStatus = 'FAIL';
                let finalGrade = 'RA';

                if (dummyMapping.isAbsent) {
                    externalVal = 0;
                    rawExternal100 = 0;
                    finalResultStatus = 'FAIL';
                    finalGrade = 'AB'; // Special absentee grade
                } else if (extRecord) {
                    externalVal = extRecord.convertedExternal60 || 0;
                    rawExternal100 = extRecord.rawExternal100 || 0;

                    const totalMarks = Math.round(internalVal + externalVal);
                    const isExternalPass = rawExternal100 >= 50;

                    const matchedGrade = grades.find(g => totalMarks >= g.minPercentage && totalMarks <= g.maxPercentage)
                        || { grade: 'RA', resultStatus: 'FAIL' };

                    finalResultStatus = (matchedGrade.resultStatus === 'PASS' && isExternalPass) ? 'PASS' : 'FAIL';
                    finalGrade = finalResultStatus === 'PASS' ? matchedGrade.grade : 'RA';
                }

                const totalMarks = Math.round(internalVal + externalVal);

                // 🧱 ATTENDANCE SNAPSHOT
                // Calculate current attendance percentage
                const totalClasses = student.attendance.length;
                const presentCount = student.attendance.filter(a => a.status === 'PRESENT' || a.status === 'OD').length;
                const attPercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

                await tx.endSemMarks.upsert({
                    where: { marksId: ciaRecord.id },
                    update: {
                        externalMarks: dummyMapping.isAbsent ? 0 : (extRecord?.rawExternal100 || 0),
                        totalMarks,
                        grade: finalGrade,
                        resultStatus: finalResultStatus,
                        attendanceSnapshot: attPercentage
                    },
                    create: {
                        marksId: ciaRecord.id,
                        externalMarks: dummyMapping.isAbsent ? 0 : (extRecord?.rawExternal100 || 0),
                        totalMarks,
                        grade: finalGrade,
                        resultStatus: finalResultStatus,
                        attendanceSnapshot: attPercentage
                    }
                });

                // 🧱 ARREAR PROPAGATION (CRITICAL)
                // Check if this student has an active Arrear record for this subject
                const arrear = await tx.arrear.findUnique({
                    where: { studentId_subjectId: { studentId: student.id, subjectId: subIdInt } }
                });

                if (arrear && !arrear.isCleared) {
                    // Update the active attempt (the one with resultStatus: null)
                    await tx.arrearAttempt.updateMany({
                        where: {
                            arrearId: arrear.id,
                            resultStatus: null
                        },
                        data: {
                            externalMarks: extRecord.rawExternal100,
                            totalMarks,
                            grade: finalGrade,
                            resultStatus: finalResultStatus,
                            semester: student.semester // record the sem they attempted in
                        }
                    });

                    // If they passed, clear the parent Arrear record
                    if (finalResultStatus === 'PASS') {
                        await tx.arrear.update({
                            where: { id: arrear.id },
                            data: {
                                isCleared: true,
                                clearedInSem: student.semester
                            }
                        });
                    }
                }

                count++;
            }
            return { count, skipped };
        });

        res.json({
            message: "Consolidated marks updated and grades calculated",
            count: resultCount.count,
            skippedCount: resultCount.skipped.length,
            skipped: resultCount.skipped  // Admin can see which students were skipped
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// --- GPA/CGPA Engine ---

exports.calculateGPA = async (req, res) => {
    try {
        const { studentId, semester } = req.body;
        const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const regulation = student.regulation || '2021';
        const grades = await prisma.gradeSettings.findMany({ where: { regulation } });
        const marks = await prisma.marks.findMany({
            where: { studentId: parseInt(studentId) },
            include: { subject: true, endSemMarks: true }
        });

        // Filter marks for current semester
        const currentSemMarks = marks.filter(m => m.subject.semester === parseInt(semester));

        let totalPoints = 0;
        let totalCredits = 0;
        let earnedCredits = 0;
        let semesterPass = true;

        for (const m of currentSemMarks) {
            const credits = m.subject.credits || 3;
            if (!m.endSemMarks || m.endSemMarks.resultStatus === 'FAIL') {
                semesterPass = false;
                totalCredits += credits;
                continue;
            }

            const gradeInfo = grades.find(g => g.grade === m.endSemMarks.grade);
            const gp = gradeInfo ? gradeInfo.gradePoint : 0;

            totalPoints += gp * credits;
            totalCredits += credits;
            earnedCredits += credits;
        }

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;

        // CGPA calculation (all past semesters + cleared arrears)
        let cumulativePoints = 0;
        let cumulativeCredits = 0;

        // Fetch all cleared arrears for this student
        const clearedArrears = await prisma.arrear.findMany({
            where: { studentId: parseInt(studentId), isCleared: true },
            include: { subject: true }
        });

        // 1. Process standard marks (Regular attempts in current/past semesters)
        for (const m of marks) {
            if (m.subject.semester <= parseInt(semester)) {
                const isClearedArrear = clearedArrears.some(ar => ar.subjectId === m.subjectId);
                const credits = m.subject.credits || 3;

                if (m.endSemMarks && m.endSemMarks.resultStatus === 'PASS') {
                    // Regular pass — add points and credits
                    const gradeInfo = grades.find(g => g.grade === m.endSemMarks.grade);
                    cumulativePoints += (gradeInfo ? gradeInfo.gradePoint : 0) * credits;
                    cumulativeCredits += credits;
                } else if (isClearedArrear) {
                    // This subject was failed initially but cleared in an arrear attempt.
                    // ONLY add credits to denominator here (points will be added in the arrear block).
                    // Do NOT add again in the arrear block.
                    cumulativeCredits += credits;
                }
                // If it's still a fail (not cleared) — do not count credits or points
            }
        }

        // 2. Process Arrear Points (Points earned in recovery)
        for (const ar of clearedArrears) {
            // Find the successful attempt
            const attempt = await prisma.arrearAttempt.findFirst({
                where: { arrearId: ar.id, resultStatus: 'PASS' },
                orderBy: { id: 'desc' }
            });

            if (attempt) {
                const gradeInfo = grades.find(g => g.grade === attempt.grade);
                // Add ONLY the grade points. Credits were already counted in the standard marks loop above.
                cumulativePoints += (gradeInfo ? gradeInfo.gradePoint : 0) * (ar.subject.credits || 3);
                // NOTE: Do NOT increment cumulativeCredits here — already counted above to avoid double-counting.
            }
        }

        const cgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits) : 0;

        await prisma.semesterResult.upsert({
            where: {
                studentId_semester: {
                    studentId: parseInt(studentId),
                    semester: parseInt(semester)
                }
            },
            update: {
                gpa,
                cgpa,
                totalCredits,
                earnedCredits,
                resultStatus: semesterPass ? "PASS" : "FAIL"
            },
            create: {
                studentId: parseInt(studentId),
                semester: parseInt(semester),
                gpa,
                cgpa,
                totalCredits,
                earnedCredits,
                resultStatus: semesterPass ? "PASS" : "FAIL"
            }
        });

        res.json({ gpa, cgpa, resultStatus: semesterPass ? "PASS" : "FAIL" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Faculty Result View (Read-Only) ---

exports.getFacultyResults = async (req, res) => {
    try {
        const { department, year, semester, section, subjectId } = req.query;

        // 1. Check if Results are Published
        const deptFilter = await getDeptCriteria(department);
        const control = await prisma.semesterControl.findFirst({
            where: {
                ...deptFilter,
                year: parseInt(year),
                semester: parseInt(semester),
                section
            }
        });

        if (!control || !control.isPublished) {
            return res.status(403).json({ message: "Results for this semester have not been published yet." });
        }

        // 2. Fetch marks (Read-only)
        const students = await prisma.student.findMany({
            where: {
                ...deptFilter,
                year: parseInt(year),
                semester: parseInt(semester),
                section
            },
            include: {
                marks: {
                    where: { subjectId: parseInt(subjectId) },
                    include: { endSemMarks: true }
                },
                results: {
                    where: { semester: parseInt(semester) }
                }
            }
        });

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Semester Control ---

exports.toggleSemesterControl = async (req, res) => {
    try {
        const { department, year, semester, section, field, value } = req.body;

        const updateData = {};
        updateData[field] = value;

        // Find official department definition to ensure unique key consistency
        const deptDef = await prisma.department.findFirst({
            where: { OR: [{ name: department }, { code: department }] }
        });
        const officialDept = deptDef ? deptDef.name : department;

        const control = await prisma.semesterControl.upsert({
            where: {
                department_year_semester_section: {
                    department: officialDept,
                    year: parseInt(year),
                    semester: parseInt(semester),
                    section
                }
            },
            update: updateData,
            create: {
                department: officialDept,
                year: parseInt(year),
                semester: parseInt(semester),
                section,
                ...updateData
            }
        });

        // 🧱 FIX ATTENDANCE SNAPSHOT ISSUE (CRITICAL)
        if (field === 'isPublished' && value === true) {
            const deptFilter = await getDeptCriteria(officialDept);
            const students = await prisma.student.findMany({
                where: {
                    ...deptFilter,
                    year: parseInt(year),
                    semester: parseInt(semester),
                    section
                },
                include: {
                    attendance: true,
                    marks: { include: { endSemMarks: true } }
                }
            });

            for (const student of students) {
                for (const mark of student.marks) {
                    if (mark.endSemMarks) {
                        // Per-subject attendance snapshot
                        const subAttendance = student.attendance.filter(a => a.subjectId === mark.subjectId);
                        const total = subAttendance.length;
                        const present = subAttendance.filter(a => a.status === 'PRESENT' || a.status === 'OD').length;
                        const percentage = total > 0 ? (present / total) * 100 : 0;

                        await prisma.endSemMarks.update({
                            where: { id: mark.endSemMarks.id },
                            data: {
                                attendanceSnapshot: percentage,
                                isPublished: true
                            }
                        });
                    }
                }
            }
        }

        res.json(control);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSemesterControl = async (req, res) => {
    try {
        const { department, year, semester, section } = req.query;
        const deptFilter = await getDeptCriteria(department);

        const control = await prisma.semesterControl.findFirst({
            where: {
                ...deptFilter,
                year: parseInt(year),
                semester: parseInt(semester),
                section
            }
        });

        // If no control record exists, return default status
        res.json(control || {
            markEntryOpen: false,
            isPublished: false,
            isLocked: false
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getGradeSheet = async (req, res) => {
    try {
        const { studentId, semester } = req.query;

        const student = await prisma.student.findUnique({
            where: { id: parseInt(studentId) },
            include: {
                marks: {
                    include: {
                        subject: true,
                        endSemMarks: true
                    }
                },
                results: {
                    where: { semester: parseInt(semester) }
                }
            }
        });

        if (!student) return res.status(404).send('Student not found');

        const result = student.results[0] || { gpa: 0, resultStatus: 'N/A' };

        const pdfData = {
            studentName: student.name,
            registerNumber: student.registerNumber,
            department: student.department,
            semester,
            gpa: result.gpa,
            resultStatus: result.resultStatus,
            marks: student.marks.map(m => ({
                subjectCode: m.subject.code,
                subjectName: m.subject.name,
                credits: m.subject.credits,
                grade: m.endSemMarks?.grade || 'N/A',
                status: m.endSemMarks?.resultStatus || 'PENDING'
            }))
        };

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=grade_sheet_${studentId}.pdf`);

        pdfService.generateGradeSheet(res, pdfData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
