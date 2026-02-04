import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const AdminMarksManager = () => {
    // We might access this via /admin/marks/:subjectId
    // Or if we access via a list first...
    // Let's assume we navigate here from Subject Manager? 
    // Actually, let's look at the routing plan. 
    // Use URL params: /admin/marks/:subjectId

    const { subjectId } = useParams();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [subjectDetails, setSubjectDetails] = useState(null);

    useEffect(() => {
        if (subjectId) {
            fetchMarks();
        }
    }, [subjectId]);

    const fetchMarks = async () => {
        try {
            // We need an endpoint to get subject details too ideally
            const res = await api.get(`/admin/marks/${subjectId}`);
            setStudents(Array.isArray(res.data) ? res.data : []);
            // setSubjectDetails(res.data[0]?.subjectName?); // The API might need to return subject metadata
        } catch (err) {
            alert('Error fetching marks');
        }
    }

    const handleMarkChange = (studentId, field, value) => {
        if (value === '') {
            updateMarkState(studentId, field, '');
            return;
        }
        const numVal = parseFloat(value);
        if (isNaN(numVal) || numVal < 0 || numVal > 60) return;
        updateMarkState(studentId, field, value);
    }

    const updateMarkState = (studentId, field, value) => {
        setStudents(prev => prev.map(s =>
            s.studentId === studentId
                ? { ...s, marks: { ...s.marks, [field]: value } }
                : s
        ));
    }

    const handleSaveMarks = async (studentId) => {
        const student = students.find(s => s.studentId === studentId);
        const marks = student.marks;
        try {
            await api.post('/admin/marks', {
                studentId,
                subjectId,
                ...marks // Pass all fields (cia1_test etc) if they exist in state
            });
            fetchMarks();
            alert('Marks Updated');
        } catch (err) {
            alert('Failed to save marks');
        }
    }

    return (
        <div className="p-6">
            <button onClick={() => navigate('/admin/subjects')} className="mb-4 text-indigo-600 hover:underline">← Back to Subjects</button>
            <div className="bg-white p-6 rounded shadow border-l-4 border-indigo-500">
                <h2 className="text-2xl font-bold mb-2">Admin Override - Marks</h2>
                <p className="text-gray-600 mb-6">Editing marks as Administrator. Partial updates supported.</p>

                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 border">Reg No</th>
                            <th className="p-3 border">Name</th>
                            {/* Simplified View for Admin? Or full breakdown? 
                                Let's show Breakdown for CIA 1 as example or tabbed view.
                                For now, existing logic was simple inputs. 
                                Let's match the NEW schema. 
                            */}
                            <th className="p-3 border">CIA 1 (Total)</th>
                            <th className="p-3 border">CIA 2 (Total)</th>
                            <th className="p-3 border">CIA 3 (Total)</th>
                            <th className="p-3 border">Internal</th>
                            <th className="p-3 border">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map(student => {
                            // Helper to sum
                            const sum = (t, a, at) => (t || 0) + (a || 0) + (at || 0);
                            const c1 = sum(student.marks.cia1_test, student.marks.cia1_assignment, student.marks.cia1_attendance);
                            const c2 = sum(student.marks.cia2_test, student.marks.cia2_assignment, student.marks.cia2_attendance);
                            const c3 = sum(student.marks.cia3_test, student.marks.cia3_assignment, student.marks.cia3_attendance);

                            return (
                                <tr key={student.studentId} className="border-b hover:bg-gray-50">
                                    <td className="p-3 border">{student.registerNumber}</td>
                                    <td className="p-3 border">{student.name}</td>
                                    <td className="p-3 border">
                                        {/* Just simple inputs for totals? No, schema stores components. 
                                            Admin editing COMPONENTS is complex. 
                                            Let's just show totals for READ ONLY and maybe Edit button to open modal?
                                            Or keep it simple: Edit Test Only?
                                            Let's assume Admin only edits totals for overrides? No, that breaks consistency.
                                            Let's display Read-Only calculated totals here.
                                        */}
                                        <span className="font-mono">{c1}</span>
                                    </td>
                                    <td className="p-3 border"><span className="font-mono">{c2}</span></td>
                                    <td className="p-3 border"><span className="font-mono">{c3}</span></td>
                                    <td className="p-3 border font-bold text-gray-700">{student.marks.internal}</td>
                                    <td className="p-3 border">
                                        <button className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Edit Details</button>
                                        {/* Placeholder for complex modal edit */}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminMarksManager;
