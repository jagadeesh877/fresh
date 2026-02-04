import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AuthContext from '../context/AuthProvider';

const ProtectedRoute = ({ allowedRoles }) => {
    const { auth } = useContext(AuthContext);

    if (!auth) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(auth.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
