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
        const subject = await prisma.subject.findUnique({ where: { id: subIdInt } });
        const category = subject?.subjectCategory || 'THEORY';

        // For INTEGRATED: build separate maps for THEORY and LAB components
        let extTheoryMap = {}, extLabMap = {};
        if (category === 'INTEGRATED') {
            const theoryMarks = externalMarks.filter(em => em.component === 'THEORY');
            const labMarks = externalMarks.filter(em => em.component === 'LAB');
            theoryMarks.forEach(em => { extTheoryMap[em.dummyNumber] = em; });
            labMarks.forEach(em => { extLabMap[em.dummyNumber] = em; });
        }

        const consolidated = students.map(student => {
            const ciaRecord = student.marks[0] || {};
            const dummyMapping = student.dummyMappings[0] || {};

            // For THEORY and INTEGRATED THEORY component: lookup by dummy number. For LAB: lookup by register number
            const lookupKey = (category === 'LAB')
                ? student.registerNumber
                : dummyMapping.dummyNumber;

            let externalProcessed = 0;
            const isAbsent = dummyMapping.isAbsent || false;

            // Internal conversion depends on category
            let internalProcessed = 0;
            if ((ciaRecord.internal !== undefined && ciaRecord.internal !== null) && ciaRecord.isApproved) {
                if (category === 'LAB') {
                    internalProcessed = ciaRecord.internal; // markService already stored /100*60
                } else if (category === 'INTEGRATED') {
                    // markService calculates theory25 + lab25 = 50
                    internalProcessed = ciaRecord.internal;
                } else {
                    // THEORY: internal is /100, convert to 40
                    internalProcessed = Math.round(ciaRecord.internal * 0.4);
                }
            }

            if (!isAbsent) {
                if (category === 'LAB') {
                    // LAB external: 40 is max
                    const extRecord = extMarksMap[lookupKey] || {};
                    externalProcessed = extRecord.rawExternal100 || 0;
                } else if (category === 'INTEGRATED') {
                    // Two components: THEORY (by dummyNumber) + LAB (by registerNumber)
                    const theoryExt = extTheoryMap[lookupKey] || {};
                    const labExt = extLabMap[student.registerNumber] || {};
                    const theoryConverted25 = theoryExt.rawExternal100 || 0;
                    const labConverted25 = labExt.rawExternal100 || 0;
                    externalProcessed = theoryConverted25 + labConverted25;
                } else {
                    // THEORY: 60 is max
                    const extRecord = extMarksMap[lookupKey] || {};
                    externalProcessed = extRecord.rawExternal100 || 0;
                }
            }

            const total100 = isAbsent ? 'AB' : Math.round(internalProcessed + externalProcessed);

            // Add CIA totals to help frontend show breakdown for integrated subjects
            const calculateSum = (t, a, att) => {
                const parseVal = (v) => (v === -1 || v === null || v === undefined ? 0 : parseFloat(v) || 0);
                return parseVal(t) + parseVal(a) + parseVal(att);
            };

            // For INTEGRATED, expose both external components separately and SCALED
            let theoryExt25 = null;
            let labExt25 = null;

            if (category === 'INTEGRATED') {
                const tRaw = (extTheoryMap[lookupKey] || extTheoryMap[student.registerNumber])?.rawExternal100 || 0;
                theoryExt25 = tRaw > 25 ? (tRaw / 100) * 25 : tRaw;

                const lRaw = (extLabMap[student.registerNumber] || extLabMap[lookupKey])?.rawExternal100 || 0;
                labExt25 = lRaw > 25 ? (lRaw / 100) * 25 : lRaw;
            }

            return {
                id: student.id,
                name: student.name,
                registerNumber: student.registerNumber,
                rollNo: student.rollNo,
                internal40: internalProcessed,
                external60: isAbsent ? 'AB' : externalProcessed,
                theoryExt25,   // INTEGRATED only (scaled /25)
                labExt25,      // INTEGRATED only (scaled /25)
                total100,
                dummyNumber: dummyMapping.dummyNumber || student.registerNumber,
                isLocked: ciaRecord.endSemMarks?.isLocked || false,
                isPublished: ciaRecord.endSemMarks?.isPublished || false,
                grade: ciaRecord.endSemMarks?.grade || 'N/A',
                resultStatus: ciaRecord.endSemMarks?.resultStatus || 'N/A',
                // Breakdown fields for Integrated internal
                cia1: calculateSum(ciaRecord.cia1_test, ciaRecord.cia1_assignment, ciaRecord.cia1_attendance),
                cia2: calculateSum(ciaRecord.cia2_test, ciaRecord.cia2_assignment, ciaRecord.cia2_attendance),
                cia3: calculateSum(ciaRecord.cia3_test, ciaRecord.cia3_assignment, ciaRecord.cia3_attendance),
                lab: (parseFloat(ciaRecord.lab_attendance) || 0) + (parseFloat(ciaRecord.lab_observation) || 0) + (parseFloat(ciaRecord.lab_record) || 0) + (parseFloat(ciaRecord.lab_model) || 0)
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

        const resultCount = await prisma.$transaction(async (tx) => {
            // 1. Fetch the subject to get its category
            const subject = await tx.subject.findUnique({ where: { id: subIdInt } });
            const subjectCategory = subject?.subjectCategory || 'THEORY';
            const isLabOnly = subjectCategory === 'LAB';

            // 2. Fetch students based on category:
            //    THEORY/INTEGRATED → must have dummyMapping (needed for absent flag & extRecord key)
            //    LAB → just need a marks record (no dummy mapping)
            const studentWhere = isLabOnly
                ? { marks: { some: { subjectId: subIdInt } } }
                : {
                    marks: { some: { subjectId: subIdInt } },
                    dummyMappings: { some: { subjectId: subIdInt } }
                };

            const students = await tx.student.findMany({
                where: studentWhere,
                include: {
                    marks: { where: { subjectId: subIdInt }, include: { endSemMarks: true } },
                    dummyMappings: { where: { subjectId: subIdInt } },
                    attendance: { where: { subjectId: subIdInt } }
                }
            });

            const externalMarks = await tx.externalMark.findMany({
                where: { subjectId: subIdInt, isApproved: true }
            });
            // For THEORY/LAB: key by dummyNumber. For INTEGRATED: build separate THEORY and LAB maps
            const extTheoryMap = {};
            const extLabMap = {};
            externalMarks.forEach(em => {
                if (em.component === 'LAB') {
                    // Lab components usually keyed by register number (which is stored in dummyNumber field for pure LAB subjects)
                    extLabMap[em.dummyNumber] = em;
                } else {
                    extTheoryMap[em.dummyNumber] = em;
                }
            });

            const grades = await tx.gradeSettings.findMany({ where: { regulation } });

            let count = 0;
            const skipped = [];

            for (const student of students) {
                const ciaRecord = student.marks[0];
                if (!ciaRecord) {
                    skipped.push({ studentId: student.id, name: student.name, reason: 'No CIA marks' });
                    continue;
                }

                // For THEORY/INTEGRATED: use dummyMapping for absent flag and extRecord key
                // For LAB: use registerNumber as extRecord key, no absent flag from mapping
                const dummyMapping = student.dummyMappings[0] || null;
                const isAbsent = isLabOnly ? false : (dummyMapping?.isAbsent || false);

                // Lookup key for external marks
                const extLookupKey = isLabOnly
                    ? student.registerNumber
                    : (dummyMapping?.dummyNumber || null);

                if (!isLabOnly && !dummyMapping) {
                    skipped.push({ studentId: student.id, name: student.name, reason: 'No dummy mapping' });
                    continue;
                }

                const extRecord = extLookupKey ? extTheoryMap[extLookupKey] : null;
                if (!isAbsent && !extRecord) continue;
                if (ciaRecord.endSemMarks?.isLocked || ciaRecord.endSemMarks?.isPublished) continue;

                // ── Mark calculation based on subject category ──────────────────
                let internalVal = 0;
                let externalVal = 0;
                let rawExternal = 0;
                let finalGrade = 'RA';
                let finalResultStatus = 'FAIL';

                if (isAbsent) {
                    finalGrade = 'AB';
                    finalResultStatus = 'FAIL';
                } else if (subjectCategory === 'LAB') {
                    // LAB: internal /60, external /40
                    internalVal = (ciaRecord.internal && ciaRecord.isApproved)
                        ? ciaRecord.internal
                        : 0;
                    // Check both maps in case component was labeled differently
                    const labRec = extLabMap[extLookupKey] || extTheoryMap[extLookupKey];
                    rawExternal = labRec?.rawExternal100 || 0;
                    externalVal = rawExternal;

                    const totalMarks = Math.round(internalVal + externalVal);
                    const isExternalPass = externalVal >= 16; // 40% of 40 (More standard for practical)

                    const matchedGrade = grades.find(g => totalMarks >= g.minPercentage && totalMarks <= g.maxPercentage)
                        || { grade: 'RA', resultStatus: 'FAIL' };

                    finalResultStatus = (matchedGrade.resultStatus === 'PASS' && isExternalPass) ? 'PASS' : 'FAIL';
                    finalGrade = finalResultStatus === 'PASS' ? matchedGrade.grade : 'RA';

                } else if (subjectCategory === 'INTEGRATED') {
                    // INTEGRATED: internal is 50, External: THEORY 25 + LAB 25 = 50
                    internalVal = (ciaRecord.internal && ciaRecord.isApproved) ? ciaRecord.internal : 0;

                    // Lookup Theory (Dummy or Reg) and Lab (Reg)
                    const theoryRec = extTheoryMap[extLookupKey] || extTheoryMap[student.registerNumber];
                    const labRec = extLabMap[student.registerNumber] || extLabMap[extLookupKey] || extTheoryMap[student.registerNumber];

                    // Scaling logic: If raw > 25, it's likely out of 100, so scale it.
                    let theoryRaw = theoryRec?.rawExternal100 || 0;
                    if (theoryRaw > 25) theoryRaw = (theoryRaw / 100) * 25;

                    let labRaw = labRec?.rawExternal100 || 0;
                    if (labRaw > 25 && labRec?.component === 'LAB') labRaw = (labRaw / 100) * 25;
                    else if (labRaw > 25) labRaw = (labRaw / 100) * 25;

                    const theoryExt25 = theoryRaw;
                    const labExt25 = labRaw;

                    externalVal = theoryExt25 + labExt25;
                    rawExternal = theoryExt25; // Base theory for legacy field

                    const totalMarks = Math.round(internalVal + externalVal); // max 100
                    const internalPass = internalVal >= 20;   // 40% of 50
                    const theoryExtPass = theoryExt25 >= 8.75; // 35% of 25 (Standard pass)
                    const labExtPass = labExt25 >= 12.5;      // 50% of 25 (Lab usually needs 50%)

                    const matchedGrade = grades.find(g => totalMarks >= g.minPercentage && totalMarks <= g.maxPercentage)
                        || { grade: 'RA', resultStatus: 'FAIL' };

                    // Pass only if all components and total meet criteria
                    finalResultStatus = (matchedGrade.resultStatus === 'PASS' && internalPass && theoryExtPass && labExtPass) ? 'PASS' : 'FAIL';
                    finalGrade = finalResultStatus === 'PASS' ? matchedGrade.grade : 'RA';

                } else {
                    // THEORY: internal 40, external 60
                    internalVal = (ciaRecord.internal && ciaRecord.isApproved) ? ciaRecord.internal * 0.4 : 0;
                    rawExternal = extTheoryMap[extLookupKey]?.rawExternal100 || 0;
                    externalVal = rawExternal;

                    const totalMarks = Math.round(internalVal + externalVal);
                    const isExternalPass = externalVal >= 21; // 35% of 60 (Standard University pass)

                    const matchedGrade = grades.find(g => totalMarks >= g.minPercentage && totalMarks <= g.maxPercentage)
                        || { grade: 'RA', resultStatus: 'FAIL' };

                    finalResultStatus = (matchedGrade.resultStatus === 'PASS' && isExternalPass) ? 'PASS' : 'FAIL';
                    finalGrade = finalResultStatus === 'PASS' ? matchedGrade.grade : 'RA';
                }

                const totalMarks = Math.round(
                    subjectCategory === 'THEORY'
                        ? (ciaRecord.isApproved ? ciaRecord.internal * 0.4 : 0) + externalVal
                        : internalVal + externalVal
                );

                // ── Attendance Snapshot ─────────────────────────────────────────
                const totalClasses = student.attendance.length;
                const presentCount = student.attendance.filter(a => a.status === 'PRESENT' || a.status === 'OD').length;
                const attPercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

                await tx.endSemMarks.upsert({
                    where: { marksId: ciaRecord.id },
                    update: {
                        externalMarks: isAbsent ? 0 : rawExternal,
                        totalMarks,
                        grade: finalGrade,
                        resultStatus: finalResultStatus,
                        attendanceSnapshot: attPercentage
                    },
                    create: {
                        marksId: ciaRecord.id,
                        externalMarks: isAbsent ? 0 : rawExternal,
                        totalMarks,
                        grade: finalGrade,
                        resultStatus: finalResultStatus,
                        attendanceSnapshot: attPercentage
                    }
                });

                // ── Arrear Propagation & Automatic Generation ──────────────────
                const arrear = await tx.arrear.findUnique({
                    where: { studentId_subjectId: { studentId: student.id, subjectId: subIdInt } }
                });

                if (arrear) {
                    if (!arrear.isCleared) {
                        await tx.arrearAttempt.updateMany({
                            where: { arrearId: arrear.id, resultStatus: null },
                            data: {
                                externalMarks: rawExternal,
                                totalMarks,
                                grade: finalGrade,
                                resultStatus: finalResultStatus,
                                semester: student.semester
                            }
                        });

                        if (finalResultStatus === 'PASS') {
                            if (arrear.semester === student.semester) {
                                // If they were previously marked as FAIL in this same regular session, but now PASS (correction)
                                // We remove the arrear record as it never truly became one.
                                await tx.arrearAttempt.deleteMany({ where: { arrearId: arrear.id } });
                                await tx.arrear.delete({ where: { id: arrear.id } });
                            } else {
                                // Official arrear clearing
                                await tx.arrear.update({
                                    where: { id: arrear.id },
                                    data: { isCleared: true, clearedInSem: student.semester }
                                });
                            }
                        }
                    }
                } else if (finalResultStatus === 'FAIL') {
                    // First time fail - Auto-generate arrear record for future tracking
                    await tx.arrear.create({
                        data: {
                            studentId: student.id,
                            subjectId: subIdInt,
                            semester: student.semester,
                            attemptCount: 0,
                            isCleared: false
                        }
                    });
                }

                count++;
            }
            return { count, skipped };
        });

        res.json({
            message: "Consolidated marks updated and grades calculated",
            count: resultCount.count,
            skippedCount: resultCount.skipped.length,
            skipped: resultCount.skipped
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// --- GPA/CGPA Engine ---


// Helper for internal calculation
const _performGPACalculation = async (studentId, semester, grades) => {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return null;

    const marks = await prisma.marks.findMany({
        where: { studentId: studentId },
        include: { subject: true, endSemMarks: true }
    });

    // Filter marks for current semester
    const currentSemMarks = marks.filter(m => m.subject.semester === parseInt(semester));

    let totalPoints = 0;
    let totalCredits = 0;
    let earnedCredits = 0;
    let semesterPass = true;

    for (const m of currentSemMarks) {
        const credits = m.subject.credits || 0;
        if (!m.endSemMarks || m.endSemMarks.resultStatus !== 'PASS') {
            semesterPass = false;
            // Only count credits if they actually attempted it (have some mark record or dummy mapping)
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

    const clearedArrears = await prisma.arrear.findMany({
        where: { studentId: studentId, isCleared: true },
        include: { subject: true }
    });

    for (const m of marks) {
        if (m.subject.semester <= parseInt(semester)) {
            const isClearedArrear = clearedArrears.some(ar => ar.subjectId === m.subjectId);
            const credits = m.subject.credits || 0;

            if (m.endSemMarks && m.endSemMarks.resultStatus === 'PASS') {
                const gradeInfo = grades.find(g => g.grade === m.endSemMarks.grade);
                cumulativePoints += (gradeInfo ? gradeInfo.gradePoint : 0) * credits;
                cumulativeCredits += credits;
            } else if (isClearedArrear) {
                cumulativeCredits += credits;
            }
        }
    }

    for (const ar of clearedArrears) {
        const attempt = await prisma.arrearAttempt.findFirst({
            where: { arrearId: ar.id, resultStatus: 'PASS' },
            orderBy: { id: 'desc' }
        });
        if (attempt) {
            const gradeInfo = grades.find(g => g.grade === attempt.grade);
            cumulativePoints += (gradeInfo ? gradeInfo.gradePoint : 0) * (ar.subject.credits || 0);
        }
    }

    const cgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits) : 0;

    return {
        gpa, cgpa, totalCredits, earnedCredits,
        resultStatus: semesterPass ? "PASS" : "FAIL"
    };
};

exports.calculateGPA = async (req, res) => {
    try {
        const { studentId, semester } = req.body;
        const student = await prisma.student.findUnique({ where: { id: parseInt(studentId) } });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const regulation = student.regulation || '2021';
        const grades = await prisma.gradeSettings.findMany({ where: { regulation } });

        const result = await _performGPACalculation(parseInt(studentId), parseInt(semester), grades);
        if (!result) return res.status(404).json({ message: "Calculation failed" });

        await prisma.semesterResult.upsert({
            where: {
                studentId_semester: {
                    studentId: parseInt(studentId),
                    semester: parseInt(semester)
                }
            },
            update: result,
            create: {
                studentId: parseInt(studentId),
                semester: parseInt(semester),
                ...result
            }
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.calculateBulkGPA = async (req, res) => {
    try {
        const { department, semester, regulation = '2021' } = req.body;
        const semInt = parseInt(semester);
        const deptFilter = await getDeptCriteria(department);

        const students = await prisma.student.findMany({
            where: { ...deptFilter, semester: semInt, status: 'ACTIVE' }
        });

        const grades = await prisma.gradeSettings.findMany({ where: { regulation } });

        let processed = 0;
        for (const student of students) {
            const result = await _performGPACalculation(student.id, semInt, grades);
            if (result) {
                await prisma.semesterResult.upsert({
                    where: { studentId_semester: { studentId: student.id, semester: semInt } },
                    update: result,
                    create: { studentId: student.id, semester: semInt, ...result }
                });
                processed++;
            }
        }

        res.json({ message: `Successfully calculated GPAs for ${processed} students.` });
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

const getConsolidatedResultsData = async (department, semester, regulation) => {
    const semInt = parseInt(semester);
    const deptFilter = await getDeptCriteria(department);

    const subjects = await prisma.subject.findMany({
        where: {
            semester: semInt,
            OR: [
                deptFilter,
                { type: 'COMMON' }
            ]
        },
        orderBy: { code: 'asc' }
    });

    const students = await prisma.student.findMany({
        where: {
            ...deptFilter,
            semester: semInt,
            status: 'ACTIVE'
        },
        include: {
            marks: {
                include: {
                    endSemMarks: true,
                    subject: true
                }
            },
            results: {
                where: { semester: semInt }
            },
            dummyMappings: true
        },
        orderBy: { rollNo: 'asc' }
    });

    // Fetch all external marks for these subjects to get the breakdown
    const externalMarks = await prisma.externalMark.findMany({
        where: {
            subjectId: { in: subjects.map(s => s.id) },
            isApproved: true
        }
    });

    const extMap = {};
    externalMarks.forEach(em => {
        if (!extMap[em.subjectId]) extMap[em.subjectId] = {};
        extMap[em.subjectId][em.dummyNumber] = em;
    });

    const studentData = students.map((student, index) => {
        const studentMarks = {};
        subjects.forEach(sub => {
            const markRecord = student.marks.find(m => m.subjectId === sub.id);
            const dummyMapping = student.dummyMappings.find(dm => dm.subjectId === sub.id);
            const dummyNo = dummyMapping?.dummyNumber;

            // Scaled component lookups
            let theoryExt = null;
            let labExt = null;

            if (sub.subjectCategory === 'INTEGRATED') {
                // For Integrated, Theory is usually keyed by dummyNo, Lab by registerNumber
                const tRec = extMap[sub.id]?.[dummyNo] || extMap[sub.id]?.[student.registerNumber];
                const lRec = extMap[sub.id]?.[student.registerNumber] || extMap[sub.id]?.[dummyNo];

                if (tRec && tRec.component !== 'LAB') {
                    theoryExt = tRec.rawExternal100 > 25 ? (tRec.rawExternal100 / 100) * 25 : tRec.rawExternal100;
                }
                if (lRec && (lRec.component === 'LAB' || lRec !== tRec)) {
                    labExt = lRec.rawExternal100 > 25 ? (lRec.rawExternal100 / 100) * 25 : lRec.rawExternal100;
                }
            } else if (sub.subjectCategory === 'LAB') {
                const lRec = extMap[sub.id]?.[student.registerNumber] || extMap[sub.id]?.[dummyNo];
                labExt = lRec ? (lRec.rawExternal100 > 25 ? (lRec.rawExternal100 / 100) * 40 : lRec.rawExternal100) : null;
            } else {
                const tRec = extMap[sub.id]?.[dummyNo] || extMap[sub.id]?.[student.registerNumber];
                theoryExt = tRec ? (tRec.rawExternal100 > 25 ? (tRec.rawExternal100 / 100) * 60 : tRec.rawExternal100) : null;
            }

            studentMarks[sub.code] = {
                internal: markRecord?.internal || 0,
                external: markRecord?.endSemMarks?.externalMarks || 0,
                theoryExt: theoryExt,
                labExt: labExt,
                total: markRecord?.endSemMarks?.totalMarks || 0,
                grade: markRecord?.endSemMarks?.grade || '-',
                status: markRecord?.endSemMarks?.resultStatus || '-'
            };
        });

        return {
            sno: index + 1,
            name: student.name,
            registerNumber: student.registerNumber,
            rollNo: student.rollNo,
            marks: studentMarks,
            gpa: student.results[0] ? student.results[0].gpa : null,
            cgpa: student.results[0] ? student.results[0].cgpa : null,
            earnedCredits: student.results[0] ? student.results[0].earnedCredits : null,
            resultStatus: student.results[0] ? student.results[0].resultStatus : 'PENDING'
        };
    });

    return {
        department,
        semester: semInt,
        regulation,
        subjects: subjects.map(s => ({
            code: s.code,
            name: s.name,
            credits: s.credits,
            subjectCategory: s.subjectCategory
        })),
        students: studentData
    };
};

exports.getConsolidatedResults = async (req, res) => {
    try {
        const { department, semester, regulation = '2021' } = req.query;
        if (!department || !semester) return res.status(400).json({ message: "Params missing" });
        const data = await getConsolidatedResultsData(department, semester, regulation);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.exportResultsPortrait = async (req, res) => {
    try {
        const { department, semester, regulation = '2021' } = req.query;
        const data = await getConsolidatedResultsData(department, semester, regulation);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=results_portrait_${department}_sem${semester}.pdf`);
        pdfService.generateProvisionalResultsPortrait(res, data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.exportResultsLandscape = async (req, res) => {
    try {
        const { department, semester, regulation = '2021' } = req.query;
        const data = await getConsolidatedResultsData(department, semester, regulation);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=results_landscape_A3_${department}_sem${semester}.pdf`);
        pdfService.generateConsolidatedTabulationSheet(res, data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
