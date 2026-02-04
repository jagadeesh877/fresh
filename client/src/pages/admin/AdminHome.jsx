import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, GraduationCap, BookOpen, Building2, TrendingUp,
    Calendar, Award, Activity, ArrowUpRight, ArrowDownRight,
    Clock, UserCheck, BookMarked, Target
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import api from '../../api/axios';

const AdminHome = () => {
    const [statsData, setStatsData] = useState({
        students: 0,
        faculty: 0,
        subjects: 0,
        avgAttendance: '0%'
    });
    const [departmentData, setDepartmentData] = useState([]);
    const [performanceTrend, setPerformanceTrend] = useState([]);
    const [marksDistribution, setMarksDistribution] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/stats');
                if (res.data) {
                    setStatsData({
                        students: res.data.students,
                        faculty: res.data.faculty,
                        subjects: res.data.subjects,
                        avgAttendance: res.data.avgAttendance
                    });
                    setDepartmentData(res.data.departmentData || []);
                    setPerformanceTrend(res.data.performanceTrend || []);
                    setMarksDistribution(res.data.marksDistribution || []);
                    setAttendanceData(res.data.attendanceData || []);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Stats cards configuration

    const stats = [
        {
            title: 'Total Students',
            value: statsData.students || 0,
            change: '+12%',
            trend: 'up',
            icon: Users,
            gradient: 'from-blue-600 to-blue-400',
            bgGradient: 'from-blue-50 to-blue-50/50'
        },
        {
            title: 'Faculty Members',
            value: statsData.faculty || 0,
            change: '+5%',
            trend: 'up',
            icon: GraduationCap,
            gradient: 'from-[#003B73] to-blue-800',
            bgGradient: 'from-gray-50 to-blue-50'
        },
        {
            title: 'Active Courses',
            value: statsData.subjects || 0,
            change: '+8%',
            trend: 'up',
            icon: BookOpen,
            gradient: 'from-cyan-600 to-cyan-400',
            bgGradient: 'from-cyan-50 to-blue-50'
        },
        {
            title: 'Avg Attendance',
            value: typeof statsData.avgAttendance === 'number' ? `${statsData.avgAttendance}%` : statsData.avgAttendance,
            change: '-2%',
            trend: 'down',
            icon: UserCheck,
            gradient: 'from-emerald-600 to-emerald-400',
            bgGradient: 'from-emerald-50 to-teal-50'
        },
    ];

    const recentActivities = [
        { action: 'New student admission', user: 'Admin', time: '2 hours ago', type: 'success' },
        { action: 'CIA-2 marks published', user: 'Dr. Kumar', time: '4 hours ago', type: 'info' },
        { action: 'Timetable updated for CSE-3A', user: 'Admin', time: '5 hours ago', type: 'warning' },
        { action: 'Faculty leave approved', user: 'HOD CSE', time: '1 day ago', type: 'info' },
    ];

    const upcomingEvents = [
        { title: 'CIA-3 Examination', date: 'Feb 15-20, 2026', type: 'exam' },
        { title: 'Faculty Development Program', date: 'Feb 10, 2026', type: 'workshop' },
        { title: 'Sports Day', date: 'Feb 25, 2026', type: 'event' },
    ];

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-6 custom-scrollbar">
            {/* Header */}
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-3xl font-black text-[#003B73] mb-2 tracking-tight">
                    Admin Dashboard
                </h1>
                <p className="text-gray-500 flex items-center gap-2 font-medium">
                    <Clock size={16} />
                    Welcome back! Here's what's happening today.
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
                            <div className={`flex items-center gap-1 text-sm font-bold ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                {stat.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                {stat.change}
                            </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-bold mb-1">{stat.title}</h3>
                        <p className="text-3xl font-black text-[#003B73]">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Performance Trend */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-[#003B73] flex items-center gap-2">
                                <TrendingUp className="text-blue-600" size={24} />
                                Performance Trend
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Average marks over last 6 months</p>
                        </div>
                        <div className="badge bg-emerald-100 text-emerald-700 border border-emerald-200">+8% vs last year</div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={performanceTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} />
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
                            <Line
                                type="monotone"
                                dataKey="average"
                                stroke="#003B73"
                                strokeWidth={3}
                                dot={{ fill: '#003B73', r: 5 }}
                                activeDot={{ r: 7 }}
                                name="Average Marks"
                            />
                            <Line
                                type="monotone"
                                dataKey="target"
                                stroke="#10b981"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="Target"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Department Comparison */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-[#003B73] flex items-center gap-2">
                                <Building2 className="text-blue-500" size={24} />
                                Department Overview
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Student & faculty distribution</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={departmentData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="dept" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} />
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
                            <Bar dataKey="students" fill="#003B73" radius={[6, 6, 0, 0]} name="Students" />
                            <Bar dataKey="faculty" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Faculty" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Weekly Attendance */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-300 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-[#003B73] flex items-center gap-2">
                                <Activity className="text-emerald-600" size={24} />
                                Weekly Attendance
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">This week's attendance rate</p>
                        </div>
                        <div className="badge bg-blue-100 text-blue-700 border border-blue-200">Current Week</div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={attendanceData}>
                            <defs>
                                <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} />
                            <YAxis stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: 500 }} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="rate"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorAttendance)"
                                name="Attendance %"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Marks Distribution */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-400">
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-[#003B73] flex items-center gap-2">
                            <Award className="text-amber-600" size={24} />
                            Marks Distribution
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Current semester</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={marksDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                            >
                                {marksDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color === '#8b5cf6' ? '#003B73' : entry.color === '#ec4899' ? '#3B82F6' : entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                        {marksDistribution.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color === '#8b5cf6' ? '#003B73' : item.color === '#ec4899' ? '#3B82F6' : item.color }}></div>
                                    <span className="text-gray-600 font-medium">{item.range}</span>
                                </div>
                                <span className="font-bold text-[#003B73]">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-100">
                    <h3 className="text-xl font-bold text-[#003B73] mb-4 flex items-center gap-2">
                        <Target className="text-blue-600" size={24} />
                        Quick Actions
                    </h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/admin/students', { state: { openAddModal: true } })}
                            className="w-full text-left px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-all duration-300 hover:shadow-md flex items-center"
                        >
                            <div className="bg-blue-100 p-1.5 rounded-lg mr-3 text-blue-600">
                                <Users size={18} />
                            </div>
                            Add New Student
                        </button>
                        <button
                            onClick={() => navigate('/admin/faculty')}
                            className="w-full text-left px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-all duration-300 hover:shadow-md flex items-center"
                        >
                            <div className="bg-[#003B73]/10 p-1.5 rounded-lg mr-3 text-[#003B73]">
                                <GraduationCap size={18} />
                            </div>
                            Add New Faculty
                        </button>
                        <button
                            onClick={() => navigate('/admin/timetable')}
                            className="w-full text-left px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-all duration-300 hover:shadow-md flex items-center"
                        >
                            <div className="bg-cyan-100 p-1.5 rounded-lg mr-3 text-cyan-600">
                                <Calendar size={18} />
                            </div>
                            Manage Timetable
                        </button>
                        <button
                            onClick={() => navigate('/admin/subjects')}
                            className="w-full text-left px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold text-sm transition-all duration-300 hover:shadow-md flex items-center"
                        >
                            <div className="bg-amber-100 p-1.5 rounded-lg mr-3 text-amber-600">
                                <BookMarked size={18} />
                            </div>
                            Manage Subjects
                        </button>
                    </div>
                </div>

                {/* Recent Activities */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-200">
                    <h3 className="text-xl font-bold text-[#003B73] mb-4">Recent Activities</h3>
                    <div className="space-y-4">
                        {recentActivities.map((activity, idx) => (
                            <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                                <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'success' ? 'bg-emerald-500' :
                                    activity.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}></div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-800">{activity.action}</p>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">by {activity.user} • {activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fadeIn delay-300">
                    <h3 className="text-xl font-bold text-[#003B73] mb-4">Upcoming Events</h3>
                    <div className="space-y-4">
                        {upcomingEvents.map((event, idx) => (
                            <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{event.title}</p>
                                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1 font-medium">
                                            <Calendar size={12} />
                                            {event.date}
                                        </p>
                                    </div>
                                    <span className={`badge ${event.type === 'exam' ? 'bg-red-100 text-red-700' :
                                        event.type === 'workshop' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                        {event.type}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminHome;
