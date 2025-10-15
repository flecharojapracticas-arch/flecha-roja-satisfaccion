import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'; 

// Componentes
import Login from './Login'; 
import Dashboard from './Dashboard'; 
import AnalisisPage from './pages/Analisis'; 
import EncuestasPage from './pages/Encuestas'; 
import ResultadosPage from './pages/Resultados'; 
import ResumenPage from './pages/Resumen'; 

// URL de tu API de Render para verificar el token
const API_DATA_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/data';


// =======================================================
// COMPONENTE AUXILIAR: PRIVATE ROUTE
// =======================================================
const PrivateRoute = ({ children, isAuthenticated }) => {
    return isAuthenticated === true ? children : <Navigate to="/login" />;
};


function App() {
    // ESTADOS
    const [isAuthenticated, setIsAuthenticated] = useState(null); // null = cargando
    const [error, setError] = useState(null);

    // FUNCIÓN DE CARGA DE DATOS (Verifica Token)
    const fetchData = async () => {
        setError(null);
        const token = localStorage.getItem('auth-token');
        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        try {
            const response = await fetch(API_DATA_URL, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('auth-token');
                setIsAuthenticated(false);
                return;
            }

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            setIsAuthenticated(true); 

        } catch (err) {
            console.error("Error al obtener datos:", err);
            setError("No se pudieron cargar los datos. " + err.message);
            setIsAuthenticated(false); 
        }
    };

    // EFECTO DE INICIO
    useEffect(() => {
        const token = localStorage.getItem('auth-token');
        if (token) {
            fetchData();
        } else {
            setIsAuthenticated(false);
        }
    }, []);

    // MANEJADORES DE ESTADO
    const handleLoginSuccess = () => { fetchData(); };
    const handleLogout = () => {
        localStorage.removeItem('auth-token');
        setIsAuthenticated(false);
        setError(null);
    };

    // RENDERIZADO CONDICIONAL DE CARGA
    if (isAuthenticated === null) {
        return (
            <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.2em', color: '#333', backgroundColor: '#f4f4f4' }}>
                Verificando sesión...
                {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
            </div>
        );
    }


    // RENDERIZADO CON ROUTER
    return (
        <BrowserRouter>
            <Routes>
                {/* 1. Ruta de Login */}
                <Route 
                    path="/login" 
                    element={isAuthenticated ? 
                        <Navigate to="/dashboard" replace /> : 
                        <Login onLoginSuccess={handleLoginSuccess} />
                    } 
                />

                {/* 2. Ruta Raíz: redirige al Dashboard principal */}
                <Route 
                    path="/" 
                    element={<Navigate to="/dashboard" />} 
                />
                
                {/* 3. RUTA PRINCIPAL: Carga el Dashboard.tsx (El layout con gráfico/tarjetas) */}
                <Route 
                    path="/dashboard" 
                    element={
                        <PrivateRoute isAuthenticated={isAuthenticated}>
                            <Dashboard onLogout={handleLogout} /> 
                        </PrivateRoute>
                    } 
                />
                
                {/* 4. RUTAS SECUNDARIAS (Ahora incluyendo ANÁLISIS correctamente) */}
                
                {/* ANÁLISIS: Carga el componente AnalisisPage.tsx */}
                <Route 
                    path="/dashboard/analisis" 
                    element={
                        <PrivateRoute isAuthenticated={isAuthenticated}>
                            <AnalisisPage onLogout={handleLogout} /> 
                        </PrivateRoute>
                    } 
                />
                
                {/* ENCUESTAS */}
                <Route 
                    path="/dashboard/encuestas" 
                    element={
                        <PrivateRoute isAuthenticated={isAuthenticated}>
                            <EncuestasPage onLogout={handleLogout} /> 
                        </PrivateRoute>
                    } 
                />
                
                {/* RESULTADOS */}
                <Route 
                    path="/dashboard/resultados" 
                    element={
                        <PrivateRoute isAuthenticated={isAuthenticated}>
                            <ResultadosPage onLogout={handleLogout} /> 
                        </PrivateRoute>
                    } 
                />
                
                {/* RESUMEN */}
                <Route 
                    path="/dashboard/resumen" 
                    element={
                        <PrivateRoute isAuthenticated={isAuthenticated}>
                            <ResumenPage onLogout={handleLogout} /> 
                        </PrivateRoute>
                    } 
                />

                {/* 5. Ruta 404 */}
                <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;