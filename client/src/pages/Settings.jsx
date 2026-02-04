import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import AuthContext from '../context/AuthProvider';
import {
    User, Lock, Shield, Activity, Save,
    RefreshCw, UserMinus, UserCheck, AlertTriangle,
    CheckCircle, XCircle, Info, Mail, Phone, Hash
} from 'lucide-react';

const Settings = () => {
    const { auth } = useContext(AuthContext);
    const location = useLocation();
    const isForced = location.state?.forcePasswordChange || auth.forcePasswordChange;
    const isAdmin = auth.role === 'ADMIN';

    const [activeTab, setActiveTab] = useState('personal');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Personal Info States
    const [personalInfo, setPersonalInfo] = useState({
        fullName: '',
        email: '',
        phoneNumber: ''
    });

    // Security States
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Admin-Only: Faculty Management States
    const [facultyList, setFacultyList] = useState([]);
    const [activities, setActivities] = useState([]);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [newFacultyPassword, setNewFacultyPassword] = useState('');

    useEffect(() => {
        fetchProfile();
        if (isAdmin) {
            fetchFaculty();
            fetchActivities();
        }
        if (isForced) {
            setActiveTab('security');
        }
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/profile');
            setProfile(res.data);
            setPersonalInfo({
                fullName: res.data.fullName || '',
                email: res.data.email || '',
                phoneNumber: res.data.phoneNumber || ''
            });
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFaculty = async () => {
        try {
            const res = await api.get('/profile/faculty');
            setFacultyList(res.data);
        } catch (err) {
            console.error('Failed to fetch faculty:', err);
        }
    };

    const fetchActivities = async () => {
        try {
            const res = await api.get('/profile/activity-logs');
            setActivities(res.data);
        } catch (err) {
            console.error('Failed to fetch activities:', err);
        }
    };

    const handleUpdatePersonal = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/profile', personalInfo);
            alert('Profile updated successfully!');
            fetchProfile();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        setSaving(true);
        try {
            await api.post('/profile/change-password', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            alert('Password changed successfully!');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to change password');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleFaculty = async (facultyId, currentStatus) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'enable' : 'disable'} this account?`)) return;
        try {
            await api.post('/profile/faculty/toggle-status', {
                facultyId,
                isDisabled: !currentStatus
            });
            fetchFaculty();
            fetchActivities();
        } catch (err) {
            alert('Failed to toggle status');
        }
    };

    const handleResetFacultyPassword = async () => {
        if (!newFacultyPassword) return;
        try {
            await api.post('/profile/faculty/reset-password', {
                facultyId: selectedFaculty.id,
                newPassword: newFacultyPassword
            });
            alert('Password reset successfully!');
            setShowResetModal(false);
            setNewFacultyPassword('');
            fetchActivities();
        } catch (err) {
            alert('Failed to reset password');
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading settings...</div>;

    const sections = [
        { id: 'personal', label: 'Personal Information', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
    ];

    if (isAdmin) {
        sections.push({ id: 'faculty', label: 'Faculty Control', icon: Shield });
        sections.push({ id: 'activity', label: 'Activity Log', icon: Activity });
    } else {
        sections.push({ id: 'academic', label: 'Academic Info', icon: Info });
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-3xl font-black text-[#003B73]">Profile Settings</h1>
                <p className="text-gray-500 font-medium">Manage your {isAdmin ? 'admin' : 'faculty'} account preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Tabs */}
                <div className="lg:col-span-1 space-y-2 animate-slideIn">
                    {sections.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveTab(s.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${activeTab === s.id
                                ? 'bg-[#003B73] text-white shadow-lg translate-x-1'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <s.icon size={20} />
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fadeIn">

                        {/* 1. Personal Information */}
                        {activeTab === 'personal' && (
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <User className="text-blue-600" size={24} />
                                    Personal Details
                                </h3>
                                <form onSubmit={handleUpdatePersonal} className="space-y-6 max-w-2xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Full Name</label>
                                            <input
                                                className="input-field"
                                                value={personalInfo.fullName}
                                                onChange={e => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Email ID {isAdmin ? '(Editable)' : '(Read-only)'}</label>
                                            <input
                                                className={`input-field ${!isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                                value={personalInfo.email}
                                                onChange={e => isAdmin && setPersonalInfo({ ...personalInfo, email: e.target.value })}
                                                disabled={!isAdmin}
                                                type="email"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Phone Number</label>
                                            <input
                                                className="input-field"
                                                value={personalInfo.phoneNumber}
                                                onChange={e => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                                                placeholder="Enter phone number"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Role</label>
                                            <div className="input-field bg-gray-50 flex items-center gap-2 font-black text-blue-700">
                                                <Shield size={16} /> {profile.role}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Username</label>
                                            <div className="input-field bg-gray-50 font-mono text-gray-600">
                                                {profile.username}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn btn-primary px-8 py-3 flex items-center gap-2 shadow-xl"
                                    >
                                        <Save size={18} /> {saving ? 'Saving...' : 'Update Information'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* 2. Security */}
                        {activeTab === 'security' && (
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <Lock className="text-red-600" size={24} />
                                    Security & Auth
                                </h3>

                                {isForced && (
                                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3 animate-bounce">
                                        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="font-bold text-red-800">Password Change Required</p>
                                            <p className="text-sm text-red-600">Your password was reset by an administrator. You must change it before continuing.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Current Password</label>
                                            <input
                                                type="password"
                                                className="input-field"
                                                value={passwords.currentPassword}
                                                onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">New Password</label>
                                            <input
                                                type="password"
                                                className="input-field"
                                                value={passwords.newPassword}
                                                onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700">Confirm New Password</label>
                                            <input
                                                type="password"
                                                className="input-field"
                                                value={passwords.confirmPassword}
                                                onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="btn btn-primary bg-red-600 hover:bg-red-700 border-none w-full py-4 shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={20} /> {saving ? 'Processing...' : 'Change Password'}
                                        </button>
                                    </form>

                                    <div className="space-y-6">
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <p className="text-sm font-bold text-gray-500 uppercase">Last Password Change</p>
                                            <p className="text-lg font-black text-gray-800 mt-1">
                                                {profile.lastPasswordChange ? new Date(profile.lastPasswordChange).toLocaleDateString() : 'Never'}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                            <h4 className="font-bold text-red-800 flex items-center gap-2">
                                                <AlertTriangle size={18} /> Danger Zone
                                            </h4>
                                            <p className="text-xs text-red-600 mt-1 mb-4">You can force logout all sessions from here.</p>
                                            <button className="w-full py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors">
                                                Logout from all devices (Optional)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Admin-Only Faculty Control */}
                        {activeTab === 'faculty' && isAdmin && (
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <Shield className="text-indigo-600" size={24} />
                                    Faculty Account Control
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Faculty</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                                <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Last Login</th>
                                                <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {facultyList.map(f => (
                                                <tr key={f.id} className="hover:bg-gray-50">
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-800">{f.fullName}</span>
                                                            <span className="text-xs text-gray-500 font-mono">{f.username} • {f.department}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {f.isDisabled ? (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-200">Disabled</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-200">Active</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-600">
                                                        {f.lastLogin ? new Date(f.lastLogin).toLocaleString() : 'Never'}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => { setSelectedFaculty(f); setShowResetModal(true); }}
                                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                                                title="Reset Password"
                                                            >
                                                                <RefreshCw size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleFaculty(f.id, f.isDisabled)}
                                                                className={`p-2 rounded-lg ${f.isDisabled ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                                                title={f.isDisabled ? 'Enable' : 'Disable'}
                                                            >
                                                                {f.isDisabled ? <UserCheck size={16} /> : <UserMinus size={16} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 4. Admin-Only Activity Log */}
                        {activeTab === 'activity' && isAdmin && (
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <Activity className="text-blue-500" size={24} />
                                    Recent Admin Actions
                                </h3>
                                <div className="space-y-4">
                                    {activities.length === 0 ? (
                                        <p className="text-center py-12 text-gray-400 font-medium">No recent actions logged</p>
                                    ) : (
                                        activities.map(log => (
                                            <div key={log.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className={`p-3 rounded-lg flex-shrink-0 ${log.action.includes('PASSWORD') ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                                                    }`}>
                                                    <Activity size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <span className="font-black text-[#003B73] text-sm uppercase tracking-wider">{log.action.replace('_', ' ')}</span>
                                                        <span className="text-[10px] font-bold text-gray-400">{new Date(log.timestamp).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-gray-600 text-sm mt-1">{log.description}</p>
                                                    <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-tighter">
                                                        Performed by: <span className="text-indigo-600">{log.performer.fullName}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 5. Faculty-Only Academic Info */}
                        {activeTab === 'academic' && !isAdmin && (
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <Info className="text-blue-600" size={24} />
                                    Academic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                            <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Department</p>
                                            <p className="text-xl font-black text-blue-900">{profile.department}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Designation</p>
                                            <p className="text-xl font-black text-gray-800">{profile.designation || 'Faculty Member'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-2xl">
                                        <h4 className="font-bold mb-4 flex items-center gap-2">
                                            <Activity className="text-cyan-400" size={18} /> Teaching Overview
                                        </h4>
                                        <ul className="space-y-3">
                                            <li className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">Current Academic Year</span>
                                                <span className="font-mono text-cyan-400">2025-26</span>
                                            </li>
                                            <li className="flex justify-between items-center text-sm border-t border-gray-800 pt-3">
                                                <span className="text-gray-400">Total Subjects Handled</span>
                                                <span className="font-mono font-bold">Demo (Data in classes page)</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Reset Password</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Resetting password for <strong>{selectedFaculty.fullName}</strong>.
                            They will be forced to change it on their next login.
                        </p>
                        <input
                            type="password"
                            className="input-field w-full mb-6"
                            placeholder="Enter new password"
                            value={newFacultyPassword}
                            onChange={e => setNewFacultyPassword(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setShowResetModal(false)} className="flex-1 btn bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</button>
                            <button onClick={handleResetFacultyPassword} className="flex-1 btn btn-primary">Confirm Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
