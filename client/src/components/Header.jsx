import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell, Search, Menu } from 'lucide-react';
import { useContext, useState } from 'react';
import AuthContext from '../context/AuthProvider';

const Header = ({ title }) => {
    const { auth, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [showProfile, setShowProfile] = useState(false);

    return (
        <header className="h-24 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-40 transition-all duration-300">
            {/* Title Section */}
            <div>
                <h1 className="text-2xl font-black text-[#003B73]">
                    {title}
                </h1>
                <p className="text-sm text-gray-500 font-medium">Welcome back, {auth?.fullName?.split(' ')[0] || 'User'}</p>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-6">

                {/* Search Bar - Minimal */}
                <div className="hidden md:flex relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#003B73] transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-64 pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-[#003B73]/20 focus:bg-white transition-all text-sm font-medium text-gray-700"
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group">
                    <Bell size={20} className="text-gray-600 group-hover:text-[#003B73] transition-colors" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-white"></span>
                </button>

                {/* User Profile */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        className="flex items-center gap-3 pl-2 pr-1 py-1 hover:bg-gray-50 rounded-full transition-all border border-transparent hover:border-gray-200"
                    >
                        <div className="w-10 h-10 rounded-full bg-[#003B73] flex items-center justify-center text-white font-bold shadow-md ring-4 ring-gray-50">
                            {(auth?.fullName || auth?.user || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left hidden md:block pr-2">
                            <p className="text-sm font-bold text-gray-800 leading-tight">
                                {auth?.fullName || auth?.user}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                {auth?.role === 'ADMIN' ? 'Admin' : 'Faculty'}
                            </p>
                        </div>
                    </button>

                    {/* Dropdown */}
                    {showProfile && (
                        <div className="absolute right-0 mt-4 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fadeIn overflow-hidden z-50">
                            <div className="px-5 py-4 bg-[#F5F7FA] border-b border-gray-100">
                                <p className="text-sm font-bold text-[#003B73]">{auth?.fullName || auth?.user}</p>
                                <p className="text-xs text-gray-500">
                                    {auth?.role === 'ADMIN' ? 'Administrator' : 'Faculty Member'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowProfile(false);
                                    navigate(auth?.role === 'ADMIN' ? '/admin/settings' : '/faculty/settings');
                                }}
                                className="w-full px-5 py-3 text-left text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-3"
                            >
                                <User size={16} className="text-gray-400" />
                                <span>Profile Settings</span>
                            </button>
                            <button
                                onClick={logout}
                                className="w-full px-5 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 border-t border-gray-50 mt-1"
                            >
                                <LogOut size={16} />
                                <span className="font-medium">Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;

