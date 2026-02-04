import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { GraduationCap, Users, CheckCircle, ChevronRight, Search, AlertCircle, TrendingUp, Filter, ArrowRight } from 'lucide-react';

const StudentPromotion = () => {
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Source Filter State
    const [sourceYear, setSourceYear] = useState('1');
    const [sourceDept, setSourceDept] = useState('');
    const [sourceSection, setSourceSection] = useState('All');

    // Promotion Config (Target)
    const [promoDept, setPromoDept] = useState('');
    const [promoSection, setPromoSection] = useState('A');
    const [promoYear, setPromoYear] = useState('2');
    const [promoSem, setPromoSem] = useState('3');

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchStudents();
        // Auto-update target defaults when source year changes
        const nextYear = Math.min(parseInt(sourceYear) + 1, 4);
        setPromoYear(nextYear.toString());
        setPromoSem((nextYear * 2 - 1).toString());
        setPromoDept(sourceDept);
    }, [sourceYear, sourceDept, sourceSection]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/students');
            const allStudents = Array.isArray(res.data) ? res.data : [];

            const filtered = allStudents.filter(s => {
                const yearMatch = s.year === parseInt(sourceYear);
                const deptMatch = (sourceDept === '' || sourceDept === 'GEN')
                    ? (s.department === null || s.department === '' || s.department === 'First Year (General)' || s.department === 'GEN')
                    : (s.department === sourceDept || s.department === departments.find(d => d.code === sourceDept)?.name);
                const sectionMatch = sourceSection === 'All' ? true : s.section === sourceSection;

                return yearMatch && deptMatch && sectionMatch;
            });

            setStudents(filtered);
            setSelectedStudents([]);
        } catch (err) {
            console.error("Failed to fetch students");
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/admin/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error("Failed to fetch departments");
        }
    };

    const handleSelectStudent = (id) => {
        if (selectedStudents.includes(id)) {
            setSelectedStudents(selectedStudents.filter(sid => sid !== id));
        } else {
            setSelectedStudents([...selectedStudents, id]);
        }
    };

    const handleSelectAll = () => {
        if (selectedStudents.length === filteredStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents.map(s => s.id));
        }
    };

    const handlePromote = async () => {
        if (selectedStudents.length === 0) return alert('Select students to promote');
        if (parseInt(promoYear) > 1 && !promoDept) return alert('Select target department');

        if (!confirm(`Promote ${selectedStudents.length} students to ${promoDept || 'General'} Year ${promoYear}?`)) return;

        try {
            const res = await api.post('/admin/students/promote', {
                studentIds: selectedStudents,
                department: promoDept || null,
                section: promoSection,
                year: promoYear,
                semester: promoSem
            });
            alert(res.data.message);
            setSelectedStudents([]);
            fetchStudents();
        } catch (err) {
            alert('Promotion failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registerNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <TrendingUp className="text-blue-600 w-10 h-10" />
                    Student Promotion Portal
                </h2>
                <p className="text-gray-500 text-lg mt-1">Manage bulk promotions and department allocations with ease.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* Column 1: Source (The "From") */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-6 text-blue-600">
                            <Filter size={22} className="font-bold" />
                            <h3 className="text-xl font-bold text-gray-800">1. Select Source</h3>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Year</label>
                                <select className="input-field bg-gray-50 border-gray-200 focus:bg-white" value={sourceYear} onChange={e => setSourceYear(e.target.value)}>
                                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Department</label>
                                <select className="input-field bg-gray-50 border-gray-200 focus:bg-white" value={sourceDept} onChange={e => setSourceDept(e.target.value)}>
                                    <option value="GEN">GEN</option>
                                    {departments.filter(d => d.name !== 'First Year (General)').map(d => <option key={d.id} value={d.code || d.name}>{d.code || d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Section Filter</label>
                                <select className="input-field bg-gray-50 border-gray-200 focus:bg-white" value={sourceSection} onChange={e => setSourceSection(e.target.value)}>
                                    <option value="All">All Sections</option>
                                    {(departments.find(d => (d.code || d.name) === ((sourceYear === '1' && (!sourceDept || sourceDept === 'GEN')) ? 'GEN' : sourceDept))?.sections?.split(',') || ['A', 'B', 'C']).map(s => (
                                        <option key={s} value={s}>Section {s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                        <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Status Summary</h4>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-3xl font-black">{students.length}</p>
                                <p className="text-xs opacity-80">Students Found</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-yellow-300">{selectedStudents.length}</p>
                                <p className="text-xs opacity-80">Ready to Promote</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Student Selection (The "Who") */}
                <div className="xl:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <Users size={22} className="font-bold" />
                                <h3 className="text-xl font-bold text-gray-800">2. Choose Students</h3>
                            </div>
                            <button
                                onClick={handleSelectAll}
                                className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                            >
                                {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All Filtered'}
                            </button>
                        </div>

                        <div className="p-4 bg-white border-b border-gray-50">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by name or register number..."
                                    className="w-full pl-12 pr-4 py-3 bg-gray-100/50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[600px]">
                            <table className="w-full text-left">
                                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                    <tr className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                        <th className="p-4 w-12 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                                                onChange={handleSelectAll}
                                                className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </th>
                                        <th className="p-4">Student</th>
                                        <th className="p-4 text-center">Current Class</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan="4" className="p-20 text-center text-gray-400 font-bold italic animate-pulse">Scanning Database...</td></tr>
                                    ) : filteredStudents.length > 0 ? (
                                        filteredStudents.map(student => (
                                            <tr
                                                key={student.id}
                                                className={`hover:bg-indigo-50/40 transition-all cursor-pointer group ${selectedStudents.includes(student.id) ? 'bg-indigo-50/60' : ''}`}
                                                onClick={() => handleSelectStudent(student.id)}
                                            >
                                                <td className="p-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(student.id)}
                                                        onChange={() => { }}
                                                        className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                            {student.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-extrabold text-gray-900">{student.name}</p>
                                                            <p className="text-xs font-mono text-gray-400 mt-0.5">{student.registerNumber}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="text-xs font-black text-gray-700">YEAR {student.year}</span>
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">SEC {student.section}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {selectedStudents.includes(student.id) ? (
                                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-xs font-black ring-1 ring-green-200">SELECTED</span>
                                                    ) : (
                                                        <ChevronRight className="inline text-gray-200 group-hover:text-indigo-300 transition-colors" size={24} />
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="p-24 text-center">
                                                <div className="max-w-xs mx-auto">
                                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <Users className="text-gray-300" size={40} />
                                                    </div>
                                                    <p className="text-gray-900 text-xl font-black">Empty Class</p>
                                                    <p className="text-sm text-gray-400 mt-2 font-medium">No students match your current source filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Column 3: Promotion Target (The "To") */}
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-emerald-500/20 sticky top-6">
                        <div className="flex items-center gap-2 mb-8 text-emerald-600">
                            <GraduationCap size={24} className="font-bold" />
                            <h3 className="text-xl font-bold text-gray-800">3. Set Promotion</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-4 mb-4">
                                <div className="bg-emerald-500 p-2 rounded-lg text-white">
                                    <ArrowRight size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Target Path</p>
                                    <p className="text-sm font-bold text-emerald-900">Next Academic Level</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target Department</label>
                                <select
                                    className="input-field border-emerald-200 focus:ring-emerald-500 p-3"
                                    value={promoDept}
                                    onChange={e => setPromoDept(e.target.value)}
                                >
                                    <option value="">-- Select Dept --</option>
                                    {departments.map(d => <option key={d.id} value={d.code || d.name}>{d.code || d.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target Year</label>
                                    <select className="input-field border-emerald-200" value={promoYear} onChange={e => setPromoYear(e.target.value)}>
                                        {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target Section</label>
                                    <select className="input-field border-emerald-200" value={promoSection} onChange={e => setPromoSection(e.target.value)}>
                                        {(departments.find(d => (d.code || d.name) === ((promoYear === '1' && (!promoDept || promoDept === 'GEN')) ? 'GEN' : promoDept))?.sections?.split(',') || ['A', 'B', 'C']).map(s => (
                                            <option key={s} value={s}>Section {s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target Semester</label>
                                <select className="input-field border-emerald-200" value={promoSem} onChange={e => setPromoSem(e.target.value)}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                </select>
                            </div>

                            <div className="pt-6 border-t border-gray-100 mt-6">
                                <button
                                    onClick={handlePromote}
                                    disabled={selectedStudents.length === 0}
                                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg ${selectedStudents.length === 0
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200'
                                        }`}
                                >
                                    <CheckCircle size={22} />
                                    PROMOTE {selectedStudents.length || ''} STUDENTS
                                </button>
                                {selectedStudents.length === 0 && (
                                    <p className="text-[10px] text-gray-400 mt-3 text-center flex items-center justify-center gap-1 font-bold">
                                        <AlertCircle size={12} /> SELECT STUDENTS TO ENABLE ACTION
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentPromotion;
