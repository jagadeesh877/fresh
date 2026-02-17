const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');

// Helper to calculate seating distribution
const calculateSeating = (students, halls) => {
    console.log(`[Algorithm] Generating seating for ${students.length} students in ${halls.length} halls.`);
    // 1. Group students by subject for alternation
    const subjectPoolsMap = {};
    students.forEach(s => {
        if (!subjectPoolsMap[s.currentSubjectId]) subjectPoolsMap[s.currentSubjectId] = [];
        subjectPoolsMap[s.currentSubjectId].push(s);
    });

    // Convert to an array of pools and sort by subject ID for consistency
    const pools = Object.keys(subjectPoolsMap)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(id => subjectPoolsMap[id]);

    let currentPoolIdx = 0;
    const allocations = [];

    // Sort halls by name/id to ensure consistency
    const sortedHalls = [...halls].sort((a, b) => a.id - b.id);

    for (const hall of sortedHalls) {
        let isSessionDone = false;
        for (let c = 1; c <= hall.benchesPerRow; c++) {
            if (isSessionDone) break;
            for (let r = 1; r <= hall.totalRows; r++) {

                // 2. Find a student from the next active subject pool (Alternation Logic)
                let studentFound = null;
                let checkedPools = 0;

                while (checkedPools < pools.length) {
                    if (pools[currentPoolIdx].length > 0) {
                        studentFound = pools[currentPoolIdx].shift();
                        // Advance index for next seat
                        currentPoolIdx = (currentPoolIdx + 1) % pools.length;
                        break;
                    }
                    // Skip empty pool
                    currentPoolIdx = (currentPoolIdx + 1) % pools.length;
                    checkedPools++;
                }

                if (!studentFound) {
                    isSessionDone = true;
                    break;
                }

                allocations.push({
                    hallId: hall.id,
                    studentId: studentFound.id,
                    subjectId: studentFound.currentSubjectId,
                    department: studentFound.department,
                    year: studentFound.year,
                    seatNumber: `${String.fromCharCode(64 + c)}${r}`, // e.g., A1, B1
                    rowNumber: r,
                    columnNumber: c
                });
                console.log(`[Algorithm] Assigned ${studentFound.rollNo} to ${hall.hallName} - ${String.fromCharCode(64 + c)}${r}`);
            }
        }
    }

    return { allocations, remaining: pools.flat() };
};

