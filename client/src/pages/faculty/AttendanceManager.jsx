import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Save, Calendar, CheckCircle, XCircle, Search, UserCheck, Briefcase } from 'lucide-react';

const AttendanceManager = () => {
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyTaken, setAlreadyTaken] = useState(false);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const res = await api.get('/faculty/assignments');
            setAssignments(res.data);
            if (res.data.length > 0) {
                // Auto select first
                // setSelectedAssignment(res.data[0].id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchStudents = async () => {
        if (!selectedAssignment) return;
        setLoading(true);
        try {
            const assignment = assignments.find(a => a.id === parseInt(selectedAssignment));
            if (!assignment) return;

            const res = await api.get('/faculty/attendance/students', {
                params: {
                    subjectId: assignment.subjectId,
                    section: assignment.section,
                    date: selectedDate
                }
            });

            // Add 'status' field to local state if not present (default PRESENT)
            // The API returns status if already taken, or default PRESENT if not.
            // But we need to make it mutable in UI without changing 'status' prop directly if strictly react, 
            // but here we can just map it.
            const studentList = res.data.students.map(s => ({
                ...s,
                status: s.status || 'PRESENT'
            }));

            setStudents(studentList);
            setAlreadyTaken(res.data.isAlreadyTaken);

        } catch (err) {
            alert("Failed to fetch students");
        } finally {
            setLoading(false);
        }
    };

    // Toggle Status - Three-state cycle: PRESENT -> ABSENT -> OD -> PRESENT
    const toggleStatus = (studentId) => {
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                let newStatus;
                if (s.status === 'PRESENT') newStatus = 'ABSENT';
                else if (s.status === 'ABSENT') newStatus = 'OD';
                else newStatus = 'PRESENT';
                return { ...s, status: newStatus };
            }
            return s;
        }));
    };

    const markAll = (status) => {
        setStudents(prev => prev.map(s => ({ ...s, status })));
    };

    const handleSubmit = async () => {
        if (!confirm(`Submit attendance for ${students.length} students?`)) return;

        setSubmitting(true);
        try {
            const assignment = assignments.find(a => a.id === parseInt(selectedAssignment));

            const attendanceData = students.map(s => ({
                studentId: s.id,
                status: s.status
            }));

            await api.post('/faculty/attendance', {
                subjectId: assignment.subjectId,
                date: selectedDate,
                // period: 1, // Optional: add period selector UI later if needed
                attendanceData
            });

            alert("Attendance submitted successfully!");
            setAlreadyTaken(true);
        } catch (err) {
            alert("Failed to submit attendance");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="animate-fadeIn">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <UserCheck size={32} className="text-[#003B73]" />
                    Attendance Manager
                </h1>
                <p className="text-gray-600">Mark daily attendance for your classes.</p>
            </div>

            {/* Controls */}
            <div className="premium-card p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-l-4 border-[#003B73]">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Class</label>
                    <select
                        className="input-field w-full"
                        value={selectedAssignment}
                        onChange={e => setSelectedAssignment(e.target.value)}
                    >
                        <option value="">-- Select Class --</option>
                        {assignments.map(a => (
                            <option key={a.id} value={a.id}>
                                {a.subject.name} - Sec {a.section} ({a.subject.department})
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                    <input
                        type="date"
                        className="input-field w-full"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={fetchStudents}
                        disabled={!selectedAssignment || loading}
                        className="btn btn-primary w-full flex justify-center items-center gap-2"
                    >
                        {loading ? 'Loading...' : 'Fetch Students'} <Search size={18} />
                    </button>
                </div>
            </div>

            {/* Student List */}
            {students.length > 0 && (
                <div className="premium-card overflow-hidden animate-fadeIn">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center flex-wrap gap-4">
                        <div className="flex gap-4">
                            <span className="text-sm font-bold text-gray-600">
                                Total: <span className="text-[#003B73] text-lg">{students.length}</span>
                            </span>
                            <span className="text-sm font-bold text-green-600">
                                Present: <span className="text-lg">{students.filter(s => s.status === 'PRESENT').length}</span>
                            </span>
                            <span className="text-sm font-bold text-red-600">
                                Absent: <span className="text-lg">{students.filter(s => s.status === 'ABSENT').length}</span>
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                                OD: <span className="text-lg">{students.filter(s => s.status === 'OD').length}</span>
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => markAll('PRESENT')} className="btn bg-green-100 text-green-700 hover:bg-green-200 text-xs">
                                Mark All Present
                            </button>
                            <button onClick={() => markAll('ABSENT')} className="btn bg-red-100 text-red-700 hover:bg-red-200 text-xs">
                                Mark All Absent
                            </button>
                            <button onClick={() => markAll('OD')} className="btn bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs">
                                Mark All OD
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 text-left">Roll No</th>
                                    <th className="p-4 text-left">Reg No</th>
                                    <th className="p-4 text-left">Name</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, idx) => (
                                    <tr key={student.id} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-mono text-[#003B73] font-bold">{student.rollNo}</td>
                                        <td className="p-4 font-mono text-gray-500 text-sm italic">{student.registerNumber || '-'}</td>
                                        <td className="p-4 font-medium text-gray-800">{student.name}</td>
                                        <td className="p-4 flex justify-center">
                                            <button
                                                onClick={() => toggleStatus(student.id)}
                                                className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all transform active:scale-95 ${student.status === 'PRESENT'
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 ring-2 ring-green-400'
                                                    : student.status === 'ABSENT'
                                                        ? 'bg-red-100 text-red-700 hover:bg-red-200 ring-2 ring-red-400'
                                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 ring-2 ring-blue-400'
                                                    }`}
                                            >
                                                {student.status === 'PRESENT' ? (
                                                    <>
                                                        <CheckCircle size={18} /> Present
                                                    </>
                                                ) : student.status === 'ABSENT' ? (
                                                    <>
                                                        <XCircle size={18} /> Absent
                                                    </>
                                                ) : (
                                                    <>
                                                        <Briefcase size={18} /> OD
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 bg-white border-t sticky bottom-0 z-20 shadow-inner">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`btn w-full text-lg py-4 flex items-center justify-center gap-3 shadow-xl ${alreadyTaken ? 'btn-secondary' : 'btn-primary'
                                }`}
                        >
                            <Save size={24} />
                            {submitting ? 'Saving...' : alreadyTaken ? 'Update Attendance' : 'Submit Attendance'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceManager;
