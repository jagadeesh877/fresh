import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { CheckCircle, Lock, Clock, Filter, Users, BookOpen } from 'lucide-react';

const AdminMarksApproval = () => {
    const navigate = useNavigate();
    const [selectedExam, setSelectedExam] = useState('cia1'); // 'cia1', 'cia2', 'cia3'
    const [allSubjects, setAllSubjects] = useState([]);
    const [filterDept, setFilterDept] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'PENDING', 'COMPLETED'

    // Detailed View State
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [subjectMarks, setSubjectMarks] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

    useEffect(() => {
        fetchSubjectsStatus();
    }, []);

    const fetchSubjectsStatus = async () => {
        console.log('Fetching subjects status...');
        try {
            const res = await api.get('/admin/marks-approval/status');
            console.log('Subjects status response:', res.data);
            setAllSubjects(res.data);
        } catch (error) {
            console.error('Error fetching subjects status:', error);
        }
    };

    const fetchSubjectMarks = async (subjectId) => {
        try {
            const res = await api.get(`/admin/marks-approval/${subjectId}`);
            setSubjectMarks(res.data);
            setSelectedStudents([]); // Reset selection
        } catch (error) {
            console.error('Error fetching marks:', error);
        }
    };

    const handleSubjectClick = (subject) => {
        setSelectedSubject(subject);
        fetchSubjectMarks(subject.subjectId);
    };

    const handleBack = () => {
        setSelectedSubject(null);
        setSubjectMarks([]);
        fetchSubjectsStatus(); // Refresh counts
    };

    const toggleStudentSelection = (studentId) => {
        setSelectedStudents(prev => {
            if (prev.includes(studentId)) return prev.filter(id => id !== studentId);
            return [...prev, studentId];
        });
    };

    const handleSelectAll = () => {
        if (selectedStudents.length > 0 && selectedStudents.length === subjectMarks.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(subjectMarks.map(s => s.student.id)); // Use student.id from Mark object
        }
    };

    const handleApproveSelected = async (lock = false) => {
        if (selectedStudents.length === 0) return;

        const action = lock ? 'Approve & Lock' : 'Approve';
        if (!confirm(`${action} ${selectedStudents.length} students for ${selectedExam.toUpperCase()}?`)) return;

        try {
            await api.post('/admin/marks-approval/approve', {
                subjectId: selectedSubject.subjectId,
                studentIds: selectedStudents,
                lock,
                exam: selectedExam
            });
            alert(`Success: ${action} completed for ${selectedExam.toUpperCase()}`);
            fetchSubjectMarks(selectedSubject.subjectId);
        } catch (error) {
            alert('Error approving marks');
        }
    };

    const handleUnlockSelected = async () => {
        if (selectedStudents.length === 0) return;
        if (!confirm(`Unlock ${selectedExam.toUpperCase()} marks for selected students? This allows faculty to edit them again.`)) return;

        try {
            await api.post('/admin/marks-approval/unlock', {
                subjectId: selectedSubject.subjectId,
                studentIds: selectedStudents,
                exam: selectedExam
            });
            alert(`Unlocked ${selectedExam.toUpperCase()} marks`);
            fetchSubjectMarks(selectedSubject.subjectId);
        } catch (error) {
            alert('Error unlocking marks');
        }
    };

    const handleUnapproveSelected = async () => {
        if (selectedStudents.length === 0) return;
        if (!confirm(`Revert approval for ${selectedExam.toUpperCase()}? These marks will become PENDING again.`)) return;

        try {
            await api.post('/admin/marks-approval/unapprove', {
                subjectId: selectedSubject.subjectId,
                studentIds: selectedStudents,
                exam: selectedExam
            });
            alert(`Reverted approval for ${selectedExam.toUpperCase()}`);
            fetchSubjectMarks(selectedSubject.subjectId);
        } catch (error) {
            alert('Error reverting approval');
        }
    };

    const calculateCIA = (test, assignment, attendance) => {
        return (test || 0) + (assignment || 0) + (attendance || 0);
    };

    // Filter Logic
    const filteredSubjects = allSubjects.filter(subject => {
        if (filterDept && subject.department !== filterDept) return false;
        if (filterSemester && subject.semester !== parseInt(filterSemester)) return false;

        // Filter based on Selected Exam Status
        const pendingCount = subject[`pending_${selectedExam}`] || 0;

        if (filterStatus === 'PENDING') return pendingCount > 0;
        if (filterStatus === 'COMPLETED') return pendingCount === 0;

        return true;
    });

    if (selectedSubject) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <button onClick={handleBack} className="mb-4 text-indigo-600 hover:text-indigo-800 font-medium">
                    ← Back to Subjects List
                </button>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{selectedSubject.subjectName}</h2>
                            <p className="text-gray-600 mt-1">
                                {selectedSubject.subjectCode} • {selectedSubject.department} • Semester {selectedSubject.semester}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Faculty: {selectedSubject.faculty}</p>
                            <p className="text-gray-500 mt-2">Exam: <span className="font-semibold text-blue-600">{selectedExam.toUpperCase()}</span></p>
                        </div>

                        <div className="flex flex-col gap-2 items-end">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleApproveSelected(false)}
                                    disabled={selectedStudents.length === 0}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <CheckCircle size={18} />
                                    Approve ({selectedStudents.length})
                                </button>
                                <button
                                    onClick={() => handleApproveSelected(true)}
                                    disabled={selectedStudents.length === 0}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Lock size={18} />
                                    Approve & Lock
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUnlockSelected}
                                    disabled={selectedStudents.length === 0}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                                >
                                    Unlock {selectedExam.toUpperCase()}
                                </button>
                                <button
                                    onClick={handleUnapproveSelected}
                                    disabled={selectedStudents.length === 0}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                                >
                                    Revert Approval
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {subjectMarks.length === 0 ? (
                    <div className="text-center py-12">No students found for this subject.</div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="p-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.length > 0 && selectedStudents.length === subjectMarks.length}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4"
                                            />
                                        </th>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700">Reg No</th>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-700">Dept/Year</th>
                                        <th className="p-3 text-center text-sm font-semibold text-gray-700">CIA 1</th>
                                        <th className="p-3 text-center text-sm font-semibold text-gray-700">CIA 2</th>
                                        <th className="p-3 text-center text-sm font-semibold text-gray-700">CIA 3</th>
                                        <th className="p-3 text-center text-sm font-semibold text-gray-700">Internal</th>
                                        <th className="p-3 text-center text-sm font-semibold text-gray-700">Status ({selectedExam.toUpperCase()})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {subjectMarks.map(mark => {
                                        const cia1Total = calculateCIA(mark.cia1_test, mark.cia1_assignment, mark.cia1_attendance);
                                        const cia2Total = calculateCIA(mark.cia2_test, mark.cia2_assignment, mark.cia2_attendance);
                                        const cia3Total = calculateCIA(mark.cia3_test, mark.cia3_assignment, mark.cia3_attendance);

                                        const isLocked = mark[`isLocked_${selectedExam}`];
                                        const isApproved = mark[`isApproved_${selectedExam}`];

                                        return (
                                            <tr key={mark.studentId} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(mark.studentId)}
                                                        onChange={() => toggleStudentSelection(mark.studentId)}
                                                        className="w-4 h-4"
                                                    />
                                                </td>
                                                <td className="p-3 text-sm font-mono">{mark.student.registerNumber}</td>
                                                <td className="p-3 text-sm font-medium text-gray-800">{mark.student.name}</td>
                                                <td className="p-3 text-sm text-gray-600">{mark.student.department}-{mark.student.year}</td>
                                                <td className="p-3 text-center text-sm font-mono">{cia1Total.toFixed(1)}</td>
                                                <td className="p-3 text-center text-sm font-mono">{cia2Total.toFixed(1)}</td>
                                                <td className="p-3 text-center text-sm font-mono">{cia3Total.toFixed(1)}</td>
                                                <td className="p-3 text-center text-sm font-bold text-indigo-600">{mark.internal?.toFixed(1) || '-'}</td>
                                                <td className="p-3 text-center">
                                                    {isLocked ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                            <Lock size={12} /> Locked
                                                        </span>
                                                    ) : isApproved ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                                            <CheckCircle size={12} /> Approved
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                                            <Clock size={12} /> Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const departments = [...new Set(allSubjects.map(s => s.department))];
    const semesters = [...new Set(allSubjects.map(s => s.semester))].sort((a, b) => a - b);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Marks Approval</h1>
                <p className="text-gray-600 mt-1">Review and approve marks submitted by faculty</p>
                <div className="mt-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200 inline-flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 pl-2">Exam Focus:</span>
                    <select
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        className="border-none bg-blue-50 text-blue-700 font-semibold rounded focus:ring-0 cursor-pointer py-1 px-3"
                    >
                        <option value="cia1">CIA 1</option>
                        <option value="cia2">CIA 2</option>
                        <option value="cia3">CIA 3</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border-2 border-yellow-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-700 text-sm font-medium">Pending Subjects</p>
                            <p className="text-3xl font-bold text-yellow-800 mt-1">
                                {allSubjects.filter(s => s[`pending_${selectedExam}`] > 0).length}
                            </p>
                        </div>
                        <Clock size={40} className="text-yellow-600 opacity-50" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border-2 border-indigo-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-700 text-sm font-medium">Total Subjects</p>
                            <p className="text-3xl font-bold text-indigo-800 mt-1">
                                {allSubjects.length}
                            </p>
                        </div>
                        <BookOpen size={40} className="text-indigo-600 opacity-50" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-600" />
                        <span className="font-semibold text-gray-700">Filters:</span>
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending Action</option>
                        <option value="COMPLETED">Fully Approved</option>
                    </select>

                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                    <select
                        value={filterSemester}
                        onChange={(e) => setFilterSemester(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Semesters</option>
                        {semesters.map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-left text-sm font-semibold text-gray-700">Subject Code</th>
                                <th className="p-4 text-left text-sm font-semibold text-gray-700">Subject Name</th>
                                <th className="p-4 text-left text-sm font-semibold text-gray-700">Department</th>
                                <th className="p-4 text-left text-sm font-semibold text-gray-700">Semester</th>
                                <th className="p-4 text-left text-sm font-semibold text-gray-700">Faculty</th>
                                <th className="p-4 text-center text-sm font-semibold text-gray-700">Status</th>
                                <th className="p-4 text-center text-sm font-semibold text-gray-700">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSubjects.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        No subjects found matching filters
                                    </td>
                                </tr>
                            ) : (
                                filteredSubjects.map(subject => {
                                    const pending = subject[`pending_${selectedExam}`] || 0;
                                    const approved = subject[`approved_${selectedExam}`] || 0;
                                    const locked = subject[`locked_${selectedExam}`] || 0;

                                    // Status Logic for Display
                                    let statusEl;
                                    if (pending > 0) {
                                        statusEl = (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                                                {pending} Pending
                                            </span>
                                        );
                                    } else if (locked > 0) {
                                        // If locked, it's done. 
                                        // Note: Logic in original was `subject.locked === subject.total`.
                                        // Here we use the granular locked count. If all are locked (equal to total), or just display Locked count?
                                        // Let's just say if locked > 0 (and no pending), it implies work is proceeding/done.
                                        // Or better: If pending == 0.
                                        statusEl = (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                                Locked
                                            </span>
                                        );
                                    } else {
                                        // Approved but not locked? or just completed?
                                        statusEl = (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                                Approved
                                            </span>
                                        );
                                    }

                                    return (
                                        <tr key={subject.subjectId} className="hover:bg-gray-50">
                                            <td className="p-4 text-sm font-mono text-gray-800">{subject.subjectCode}</td>
                                            <td className="p-4 text-sm font-medium text-gray-800">{subject.subjectName}</td>
                                            <td className="p-4 text-sm text-gray-600">{subject.department}</td>
                                            <td className="p-4 text-sm text-gray-600">{subject.semester}</td>
                                            <td className="p-4 text-sm text-gray-600">{subject.faculty}</td>
                                            <td className="p-4 text-center">
                                                {statusEl}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleSubjectClick(subject)}
                                                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium"
                                                >
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminMarksApproval;