exports.getSessions = async (req, res) => {
    try {
        const sessions = await prisma.examSession.findMany({
            include: {
                subjects: { include: { subject: true } },
                _count: { select: { allocations: true } }
            },
            orderBy: { examDate: 'desc' }
        });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createSession = async (req, res) => {
    try {
        const { examName, examDate, session, subjectIds } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const newSession = await tx.examSession.create({
                data: {
                    examName,
                    examDate: new Date(examDate),
                    session,
                    createdBy: req.user.id
                }
            });

            if (subjectIds && subjectIds.length > 0) {
                await tx.examSessionSubjects.createMany({
                    data: subjectIds.map(id => ({
                        examSessionId: newSession.id,
                        subjectId: parseInt(id)
                    }))
                });
            }

            return newSession;
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getHalls = async (req, res) => {
    try {
        const halls = await prisma.hall.findMany({
            where: { isActive: true },
            orderBy: { hallName: 'asc' }
        });
        res.json(halls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addHall = async (req, res) => {
    try {
        const { hallName, blockName, totalRows, benchesPerRow } = req.body;
        const hall = await prisma.hall.create({
            data: {
                hallName,
                blockName,
                totalRows: parseInt(totalRows),
                benchesPerRow: parseInt(benchesPerRow),
                capacity: parseInt(totalRows) * parseInt(benchesPerRow)
            }
        });
        res.json(hall);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteHall = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.hall.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Hall deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.generateAllocations = async (req, res) => {
    console.log("[API] Generate Allocations called - VER: V4V");
    try {
        const { sessionId, hallIds } = req.body;

        const session = await prisma.examSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: { subjects: true }
        });

        if (!session) return res.status(404).json({ message: "Session not found" });
        if (session.isLocked) return res.status(403).json({ message: "Session is locked. Unlock to regenerate." });

        // 1. Fetch all students registered for these subjects
        const subjectIds = session.subjects.map(s => s.subjectId);

        // This is tricky: we need students taking these subjects. 
        // We'll use the StudentAttendance or Marks table as a proxy for registration if no direct registration table exists,
        // but in this ERP, students are tied to departments/semesters. 
        // We filter students where student.semester matches subject.semester AND student.department matches subject.department

        const subjects = await prisma.subject.findMany({
            where: { id: { in: subjectIds } }
        });

        let allEligibleStudents = [];

        for (const sub of subjects) {
            const studentList = await prisma.student.findMany({
                where: {
                    department: sub.department || undefined,
                    semester: sub.semester
                },
                orderBy: { rollNo: 'asc' }
            });
            // Assign which subject they are taking for this session tracking
            studentList.forEach(s => s.currentSubjectId = sub.id);
            allEligibleStudents = [...allEligibleStudents, ...studentList];
        }

        // Remove duplicates if a student takes multiple subjects in one session (unlikely but safe)
        const uniqueStudents = [];
        const seenIds = new Set();
        for (const s of allEligibleStudents) {
            if (!seenIds.has(s.id)) {
                uniqueStudents.push(s);
                seenIds.add(s.id);
            }
        }

        // 2. Fetch selected halls
        const halls = await prisma.hall.findMany({
            where: { id: { in: hallIds.map(id => parseInt(id)) }, isActive: true }
        });

        halls.forEach(h => {
            console.log(`[Algorithm] Hall: ${h.hallName}, Rows: ${h.totalRows}, Benches/Row: ${h.benchesPerRow}, Cap: ${h.capacity}`);
        });

        const totalCapacity = halls.reduce((acc, h) => acc + h.capacity, 0);
        if (uniqueStudents.length > totalCapacity) {
            return res.status(400).json({
                message: `Insufficient capacity. Students: ${uniqueStudents.length}, Capacity: ${totalCapacity}`
            });
        }

        // 3. Algorithm: Balanced Seating
        // Group by subject and department for balancing later if needed
        // For now, let's shuffle or sort to mix depts
        const processedStudents = uniqueStudents.sort((a, b) => a.department.localeCompare(b.department) || a.year - b.year);

        const { allocations, remaining } = calculateSeating(processedStudents, halls);

        // 4. Save to DB within transaction
        await prisma.$transaction(async (tx) => {
            // Delete old allocations for this session
            await tx.hallAllocation.deleteMany({ where: { examSessionId: session.id } });

            // Bulk Create (Batching for performance)
            await tx.hallAllocation.createMany({
                data: allocations.map(a => ({
                    examSessionId: session.id,
                    hallId: a.hallId,
                    studentId: a.studentId,
                    subjectId: a.subjectId,
                    department: a.department,
                    year: a.year,
                    seatNumber: a.seatNumber,
                    rowNumber: a.rowNumber,
                    columnNumber: a.columnNumber
                }))
            });
        });

        res.json({
            message: "Allocation generated successfully (ALGO: VERTICAL_V4V)",
            count: allocations.length,
            unallocated: remaining.length
        });

    } catch (error) {
        console.error("Allocation Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getSessionAllocations = async (req, res) => {
    try {
        const { id } = req.params;
        const allocations = await prisma.hallAllocation.findMany({
            where: { examSessionId: parseInt(id) },
            include: {
                student: true,
                subject: true,
                hall: true
            },
            orderBy: [{ hallId: 'asc' }, { rowNumber: 'asc' }, { columnNumber: 'asc' }]
        });
        res.json(allocations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.toggleSessionLock = async (req, res) => {
    try {
        const { id } = req.params;
        const { isLocked } = req.body;
        const session = await prisma.examSession.update({
            where: { id: parseInt(id) },
            data: { isLocked }
        });
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const sessionId = parseInt(id);

        // Delete associated subjects and allocations will be handled by Cascading Deletes defined in Prisma schema
        // But for extra safety or if we want to log what's happening, we can do it here.
        await prisma.examSession.delete({
            where: { id: sessionId }
        });

        res.json({ message: "Exam session and its allocations deleted successfully" });
    } catch (error) {
        console.error("Delete Session Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.updateSessionSubjects = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectIds } = req.body;

        console.log(`Updating subjects for session ${id}:`, subjectIds);

        const session = await prisma.examSession.findUnique({ where: { id: parseInt(id) } });
        if (!session) return res.status(404).json({ message: "Session not found" });

        await prisma.$transaction(async (tx) => {
            // 1. Delete existing subjects
            await tx.examSessionSubjects.deleteMany({
                where: { examSessionId: parseInt(id) }
            });

            // 2. Add new subjects if any
            if (subjectIds && subjectIds.length > 0) {
                // Using individual creates for better compatibility across all DB types
                for (const sid of subjectIds) {
                    await tx.examSessionSubjects.create({
                        data: {
                            examSessionId: parseInt(id),
                            subjectId: parseInt(sid)
                        }
                    });
                }
            }
        });

        const updatedSession = await prisma.examSession.findUnique({
            where: { id: parseInt(id) },
            include: { subjects: true }
        });

        res.json(updatedSession);
    } catch (error) {
        console.error("Update Session Subjects Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Helper to group register numbers into ranges
const getRegisterRanges = (students) => {
    if (!students || students.length === 0) return "";

    // Extract numeric parts of roll numbers and sort
    const regNos = students.map(s => s.rollNo).filter(Boolean).sort();

    const ranges = [];
    let start = regNos[0];
    let prev = regNos[0];

    for (let i = 1; i <= regNos.length; i++) {
        const current = regNos[i];

        // Check if current is continuous with prev
        // In many colleges, the last 3-4 digits are numeric
        const prevNum = parseInt(prev.slice(-3));
        const currNum = current ? parseInt(current.slice(-3)) : null;

        if (currNum !== prevNum + 1 || i === regNos.length) {
            if (start === prev) {
                ranges.push(start);
            } else {
                ranges.push(`${start}-${prev.slice(-3)}`);
            }
            start = current;
        }
        prev = current;
    }
    return ranges.join(", ");
};

const getRomanNumeral = (num) => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    return roman[num] || num;
};

exports.exportConsolidatedPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await prisma.examSession.findUnique({
            where: { id: parseInt(id) }
        });

        if (!session) return res.status(404).json({ message: "Session not found" });

        const allocations = await prisma.hallAllocation.findMany({
            where: { examSessionId: parseInt(id) },
            include: {
                student: true,
                subject: true,
                hall: true
            },
            orderBy: [
                { hall: { hallName: 'asc' } },
                { year: 'asc' },
                { department: 'asc' }
            ]
        });

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Hall_Plan_${session.examName.replace(/\s+/g, '_')}.pdf`);
        doc.pipe(res);

        // --- HEADER SECTION ---
        const logoPath = require('path').join(process.cwd(), '..', 'client', 'public', 'miet-logo.png');
        try {
            doc.image(logoPath, 40, 30, { width: 80 });
        } catch (e) {
            console.warn("Logo not found at", logoPath);
        }

        doc.fontSize(16).font('Helvetica-Bold').text('M.I.E.T. ENGINEERING COLLEGE', 130, 35, { align: 'center', width: 350 });
        doc.fontSize(10).font('Helvetica').text('(AUTONOMOUS)', 130, 52, { align: 'center', width: 350 });
        doc.fontSize(9).text('(AFFILIATED TO ANNA UNIVERSITY, CHENNAI)', 130, 65, { align: 'center', width: 350 });
        doc.text('TIRUCHIRAPPALLI', 130, 75, { align: 'center', width: 350 });
        doc.fontSize(11).font('Helvetica-Bold').text('OFFICE OF THE CONTROLLER OF EXAMINATIONS', 130, 90, { align: 'center', width: 350 });

        doc.moveDown(2);

        // Title Boxes
        const topY = 120;
        doc.rect(40, topY, 520, 25).stroke();
        doc.fontSize(11).font('Helvetica-Bold').text(session.examName.toUpperCase(), 40, topY + 7, { align: 'center', width: 520 });

        doc.rect(40, topY + 25, 520, 20).stroke();
        doc.fontSize(10).text('CONSOLIDATED HALL PLAN', 40, topY + 30, { align: 'center', width: 520 });

        // --- DATA PROCESSING ---
        // Group by Hall -> then by (Year/Dept)
        const groupedData = [];
        const hallsMap = new Map();

        allocations.forEach(a => {
            if (!hallsMap.has(a.hall.hallName)) {
                hallsMap.set(a.hall.hallName, {
                    name: a.hall.hallName,
                    totalStrength: 0,
                    rows: []
                });
            }
            const hall = hallsMap.get(a.hall.hallName);
            hall.totalStrength++;

            const rowKey = `${a.year}-${a.department}`;
            let row = hall.rows.find(r => r.key === rowKey);
            if (!row) {
                row = {
                    key: rowKey,
                    year: a.year,
                    dept: a.department,
                    students: []
                };
                hall.rows.push(row);
            }
            row.students.push(a.student);
        });

        // --- TABLE RENDERING ---
        const startY = topY + 45;
        let currentY = startY;

        // Table Header
        const colWidths = {
            sno: 30,
            sem: 40,
            dept: 50,
            hall: 60,
            reg: 220,
            str: 60,
            total: 60
        };
        const colX = {
            sno: 40,
            sem: 40 + colWidths.sno,
            dept: 40 + colWidths.sno + colWidths.sem,
            hall: 40 + colWidths.sno + colWidths.sem + colWidths.dept,
            reg: 40 + colWidths.sno + colWidths.sem + colWidths.dept + colWidths.hall,
            str: 40 + colWidths.sno + colWidths.sem + colWidths.dept + colWidths.hall + colWidths.reg,
            total: 40 + colWidths.sno + colWidths.sem + colWidths.dept + colWidths.hall + colWidths.reg + colWidths.str
        };

        const drawTableHeader = (y) => {
            doc.font('Helvetica-Bold').fontSize(9);
            doc.rect(40, y, 520, 30).stroke();
            doc.text('S.', colX.sno, y + 5, { width: colWidths.sno, align: 'center' });
            doc.text('No.', colX.sno, y + 15, { width: colWidths.sno, align: 'center' });
            doc.text('Sem', colX.sem, y + 10, { width: colWidths.sem, align: 'center' });
            doc.text('Dept.', colX.dept, y + 10, { width: colWidths.dept, align: 'center' });
            doc.text('Hall', colX.hall, y + 5, { width: colWidths.hall, align: 'center' });
            doc.text('Name', colX.hall, y + 15, { width: colWidths.hall, align: 'center' });
            doc.text('Roll Number', colX.reg, y + 10, { width: colWidths.reg, align: 'center' });
            doc.text('Strength', colX.str, y + 10, { width: colWidths.str, align: 'center' });
            doc.text('Total', colX.total, y + 5, { width: colWidths.total, align: 'center' });
            doc.text('Strength', colX.total, y + 15, { width: colWidths.total, align: 'center' });

            // Vertical lines for header
            [colX.sem, colX.dept, colX.hall, colX.reg, colX.str, colX.total].forEach(x => {
                doc.moveTo(x, y).lineTo(x, y + 30).stroke();
            });
            return y + 30;
        };

        currentY = drawTableHeader(currentY);

        let sNo = 1;
        Array.from(hallsMap.values()).forEach(hall => {
            const hallRowHeight = Math.max(hall.rows.length * 30, 40); // Minimum height or dynamic

            // Page break check
            if (currentY + hallRowHeight > 750) {
                doc.addPage();
                currentY = drawTableHeader(50);
            }

            const hallStartY = currentY;

            hall.rows.forEach((row, rowIdx) => {
                const rowHeight = 30;
                doc.font('Helvetica').fontSize(9);

                // Draw cells
                doc.rect(40, currentY, 520, rowHeight).stroke();

                // Semester (assuming Year * 2 - 1 for consistency, or we could fetch actual semester)
                // Let's use Year for now as a placeholder
                doc.text(getRomanNumeral(row.year * 2), colX.sem, currentY + 10, { width: colWidths.sem, align: 'center' });
                doc.text(row.dept, colX.dept, currentY + 10, { width: colWidths.dept, align: 'center' });

                // Register numbers range
                const ranges = getRegisterRanges(row.students);
                doc.text(ranges, colX.reg + 5, currentY + 5, { width: colWidths.reg - 10, align: 'left' });

                doc.text(row.students.length.toString(), colX.str, currentY + 10, { width: colWidths.str, align: 'center' });

                // Vertical lines (except for merged ones)
                [colX.sem, colX.dept, colX.hall, colX.reg, colX.str, colX.total].forEach(x => {
                    if (x === colX.hall || x === colX.total) return; // We draw these after loop
                    doc.moveTo(x, currentY).lineTo(x, currentY + rowHeight).stroke();
                });

                currentY += rowHeight;
            });

            // Draw Merged Cells for this hall
            const totalHeight = currentY - hallStartY;

            // S.No
            doc.rect(colX.sno, hallStartY, colWidths.sno, totalHeight).stroke();
            doc.font('Helvetica-Bold').text(sNo.toString(), colX.sno, hallStartY + (totalHeight / 2) - 5, { width: colWidths.sno, align: 'center' });

            // Hall Name
            doc.rect(colX.hall, hallStartY, colWidths.hall, totalHeight).stroke();
            doc.font('Helvetica-Bold').text(hall.name, colX.hall, hallStartY + (totalHeight / 2) - 5, { width: colWidths.hall, align: 'center' });

            // Total Strength
            doc.rect(colX.total, hallStartY, colWidths.total, totalHeight).stroke();
            doc.font('Helvetica-Bold').text(hall.totalStrength.toString(), colX.total, hallStartY + (totalHeight / 2) - 5, { width: colWidths.total, align: 'center' });

            sNo++;
        });

        // --- INDIVIDUAL HALL PAGES ---
        Array.from(hallsMap.values()).forEach(hall => {
            doc.addPage();

            // Re-draw Header for individual hall page
            try {
                doc.image(logoPath, 40, 30, { width: 60 });
            } catch (e) { }

            doc.fontSize(14).font('Helvetica-Bold').text('M.I.E.T. ENGINEERING COLLEGE', 110, 35, { align: 'center', width: 380 });
            doc.fontSize(9).font('Helvetica').text('(AUTONOMOUS)', 110, 50, { align: 'center', width: 380 });
            doc.fontSize(10).font('Helvetica-Bold').text('End Semester Examinations- ' + (session.examName.includes('20') ? session.examName.match(/20\d{2}/)[0] : '2025'), 110, 65, { align: 'center', width: 380 });

            // Date and Session
            const examDateStr = new Date(session.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
            doc.fontSize(10).text(`DATE- ${examDateStr}      ${session.session}`, 110, 80, { align: 'center', width: 380 });

            // Hall Number Box (Right Aligned)
            doc.rect(430, 95, 130, 20).stroke();
            doc.fontSize(10).font('Helvetica-Bold').text(`HALL NO-${hall.name}`, 430, 100, { align: 'center', width: 130 });

            // --- SEATING GRID ---
            const gridTop = 120;
            const gridWidth = 520;
            const colLabels = ['A', 'B', 'C', 'D'];
            const numCols = 4;
            const colW = gridWidth / numCols;
            const rowH = 22; // Height per seat row

            // Header for Grid (A, B, C, D)
            doc.rect(40, gridTop, gridWidth, 20).stroke();
            colLabels.forEach((label, i) => {
                doc.font('Helvetica-Bold').text(label, 40 + (i * colW), gridTop + 5, { width: colW, align: 'center' });
                if (i > 0) doc.moveTo(40 + (i * colW), gridTop).lineTo(40 + (i * colW), gridTop + 20).stroke();
            });

            // Find max rows for this hall to draw grid
            const hallAllocations = allocations.filter(a => a.hall.hallName === hall.name);
            const maxRow = Math.max(...hallAllocations.map(a => a.rowNumber), 7);

            let currentGridY = gridTop + 20;
            for (let r = 1; r <= maxRow; r++) {
                doc.rect(40, currentGridY, gridWidth, rowH).stroke();

                for (let c = 1; c <= numCols; c++) {
                    const colX = 40 + (c - 1) * colW;

                    if (c > 1) doc.moveTo(colX, currentGridY).lineTo(colX, currentGridY + rowH).stroke();

                    const seatLabel = `${colLabels[c - 1]}${r}`;

                    // Always show the seat label (A1, A2...)
                    doc.save().font('Helvetica').fontSize(8).fillColor('#333333').text(seatLabel, colX + 3, currentGridY + 7, { width: 25 }).restore();

                    const studentAlloc = hallAllocations.find(a => a.rowNumber === r && a.columnNumber === c);
                    if (studentAlloc) {
                        const displayText = studentAlloc.student.registerNumber || studentAlloc.student.rollNo;
                        doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text(displayText, colX + 22, currentGridY + 7, { width: colW - 25, align: 'center' });
                    } else {
                        // Shading/Empty box (Moved start point to not cover label)
                        doc.save().fillColor('#f5f5f5').rect(colX + 22, currentGridY + 1, colW - 23, rowH - 2).fill().restore();
                    }
                }
                currentGridY += rowH;
            }

            // --- HALL SUMMARY TABLE ---
            doc.moveDown(1);
            const summaryY = currentGridY + 15;
            const summaryW = 280;
            const sumCol1 = 150;
            const sumCol2 = 130;

            const deptSummary = {};
            hallAllocations.forEach(a => {
                const key = a.department;
                deptSummary[key] = (deptSummary[key] || 0) + 1;
            });

            doc.font('Helvetica-Bold').fontSize(9);
            const drawSummaryRow = (y, c1, c2, isBold = false) => {
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
                doc.rect(145, y, summaryW, 18).stroke();
                doc.text(c1, 150, y + 5, { width: sumCol1 - 10 });
                doc.moveTo(145 + sumCol1, y).lineTo(145 + sumCol1, y + 18).stroke();
                doc.text(c2, 145 + sumCol1, y + 5, { width: sumCol2, align: 'center' });
                return y + 18;
            };

            let currentSumY = summaryY;
            Object.entries(deptSummary).forEach(([dept, count]) => {
                currentSumY = drawSummaryRow(currentSumY, dept, count.toString());
            });
            currentSumY = drawSummaryRow(currentSumY, 'TOTAL', hall.totalStrength.toString(), true);

            // --- FOOTER / SIGNATURES ---
            const footerY = 720;
            doc.font('Helvetica').fontSize(9);
            doc.text('Name & Signature of', 40, footerY);
            doc.text('hall superintendent', 40, footerY + 12);

            doc.text('Signature of Chief', 430, footerY, { align: 'right', width: 130 });
            doc.text('superintendent with', 430, footerY + 12, { align: 'right', width: 130 });
            doc.text('College seal', 430, footerY + 24, { align: 'right', width: 130 });
        });

        doc.end();

    } catch (error) {
        console.error("PDF Export Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};
