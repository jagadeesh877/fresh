import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Save, Loader, X, Clock, MapPin, User, BookOpen, Plus, Edit2, Trash2, Calendar, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const TimetableManager = () => {
    const [department, setDepartment] = useState('');
    const [year, setYear] = useState('1');
    const [section, setSection] = useState('A');
    const [semester, setSemester] = useState('1');

    const [timetable, setTimetable] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [facultyList, setFacultyList] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');
    const [entryType, setEntryType] = useState('THEORY');
    const [selectedDuration, setSelectedDuration] = useState(1);

    // Substitution Management State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [absences, setAbsences] = useState([]);
    const [substitutions, setSubstitutions] = useState([]);
    const [statusLoading, setStatusLoading] = useState(false);
    const [assigningSub, setAssigningSub] = useState(false);
    const [substituteId, setSubstituteId] = useState('');

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const periods = [
        { id: 1, label: '09:15-10:05', name: 'Period 1' },
        { id: 2, label: '10:05-10:55', name: 'Period 2' },
        { id: 3, label: '11:15-12:05', name: 'Period 3' },
        { id: 4, label: '12:05-12:55', name: 'Period 4' },
        { id: 5, label: '01:45-02:30', name: 'Period 5' },
        { id: 6, label: '02:30-03:15', name: 'Period 6' },
        { id: 7, label: '03:25-04:10', name: 'Period 7' },
        { id: 8, label: '04:10-04:50', name: 'Period 8' },
    ];

    useEffect(() => {
        fetchSubjects();
        fetchFaculty();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/admin/departments');
            setDepartments(res.data);
            if (res.data.length > 0 && !department) {
                setDepartment(res.data[0].name);
            }
        } catch (err) {
            console.error("Failed to fetch departments");
        }
    };

    useEffect(() => {
        const deptObj = departments.find(d => (d.code || d.name) === department);
        if (deptObj) {
            // Update Section
            const secs = deptObj.sections?.split(',') || ['A'];
            if (!secs.includes(section)) {
                setSection(secs[0]);
            }

            // Update Year
            const availableYears = deptObj.years?.split(',') || ['2', '3', '4'];
            if (!availableYears.includes(year.toString())) {
                setYear(availableYears[0]);
            }
        }
    }, [department, departments]);

    useEffect(() => {
        let validSems;
        const isGeneral = department === 'First Year (General)' ||
            departments.find(d => (d.code || d.name) === department)?.name === 'First Year (General)';

        if (isGeneral) {
            validSems = ['1', '2'];
        } else {
            const y = parseInt(year);
            validSems = [(y * 2 - 1).toString(), (y * 2).toString()];
        }

        if (!validSems.includes(semester.toString())) {
            setSemester(validSems[0]);
        }
    }, [year, department, departments]);

    useEffect(() => {
        fetchTimetable();
    }, [department, year, semester, section]);

    useEffect(() => {
        if (selectedDate) {
            fetchDailyStatus();
        }
    }, [selectedDate, timetable]); // Re-fetch status if timetable or date changes

    const fetchDailyStatus = async () => {
        setStatusLoading(true);
        try {
            // Parallel fetch
            const [absRes, subRes] = await Promise.all([
                api.get('/admin/faculty-absences', { params: { date: selectedDate } }),
                api.get('/admin/substitutions', { params: { date: selectedDate } })
            ]);
            setAbsences(absRes.data);
            setSubstitutions(subRes.data);
        } catch (err) {
            console.error("Failed to fetch daily status", err);
        } finally {
            setStatusLoading(false);
        }
    };

    // Helper to get day name from date (UTC safe)
    const getDayName = (dateStr) => {
        const date = new Date(dateStr);
        // Use UTC day to avoid timezone shifts since input=date returns YYYY-MM-DD (UTC midnight)
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        return days[date.getUTCDay()];
    };

    const fetchSubjects = async () => {
        try {
            const res = await api.get('/admin/subjects');
            setSubjects(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch subjects");
        }
    };

    const fetchFaculty = async () => {
        try {
            const res = await api.get('/admin/faculty');
            setFacultyList(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTimetable = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/timetable', {
                params: { department, year, semester, section }
            });
            const map = {};
            res.data.forEach(t => {
                map[`${t.day}-${t.period}`] = t;
            });
            setTimetable(map);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCellClick = (day, period) => {
        const key = `${day}-${period}`;
        const existing = timetable[key];

        setSelectedCell({ day, period });
        setEntryType(existing?.type || 'THEORY');
        setSelectedSubject(existing?.subjectName || '');
        setSelectedFaculty(existing?.facultyName || '');
        setSelectedRoom(existing?.room || '');
        setSelectedDuration(existing?.duration || 1);
        setSubstituteId(''); // Reset substitute selection
        setModalOpen(true);
    };

    const handleSubjectChange = (name) => {
        setSelectedSubject(name);
        const subj = subjects.find(s => s.name === name);
        if (subj) {
            const assignment = subj.assignments?.find(a => a.section === section);
            if (assignment) {
                setSelectedFaculty(assignment.facultyName);
            } else {
                setSelectedFaculty('');
            }
        }
    };

    const applyChanges = () => {
        if (!selectedCell) return;
        const { day, period } = selectedCell;
        const key = `${day}-${period}`;

        const subj = subjects.find(s => s.name === selectedSubject);
        let fId = null;
        if (subj) {
            const assignment = subj.assignments?.find(a => a.section === section);
            if (assignment) fId = assignment.facultyId;
        }

        setTimetable(prev => ({
            ...prev,
            [key]: {
                day,
                period,
                duration: selectedDuration,
                subjectName: selectedSubject,
                facultyName: selectedFaculty,
                facultyId: fId,
                room: selectedRoom,
                type: entryType
            }
        }));
        setModalOpen(false);
    };

    const deleteEntry = () => {
        if (!selectedCell) return;
        const { day, period } = selectedCell;
        const key = `${day}-${period}`;

        setTimetable(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setModalOpen(false);
    };

    // --- Substitution & Absence Actions ---

    const handleMarkAbsent = async (facultyId) => {
        if (!confirm("Are you sure you want to mark this faculty as absent? This will affect all their classes for today.")) return;
        try {
            await api.post('/admin/faculty-absences', {
                facultyId,
                date: selectedDate,
                reason: 'Marked from Timetable'
            });
            fetchDailyStatus();
            setModalOpen(false);
            alert("Faculty marked as absent.");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to mark absent");
        }
    };

    const handleAssignSubstitute = async (timetableId) => {
        if (!timetableId) return alert("Please save the timetable before assigning a substitute.");
        if (!substituteId) return alert("Please select a substitute faculty");
        setAssigningSub(true);
        try {
            await api.post('/admin/substitutions', {
                timetableId,
                substituteFacultyId: substituteId,
                date: selectedDate
            });
            fetchDailyStatus();
            setModalOpen(false);
            alert("Substitute assigned successfully!");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to assign substitute");
        } finally {
            setAssigningSub(false);
        }
    };

    const handleRemoveSubstitution = async (subId) => {
        if (!confirm("Remove this substitution?")) return;
        try {
            await api.delete(`/admin/substitutions/${subId}`);
            fetchDailyStatus();
            setModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to remove substitution");
        }
    }
    const handleRemoveAbsence = async (facultyId) => {
        if (!confirm("Restore faculty presence for ONLY this class?")) return;
        try {
            await api.delete('/admin/faculty-absences', {
                params: {
                    facultyId,
                    date: selectedDate,
                    period: selectedCell.period
                }
            });
            fetchDailyStatus();
            setModalOpen(false);
            alert("Absence removed for this class.");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to remove absence");
        }
    };

    const handleRestoreRemainder = async (facultyId) => {
        if (!confirm("Restore faculty presence for this AND all subsequent classes today?")) return;
        try {
            await api.delete('/admin/faculty-absences', {
                params: {
                    facultyId,
                    date: selectedDate,
                    period: selectedCell.period,
                    mode: 'from_period'
                }
            });
            fetchDailyStatus();
            setModalOpen(false);
            alert("Absence removed for remainder of the day.");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to restore presence");
        }
    };

    const renderStatusSection = () => {
        if (!selectedCell) return null;
        const key = `${selectedCell.day}-${selectedCell.period}`;
        if (!timetable[key]) return null;

        const entry = timetable[key];
        if (!entry.facultyId) return null;
        if (getDayName(selectedDate) !== selectedCell.day.toUpperCase()) return null;

        const isAbsent = absences.some(a => a.facultyId === entry.facultyId && (a.period === 0 || a.period === selectedCell.period));
        const subEntry = substitutions.find(s => s.timetableId === entry.id);

        return (
            <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-600" />
                    Daily Status & Substitution ({selectedDate})
                </h4>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Faculty Status:</span>
                        {isAbsent ? (
                            <div className="flex flex-col items-end">
                                <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                                    <AlertTriangle size={14} /> Absent
                                </span>
                            </div>
                        ) : (
                            <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                                <CheckCircle size={14} /> Present
                            </span>
                        )}
                    </div>

                    {!isAbsent && (
                        <button
                            onClick={() => handleMarkAbsent(entry.facultyId)}
                            className="w-full btn border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                        >
                            <AlertTriangle size={16} />
                            Mark Faculty as Absent Today
                        </button>
                    )}

                    {isAbsent && (
                        <>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRemoveAbsence(entry.facultyId)}
                                        className="flex-1 btn bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-xs"
                                    >
                                        Restore This Class Only
                                    </button>
                                    <button
                                        onClick={() => handleRestoreRemainder(entry.facultyId)}
                                        className="flex-1 btn bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs"
                                    >
                                        Restore Remainder of Day
                                    </button>
                                </div>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                <h5 className="font-semibold text-yellow-800 mb-2">Substitution</h5>

                                {subEntry ? (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-yellow-900 font-medium">Assigned To:</p>
                                            <p className="font-bold text-yellow-800">{subEntry.substituteFaculty?.fullName}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveSubstitution(subEntry.id)}
                                            className="text-red-500 hover:text-red-700 p-2"
                                            title="Remove Substitution"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <select
                                            className="input-field w-full text-sm"
                                            value={substituteId}
                                            onChange={e => setSubstituteId(e.target.value)}
                                        >
                                            <option value="">-- Select Substitute --</option>
                                            {facultyList
                                                .filter(f => f.id !== entry.facultyId) // Exclude current faculty
                                                .map(f => (
                                                    <option key={f.id} value={f.id}>{f.fullName} ({f.department})</option>
                                                ))}
                                        </select>
                                        <button
                                            onClick={() => handleAssignSubstitute(entry.id)}
                                            disabled={assigningSub || !substituteId}
                                            className="btn btn-primary w-full text-sm"
                                        >
                                            {assigningSub ? 'Assigning...' : 'Assign Substitute'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };


    const handleSave = async () => {
        setSaving(true);
        try {
            const entries = Object.values(timetable).map(e => ({
                ...e,
                facultyId: e.facultyId
            }));

            await api.post('/admin/timetable', {
                entries,
                department,
                year,
                semester,
                section
            });
            alert('Timetable saved successfully!');
            fetchTimetable();
            fetchDailyStatus();
        } catch (err) {
            alert('Failed to save timetable');
        } finally {
            setSaving(false);
        }
    };

    const departmentColors = {
        'CSE': 'bg-[#003B73] text-white',
        'ECE': 'bg-[#003B73] text-white',
        'EEE': 'bg-[#003B73] text-white',
        'MECH': 'bg-[#003B73] text-white',
        'CIVIL': 'bg-[#003B73] text-white',
        'IT': 'bg-[#003B73] text-white'
    };

    const currentDept = departments.find(d => (d.code || d.name) === department);

    const availableSubjects = subjects.filter(s => {
        // Strict department match for Department-specific subjects

        if (s.semester !== parseInt(semester)) return false;

        if (s.type === 'COMMON') return true;

        // Match against Code OR Name (handle legacy data or mismatch)
        return s.department === department || (currentDept && s.department === currentDept.name);
    });

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-6">
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-3xl font-black text-[#003B73] mb-2 tracking-tight">
                    Timetable Manager
                </h1>
                <p className="text-gray-500 font-medium">Create and manage class schedules</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6 animate-fadeIn delay-100">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end mb-4 border-b border-gray-100 pb-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar size={18} className="text-[#003B73]" />
                            Select Date
                        </label>
                        <input
                            type="date"
                            className="input-field font-semibold text-gray-700"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-2 font-medium">
                            Viewing schedule for: <span className="font-bold text-[#003B73]">{getDayName(selectedDate)}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchDailyStatus}
                            className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-[#003B73] hover:text-white transition-all shadow-sm"
                            title="Refresh Status"
                        >
                            <RefreshCw size={20} className={statusLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Department</label>
                        <select
                            className="input-field w-full font-semibold"
                            value={department}
                            onChange={e => setDepartment(e.target.value)}
                        >
                            {departments.map(d =>
                                <option key={d.id} value={d.code || d.name}>{d.code || d.name}</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Year</label>
                        <select
                            className="input-field w-full font-semibold"
                            value={year}
                            onChange={e => setYear(e.target.value)}
                        >
                            {(departments.find(d => (d.code || d.name) === department)?.years?.split(',') || ['1', '2', '3', '4']).map(y =>
                                <option key={y} value={y}>{y} Year</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Semester</label>
                        <select
                            className="input-field w-full font-semibold"
                            value={semester}
                            onChange={e => setSemester(e.target.value)}
                        >
                            {(department === 'First Year (General)' || currentDept?.name === 'First Year (General)'
                                ? ['1', '2']
                                : [(parseInt(year) * 2 - 1).toString(), (parseInt(year) * 2).toString()]
                            ).map(s =>
                                <option key={s} value={s}>Sem {s}</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Section</label>
                        <select
                            className="input-field w-full font-semibold"
                            value={section}
                            onChange={e => setSection(e.target.value)}
                        >
                            {(departments.find(d => (d.code || d.name) === department)?.sections?.split(',') || ['A', 'B', 'C']).map(s =>
                                <option key={s} value={s}>{s}</option>
                            )}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full bg-[#003B73] hover:bg-[#002850] text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
                        >
                            {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Timetable Grid */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fadeIn delay-200">
                <div className="p-6 bg-[#003B73] text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">
                            {department} - Year {year} - Section {section}
                        </h2>
                        <p className="text-blue-200 text-sm mt-1 font-medium">Click any cell to manage schedule</p>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg">
                        <Clock className="text-white" size={24} />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader className="animate-spin text-indigo-600" size={48} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b-2 border-gray-200">
                                    <th className="p-4 text-left font-bold text-gray-700 w-32">Day</th>
                                    {periods.map(p => (
                                        <th key={p.id} className="p-4 text-center min-w-[160px]">
                                            <div className="font-bold text-gray-800">{p.name}</div>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                                                <Clock size={12} />
                                                {p.label}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {days.map((day, dayIdx) => {
                                    // Track which periods are occupied by multi-period entries
                                    const occupiedPeriods = new Set();

                                    // First pass: identify occupied periods
                                    periods.forEach(p => {
                                        const key = `${day}-${p.id}`;
                                        const entry = timetable[key];
                                        if (entry && entry.duration > 1) {
                                            // Mark subsequent periods as occupied
                                            for (let i = 1; i < entry.duration; i++) {
                                                occupiedPeriods.add(p.id + i);
                                            }
                                        }
                                    });

                                    return (
                                        <tr key={day} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-bold text-gray-700 bg-gray-50">
                                                {day}
                                            </td>
                                            {periods.map(p => {
                                                // Skip this cell if it's occupied by a previous multi-period entry
                                                if (occupiedPeriods.has(p.id)) {
                                                    return null;
                                                }

                                                // Determine day name for current date
                                                // Note: days array is ['MON', 'TUE'...]
                                                // getDayName returns 3 chars e.g. 'MON'
                                                // Ensure simple comparison works


                                                const key = `${day}-${p.id}`;
                                                const entry = timetable[key];
                                                const colspan = entry?.duration || 1;

                                                // Check Status logic
                                                const isToday = getDayName(selectedDate) === day.toUpperCase().slice(0, 3);
                                                // Check for specific period absence or full day (period 0)
                                                const isAbsent = entry?.facultyId && absences.some(a =>
                                                    a.facultyId === entry.facultyId && (a.period === 0 || a.period === p.id)
                                                );
                                                const subEntry = entry && substitutions.find(s => s.timetableId === entry.id);

                                                return (
                                                    <td
                                                        key={p.id}
                                                        colSpan={colspan}
                                                        onClick={() => handleCellClick(day, p.id)}
                                                        className={`p-2 cursor-pointer group relative ${isToday ? 'bg-indigo-50/30' : ''}`}
                                                    >
                                                        {entry ? (

                                                            <div className={`p-3 rounded-lg transition-all h-24 flex flex-col justify-between ${subEntry
                                                                ? 'bg-yellow-50 border-2 border-yellow-400'
                                                                : isToday && isAbsent
                                                                    ? 'bg-red-50 border-2 border-red-400'
                                                                    : entry.type === 'LAB'
                                                                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-400'
                                                                        : 'bg-white border-2 border-gray-200 hover:border-indigo-400'
                                                                }`}>
                                                                <div>
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <span className="font-semibold text-gray-800 text-sm leading-tight">
                                                                            {entry.subjectName || 'Untitled'}
                                                                        </span>
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entry.type === 'LAB'
                                                                            ? 'bg-blue-100 text-blue-700'
                                                                            : 'bg-gray-100 text-gray-700'
                                                                            }`}>
                                                                            {entry.type || 'THEORY'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                                                        <User size={12} />
                                                                        {subEntry ? (
                                                                            <span className="font-bold text-yellow-700 flex items-center gap-1">
                                                                                <RefreshCw size={10} />
                                                                                {subEntry.substituteFaculty?.fullName || 'Sub'}
                                                                            </span>
                                                                        ) : isToday && isAbsent ? (
                                                                            <span className="font-bold text-red-600 flex items-center gap-1">
                                                                                <AlertTriangle size={10} />
                                                                                ABSENT
                                                                            </span>
                                                                        ) : (
                                                                            entry.facultyName || 'TBA'
                                                                        )}
                                                                    </div>
                                                                    {entry.room && (
                                                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                            <MapPin size={12} />
                                                                            {entry.room}
                                                                        </div>
                                                                    )}
                                                                    {entry.duration && entry.duration > 1 && (
                                                                        <div className="text-xs text-indigo-600 mt-1 flex items-center gap-1 font-medium">
                                                                            <Clock size={12} />
                                                                            Period {p.id}-{p.id + entry.duration - 1}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="h-24 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center group">
                                                                <div className="text-gray-400 group-hover:text-indigo-600 transition-colors">
                                                                    <Plus size={24} className="opacity-50 group-hover:opacity-100" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg transform scale-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">Assign Class</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedCell?.day} - Period {selectedCell?.period}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setModalOpen(false);
                                    setSubstituteId('');
                                }}
                                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Type Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                            <button
                                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${entryType === 'THEORY'
                                    ? 'bg-white shadow-md text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                onClick={() => setEntryType('THEORY')}
                            >
                                📚 Theory Class
                            </button>
                            <button
                                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${entryType === 'LAB'
                                    ? 'bg-white shadow-md text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                onClick={() => setEntryType('LAB')}
                            >
                                🔬 Lab Session
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <BookOpen size={16} />
                                    Subject
                                </label>
                                <select
                                    className="input-field w-full"
                                    value={selectedSubject}
                                    onChange={e => handleSubjectChange(e.target.value)}
                                >
                                    <option value="">-- Select Subject --</option>
                                    {availableSubjects.map(s => (
                                        <option key={s.id} value={s.name}>
                                            {s.shortName ? `${s.shortName} - ${s.name}` : s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <User size={16} />
                                    Faculty
                                </label>
                                <input
                                    className="input-field w-full bg-gray-50"
                                    value={selectedFaculty}
                                    readOnly
                                    placeholder="Auto-assigned based on subject"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Faculty is automatically assigned based on subject selection
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <MapPin size={16} />
                                    Room
                                </label>
                                <input
                                    type="text"
                                    className="input-field w-full"
                                    placeholder="e.g., Lab-301, Room-205"
                                    value={selectedRoom}
                                    onChange={e => setSelectedRoom(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Clock size={16} />
                                    Duration (Periods)
                                </label>
                                <select
                                    className="input-field w-full"
                                    value={selectedDuration}
                                    onChange={e => setSelectedDuration(parseInt(e.target.value))}
                                >
                                    <option value={1}>1 Period (Regular Class)</option>
                                    <option value={2}>2 Periods (Lab)</option>
                                    <option value={3}>3 Periods (Extended Lab)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {selectedDuration > 1 && `This will occupy periods ${selectedCell?.period} to ${selectedCell?.period + selectedDuration - 1}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            {timetable[`${selectedCell?.day}-${selectedCell?.period}`] && (
                                <button
                                    onClick={deleteEntry}
                                    className="btn bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 flex items-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setModalOpen(false);
                                    setSubstituteId('');
                                }}
                                className="flex-1 btn bg-gray-100 hover:bg-gray-200 text-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyChanges}
                                className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                                disabled={!selectedSubject}
                            >
                                <Edit2 size={16} />
                                {timetable[`${selectedCell?.day}-${selectedCell?.period}`] ? 'Update' : 'Assign'}
                            </button>
                        </div>
                        {renderStatusSection()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetableManager;
