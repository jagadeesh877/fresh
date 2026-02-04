import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/*" element={<App />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
            <Toaster position="top-right" />
        </ErrorBoundary>
    </StrictMode>,
)
