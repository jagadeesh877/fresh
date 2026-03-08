const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const COLLEGE_NAME = 'M.I.E.T. Engineering College';
const COLLEGE_NAME_BOLD = '(AUTONOMOUS)';
const COLLEGE_SUB = '(Affiliated to Anna University, Chennai)';
const COLLEGE_CITY = 'TIRUCHIRAPPALLI';
const CONTROLLER_LINE = 'OFFICE OF THE CONTROLLER OF EXAMINATIONS';
const MIET_LOGO = path.join(__dirname, '../../client/public/miet-logo.png');

// ─── Helper: number to words ──────────────────────────────────────────────────
function numberToWords(num) {
    if (num == null || isNaN(num)) return '';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const n = Math.round(num);
    if (n === 0) return 'Zero';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
}

function romanize(num) {
    const val = [['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
    let result = '';
    let n = parseInt(num) || 0;
    for (const [r, v] of val) { while (n >= v) { result += r; n -= v; } }
    return result;
}

// ─── Helper: draw MIET college header ────────────────
function drawMIETHeader(doc, startY) {
    const LOGO_SZ = 60;
    const M = 40;
    const CW = 515;

    if (fs.existsSync(MIET_LOGO)) {
        doc.image(MIET_LOGO, M, startY, { width: LOGO_SZ, height: LOGO_SZ });
    }

    const TX = M + LOGO_SZ + 10;
    const TW = CW - LOGO_SZ - 10;

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
    doc.text(COLLEGE_NAME, TX, startY + 2, { width: TW, align: 'center' });
    doc.fontSize(12).text(COLLEGE_NAME_BOLD, TX, startY + 20, { width: TW, align: 'center' });
    doc.fontSize(9).font('Helvetica').text(COLLEGE_SUB, TX, startY + 35, { width: TW, align: 'center' });
    doc.text(COLLEGE_CITY, TX, startY + 45, { width: TW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(10).text(CONTROLLER_LINE, TX, startY + 58, { width: TW, align: 'center' });

    return startY + LOGO_SZ + 15;
}

// ─── THEORY: Statement of Marks PDF ──────────────────────────────────────────
exports.generateTheoryStatementOfMarks = (res, data) => {
    const entries = data.entries || [];
    const PAGE_STUDENTS = 25;
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_STUDENTS));
    const pages = [];
    for (let i = 0; i < entries.length; i += PAGE_STUDENTS) {
        pages.push(entries.slice(i, i + PAGE_STUDENTS));
    }
    if (pages.length === 0) pages.push([]);

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    doc.pipe(res);

    const M = 40;
    const CW = 515;

    pages.forEach((pageRows, pageIdx) => {
        if (pageIdx > 0) doc.addPage();

        let y = 25;
        y = drawMIETHeader(doc, y);

        const year = new Date().getFullYear();
        const componentLabel = data.component === 'LAB' ? 'PRACTICAL' : 'THEORY';
        const examTitle = data.examTitle || `END SEMESTER ${componentLabel} EXAMINATIONS NOV/DEC ${year}`;

        doc.font('Helvetica-Bold').fontSize(11).text(examTitle, M, y, { width: CW, align: 'center' });
        y += 15;

        if (data.boardName) {
            doc.fontSize(10).text(data.boardName, M, y, { width: CW, align: 'center' });
            y += 15;
        }

        doc.fontSize(12).text('STATEMENT OF MARKS', M, y, { width: CW, align: 'center', underline: true });
        y += 20;

        // Info Table
        const col1 = M, col2 = M + 90, col3 = M + 280, col4 = M + 380;
        doc.font('Helvetica-Bold').fontSize(9);

        doc.text('COURSE CODE:', col1, y);
        doc.font('Helvetica').text(data.subject?.code || '', col2, y);
        doc.font('Helvetica-Bold').text('SEMESTER:', col3, y);
        doc.font('Helvetica').text(romanize(data.subject?.semester) || '', col4, y);
        y += 15;

        doc.font('Helvetica-Bold').text('COURSE TITLE:', col1, y);
        doc.font('Helvetica').text(data.subject?.name || '', col2, y, { width: 180 });
        doc.font('Helvetica-Bold').text('QP CODE:', col3, y);
        doc.font('Helvetica').text(data.qpCode || 'N/A', col4, y);
        y += 20;

        doc.font('Helvetica-Bold').text('DATE:', col1, y);
        doc.font('Helvetica').text(data.dateSession || '', col2, y);
        doc.font('Helvetica-Bold').text('PACKET NO:', col3, y);
        const packetBase = parseInt(data.packetNoBase) || 1;
        doc.font('Helvetica').text(`${packetBase + pageIdx}/${totalPages}`, col4, y);
        y += 20;

        // Main Table
        const TW = CW;
        const c1 = 40, c2 = 120, c3 = 100, c4 = 255;
        const rowH = 20;

        // Headers
        doc.font('Helvetica-Bold').fontSize(9);
        doc.rect(M, y, TW, rowH).fillAndStroke('#f0f0f0', '#000000');
        doc.fillColor('#000000');
        doc.text('S.NO', M + 2, y + 6, { width: c1, align: 'center' });
        doc.text('DUMMY NUMBER', M + c1, y + 6, { width: c2, align: 'center' });
        doc.text('MARKS (FIG)', M + c1 + c2, y + 6, { width: c3, align: 'center' });
        doc.text('MARKS IN WORDS', M + c1 + c2 + c3, y + 6, { width: c4, align: 'center' });

        // Vertical dividers for header
        [c1, c1 + c2, c1 + c2 + c3].forEach(x => {
            doc.moveTo(M + x, y).lineTo(M + x, y + rowH).stroke();
        });
        y += rowH;

        doc.font('Helvetica').fontSize(9);
        const startSNo = pageIdx * PAGE_STUDENTS + 1;

        for (let i = 0; i < PAGE_STUDENTS; i++) {
            const row = pageRows[i];
            doc.rect(M, y, TW, rowH).stroke();
            [c1, c1 + c2, c1 + c2 + c3].forEach(x => {
                doc.moveTo(M + x, y).lineTo(M + x, y + rowH).stroke();
            });

            doc.text(`${startSNo + i}`, M, y + 6, { width: c1, align: 'center' });
            if (row) {
                doc.text(row.dummyNumber || '', M + c1, y + 6, { width: c2, align: 'center' });
                if (row.marks != null) {
                    doc.font('Helvetica-Bold').text(row.marks.toString(), M + c1 + c2, y + 6, { width: c3, align: 'center' });
                    doc.font('Helvetica').text(numberToWords(row.marks), M + c1 + c2 + c3 + 5, y + 6, { width: c4 - 10, align: 'left' });
                }
            }
            y += rowH;
        }

        // Summary Line
        doc.rect(M, y, TW, rowH).stroke();
        doc.font('Helvetica-Bold').text('TOTAL CANDIDATES PRESENT:', M + 10, y + 6);
        doc.text(pageRows.filter(r => r.marks != null).length.toString(), M + 180, y + 6);
        y += 40;

        // Signatures
        const sigY = 780;
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('ASSISTANT EXAMINER', M, sigY);
        doc.text('EXAMINER', M, sigY, { width: CW, align: 'center' });
        doc.text('BOARD CHAIRMAN', M, sigY, { width: CW, align: 'right' });
    });

    doc.end();
};

// ─── LAB: Statement of Marks PDF ─────────────────────────────────────────────
exports.generateLabStatementOfMarks = (res, data) => {
    const entries = data.entries || [];
    const PAGE_STUDENTS = 25;
    const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_STUDENTS));
    const pages = [];
    for (let i = 0; i < entries.length; i += PAGE_STUDENTS) {
        pages.push(entries.slice(i, i + PAGE_STUDENTS));
    }
    if (pages.length === 0) pages.push([]);

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    doc.pipe(res);

    const M = 40, CW = 515;

    pages.forEach((pageRows, pageIdx) => {
        if (pageIdx > 0) doc.addPage();
        let y = 25;
        y = drawMIETHeader(doc, y);

        const year = new Date().getFullYear();
        doc.font('Helvetica-Bold').fontSize(11).text(`END SEMESTER PRACTICAL EXAMINATIONS NOV/DEC ${year}`, M, y, { width: CW, align: 'center' });
        y += 20;

        doc.fontSize(12).text('STATEMENT OF MARKS', M, y, { width: CW, align: 'center', underline: true });
        y += 20;

        // Info
        const c1 = M, c2 = M + 100, c3 = M + 280, c4 = M + 380;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('COURSE CODE:', c1, y);
        doc.font('Helvetica').text(data.subject?.code || '', c2, y);
        doc.font('Helvetica-Bold').text('SEMESTER:', c3, y);
        doc.font('Helvetica').text(romanize(data.subject?.semester) || '', c4, y);
        y += 18;

        doc.font('Helvetica-Bold').text('COURSE TITLE:', c1, y);
        doc.font('Helvetica').text(data.subject?.name || '', c2, y, { width: 170 });
        doc.font('Helvetica-Bold').text('DATE:', c3, y);
        doc.font('Helvetica').text(data.dateSession || '', c4, y);
        y += 25;

        // Table
        const TW = CW;
        const col_sno = 50, col_reg = 180, col_mark = 140, col_rem = 145;
        const rowH = 20;

        doc.font('Helvetica-Bold').fontSize(9);
        doc.rect(M, y, TW, rowH).fillAndStroke('#f0f0f0', '#000000');
        doc.fillColor('#000000');
        doc.text('S.NO', M, y + 6, { width: col_sno, align: 'center' });
        doc.text('REGISTER NUMBER', M + col_sno, y + 6, { width: col_reg, align: 'center' });
        doc.text('MARKS', M + col_sno + col_reg, y + 6, { width: col_mark, align: 'center' });
        doc.text('REMARKS', M + col_sno + col_reg + col_mark, y + 6, { width: col_rem, align: 'center' });

        [col_sno, col_sno + col_reg, col_sno + col_reg + col_mark].forEach(x => {
            doc.moveTo(M + x, y).lineTo(M + x, y + rowH).stroke();
        });
        y += rowH;

        doc.font('Helvetica').fontSize(10);
        for (let i = 0; i < PAGE_STUDENTS; i++) {
            const row = pageRows[i];
            doc.rect(M, y, TW, rowH).stroke();
            [col_sno, col_sno + col_reg, col_sno + col_reg + col_mark].forEach(x => {
                doc.moveTo(M + x, y).lineTo(M + x, y + rowH).stroke();
            });

            doc.text(`${(pageIdx * PAGE_STUDENTS) + i + 1}`, M, y + 6, { width: col_sno, align: 'center' });
            if (row) {
                doc.font('Helvetica-Bold').text(row.registerNumber || '', M + col_sno, y + 6, { width: col_reg, align: 'center' });
                if (row.marks != null) {
                    doc.text(row.marks.toString(), M + col_sno + col_reg, y + 6, { width: col_mark, align: 'center' });
                }
            }
            y += rowH;
        }

        y += 50;
        const sigY = 780;
        doc.font('Helvetica-Bold').text('INTERNAL EXAMINER', M, sigY);
        doc.text('EXTERNAL EXAMINER', M, sigY, { width: CW, align: 'right' });
    });

    doc.end();
};

