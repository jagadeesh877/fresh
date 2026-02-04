import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Trash2, UserPlus, CalendarX, X } from 'lucide-react';

const FacultyManager = () => {
    const [facultyList, setFacultyList] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [newFaculty, setNewFaculty] = useState({ username: '', password: '', fullName: '', department: '' });
    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [loading, setLoading] = useState(false);

    // Absence Modal State
    const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
    const [selectedFacultyForAbsence, setSelectedFacultyForAbsence] = useState(null);
    const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
    const [absenceReason, setAbsenceReason] = useState('');

    // Restoration State
    const [activeSubstitutions, setActiveSubstitutions] = useState([]);
    const [selectedSubsToRemove, setSelectedSubsToRemove] = useState([]);
    const [facultySchedule, setFacultySchedule] = useState([]);
    const [substituteSelection, setSubstituteSelection] = useState({}); // { [timetableId]: facultyId }

    // Helper for Local Date (YYYY-MM-DD)
    const getTodayStr = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Absence View State (Persist in Session)
    const [viewDate, setViewDate] = useState(() => {
        return sessionStorage.getItem('adminViewDate') || getTodayStr();
    });
    const [absentFacultyIds, setAbsentFacultyIds] = useState([]);

    useEffect(() => {
        refreshFaculty();
        fetchDepartments();
    }, []);

    useEffect(() => {
        sessionStorage.setItem('adminViewDate', viewDate);
        fetchAbsences();
    }, [viewDate]);

    const refreshFaculty = async () => {
        try {
            const res = await api.get('/admin/faculty');
            setFacultyList(res.data);
        } catch (err) {
            console.error("Failed to fetch faculty", err);
        }
    }

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/admin/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    }

    const fetchAbsences = async () => {
        try {
            const res = await api.get('/admin/faculty-absences', { params: { date: viewDate } });
            setAbsentFacultyIds(res.data.map(a => a.facultyId));
        } catch (err) {
            console.error("Failed to fetch absences", err);
        }
    }

    const fetchSubstitutionsForFaculty = async (facultyId, date) => {
        try {
            const res = await api.get('/admin/substitutions', {
                params: {
                    date: date,
                    originalFacultyId: facultyId
                }
            });
            setActiveSubstitutions(res.data);
            setSelectedSubsToRemove([]); // Reset selection
        } catch (err) {
            console.error("Failed to fetch substitutions", err);
        }
    }

    const fetchDailySchedule = async (facultyId, date) => {
        try {
            // Robust Day Calculation
            const d = new Date(date);
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            // Fix timezone offset issue by explicitly setting time or using getUTCDay if date string is standard
            // Simple hack: append T00:00:00 to ensure local time is roughly respected or just use standard
            // Ideally we parse YYYY-MM-DD
            const [y, m, day] = date.split('-').map(Number);
            const localDate = new Date(y, m - 1, day);
            const dayName = days[localDate.getDay()];

            console.log(`Fetching schedule for ${dayName} (${date})`);

            const [timetableRes, subsRes] = await Promise.all([
                api.get('/admin/timetable', { params: { facultyId, day: dayName } }),
                api.get('/admin/substitutions', { params: { date, originalFacultyId: facultyId } })
            ]);

            const schedule = timetableRes.data.map(slot => {
                const sub = subsRes.data.find(s => s.timetableId === slot.id);
                return {
                    ...slot,
                    substitution: sub || null
                };
            });
            setFacultySchedule(schedule);
        } catch (err) {
            console.error("Failed to fetch schedule", err);
        }
    }

    const handleAssignSubstitute = async (timetableId) => {
        const subId = substituteSelection[timetableId];
        if (!subId) {
            alert("Please select a substitute faculty");
            return;
        }

        try {
            await api.post('/admin/substitutions', {
                timetableId: timetableId,
                substituteFacultyId: subId,
                date: absenceDate
            });
            alert("Substitute assigned successfully");
            fetchDailySchedule(selectedFacultyForAbsence.id, absenceDate);
            setSubstituteSelection(prev => ({ ...prev, [timetableId]: '' }));
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to assign substitute");
        }
    }

    const handleDeleteSubstitution = async (subId) => {
        if (!confirm("Remove this substitution?")) return;
        try {
            await api.delete(`/admin/substitutions/${subId}`);
            fetchDailySchedule(selectedFacultyForAbsence.id, absenceDate);
        } catch (err) {
            alert("Failed to remove substitution");
        }
    }

    const handleCreateFaculty = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/admin/faculty', newFaculty);
            setNewFaculty({ username: '', password: '', fullName: '', department: '' });
            refreshFaculty();
            alert('Faculty Created Successfully');
        } catch (err) {
            if (err.response?.data?.errors) {
                const messages = err.response.data.errors.map(e => e.msg).join('\n');
                alert(`Validation Errors:\n${messages}`);
            } else {
                alert(err.response?.data?.message || 'Error creating faculty');
            }
        } finally {
            setLoading(false);
        }
    }

    const handleDeleteFaculty = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/admin/faculty/${id}`);
            refreshFaculty();
        } catch (err) {
            alert('Error deleting faculty');
        }
    }

    const openAbsenceModal = (faculty) => {
        setSelectedFacultyForAbsence(faculty);
        const dateToUse = viewDate;
        setAbsenceDate(dateToUse);
        setAbsenceReason('');

        // If already absent, fetch current substitutions
        if (absentFacultyIds.includes(faculty.id)) {
            fetchSubstitutionsForFaculty(faculty.id, dateToUse);
            fetchDailySchedule(faculty.id, dateToUse);
        } else {
            setActiveSubstitutions([]);
            setFacultySchedule([]);
        }

        setAbsenceModalOpen(true);
    };

    const handleMarkAbsent = async () => {
        if (!selectedFacultyForAbsence) return;
        try {
            await api.post('/admin/faculty-absences', {
                facultyId: selectedFacultyForAbsence.id,
                date: absenceDate,
                reason: absenceReason
            });
            alert(`Marked ${selectedFacultyForAbsence.fullName} as absent on ${absenceDate}`);
            // Note: Don't close modal, switch to schedule view to allow substitution
            // setAbsenceModalOpen(false); 
            if (absenceDate === viewDate) fetchAbsences();

            // Refresh modal data
            fetchAbsences(); // updates main list
            fetchDailySchedule(selectedFacultyForAbsence.id, absenceDate); // updates modal view

        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to mark absent');
        }
    };

    const handleRevertSelected = async () => {
        if (selectedSubsToRemove.length === 0) return;
        if (!confirm(`Revert ${selectedSubsToRemove.length} substituted periods to normal?`)) return;

        try {
            // Delete each selected substitution
            await Promise.all(selectedSubsToRemove.map(id => api.delete(`/admin/substitutions/${id}`)));
            alert("Selected periods reverted to normal.");

            // Refresh subs list in modal incase we want to do more? Or just close?
            fetchSubstitutionsForFaculty(selectedFacultyForAbsence.id, absenceDate);
        } catch (err) {
            console.error(err);
            alert("Failed to revert some periods.");
        }
    }

    const handleRemoveFullAbsence = async () => {
        if (!selectedFacultyForAbsence) return;
        const confirmMsg = activeSubstitutions.length > 0
            ? `Remove absence for ${selectedFacultyForAbsence.fullName}? This will also remove ${activeSubstitutions.length} active substitutions and revert everything to normal.`
            : `Remove absence for ${selectedFacultyForAbsence.fullName}?`;

        if (!confirm(confirmMsg)) return;

        try {
            // Using params as previously established
            await api.delete('/admin/faculty-absences', {
                params: {
                    facultyId: selectedFacultyForAbsence.id,
                    date: absenceDate,
                    cleanup: true // Trigger cleanup on backend
                }
            });
            alert(`Absence removed for ${selectedFacultyForAbsence.fullName}. Schedule reverted.`);
            setAbsenceModalOpen(false);
            if (absenceDate === viewDate) fetchAbsences();
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.message || err.message || 'Failed to remove absence';
            const errDetails = err.response?.data?.details || '';
            alert(`Error: ${errMsg}\n${errDetails}`);
        }
    }

    // Filter Logic
    // Filter Logic
    const filteredFaculty = (Array.isArray(facultyList) ? facultyList : []).filter(f => {
        const name = f.fullName ? f.fullName.toLowerCase() : '';
        const username = f.username ? f.username.toLowerCase() : '';
        const search = searchTerm.toLowerCase();

        const matchesSearch = name.includes(search) || username.includes(search);
        const matchesDept = filterDept ? f.department === filterDept : true;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="p-6 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Faculty Management</h2>

                {/* Date Picker for Status */}
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                    <span className="text-sm font-semibold text-gray-600">Check Status for:</span>
                    <input
                        type="date"
                        value={viewDate}
                        onChange={e => setViewDate(e.target.value)}
                        className="text-sm font-bold text-gray-800 bg-transparent outline-none cursor-pointer"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Form */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <UserPlus size={20} className="text-indigo-600" />
                        Add New Faculty
                    </h3>
                    {/* ... form ... */}
                    <form onSubmit={handleCreateFaculty} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input className="input-field" value={newFaculty.fullName} onChange={e => setNewFaculty({ ...newFaculty, fullName: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select className="input-field" value={newFaculty.department} onChange={e => setNewFaculty({ ...newFaculty, department: e.target.value })} required>
                                <option value="">Select Dept</option>
                                {departments.map(d => <option key={d.id} value={d.code || d.name}>{d.code || d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input className="input-field" value={newFaculty.username} onChange={e => setNewFaculty({ ...newFaculty, username: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                className="input-field"
                                type="password"
                                value={newFaculty.password}
                                onChange={e => setNewFaculty({ ...newFaculty, password: e.target.value })}
                                required
                                placeholder="Min 8 chars, Upper, Lower, Number"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Must be 8+ chars with uppercase, lowercase, and number.
                            </p>
                        </div>
                        <button type="submit" disabled={loading} className="w-full btn btn-primary flex justify-center items-center gap-2">
                            {loading ? 'Creating...' : 'Create Faculty'}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <h3 className="text-lg font-semibold">Registered Faculty</h3>

                        {/* Search & Filter UI */}
                        <div className="flex gap-2 w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search..."
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
                            <thead className="bg-gray-50 text-gray-600 text-sm uppercase">
                                <tr>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Username</th>
                                    <th className="p-3">Dept</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredFaculty.map(f => {
                                    const isAbsent = absentFacultyIds.includes(f.id);
                                    return (
                                        <tr key={f.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-800 flex items-center gap-2">
                                                {f.fullName}
                                                {isAbsent && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase rounded-full border border-red-200">
                                                        Absent
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-gray-600">{f.username}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{f.department}</span>
                                            </td>
                                            <td className="p-3 flex gap-2">
                                                <button
                                                    onClick={() => openAbsenceModal(f)}
                                                    className="text-orange-500 hover:text-orange-700 p-1 rounded hover:bg-orange-50"
                                                    title={isAbsent ? "Already Absent (Edit?)" : "Mark Absent"}
                                                >
                                                    <CalendarX size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFaculty(f.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredFaculty.length === 0 && (
                                    <tr><td colSpan="4" className="p-4 text-center text-gray-500">No faculty found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Absence Modal - Granular Control */}
            {absenceModalOpen && selectedFacultyForAbsence && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">
                                {absentFacultyIds.includes(selectedFacultyForAbsence.id) ? 'Manage Absence' : 'Mark Faculty Absent'}
                            </h3>
                            <button onClick={() => setAbsenceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-gray-600 text-sm">Faculty: <strong>{selectedFacultyForAbsence.fullName}</strong></p>
                            <p className="text-gray-600 text-sm">Date: <strong>{absenceDate}</strong></p>
                        </div>

                        {!absentFacultyIds.includes(selectedFacultyForAbsence.id) ? (
                            // MARK ABSENT FORM
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                                    <input
                                        className="input-field w-full"
                                        value={absenceReason}
                                        onChange={e => setAbsenceReason(e.target.value)}
                                        placeholder="e.g. Sick Leave"
                                    />
                                </div>
                                <div className="flex gap-3 mt-8">
                                    <button onClick={() => setAbsenceModalOpen(false)} className="flex-1 btn bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</button>
                                    <button onClick={handleMarkAbsent} className="flex-1 btn btn-primary bg-orange-600 hover:bg-orange-700 border-none">Confirm Absence</button>
                                </div>
                            </div>
                        ) : (
                            // MANAGE ABSENCE / RESTORATION FORM
                            <div className="space-y-6">

                                {activeSubstitutions.length > 0 ? (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-800 mb-3">Daily Schedule & Substitutions</h4>
                                        <p className="text-xs text-gray-500 mb-4">Assign substitutes for classes affected by this absence.</p>

                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                            {facultySchedule.length === 0 ? (
                                                <p className="text-sm text-gray-500 italic text-center py-4">No classes scheduled for this day.</p>
                                            ) : (
                                                facultySchedule.map(slot => (
                                                    <div key={slot.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <span className="font-bold text-indigo-700 text-sm">{slot.subjectName}</span>
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    Period {slot.period} • {slot.department}-{slot.year}-{slot.section}
                                                                </div>
                                                            </div>
                                                            <div className={`text-xs px-2 py-1 rounded font-bold ${slot.substitution ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-600'
                                                                }`}>
                                                                {slot.substitution ? 'Substituted' : 'Cancelled'}
                                                            </div>
                                                        </div>

                                                        {slot.substitution ? (
                                                            <div className="flex items-center justify-between mt-2 bg-orange-50 p-2 rounded text-xs">
                                                                <span className="text-orange-800 font-medium">
                                                                    Sub: {slot.substitution.substituteFaculty.fullName}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleDeleteSubstitution(slot.substitution.id)}
                                                                    className="text-red-500 hover:text-red-700 font-bold"
                                                                >
                                                                    Revert
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-2 flex gap-2">
                                                                <select
                                                                    className="flex-1 text-xs border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                    value={substituteSelection[slot.id] || ''}
                                                                    onChange={e => setSubstituteSelection(prev => ({ ...prev, [slot.id]: e.target.value }))}
                                                                >
                                                                    <option value="">Select Substitute...</option>
                                                                    {facultyList
                                                                        .filter(f => f.id !== selectedFacultyForAbsence.id && !absentFacultyIds.includes(f.id))
                                                                        .map(f => (
                                                                            <option key={f.id} value={f.id}>{f.fullName}</option>
                                                                        ))
                                                                    }
                                                                </select>
                                                                <button
                                                                    onClick={() => handleAssignSubstitute(slot.id)}
                                                                    className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
                                                                    disabled={!substituteSelection[slot.id]}
                                                                >
                                                                    Assign
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                                        <p className="text-sm text-green-700">No active substitutions. Schedule is cleared.</p>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-gray-100">
                                    <button onClick={handleRemoveFullAbsence} className="w-full btn btn-primary bg-red-600 hover:bg-red-700 border-none flex flex-col items-center justify-center gap-1 py-3">
                                        <span className="font-bold">Remove Entire Absence</span>
                                        <span className="text-[10px] font-normal opacity-90">
                                            {activeSubstitutions.length > 0 ? `(And revert all ${activeSubstitutions.length} substitutions)` : '(Faculty becomes Present)'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyManager;
