import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { BookOpen, UserPlus, CheckCircle, Trash2 } from 'lucide-react';

const SubjectManager = () => {
    const navigate = useNavigate();
    const [subjectList, setSubjectList] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [newSubject, setNewSubject] = useState({ code: '', name: '', department: '', semester: '' });
    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');

    // Assignment Mode
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [assignFacultyId, setAssignFacultyId] = useState('');
    const [assignSection, setAssignSection] = useState('A');

    useEffect(() => {
        refreshSubjects();
        refreshFaculty();
    }, []);

    const refreshSubjects = async () => {
        try {
            const res = await api.get('/admin/subjects');
            setSubjectList(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    const refreshFaculty = async () => {
        try {
            const res = await api.get('/admin/faculty');
            setFacultyList(res.data);
        } catch (err) {
            console.error(err);
        }
    }

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/subjects', newSubject);
            setNewSubject({ code: '', name: '', department: '', semester: '' });
            refreshSubjects();
            alert('Subject Created');
        } catch (err) {
            alert('Error creating subject');
        }
    }

    const handleAssignFaculty = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/assign-faculty', {
                facultyId: assignFacultyId,
                subjectId: selectedSubjectId,
                section: assignSection
            });
            alert('Faculty Assigned Successfully');
            setSelectedSubjectId(null);
            refreshSubjects();
        } catch (err) {
            alert('Error assigning faculty');
        }
    }

    const handleRemoveAssignment = async (assignmentId) => {
        if (!confirm('Remove this faculty assignment?')) return;
        try {
            await api.delete(`/admin/assign-faculty/${assignmentId}`);
            alert('Assignment removed successfully');
            refreshSubjects();
        } catch (err) {
            alert('Error removing assignment');
        }
    };

    const handleDeleteSubject = async (id) => {
        if (!confirm('Are you sure you want to delete this course? This will remove all related marks and assignments.')) return;
        try {
            await api.delete(`/admin/subjects/${id}`);
            alert('Subject deleted successfully');
            refreshSubjects();
        } catch (err) {
            alert('Failed to delete subject');
        }
    };

    // Filter Logic
    // Filter Logic
    const filteredSubjects = (Array.isArray(subjectList) ? subjectList : []).filter(s => {
        const name = s.name ? s.name.toLowerCase() : '';
        const code = s.code ? s.code.toLowerCase() : '';
        const search = searchTerm.toLowerCase();

        const matchesSearch = name.includes(search) || code.includes(search);
        const matchesDept = filterDept ? s.department === filterDept : true;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Subject Management</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Subject */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-indigo-600" />
                        Create New Subject
                    </h3>
                    <form onSubmit={handleCreateSubject} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                            <input className="input-field" value={newSubject.code} onChange={e => setNewSubject({ ...newSubject, code: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                            <input className="input-field" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select className="input-field" value={newSubject.department} onChange={e => setNewSubject({ ...newSubject, department: e.target.value })} required>
                                    <option value="">Select</option>
                                    {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                                <input type="number" className="input-field" value={newSubject.semester} onChange={e => setNewSubject({ ...newSubject, semester: e.target.value })} required min="1" max="8" />
                            </div>
                        </div>
                        <button type="submit" className="w-full btn btn-primary mt-2">Add Subject</button>
                    </form>
                </div>

                {/* List & Assign */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <h3 className="text-lg font-semibold">Course List</h3>

                        {/* Search & Filter UI */}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search Subject..."
                                className="input-field text-sm py-1"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <select
                                className="input-field text-sm py-1 w-32"
                                value={filterDept}
                                onChange={e => setFilterDept(e.target.value)}
                            >
                                <option value="">All Depts</option>
                                {['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'].map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-sm">
                                <tr>
                                    <th className="p-3">Code</th>
                                    <th className="p-3">Subject</th>
                                    <th className="p-3">Dept/Sem</th>
                                    <th className="p-3">Assignments</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredSubjects.map(sub => (
                                    <tr key={sub.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-mono text-xs">{sub.code}</td>
                                        <td className="p-3 font-medium text-gray-800">{sub.name}</td>
                                        <td className="p-3 text-sm text-gray-500">{sub.department}-S{sub.semester}</td>
                                        <td className="p-3">
                                            {sub.assignments?.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {sub.assignments.map((a, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 flex-1">
                                                                Sec {a.section}: {a.facultyName}
                                                            </span>
                                                            <button
                                                                onClick={() => handleRemoveAssignment(a.id)}
                                                                className="text-red-600 hover:bg-red-50 p-1 rounded"
                                                                title="Remove assignment"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <span className="text-gray-400 text-xs italic">Unassigned</span>}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedSubjectId(sub.id)}
                                                    className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 flex items-center gap-1"
                                                >
                                                    <UserPlus size={14} /> Assign
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/admin/marks/${sub.id}`)}
                                                    className="text-sm bg-emerald-50 text-emerald-600 px-3 py-1 rounded hover:bg-emerald-100 flex items-center gap-1"
                                                >
                                                    📊 Marks
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSubject(sub.id)}
                                                    className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 flex items-center gap-1 ml-2"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Assignment Modal */}
            {selectedSubjectId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-fade-in">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Assign Faculty</h3>
                        <form onSubmit={handleAssignFaculty}>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2">Select Faculty</label>
                                <select className="input-field" value={assignFacultyId} onChange={e => setAssignFacultyId(e.target.value)} required>
                                    <option value="">-- Select Faculty --</option>
                                    {facultyList.map(f => (
                                        <option key={f.id} value={f.id}>{f.fullName} ({f.department})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold mb-2">Section</label>
                                <select className="input-field" value={assignSection} onChange={e => setAssignSection(e.target.value)} required>
                                    {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setSelectedSubjectId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Assignment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubjectManager;
