import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Users, Calendar, TrendingUp, Clock,
    Award, Target, Activity, CheckCircle, AlertCircle
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../../api/axios';

const FacultyHome = () => {
    const [statsData, setStatsData] = useState({
        assignedSubjects: 0,
        totalStudents: 0,
        classesThisWeek: 0,
        avgPerformance: '0'
    });
    const [classPerformance, setClassPerformance] = useState([]);
    const [marksSubmission, setMarksSubmission] = useState([]);
    const [attendanceTrend, setAttendanceTrend] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
        fetchTodaySchedule();
    }, []);

    const fetchTodaySchedule = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/faculty/timetable?date=${today}`);
            if (res.data) {
                setTodaySchedule(res.data);
            }
        } catch (err) {
            console.error('[FacultyHome] Failed to fetch timetable:', err);
        }
    };

    const fetchDashboardData = async () => {
        try {
            console.log('[FacultyHome] Fetching dashboard stats...');
            const res = await api.get('/faculty/stats');
            console.log('[FacultyHome] Stats response:', res.data);

            if (res.data) {
                setStatsData({
                    assignedSubjects: res.data.assignedSubjects,
                    totalStudents: res.data.totalStudents,
                    classesThisWeek: res.data.classesThisWeek,
                    avgPerformance: res.data.avgPerformance
                });
                setClassPerformance(res.data.classPerformance || []);
                setMarksSubmission(res.data.marksSubmissionStatus || []);
                setAttendanceTrend(res.data.attendanceTrend || []);

                // Generate pending tasks from marks submission status
                const tasks = [];
                if (res.data.classPerformance) {
                    res.data.classPerformance.forEach(subject => {
                        if (subject.students > 0 && subject.average === 0) {
                            tasks.push({
                                task: `Submit marks for ${subject.subject}`,
                                priority: 'high',
                                due: 'Pending'
                            });
                        }
                    });
                }
                setPendingTasks(tasks);

                console.log('[FacultyHome] Stats data set successfully');
            }
        } catch (err) {
            console.error("[FacultyHome] Failed to fetch stats:", err);
            console.error("[FacultyHome] Error details:", err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };



    const stats = [
        {
            title: 'Assigned Subjects',
            value: statsData.assignedSubjects || 0,
            icon: BookOpen,
            gradient: 'from-blue-600 to-blue-400',
            bgGradient: 'from-blue-50 to-blue-50/50'
        },
        {
            title: 'Total Students',
            value: statsData.totalStudents || 0,
            icon: Users,
            gradient: 'from-[#003B73] to-blue-800',
            bgGradient: 'from-gray-50 to-blue-50'
        },
        {
            title: 'Classes This Week',
            value: statsData.classesThisWeek || 0,
            icon: Calendar,
            gradient: 'from-cyan-600 to-cyan-400',
            bgGradient: 'from-cyan-50 to-blue-50'
        },
        {
            title: 'Avg Performance',
            value: `${statsData.avgPerformance}%`,
            icon: TrendingUp,
            gradient: 'from-emerald-600 to-emerald-400',
            bgGradient: 'from-emerald-50 to-teal-50'
        },
    ];

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-6 custom-scrollbar">
            {/* Header */}
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-3xl font-black text-[#003B73] mb-2 tracking-tight">
                    Faculty Dashboard
                </h1>
                <p className="text-gray-500 flex items-center gap-2 font-medium">
                    <Clock size={16} />
                    Good day! Here's your teaching overview.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className={`stat-card animate-fadeIn delay-${idx * 100} bg-gradient-to-br ${stat.bgGradient} border border-white/50 shadow-sm`}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg text-white`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-bold mb-1">{stat.title}</h3>
                        <p className="text-3xl font-black text-[#003B73]">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Class Performance */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-100 lg:col-span-2">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-[#003B73] flex items-center gap-2">
                            <Award className="text-blue-600" size={24} />
                            Class Performance Overview
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Average marks by subject</p>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={classPerformance}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="subject" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} />
                            <YAxis stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="average" fill="#003B73" radius={[6, 6, 0, 0]} name="Average Marks" />
                            <Bar dataKey="students" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Students" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Marks Submission Status */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-200">
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-[#003B73] flex items-center gap-2">
                            <Target className="text-emerald-600" size={24} />
                            Marks Status
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">CIA submission progress</p>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={marksSubmission.map(item => ({
                                    ...item,
                                    color: item.name === 'Submitted' ? '#003B73' : '#E5E7EB'
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {marksSubmission.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.name === 'Submitted' || entry.name === 'Completed' ? '#003B73' : '#93C5FD'} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                        {marksSubmission.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${item.name === 'Submitted' || item.name === 'Completed' ? 'bg-[#003B73]' : 'bg-blue-300'}`}></div>
                                    <span className="text-gray-600 font-medium">{item.name}</span>
                                </div>
                                <span className="font-bold text-[#003B73]">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Attendance Trend */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6 animate-fadeIn delay-300">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-[#003B73] flex items-center gap-2">
                        <Activity className="text-blue-500" size={24} />
                        Attendance Trend
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Weekly attendance rate across all classes</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={attendanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="week" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} />
                        <YAxis stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} domain={[0, 100]} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="rate"
                            stroke="#003B73"
                            strokeWidth={3}
                            dot={{ fill: '#003B73', r: 5 }}
                            activeDot={{ r: 7 }}
                            name="Attendance %"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Schedule */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-100">
                    <h3 className="text-xl font-bold text-[#003B73] mb-4 flex items-center gap-2">
                        <Calendar className="text-blue-600" size={24} />
                        Today's Schedule
                    </h3>
                    <div className="space-y-3">
                        {todaySchedule.length > 0 ? (
                            todaySchedule.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-xl border-l-4 ${item.isCovered
                                        ? 'bg-gray-50 border-gray-400'
                                        : item.isSubstitution
                                            ? 'bg-amber-50 border-amber-500'
                                            : 'bg-blue-50 border-[#003B73]'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <p className="font-bold text-gray-800 text-sm">
                                            {item.subjectName || 'Class'}
                                            {item.isCovered && <span className="text-xs text-gray-500 ml-2">(Covered by {item.coveredBy})</span>}
                                            {item.isSubstitution && <span className="text-xs text-amber-600 ml-2">(Substitution)</span>}
                                        </p>
                                        {item.isCovered ? (
                                            <CheckCircle size={16} className="text-gray-500" />
                                        ) : item.isSubstitution ? (
                                            <AlertCircle size={16} className="text-amber-600" />
                                        ) : (
                                            <Activity size={16} className="text-[#003B73]" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium">
                                        {item.department} {item.year}-{item.section} •
                                        {item.duration && item.duration > 1
                                            ? ` Period ${item.period}-${item.period + item.duration - 1}`
                                            : ` Period ${item.period}`}
                                        {item.room && ` • ${item.room}`}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Clock size={12} />
                                        {item.day} • {item.type || 'Lecture'}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Calendar size={48} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">No classes scheduled for today</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pending Tasks */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-200">
                    <h3 className="text-xl font-bold text-[#003B73] mb-4 flex items-center gap-2">
                        <AlertCircle className="text-amber-600" size={24} />
                        Pending Tasks
                    </h3>
                    <div className="space-y-3">
                        {pendingTasks.length > 0 ? (
                            pendingTasks.map((item, idx) => (
                                <div key={idx} className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-2">
                                        <p className="text-sm font-bold text-gray-800 flex-1">{item.task}</p>
                                        <span className={`badge ml-2 ${item.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                                        <Clock size={12} />
                                        Due: {item.due}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <CheckCircle size={48} className="mx-auto mb-2 opacity-30 text-emerald-500" />
                                <p className="text-sm font-medium">All tasks completed!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-300">
                    <h3 className="text-xl font-bold text-[#003B73] mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/faculty/marks')}
                            className="w-full p-3 rounded-xl bg-[#003B73] text-white font-bold hover:bg-[#002850] transition-all duration-200 flex items-center justify-start gap-3 shadow-md"
                        >
                            <div className="bg-white/20 p-1.5 rounded-lg">
                                <Award size={18} />
                            </div>
                            Enter Marks
                        </button>
                        <button
                            onClick={() => navigate('/faculty/timetable')}
                            className="w-full p-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all duration-200 flex items-center justify-start gap-3 shadow-sm hover:shadow-md"
                        >
                            <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">
                                <Calendar size={18} />
                            </div>
                            View Timetable
                        </button>
                        <button className="w-full p-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all duration-200 flex items-center justify-start gap-3 shadow-sm hover:shadow-md">
                            <div className="bg-cyan-100 text-cyan-600 p-1.5 rounded-lg">
                                <Users size={18} />
                            </div>
                            View Students
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyHome;