exports.generateProvisionalResultsPortrait = (res, data) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    doc.pipe(res);

    const M = 30;
    const CW = doc.page.width - 2 * M;
    let y = 30;

    // Header
    y = drawMIETHeader(doc, y);
    doc.moveDown(0.5);
    y = doc.y;

    const title = `PROVISIONAL RESULTS - ${data.examSession || 'NOV/DEC ' + new Date().getFullYear()}`;
    doc.font('Helvetica-Bold').fontSize(12).text(title, M, y, { width: CW, align: 'center' });
    y += 20;

    // Sub-info
    doc.fontSize(10);
    doc.text(`BRANCH: ${data.department}`, M, y);
    doc.text(`SEMESTER: ${data.semester}`, M + 400, y);
    y += 15;
    doc.text(`REGULATION: ${data.regulation || '2021'}`, M, y);
    y += 25;

    // Table Headers
    const colWidths = {
        sno: 30,
        regno: 90,
        name: 120,
        subject: 45, // Dynamic based on subject count
        gpa: 35,
        result: 50
    };

    const subjects = data.subjects || [];
    const subCount = subjects.length;
    const availWidth = CW - colWidths.sno - colWidths.regno - colWidths.name - colWidths.gpa - colWidths.result;
    const subWidth = subCount > 0 ? Math.floor(availWidth / subCount) : 0;

    const drawRow = (row, isHeader = false) => {
        const rowH = isHeader ? 30 : 25;
        if (y + rowH > doc.page.height - 50) {
            doc.addPage();
            y = 30;
        }

        doc.rect(M, y, CW, rowH).stroke();
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);

        let curX = M;
        // Verticals
        [colWidths.sno, colWidths.regno, colWidths.name].forEach(w => {
            doc.moveTo(curX + w, y).lineTo(curX + w, y + rowH).stroke();
            curX += w;
        });

        // Subject columns verticals
        for (let i = 0; i < subCount; i++) {
            doc.moveTo(curX + subWidth, y).lineTo(curX + subWidth, y + rowH).stroke();
            curX += subWidth;
        }

        // GPA vertical
        doc.moveTo(curX + colWidths.gpa, y).lineTo(curX + colWidths.gpa, y + rowH).stroke();

        // Content
        curX = M;
        doc.text(row.sno || '', curX, y + (rowH / 2) - 4, { width: colWidths.sno, align: 'center' });
        curX += colWidths.sno;
        doc.text(row.regno || '', curX + 2, y + (rowH / 2) - 4, { width: colWidths.regno - 4, align: 'center' });
        curX += colWidths.regno;
        doc.text(row.name || '', curX + 5, y + (rowH / 2) - 4, { width: colWidths.name - 10, align: 'left' });
        curX += colWidths.name;

        // Grades
        if (isHeader) {
            subjects.forEach(sub => {
                doc.fontSize(7).text(sub.code, curX, y + 5, { width: subWidth, align: 'center' });
                doc.fontSize(6).text(`(${sub.credits})`, curX, y + 16, { width: subWidth, align: 'center' });
                curX += subWidth;
            });
        } else {
            subjects.forEach(sub => {
                const grade = row.marks[sub.code]?.grade || '-';
                doc.text(grade, curX, y + (rowH / 2) - 4, { width: subWidth, align: 'center' });
                curX += subWidth;
            });
        }

        doc.fontSize(8).text(row.gpa || '', curX, y + (rowH / 2) - 4, { width: colWidths.gpa, align: 'center' });
        curX += colWidths.gpa;
        doc.text(row.result || '', curX, y + (rowH / 2) - 4, { width: colWidths.result, align: 'center' });

        y += rowH;
    };

    // Header Row
    drawRow({
        sno: 'S.NO',
        regno: 'REGISTER NO',
        name: 'STUDENT NAME',
        gpa: 'GPA',
        result: 'RESULT'
    }, true);

    // Data Rows
    data.students.forEach(student => {
        drawRow({
            sno: student.sno,
            regno: student.registerNumber,
            name: student.name,
            marks: student.marks,
            gpa: student.gpa?.toFixed(2),
            result: student.resultStatus
        });
    });

    doc.end();
};

