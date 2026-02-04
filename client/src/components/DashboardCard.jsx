import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const DashboardCard = ({ title, value, icon: Icon, gradient, bgGradient, change, trend, index }) => {
    return (
        <div
            className={`stat-card animate-fadeIn delay-${index * 100} bg-gradient-to-br ${bgGradient || 'from-white to-gray-50'}`}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient || 'from-[#003B73] to-blue-600'} shadow-lg transform transition-transform hover:scale-110`}>
                    <Icon className="text-white" size={24} />
                </div>
                {change && (
                    <div className={`flex items-center gap-1 text-sm font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                        {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {change}
                    </div>
                )}
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-gray-900">{value}</p>

            {/* Animated progress bar */}
            <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${gradient || 'from-[#003B73] to-blue-600'} rounded-full animate-pulse`}
                    style={{ width: '75%' }}
                ></div>
            </div>
        </div>
    );
};

export default DashboardCard;
