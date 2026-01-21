import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Componentes
// Se han agregado las extensiones .jsx a los componentes para solucionar el error de compilación.
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import AnalisisPage from './pages/Analisis.tsx';
import EncuestasPage from './pages/Encuestas.tsx';
import ResultadosPage from './pages/Resultados.tsx';
import ResumenPage from './pages/Resumen.tsx';
import PeriodosPage from './pages/Periodos.tsx'; // <--- NUEVA IMPORTACIÓN DE PERIODOS
import PresentacionPage from './pages/Presentacion.tsx'; // <--- NUEVA IMPORTACIÓN DE PRESENTACIÓN

// URL de tu API de Render para verificar el token
const API_DATA_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/data';


// =======================================================
// COMPONENTE AUXILIAR: PRIVATE ROUTE
// =======================================================
// Este componente se encarga de proteger las rutas
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
        const user = localStorage.getItem('auth-user');

        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        // Bypass de verificación para el usuario visualizador
        if (user === 'usuario') {
            setIsAuthenticated(true);
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
            // Mostrar un error amigable al usuario en la pantalla de carga
            setError("No se pudieron cargar los datos o la conexión falló. Por favor, revisa tu conexión.");
            setIsAuthenticated(false);
        }
    };

    // EFECTO DE INICIO: Verifica la autenticación al cargar la app
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
            <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.2em', color: '#333', backgroundColor: '#f4f4f4', padding: '20px' }}>
                <p>Verificando sesión...</p>
                {error && <p style={{ color: 'red', marginTop: '10px', textAlign: 'center' }}>{error}</p>}
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
                        (localStorage.getItem('auth-user') === 'usuario' ?
                            <Navigate to="/presentacion" replace /> :
                            <Navigate to="/dashboard" replace />) :
                        <Login onLoginSuccess={handleLoginSuccess} />
                    }
                />

                {/* 2. Ruta Raíz: redirige según el usuario */}
                <Route
                    path="/"
                    element={localStorage.getItem('auth-user') === 'usuario' ?
                        <Navigate to="/presentacion" /> :
                        <Navigate to="/dashboard" />
                    }
                />

                {/* 3. RUTA PRINCIPAL: Carga el Dashboard.jsx (El layout con gráfico/tarjetas) */}
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute isAuthenticated={isAuthenticated}>
                            <Dashboard onLogout={handleLogout} />
                        </PrivateRoute>
                    }
                />

                {/* 4. RUTAS SECUNDARIAS (Apuntan a las pestañas del Dashboard) */}

                {/* ANÁLISIS */}
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

                {/* PERIODOS: RUTA AGREGADA PARA LA NUEVA PESTAÑA */}
                <Route
                    path="/dashboard/periodos"
                    element={
                        <PrivateRoute isAuthenticated={isAuthenticated}>
                            <PeriodosPage onLogout={handleLogout} />
                        </PrivateRoute>
                    }
                />

                {/* PRESENTACIÓN: RUTA PARA EL NUEVO USUARIO */}
                <Route
                    path="/presentacion"
                    element={
                        <PrivateRoute isAuthenticated={isAuthenticated}>
                            <PresentacionPage onLogout={handleLogout} />
                        </PrivateRoute>
                    }
                />

                {/* 5. Ruta 404 (Debe ser la última) */}
                <Route path="*" element={<h1 style={{ textAlign: 'center', marginTop: '50px' }}>404 - Página no encontrada</h1>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;