exports.generateConsolidatedTabulationSheet = (res, data) => {
    // A3 Landscape T-Sheet Redesign
    const doc = new PDFDocument({ margin: 20, size: 'A3', layout: 'landscape' });
    doc.pipe(res);

    const M = 30;
    const CW = doc.page.width - 2 * M;
    let y = 30;

    // --- Header Section (Matching img2) ---
    doc.font('Helvetica-Bold').fontSize(14).text('M.I.E.T. ENGINEERING COLLEGE (AUTONOMOUS),TRICHY-620007', M, y, { width: CW, align: 'center' });
    y += 18;
    doc.fontSize(12).text('OFFICE OF THE CONTROLLER OF EXAMINATIONS', M, y, { width: CW, align: 'center' });
    y += 18;

    const examSession = data.examSession || 'NOVEMBER/DECEMBER EXAMINATIONS 2025';
    doc.fontSize(12).text(`PROVISIONAL RESULTS OF ${examSession.toUpperCase()}`, M, y, { width: CW, align: 'center' });
    y += 25;

    // --- Branch/Semester Info Line ---
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`B.E. ${data.department || ''}`, M, y);
    doc.text(`Semester : ${data.semester || ''}`, M + 450, y);
    doc.text(`R-${data.regulation || '2021'}`, M + 600, y);
    const pubDate = data.publicationDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    doc.text(`Date of Publication : ${pubDate}`, M + 750, y);
    y += 15;

    const subjects = data.subjects || [];
    const subCount = subjects.length;

    // Layout configuration
    const colWidths = {
        sno: 25,
        regno: 70,
        name: 0 // Will adjust based on remaining space
    };

    // Each subject gets a block with Int, P-Ext, T-Ext, Total, A-Grade, R-Grade
    // We need to calculate how much space we have for subjects
    const fixedWidthStart = colWidths.sno + colWidths.regno;
    const statCols = { gpa: 30, cgpa: 30, cr: 25, result: 40 };
    const fixedWidthEnd = statCols.gpa + statCols.cgpa + statCols.cr + statCols.result;

    const totalAvail = CW - fixedWidthStart - fixedWidthEnd;
    // Subject block needs space for 6 tiny columns: Int, P-Ext, T-Ext, Total, Actual Grade, Relative Grade
    const subBlockWidth = subCount > 0 ? Math.floor(totalAvail / subCount) : 0;

    // Tiny sub-column relative widths
    const subParts = { int: 0.12, pext: 0.15, text: 0.15, total: 0.18, agrade: 0.20, rgrade: 0.20 };

    const drawLine = (x1, y1, x2, y2) => doc.moveTo(x1, y1).lineTo(x2, y2).stroke();

    const drawEnhancedRow = (row, isHeader = false) => {
        const rowH = isHeader ? 60 : 32;
        if (y + rowH > doc.page.height - 40) {
            doc.addPage();
            y = 30; // reset y on new page
        }

        doc.rect(M, y, CW, rowH).stroke();
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeader ? 9 : 9);

        let curX = M;
        // S.No
        doc.text(row.sno || '', curX, y + (rowH / 2) - 4, { width: colWidths.sno, align: 'center' }); curX += colWidths.sno; drawLine(curX, y, curX, y + rowH);
        // Register No
        doc.text(row.regno || '', curX, y + (rowH / 2) - 4, { width: colWidths.regno, align: 'center' }); curX += colWidths.regno; drawLine(curX, y, curX, y + rowH);

        // Subjects
        subjects.forEach(sub => {
            const bx = curX;
            const bw = subBlockWidth;
            const isIntegrated = sub.subjectCategory === 'INTEGRATED';

            if (isHeader) {
                // Subject Code Header
                doc.fontSize(9).text(sub.code, bx, y + 6, { width: bw, align: 'center' });
                drawLine(bx, y + 18, bx + bw, y + 18);

                const subY = y + 18;
                let sx = bx;
                doc.fontSize(6);

                // Sub-headers: Int, P-Ext, T-Ext, Total
                doc.text('Int', sx, subY + 14, { width: bw * subParts.int, align: 'center' }); sx += bw * subParts.int; drawLine(sx, subY, sx, y + rowH);
                doc.text('P-E', sx, subY + 14, { width: bw * subParts.pext, align: 'center' }); sx += bw * subParts.pext; drawLine(sx, subY, sx, y + rowH);
                doc.text('T-E', sx, subY + 14, { width: bw * subParts.text, align: 'center' }); sx += bw * subParts.text; drawLine(sx, subY, sx, y + rowH);
                doc.text('Tot', sx, subY + 14, { width: bw * subParts.total, align: 'center' }); sx += bw * subParts.total; drawLine(sx, subY, sx, y + rowH);

                doc.fontSize(6);
                doc.text('A-G', sx, subY + 14, { width: bw * subParts.agrade, align: 'center' }); sx += bw * subParts.agrade; drawLine(sx, subY, sx, y + rowH);
                doc.text('R-G', sx, subY + 14, { width: bw * subParts.rgrade, align: 'center' });

                // Max marks line
                doc.fontSize(5.5).fillColor('#444');
                let mx = bx;
                const intMax = isIntegrated ? '50' : (sub.subjectCategory === 'LAB' ? '60' : '40');
                const extMax = isIntegrated ? '50' : (sub.subjectCategory === 'LAB' ? '40' : '60');

                doc.text(intMax, mx, subY + 3, { width: bw * subParts.int, align: 'center' }); mx += bw * subParts.int;
                doc.text(sub.subjectCategory === 'LAB' || isIntegrated ? extMax : '', mx, subY + 3, { width: bw * subParts.pext, align: 'center' }); mx += bw * subParts.pext;
                doc.text(sub.subjectCategory === 'THEORY' || isIntegrated ? extMax : '', mx, subY + 3, { width: bw * subParts.text, align: 'center' }); mx += bw * subParts.text;
                doc.text('100', mx, subY + 3, { width: bw * subParts.total, align: 'center' });
                doc.fillColor('#000');
            } else {
                const mark = row.marks[sub.code] || {};
                let sx = bx;
                doc.fontSize(8);

                // Int
                doc.text(mark.internal != null ? Math.round(mark.internal).toString() : '-', sx, y + 10, { width: bw * subParts.int, align: 'center' }); sx += bw * subParts.int; drawLine(sx, y, sx, y + rowH);

                // P-Ext
                doc.text(mark.labExt != null ? Math.round(mark.labExt).toString() : '-', sx, y + 10, { width: bw * subParts.pext, align: 'center' }); sx += bw * subParts.pext; drawLine(sx, y, sx, y + rowH);

                // T-Ext
                doc.text(mark.theoryExt != null ? Math.round(mark.theoryExt).toString() : '-', sx, y + 10, { width: bw * subParts.text, align: 'center' }); sx += bw * subParts.text; drawLine(sx, y, sx, y + rowH);

                // Total
                doc.font('Helvetica-Bold').text(mark.total != null ? Math.round(mark.total).toString() : '-', sx, y + 10, { width: bw * subParts.total, align: 'center' }); sx += bw * subParts.total; drawLine(sx, y, sx, y + rowH);

                // Grades (A and R)
                doc.font('Helvetica').fontSize(mark.grade?.length > 2 ? 6 : 8);
                doc.text(mark.grade || '-', sx, y + 10, { width: bw * subParts.agrade, align: 'center' }); sx += bw * subParts.agrade; drawLine(sx, y, sx, y + rowH);
                doc.text(mark.grade || '-', sx, y + 10, { width: bw * subParts.rgrade, align: 'center' });
                doc.font('Helvetica');
            }
            curX += bw; drawLine(curX, y, curX, y + rowH);
        });

        // Stats at the end
        doc.fontSize(8.5);
        doc.text(row.gpa || '0.00', curX, y + 10, { width: statCols.gpa, align: 'center' }); curX += statCols.gpa; drawLine(curX, y, curX, y + rowH);
        doc.text(row.cgpa || '0.00', curX, y + 10, { width: statCols.cgpa, align: 'center' }); curX += statCols.cgpa; drawLine(curX, y, curX, y + rowH);
        doc.text(row.cr || '0', curX, y + 10, { width: statCols.cr, align: 'center' }); curX += statCols.cr; drawLine(curX, y, curX, y + rowH);
        
        let status = row.result;
        if (status === 'PASS') doc.fillColor('#006400');
        else if (status === 'FAIL') doc.fillColor('#8B0000');
        else doc.fillColor('#444444');
        
        doc.text(status || 'PENDING', curX, y + 10, { width: statCols.result, align: 'center' });
        doc.fillColor('#000000');

        y += rowH;
    };

    // Draw Header
    drawEnhancedRow({
        sno: 'S.No.',
        regno: 'Register No.',
        gpa: 'GPA',
        cgpa: 'CGPA',
        cr: 'CR',
        result: 'RESULT'
    }, true);

    // Draw Data
    data.students.forEach((s, idx) => {
        let displayStatus = 'PENDING';
        if (s.resultStatus === 'PASS') displayStatus = 'PASS';
        else if (s.resultStatus === 'FAIL') displayStatus = 'FAIL';

        drawEnhancedRow({
            sno: (idx + 1).toString(),
            regno: s.registerNumber,
            marks: s.marks,
            gpa: s.gpa?.toFixed(2),
            cgpa: s.cgpa?.toFixed(2),
            cr: s.earnedCredits?.toString(),
            result: displayStatus
        });
    });

    const sigY = doc.page.height - 50;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Prepared By', M + 50, sigY);
    doc.text('Verified By', M + 450, sigY);
    doc.text('Controller of Examinations', CW - 100, sigY);

    doc.end();
};
