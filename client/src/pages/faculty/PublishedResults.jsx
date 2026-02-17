import React, { useState, useEffect } from 'react';
import { Award, Search, AlertCircle, FileText } from 'lucide-react';
import api from '../../api/axios';

const PublishedResults = () => {
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const res = await api.get('/faculty/assignments');
            setAssignments(res.data);
            if (res.data.length > 0) setSelectedAssignmentId(res.data[0].id);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = async () => {
        if (!selectedAssignmentId) return;
        setLoading(true);
        setError('');
        try {
            const assignment = assignments.find(a => a.id === parseInt(selectedAssignmentId));
            if (!assignment) return;

            const res = await api.get('/exam/faculty-results', {
                params: {
                    department: assignment.subject.department,
                    year: assignment.studentYear || 2, // Assuming from assignment or student record
                    semester: assignment.subject.semester,
                    section: assignment.section,
                    subjectId: assignment.subject.id
                }
            });
            setStudents(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error fetching results. They may not be published yet.');
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-[#003B73]">
                    <Award className="text-blue-600" /> Published Semester Results
                </h1>
                <p className="text-gray-500">View official marks and grades after publication by COE.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 animate-fadeIn delay-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subject/Class</label>
                        <select
                            className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedAssignmentId}
                            onChange={e => setSelectedAssignmentId(e.target.value)}
                        >
                            <option value="">Choose Class...</option>
                            {assignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.subject.code} - {a.subject.name} (Sec {a.section})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleSearch}
                            className="bg-[#003B73] text-white px-6 py-2 rounded-lg hover:bg-[#002850] transition-colors flex items-center gap-2 font-semibold"
                        >
                            <Search size={18} /> View Results
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3 text-orange-700">
                        <AlertCircle size={20} />
                        <p className="font-medium">{error}</p>
                    </div>
                )}
            </div>

            {students.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-fadeIn delay-200">
                    <table className="w-full text-left">
                        <thead className="bg-[#003B73] text-white">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase text-sm">Roll Number</th>
                                <th className="px-6 py-4 font-semibold uppercase text-sm">Student Name</th>
                                <th className="px-6 py-4 font-semibold uppercase text-sm text-center">CIA Marks</th>
                                <th className="px-6 py-4 font-semibold uppercase text-sm text-center">End Sem</th>
                                <th className="px-6 py-4 font-semibold uppercase text-sm text-center">Total</th>
                                <th className="px-6 py-4 font-semibold uppercase text-sm text-center">Grade</th>
                                <th className="px-6 py-4 font-semibold uppercase text-sm text-center">GPA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.map(s => {
                                const internal = s.marks[0]?.internal || 0;
                                const external = s.marks[0]?.endSemMarks?.externalMarks || 0;
                                const total = internal + external;
                                const result = s.results[0] || {};

                                return (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-[#003B73] font-bold uppercase">{s.rollNo}</td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{s.name}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{internal}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{external}</td>
                                        <td className="px-6 py-4 text-center font-bold text-gray-800">{total}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.marks[0]?.endSemMarks?.resultStatus === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {s.marks[0]?.endSemMarks?.grade || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">{result.gpa || '0.00'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && students.length === 0 && !error && (
                <div className="p-20 text-center text-gray-400 bg-white rounded-xl shadow-sm border border-dashed border-gray-200">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Select a class to view published results.</p>
                </div>
            )}
        </div>
    );
};

export default PublishedResults;
