import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BookOpen, UserPlus, Trash2, Plus, X } from 'lucide-react';

const CourseManager = () => {
    const [subjectList, setSubjectList] = useState([]);
    const [facultyList, setFacultyList] = useState([]);

    // Create Mode
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCourse, setNewCourse] = useState({ code: '', name: '', department: '', semester: '' });

    // Assignment Mode
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [assignFacultyId, setAssignFacultyId] = useState('');
    const [assignSection, setAssignSection] = useState('A');

    const [departments, setDepartments] = useState([]);

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');

    useEffect(() => {
        refreshSubjects();
        refreshFaculty();
        fetchDepartments();
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

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/subjects', newCourse);
            alert('Course Created Successfully');
            setShowCreateModal(false);
            setNewCourse({ code: '', name: '', department: '', semester: '' });
            refreshSubjects();
        } catch (err) {
            alert('Error creating course. Code might be duplicate.');
        }
    }

    const handleDeleteCourse = async (id) => {
        if (!confirm('Are you sure you want to delete this course? This will remove all faculty assignments for it.')) return;
        try {
            await api.delete(`/admin/subjects/${id}`);
            refreshSubjects();
        } catch (err) {
            alert('Failed to delete course. Ensure no student marks are linked.');
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
            refreshSubjects();
        } catch (err) {
            alert('Error removing assignment');
        }
    }

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/admin/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error("Failed to fetch departments");
        }
    }

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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Course & Faculty Assignment</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} /> Add New Course
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                {/* Search & Filter UI */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h3 className="text-lg font-semibold">Course List</h3>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Search Course..."
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
                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm">
                            <tr>
                                <th className="p-3">Course Code</th>
                                <th className="p-3">Course Name</th>
                                <th className="p-3">Dept/Sem</th>
                                <th className="p-3">Assigned Faculty</th>
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
                                            <div className="flex flex-col gap-2">
                                                {sub.assignments.map((a, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit gap-3">
                                                        <span className="text-xs font-medium text-blue-800">
                                                            {a.facultyName} <span className="text-blue-500">(Sec {a.section})</span>
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveAssignment(a.id)}
                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                            title="Remove Assignment"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : <span className="text-gray-400 text-xs italic">Unassigned</span>}
                                    </td>
                                    <td className="p-3 flex items-center gap-2">
                                        <button onClick={() => setSelectedSubjectId(sub.id)} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-100 flex items-center gap-1">
                                            <UserPlus size={14} /> Assign
                                        </button>
                                        <button onClick={() => handleDeleteCourse(sub.id)} className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100 flex items-center gap-1 ml-2">
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {subjectList.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500 italic">No courses created yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Course Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <BookOpen size={20} className="text-blue-600" /> Create New Course
                        </h3>
                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Course Code</label>
                                <input className="input-field" placeholder="e.g. CS101" value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Course Name</label>
                                <input className="input-field" placeholder="e.g. Data Structures" value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Department</label>
                                    <select className="input-field" value={newCourse.department} onChange={e => setNewCourse({ ...newCourse, department: e.target.value })} required>
                                        <option value="">Select Dept</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Semester</label>
                                    <input type="number" min="1" max="8" className="input-field" value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} required />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {selectedSubjectId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
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

export default CourseManager;
