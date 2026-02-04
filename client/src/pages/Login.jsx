import { useState, useContext } from 'react';
import AuthContext from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ArrowRight } from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(username, password);

            if (user.forcePasswordChange) {
                const target = user.role === 'ADMIN' ? '/admin/settings' : '/faculty/settings';
                navigate(target, { state: { forcePasswordChange: true } });
                return;
            }

            if (user.role === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/faculty');
            }
        } catch (err) {
            setError('Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans">
            {/* Left Side - Blue Background with Logo */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#003B73] items-center justify-center p-12 relative overflow-hidden text-white">

                {/* CSS Based Logo Implementation */}
                <div className="border-4 border-white/90 rounded-3xl p-8 max-w-lg w-full text-center transform hover:scale-105 transition-transform duration-500 shadow-2xl bg-[#003B73]">
                    <h1 className="text-[120px] font-black leading-none tracking-tighter mb-2"
                        style={{
                            background: 'linear-gradient(to bottom, #FFFFFF 40%, #89CFF0 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
                        }}>
                        MIET
                    </h1>

                    <p className="font-serif text-sm md:text-md tracking-wider mb-2 text-white/90">
                        Mohamed Institute of Education & Technology
                    </p>

                    <h2 className="text-4xl font-bold tracking-[0.2em] mb-4 text-white drop-shadow-md">
                        INSTITUTIONS
                    </h2>

                    <div className="flex items-center justify-center gap-4 text-yellow-400">
                        <div className="h-0.5 w-16 bg-yellow-400"></div>
                        <span className="font-serif italic text-xl">Since 1984</span>
                        <div className="h-0.5 w-16 bg-yellow-400"></div>
                    </div>
                </div>

                {/* Subtle overlay texture/gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent pointer-events-none"></div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F5F7FA]">
                <div className="w-full max-w-md">

                    {/* Login Card */}
                    <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-10 relative overflow-hidden">

                        {/* Top Right Circle Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 opacity-50"></div>

                        <div className="relative z-10 text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0F2C59] rounded-2xl mb-6 shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
                                <User className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-[#0F2C59] mb-2">
                                MIET ERP Login
                            </h2>
                            <p className="text-gray-500 text-sm">Welcome back! Please access your academic portal.</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm font-medium animate-pulse">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                                    Username <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400 group-focus-within:text-[#0F2C59] transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2C59] focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-800 placeholder:text-gray-400 font-medium"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-[#0F2C59] transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2C59] focus:border-transparent transition-all bg-gray-50 focus:bg-white text-gray-800 placeholder:text-gray-400 font-medium"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[#0F2C59] hover:bg-[#0A1E3F] text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Login'} <ArrowRight size={20} />
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-500 mt-8 font-medium">
                        © 2026 MIET College ERP | Developed by CSE Dept
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
