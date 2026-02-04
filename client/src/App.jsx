import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/unauthorized" element={<div className="p-8">Unauthorized Access</div>} />

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin/*" element={<AdminDashboard />} />
            </Route>

            {/* Faculty Routes */}
            <Route element={<ProtectedRoute allowedRoles={['FACULTY']} />}>
                <Route path="/faculty/*" element={<FacultyDashboard />} />
            </Route>
        </Routes>
    );
}

export default App;
