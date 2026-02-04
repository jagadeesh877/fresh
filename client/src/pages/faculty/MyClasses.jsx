import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { BookOpen, Users, BarChart2, Calendar, ArrowRight, CheckCircle } from 'lucide-react';

const MyClasses = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/faculty/assignments');
            setClasses(res.data);
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B73]"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-8 animate-fadeIn">
                <h1 className="text-3xl font-bold text-[#003B73]">My Classes</h1>
                <p className="text-gray-600 mt-1">Manage your assigned subjects, attendance, and marks</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls, idx) => (
                    <div
                        key={cls.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden animate-fadeIn"
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-[#003B73]">{cls.subject.name}</h3>
                                    <p className="text-sm text-gray-500 font-mono mt-1">{cls.subject.code}</p>
                                </div>
                                <span className="px-3 py-1 bg-white text-[#003B73] text-xs font-bold rounded-full border border-blue-100 shadow-sm">
                                    {cls.subject.department} - {cls.subject.year}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-100">
                                    Section {cls.section}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                                    Semester {cls.subject.semester}
                                </span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="p-5 grid grid-cols-3 gap-4 border-b border-gray-100">
                            <div className="text-center">
                                <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1 rounded-full bg-blue-50 text-[#003B73]">
                                    <Users size={16} />
                                </div>
                                <p className="text-xs text-gray-500">Students</p>
                                <p className="font-bold text-gray-800">{cls.studentCount || 0}</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1 rounded-full bg-orange-50 text-orange-600">
                                    <BarChart2 size={16} />
                                </div>
                                <p className="text-xs text-gray-500">Avg Marks</p>
                                <p className="font-bold text-gray-800">{cls.avgMarks || 0}%</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center w-8 h-8 mx-auto mb-1 rounded-full bg-cyan-50 text-cyan-600">
                                    <Calendar size={16} />
                                </div>
                                <p className="text-xs text-gray-500">Classes/Wk</p>
                                <p className="font-bold text-gray-800">{cls.weeklyClasses || 0}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-gray-50 flex gap-2">
                            <button
                                onClick={() => navigate(`/faculty/class/${cls.subject.id}`)}
                                className="flex-1 px-4 py-2 bg-[#003B73] text-white rounded-lg hover:bg-[#002850] font-medium text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                View Class <ArrowRight size={16} />
                            </button>
                            {/* Shortucts could go here if needed, but View Class is primary */}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyClasses;
