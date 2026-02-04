import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setAuth(JSON.parse(storedUser));
        }
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            const user = response.data;
            localStorage.setItem('user', JSON.stringify(user));
            setAuth(user);
            return user;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        setAuth(null);
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
