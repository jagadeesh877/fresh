import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, Calendar, ClipboardList,
    Book, Bell, FileText, GraduationCap, Building2, Award, CheckCircle, UserCheck, Settings as SettingsIcon
} from 'lucide-react';

const Sidebar = ({ role, activePath }) => {
    const location = useLocation();
    const currentPath = activePath || location.pathname;

    const adminMenu = [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { label: 'Students', path: '/admin/students', icon: Users },
        { label: 'Subjects', path: '/admin/subjects', icon: BookOpen },
        { label: 'Faculty', path: '/admin/faculty', icon: GraduationCap },
        { label: 'Timetable', path: '/admin/timetable', icon: Calendar },
        { label: 'Attendance', path: '/admin/attendance', icon: FileText },
        { label: 'Marks Approval', path: '/admin/marks-approval', icon: CheckCircle },
        { label: 'Departments', path: '/admin/departments', icon: Building2 },
        { label: 'Settings', path: '/admin/settings', icon: SettingsIcon },
    ];

    const facultyMenu = [
        { label: 'Dashboard', path: '/faculty', icon: LayoutDashboard },
        { label: 'My Timetable', path: '/faculty/timetable', icon: Calendar },
        { label: 'Attendance', path: '/faculty/attendance', icon: UserCheck },
        { label: 'Enter Marks', path: '/faculty/marks', icon: Award },
        { label: 'My Classes', path: '/faculty/classes', icon: Users },
        { label: 'Materials', path: '/faculty/materials', icon: Book },
        { label: 'Announcements', path: '/faculty/announcements', icon: Bell },
        { label: 'Settings', path: '/faculty/settings', icon: SettingsIcon },
    ];

    const menu = role === 'ADMIN' ? adminMenu : facultyMenu;

    return (
        <div className="w-64 bg-[#003B73] text-white min-h-screen flex flex-col shadow-2xl fixed left-0 top-0 bottom-0 z-50">
            {/* Logo Area */}
            <div className="h-24 flex items-center px-6 bg-[#002850] border-b border-blue-800/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-[#003B73] flex items-center justify-center shadow-lg font-bold text-xl">
                        M
                    </div>
                    <div>
                        <span className="text-xl font-black tracking-tight font-sans">MIET ERP</span>
                        <p className="text-[10px] text-blue-200 uppercase tracking-widest">{role === 'ADMIN' ? 'Administrator' : 'Faculty Faculty'}</p>
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
                <ul className="space-y-1">
                    {menu.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');

                        return (
                            <li key={idx} className="animate-fadeIn" style={{ animationDelay: `${idx * 50}ms` }}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden
                                        ${isActive
                                            ? 'bg-white text-[#003B73] shadow-lg'
                                            : 'text-blue-100 hover:bg-[#0F2C59] hover:text-white'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'
                                        }`} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#002850] border-t border-blue-800/30">
                <div className="text-xs text-blue-300 text-center space-y-1">
                    <p className="font-semibold">© 2026 MIET ERP</p>
                    <p className="text-blue-400">v2.0.0</p>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
