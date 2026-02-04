import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Download, Search, FileText, AlertTriangle, FileSpreadsheet } from 'lucide-react';
// XLSX import removed - using backend export for Excel reports

const AttendanceReports = () => {
    const [department, setDepartment] = useState('CSE');
    const [year, setYear] = useState('1');
    const [section, setSection] = useState('A');
    const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // Start of month
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/attendance/report', {
                params: { department, year, section, fromDate, toDate }
            });
            setReportData(res.data);
        } catch (err) {
            alert("Failed to fetch report");
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        // Simple CSV export logic
        if (reportData.length === 0) return;

        const headers = ["Register No", "Name", "Total Classes", "Present", "OD", "Absent", "Percentage"];
        const rows = reportData.map(s => [s.registerNumber, s.name, s.totalClasses, s.present, s.od || 0, s.absent, s.percentage + '%']);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Attendance_Report_${department}_${year}_${section}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const exportToExcel = async () => {
        if (reportData.length === 0) return;

        setExporting(true);
        try {
            const response = await api.get('/admin/attendance/export-excel', {
                params: { department, year, section, fromDate, toDate },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Attendance_Report_${department}_${year}_${section}_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export Excel');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
                    <FileText size={40} />
                    Attendance Reports
                </h1>
                <p className="text-gray-600">Analyze student attendance trends and identify defaulters.</p>
            </div>

            {/* Filters */}
            <div className="premium-card p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div>
                        <label className="label">Department</label>
                        <select className="input-field w-full" value={department} onChange={e => setDepartment(e.target.value)}>
                            {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Year</label>
                        <select className="input-field w-full" value={year} onChange={e => setYear(e.target.value)}>
                            {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y} Year</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Section</label>
                        <select className="input-field w-full" value={section} onChange={e => setSection(e.target.value)}>
                            {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">From</label>
                        <input type="date" className="input-field w-full" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="label">To</label>
                        <input type="date" className="input-field w-full" value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                    <div>
                        <button onClick={fetchReport} className="btn btn-primary w-full flex justify-center gap-2">
                            {loading ? '...' : 'Generate'} <Search size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {reportData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="premium-card p-4 bg-white border-l-4 border-green-500">
                        <p className="text-gray-500 text-sm">Avg Attendance</p>
                        <p className="text-3xl font-bold text-gray-800">
                            {(reportData.reduce((acc, curr) => acc + parseFloat(curr.percentage), 0) / reportData.length).toFixed(1)}%
                        </p>
                    </div>
                    <div className="premium-card p-4 bg-white border-l-4 border-red-500">
                        <p className="text-gray-500 text-sm">Below 75%</p>
                        <p className="text-3xl font-bold text-red-600">
                            {reportData.filter(s => parseFloat(s.percentage) < 75).length} Students
                        </p>
                    </div>
                    <div className="premium-card p-4 bg-white border-l-4 border-blue-500">
                        <p className="text-gray-500 text-sm">Total Classes</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {reportData[0]?.totalClasses || 0}
                        </p>
                    </div>
                </div>
            )}

            {/* Table */}
            {reportData.length > 0 ? (
                <div className="premium-card overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-700">Detailed Report</h3>
                        <div className="flex gap-2">
                            <button onClick={downloadCSV} className="btn btn-secondary flex items-center gap-2">
                                <Download size={18} /> Export CSV
                            </button>
                            <button
                                onClick={exportToExcel}
                                disabled={exporting}
                                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileSpreadsheet size={18} /> {exporting ? 'Exporting...' : 'Export to Excel'}
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-4 text-left font-bold text-gray-600">Reg No</th>
                                    <th className="p-4 text-left font-bold text-gray-600">Name</th>
                                    <th className="p-4 text-center font-bold text-gray-600">Present (Days)</th>
                                    <th className="p-4 text-center font-bold text-gray-600">OD (Days)</th>
                                    <th className="p-4 text-center font-bold text-gray-600">Absent (Days)</th>
                                    <th className="p-4 text-center font-bold text-gray-600">%</th>
                                    <th className="p-4 text-center font-bold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((student) => {
                                    const perc = parseFloat(student.percentage);
                                    let statusColor = 'bg-green-100 text-green-700';
                                    if (perc < 65) statusColor = 'bg-red-100 text-red-700';
                                    else if (perc < 75) statusColor = 'bg-yellow-100 text-yellow-700';

                                    return (
                                        <tr key={student.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-mono text-gray-600">{student.registerNumber}</td>
                                            <td className="p-4 font-medium text-gray-800">{student.name}</td>
                                            <td className="p-4 text-center text-green-600 font-bold">{student.present - (student.od || 0)}</td>
                                            <td className="p-4 text-center text-blue-600 font-bold">{student.od || 0}</td>
                                            <td className="p-4 text-center text-red-500 font-bold">{student.absent}</td>
                                            <td className="p-4 text-center">
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[100px] mx-auto mb-1">
                                                    <div className={`h-2.5 rounded-full ${perc >= 75 ? 'bg-green-500' : perc >= 65 ? 'bg-yellow-400' : 'bg-red-500'
                                                        }`} style={{ width: `${perc}%` }}></div>
                                                </div>
                                                <span className="text-xs font-bold">{student.percentage}%</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {perc < 75 && (
                                                    <span className={`badge ${statusColor} flex items-center justify-center gap-1`}>
                                                        {perc < 65 ? <AlertTriangle size={12} /> : null}
                                                        {perc < 65 ? 'Critical' : 'Low'}
                                                    </span>
                                                )}
                                                {perc >= 75 && <span className="badge bg-green-50 text-green-600">Good</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-300">
                    <div className="text-gray-400 mb-4">
                        <Search size={48} className="mx-auto opacity-20" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400">No Data Found</h3>
                    <p className="text-gray-400">Select filters and click Generate to see the report.</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceReports;
