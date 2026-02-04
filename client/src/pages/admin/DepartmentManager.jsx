import { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
    Building2, Users, Plus, Edit2, Trash2,
    Briefcase, GraduationCap, X, BookOpen
} from 'lucide-react';

const DepartmentManager = () => {
    const [departments, setDepartments] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedDept, setSelectedDept] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        hodId: '',
        sections: 'A,B,C',
        years: '2,3,4'
    });

    useEffect(() => {
        fetchData();
        fetchFaculty();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/admin/departments');
            setDepartments(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load departments", err);
            setLoading(false);
        }
    };

    const fetchFaculty = async () => {
        try {
            const res = await api.get('/admin/faculty');
            setFacultyList(res.data);
        } catch (err) {
            console.error("Failed to load faculty", err);
        }
    };

    const handleOpenModal = (dept = null) => {
        if (dept) {
            setEditMode(true);
            setSelectedDept(dept);
            setFormData({
                name: dept.name,
                code: dept.code || '',
                hodId: dept.hodId || '',
                sections: dept.sections || 'A,B,C',
                years: dept.years || '2,3,4'
            });
        } else {
            setEditMode(false);
            setSelectedDept(null);
            setFormData({ name: '', code: '', hodId: '', sections: 'A,B,C', years: '2,3,4' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editMode && selectedDept) {
                await api.put(`/admin/departments/${selectedDept.id}`, formData);
                alert('Department updated successfully');
            } else {
                await api.post('/admin/departments', formData);
                alert('Department created successfully');
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert('Operation failed. Name/Code might be duplicate.');
        }
    };

    const handleYearToggle = (year) => {
        const currentYears = formData.years.split(',').filter(y => y.trim() !== '');
        let newYears;
        if (currentYears.includes(year.toString())) {
            newYears = currentYears.filter(y => y !== year.toString());
        } else {
            newYears = [...currentYears, year.toString()].sort();
        }
        setFormData({ ...formData, years: newYears.join(',') });
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this department?')) return;
        try {
            await api.delete(`/admin/departments/${id}`);
            fetchData();
        } catch (err) {
            alert('Failed to delete department');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#003B73] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[#003B73] font-bold animate-pulse">Loading Departments...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 animate-fadeIn">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-[#003B73] flex items-center gap-3">
                            <span className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
                                <Building2 size={32} className="text-[#003B73]" />
                            </span>
                            <span className="gradient-text">Department Manager</span>
                        </h1>
                        <p className="text-gray-500 font-medium mt-3 max-w-lg">
                            Configure institutional structure, assign leadership roles, and monitor departmental growth metrics.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="group bg-[#003B73] hover:bg-[#002850] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-95"
                    >
                        <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-90 transition-transform duration-500">
                            <Plus size={20} />
                        </div>
                        Add New Department
                    </button>
                </div>

                {/* Department Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {departments.map((dept, index) => (
                        <div
                            key={dept.id}
                            className={`animate-fadeIn group premium-card bg-white border border-gray-100 overflow-hidden relative`}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Decorative Top Accent */}
                            <div className="h-2 w-full bg-gradient-to-r from-[#003B73] via-blue-500 to-[#00A8E8]"></div>

                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-2xl font-black text-gray-800 tracking-tight leading-none">
                                                {dept.name}
                                            </h3>
                                            {dept.code && (
                                                <span className="px-3 py-1 bg-blue-50 text-[#003B73] text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100 shadow-sm">
                                                    {dept.code}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <div className="p-1.5 rounded-lg bg-blue-50">
                                                <Users size={14} className="text-blue-600" />
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                                                Sections: <span className="text-blue-700">{dept.sections}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <div className="p-1.5 rounded-lg bg-indigo-50">
                                                <GraduationCap size={14} className="text-indigo-600" />
                                            </div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                                                Years: <span className="text-indigo-700">{dept.name === 'First Year (General)' ? '1' : (dept.years || '2,3,4')}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-1">
                                            <div className={`p-1.5 rounded-lg ${dept.hodName === 'Unassigned' ? 'bg-gray-100' : 'bg-amber-50'}`}>
                                                <Briefcase size={14} className={dept.hodName === 'Unassigned' ? 'text-gray-400' : 'text-amber-600'} />
                                            </div>
                                            <p className="text-xs font-bold font-mono tracking-tight">
                                                <span className="text-gray-400 uppercase mr-1">HOD:</span>
                                                <span className={dept.hodName === 'Unassigned' ? 'text-gray-400 italic' : 'text-[#003B73]'}>
                                                    {dept.hodName}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(dept)}
                                            className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-md rounded-xl transition-all duration-300"
                                            title="Edit Department"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(dept.id)}
                                            className="p-3 bg-white border border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-200 hover:shadow-md rounded-xl transition-all duration-300"
                                            title="Delete Department"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Metrics Section */}
                                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-50 bg-gray-50/50 -mx-8 -mb-8 px-8 pb-8">
                                    <div className="flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:border-blue-200 transition-colors">
                                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600 mb-2">
                                            <Users size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Faculty</span>
                                        <span className="text-xl font-black text-gray-800 leading-none">{dept.stats?.faculty || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:border-indigo-200 transition-colors">
                                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 mb-2">
                                            <GraduationCap size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Students</span>
                                        <span className="text-xl font-black text-gray-800 leading-none">{dept.stats?.students || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:border-emerald-200 transition-colors">
                                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 mb-2">
                                            <BookOpen size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Subjects</span>
                                        <span className="text-xl font-black text-gray-800 leading-none">{dept.stats?.subjects || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {departments.length === 0 && (
                        <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center text-center animate-fadeIn">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
                                <Building2 size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2">No Departments Registered</h3>
                            <p className="text-gray-400 font-medium max-w-xs mx-auto mb-8">
                                Start organizing your institution by adding the first department.
                            </p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-[#003B73] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                            >
                                <Plus size={20} />
                                Initial Setup
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal Overlay */}
                {showModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6 z-[60] animate-fadeIn">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-white/20 overflow-hidden transform scale-100">
                            <div className="bg-gradient-primary p-8 text-white relative">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="absolute top-8 right-8 text-white/60 hover:text-white bg-white/10 p-2 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black tracking-tight">
                                            {editMode ? 'Modify Department' : 'Create Department'}
                                        </h3>
                                        <p className="text-blue-100 text-sm font-medium opacity-80">
                                            {editMode ? 'Updating existing record' : 'Registering new institutional unit'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Full Name</label>
                                        <input
                                            className="input-field font-bold text-gray-700"
                                            placeholder="e.g. Mechanical Engineering"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Short Code</label>
                                        <input
                                            className="input-field font-bold text-gray-700"
                                            placeholder="e.g. MECH"
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Supported Years</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4].map(year => (
                                                <button
                                                    key={year}
                                                    type="button"
                                                    onClick={() => handleYearToggle(year)}
                                                    className={`w-10 h-10 rounded-xl font-bold transition-all ${formData.years.split(',').includes(year.toString())
                                                        ? 'bg-[#003B73] text-white shadow-md'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Sections (Comma Separated)</label>
                                        <input
                                            className="input-field font-bold text-gray-700"
                                            placeholder="e.g. A,B,C,D"
                                            value={formData.sections}
                                            onChange={e => setFormData({ ...formData, sections: e.target.value })}
                                            required
                                        />
                                        <p className="text-[9px] text-gray-400 mt-1 italic font-medium">Use commas to separate sections (e.g. A,B,C)</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Assign HOD</label>
                                        <div className="relative">
                                            <select
                                                className="input-field font-bold text-gray-700 appearance-none bg-gray-50/50"
                                                value={formData.hodId}
                                                onChange={e => setFormData({ ...formData, hodId: e.target.value })}
                                            >
                                                <option value="">No Leadership Assigned</option>
                                                {facultyList.map(f => (
                                                    <option key={f.id} value={f.id}>{f.fullName} ({f.department || 'No Dept'})</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <Users size={18} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all border-2 border-transparent"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] bg-[#003B73] hover:bg-[#002850] text-white py-4 rounded-2xl font-black tracking-wide shadow-lg hover:shadow-xl transition-all"
                                    >
                                        {editMode ? 'Update Changes' : 'Confirm Registration'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentManager;
