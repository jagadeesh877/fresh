import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    BookOpen, Users, Calendar, Award, CheckCircle,
    AlertCircle, Search, Download, ChevronLeft, FileSpreadsheet
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Tab Components (Internal for simplicity, can be split later)
const OverviewTab = ({ details }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="text-[#003B73]" size={20} />
                Subject Information
            </h3>
            <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Subject Name</span>
                    <span className="font-medium text-gray-900">{details.subject.name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Subject Code</span>
                    <span className="font-mono text-gray-900">{details.subject.code}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Department</span>
                    <span className="font-medium text-gray-900">{details.subject.department}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">Semester</span>
                    <span className="font-medium text-gray-900">{details.subject.semester}</span>
                </div>
                <div className="flex justify-between pt-2">
                    <span className="text-gray-600">Credits</span>
                    <span className="font-medium text-gray-900">4 (Demo)</span>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="text-emerald-600" size={20} />
                Course Progress
            </h3>
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Syllabus Completion</span>
                    <span className="font-bold text-[#003B73]">{details.syllabusCompletion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000"
                        style={{ width: `${details.syllabusCompletion}%` }}
                    ></div>
                </div>
            </div>

        </div>
    </div>
);

const StudentsTab = ({ subjectId }) => {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await api.get(`/faculty/class/${subjectId}/students`);
                setStudents(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, [subjectId]);

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(search.toLowerCase())
    );

    const exportToExcel = async () => {
        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Students");

        // Add columns
        worksheet.columns = [
            { header: 'Roll No', key: 'rollNo', width: 20 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Attendance %', key: 'attendance', width: 15 },
            { header: 'CIA Total', key: 'cia', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        // Add rows
        students.forEach(s => {
            worksheet.addRow({
                rollNo: s.rollNo,
                name: s.name,
                attendance: s.attendancePercentage,
                cia: s.isCiaAbsent ? 'ABSENT' : s.ciaTotal,
                status: s.status
            });
        });

        // Generate filename
        const filename = `Students_${subjectId}.xlsx`;

        // Write to buffer and save
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
    };

    if (loading) return <div className="text-center py-8">Loading students...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-fadeIn">
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 font-medium"
                >
                    <Download size={18} /> Export List
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 text-gray-600 text-sm font-semibold">
                        <tr>
                            <th className="p-4 text-left">Roll No</th>
                            <th className="p-4 text-left">Name</th>
                            <th className="p-4 text-center">Attendance</th>
                            <th className="p-4 text-center">CIA Total</th>
                            <th className="p-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 font-mono text-sm text-[#003B73] font-bold">{s.rollNo}</td>
                                <td className="p-4 font-medium text-gray-800">{s.name}</td>
                                <td className="p-4 text-center">
                                    <span className={`font-bold ${s.attendancePercentage < 75 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {s.attendancePercentage}%
                                    </span>
                                </td>
                                <td className="p-4 text-center text-gray-700">
                                    {s.isCiaAbsent ? (
                                        <span className="text-red-600 font-bold">ABSENT</span>
                                    ) : (
                                        s.ciaTotal.toFixed(1)
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    {s.status === 'Eligible' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                            <CheckCircle size={12} /> Eligible
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                            <AlertCircle size={12} /> Shortage
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AttendanceTab = ({ subjectId, subject }) => {
    const [attendance, setAttendance] = useState([]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        api.get(`/faculty/class/${subjectId}/attendance`).then(res => setAttendance(res.data));
    }, [subjectId]);

    const exportToExcel = async () => {
        setExporting(true);
        try {
            const response = await api.get(`/faculty/class/${subjectId}/attendance/export-excel`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Attendance_${subject.code}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Attendance History</h3>
                <button
                    onClick={exportToExcel}
                    disabled={exporting || attendance.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileSpreadsheet size={18} /> {exporting ? 'Exporting...' : 'Export to Excel'}
                </button>
            </div>
            {attendance.length === 0 ? (
                <p className="text-gray-500">No attendance records found.</p>
            ) : (
                <div className="space-y-3">
                    {attendance.map((record, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-50 rounded-xl border border-gray-100 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                                    <Calendar size={20} />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900">{record.date}</span>
                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100">{subject.code}</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">{subject.name}</p>
                                </div>
                            </div>
                            <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end border-t md:border-t-0 pt-3 md:pt-0">
                                <p className="text-base font-black text-[#003B73]">{record.percentage}% Present</p>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                    <span className="text-emerald-600">{record.present} Present</span> • <span className="text-red-600">{record.absent} Absent</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ClassDetails = () => {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const [details, setDetails] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await api.get(`/faculty/class/${subjectId}/details`);
                setDetails(res.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchDetails();
    }, [subjectId]);

    if (!details) return <div className="p-8 text-center">Loading details...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <button
                onClick={() => navigate('/faculty/classes')}
                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-[#003B73] font-medium transition-colors"
            >
                <ChevronLeft size={20} /> Back to My Classes
            </button>

            {/* Header Card */}
            <div className="bg-[#003B73] rounded-2xl p-8 text-white shadow-lg mb-8 animate-fadeIn">
                <h1 className="text-3xl font-bold mb-2">{details.subject.name}</h1>
                <p className="opacity-90 font-mono text-lg mb-6">{details.subject.code} • {details.subject.department} - {details.subject.year} Year</p>

                <div className="flex gap-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs opacity-80 uppercase tracking-wider font-semibold">Students</p>
                            <p className="text-2xl font-bold">{details.studentCount}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-xs opacity-80 uppercase tracking-wider font-semibold">Total Classes</p>
                            <p className="text-2xl font-bold">{details.totalEstimatedClasses || 45}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200 mb-6 w-full md:w-fit animate-slideUp">
                {['overview', 'students', 'attendance', 'marks'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 capitalize ${activeTab === tab
                            ? 'bg-[#003B73] text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && <OverviewTab details={details} />}
                {activeTab === 'students' && <StudentsTab subjectId={subjectId} />}
                {activeTab === 'attendance' && <AttendanceTab subjectId={subjectId} subject={details.subject} />}
                {activeTab === 'marks' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <Award className="mx-auto text-blue-400 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Marks Management</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Enter, update, and manage CIA marks for this class. Marks are automatically locked after submission.
                        </p>
                        <button
                            onClick={() => navigate('/faculty/marks')} // Ideally deep link with subject ID pre-selected
                            className="btn btn-primary px-8 py-3"
                        >
                            Go to Marks Entry
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassDetails;
