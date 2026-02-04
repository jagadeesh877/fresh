import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { Users, ChevronRight, GraduationCap, Plus, X, ArrowLeft, Trash2, Settings } from 'lucide-react';

const StudentManager = () => {
    const [selectedDept, setSelectedDept] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedSection, setSelectedSection] = useState(null);
    const [studentsList, setStudentsList] = useState([]);

    // Dynamic Departments
    const [departments, setDepartments] = useState([]);
    const [loadingDepts, setLoadingDepts] = useState(false);

    // UI States
    const [loading, setLoading] = useState(false);
    const location = useLocation();

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeptModal, setShowDeptModal] = useState(false);

    // Form Inputs
    const [newStudent, setNewStudent] = useState({
        registerNumber: '',
        name: '',
        department: '',
        year: '',
        section: '',
        semester: ''
    });

    const [newDeptName, setNewDeptName] = useState('');

    useEffect(() => {
        fetchDepartments();
        if (location.state?.openAddModal) {
            setShowCreateModal(true);
        }
    }, [location]);

    const fetchDepartments = async () => {
        setLoadingDepts(true);
        try {
            const res = await api.get('/admin/departments');
            if (res.data.length > 0) {
                setDepartments(res.data);
            } else {
                // Determine if we should show defaults visually or wait for user to add
                // Let's seed defaults in frontend state if DB is empty to start with useful UX
                // But better to let user manage.
                setDepartments([]);
            }
        } catch (err) {
            console.error("Failed to fetch departments");
        } finally {
            setLoadingDepts(false);
        }
    }

    const fetchStudents = async (section) => {
        setSelectedSection(section);
        setLoading(true);
        try {
            const res = await api.get('/admin/students');
            const allStudents = Array.isArray(res.data) ? res.data : [];
            const filtered = allStudents.filter(s =>
                s.department === selectedDept &&
                s.year === parseInt(selectedYear) &&
                s.section === section
            );
            setStudentsList(filtered);
        } catch (err) {
            console.error(err);
            alert('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    }

    const resetSelection = (level) => {
        if (level === 0) { setSelectedDept(null); setSelectedYear(null); setSelectedSection(null); }
        if (level === 1) { setSelectedYear(null); setSelectedSection(null); }
        if (level === 2) { setSelectedSection(null); }
    }

    const handleBack = () => {
        if (selectedSection) {
            setSelectedSection(null);
        } else if (selectedYear) {
            setSelectedYear(null);
        } else if (selectedDept) {
            setSelectedDept(null);
        }
    }

    const handleCreateStudent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/students', newStudent);
            alert('Student Added Successfully');
            setShowCreateModal(false);
            setNewStudent({
                registerNumber: '',
                name: '',
                department: '',
                year: '',
                section: '',
                semester: ''
            });
            if (
                selectedDept === newStudent.department &&
                parseInt(selectedYear) === parseInt(newStudent.year) &&
                selectedSection === newStudent.section
            ) {
                fetchStudents(selectedSection);
            }
        } catch (err) {
            alert('Error adding student. Register Number might be duplicate.');
        }
    }

    const handleDeleteStudent = async (id) => {
        if (!confirm('Are you sure you want to delete this student? All marks will be lost.')) return;
        try {
            await api.delete(`/admin/students/${id}`);
            setStudentsList(studentsList.filter(s => s.id !== id));
        } catch (err) {
            alert('Failed to delete student');
        }
    }

    // --- Dept Management Handlers ---
    const handleCreateDept = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/departments', { name: newDeptName.toUpperCase() });
            setNewDeptName('');
            fetchDepartments();
        } catch (err) {
            alert('Failed to create department');
        }
    }

    const handleDeleteDept = async (id) => {
        if (!confirm('Delete department? Ensure no students depend on it (or they might get hidden).')) return;
        try {
            await api.delete(`/admin/departments/${id}`);
            fetchDepartments();
        } catch (err) {
            alert('Failed to delete department');
        }
    }

    // Use default list if DB is empty to prevent broken UI initially, 
    // OR just show empty states. Let's merge defaults if empty for now?
    // User requested "Able to add new or delete".
    // If DB has data, use it. If not, use defaults and allow user to save them?
    // Let's stick to DB source of truth. If empty, show "Add Department".

    // Actually, for better UX since we wiped the old static list:
    // If departments.length is 0, we can show a prompt.
    // Use 'departments' state for rendering.

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
                    <button
                        onClick={() => setShowDeptModal(true)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                        title="Manage Departments"
                    >
                        <Settings size={20} />
                    </button>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} /> Add New Student
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
                {/* Back Button & Breadcrumbs */}
                <div className="flex items-center gap-4 mb-8">
                    {selectedDept && (
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                        <button
                            onClick={() => resetSelection(0)}
                            className={`hover:text-blue-600 ${!selectedDept ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                        >
                            Departments
                        </button>
                        {selectedDept && <ChevronRight size={16} className="text-gray-400" />}

                        {selectedDept && (
                            <button
                                onClick={() => resetSelection(1)}
                                className={`hover:text-blue-600 ${!selectedYear ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                            >
                                {selectedDept}
                            </button>
                        )}
                        {selectedYear && <ChevronRight size={16} className="text-gray-400" />}

                        {selectedYear && (
                            <button
                                onClick={() => resetSelection(2)}
                                className={`hover:text-blue-600 ${!selectedSection ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                            >
                                Year {selectedYear}
                            </button>
                        )}
                        {selectedSection && <ChevronRight size={16} className="text-gray-400" />}

                        {selectedSection && (
                            <span className="font-bold text-blue-600">Section {selectedSection}</span>
                        )}
                    </div>
                </div>

                {/* Level 1: Dept */}
                {!selectedDept && (
                    <>
                        {departments.length === 0 && (
                            <div className="text-center p-8 bg-yellow-50 rounded text-yellow-800 border border-yellow-200 mb-6">
                                <p>No departments found. Click the <b>Settings icon</b> above or "Add New Student" to manage departments.</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
                            {departments.map(dept => (
                                <div key={dept.id} onClick={() => setSelectedDept(dept.name)}
                                    className="group p-8 bg-blue-50 hover:bg-blue-600 rounded-xl cursor-pointer transition-all duration-300 border border-blue-100 hover:shadow-lg flex flex-col items-center justify-center text-center relative">
                                    <GraduationCap className="w-10 h-10 text-blue-600 group-hover:text-white mb-3" />
                                    <h3 className="text-lg font-bold text-blue-900 group-hover:text-white">{dept.name}</h3>
                                    <p className="text-sm text-blue-400 group-hover:text-blue-100 mt-1">Select Department</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Level 2: Year */}
                {selectedDept && !selectedYear && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in">
                        {[1, 2, 3, 4].map(year => (
                            <div key={year} onClick={() => setSelectedYear(year)}
                                className="group p-8 bg-indigo-50 hover:bg-indigo-600 rounded-xl cursor-pointer transition-all duration-300 border border-indigo-100 hover:shadow-lg flex flex-col items-center justify-center text-center">
                                <span className="text-3xl font-black text-indigo-300 group-hover:text-indigo-400 mb-2">{year}</span>
                                <h3 className="text-lg font-bold text-indigo-900 group-hover:text-white">Year {year}</h3>
                                <p className="text-sm text-indigo-400 group-hover:text-indigo-100">Semesters {(year * 2) - 1} & {year * 2}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Level 3: Section */}
                {selectedDept && selectedYear && !selectedSection && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in">
                        {['A', 'B', 'C'].map(sec => (
                            <div key={sec} onClick={() => fetchStudents(sec)}
                                className="group p-8 bg-emerald-50 hover:bg-emerald-600 rounded-xl cursor-pointer transition-all duration-300 border border-emerald-100 hover:shadow-lg flex flex-col items-center justify-center text-center">
                                <Users className="w-10 h-10 text-emerald-600 group-hover:text-white mb-3" />
                                <h3 className="text-lg font-bold text-emerald-900 group-hover:text-white">Section {sec}</h3>
                                <p className="text-sm text-emerald-500 group-hover:text-emerald-100">View Students</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Level 4: List */}
                {selectedSection && (
                    <div className="animate-fade-in">
                        {loading ? (
                            <div className="text-center p-10"><p>Loading students...</p></div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600">Reg No</th>
                                        <th className="p-4 font-semibold text-gray-600">Name</th>
                                        <th className="p-4 font-semibold text-gray-600">Semester</th>
                                        <th className="p-4 font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsList.map(s => (
                                        <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-4 font-mono text-sm">{s.registerNumber}</td>
                                            <td className="p-4 font-medium text-gray-800">{s.name}</td>
                                            <td className="p-4">{s.semester}</td>
                                            <td className="p-4 flex gap-3">
                                                <button onClick={() => handleDeleteStudent(s.id)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded" title="Delete Student">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {studentsList.length === 0 && (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-500 italic">No students found for this class.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Manage Departments Modal */}
            {showDeptModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Manage Departments</h3>
                            <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDept} className="flex gap-2 mb-6">
                            <input
                                className="input-field flex-1"
                                placeholder="New Dept (e.g. AI)"
                                value={newDeptName}
                                onChange={e => setNewDeptName(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn btn-primary px-3"><Plus size={20} /></button>
                        </form>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {departments.map(d => (
                                <div key={d.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                    <span className="font-semibold text-gray-700">{d.name}</span>
                                    <button onClick={() => handleDeleteDept(d.id)} className="text-red-400 hover:text-red-600 p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {departments.length === 0 && <p className="text-center text-gray-400 text-sm">No departments yet.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Plus size={20} className="text-blue-600" /> Add New Student
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateStudent} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Register Number</label>
                                    <input
                                        className="input-field"
                                        placeholder="e.g. 2021CSE001"
                                        value={newStudent.registerNumber}
                                        onChange={e => setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Full Name</label>
                                    <input
                                        className="input-field"
                                        placeholder="John Doe"
                                        value={newStudent.name}
                                        onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Department</label>
                                    <div className="flex gap-1">
                                        <select
                                            className="input-field flex-1"
                                            value={newStudent.department}
                                            onChange={e => setNewStudent({ ...newStudent, department: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Dept</option>
                                            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    {departments.length === 0 && <p className="text-xs text-red-500 mt-1">Please add departments first.</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Year</label>
                                    <select
                                        className="input-field"
                                        value={newStudent.year}
                                        onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Year</option>
                                        {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Section</label>
                                    <select
                                        className="input-field"
                                        value={newStudent.section}
                                        onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Section</option>
                                        {['A', 'B', 'C'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Semester</label>
                                    <select
                                        className="input-field"
                                        value={newStudent.semester}
                                        onChange={e => setNewStudent({ ...newStudent, semester: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Semester</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManager;
