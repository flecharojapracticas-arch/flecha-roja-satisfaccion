import React, { useState, useEffect } from 'react';
import './App.css'; 
import Login from './Login'; 
import Dashboard from './Dashboard'; // Importamos el componente Dashboard

// URL de tu API de Render para obtener datos (solo se usa para verificar el token)
const API_DATA_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/data';

function App() {
    // 1. Estado de Autenticación: null = cargando, true = logueado, false = no logueado
    const [isAuthenticated, setIsAuthenticated] = useState(null); 
    const [error, setError] = useState(null);

    // 2. FUNCIÓN DE CARGA DE DATOS (Verifica Token)
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
            });

            if (response.status === 401 || response.status === 403) {
                // Token inválido o expirado
                localStorage.removeItem('auth-token');
                setIsAuthenticated(false);
                return;
            }

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            // Datos cargados con éxito, confirmamos la autenticación.
            setIsAuthenticated(true); 

        } catch (err) {
            console.error("Error al obtener datos:", err);
            setError("No se pudieron cargar los datos. " + err.message);
            setIsAuthenticated(false); 
        }
    };

    // 3. EFECTO DE INICIO: Verificar Token y Cargar Datos
    useEffect(() => {
        const token = localStorage.getItem('auth-token');
        if (token) {
            fetchData();
        } else {
            setIsAuthenticated(false);
        }
    }, []);

    // 4. MANEJADORES DE ESTADO

    const handleLoginSuccess = () => {
        // Al loguearse con éxito, intentamos cargar los datos nuevamente
        fetchData();
    };

    const handleLogout = () => {
        localStorage.removeItem('auth-token');
        setIsAuthenticated(false);
        setError(null);
    };

    // 5. RENDERIZADO CONDICIONAL

    // Muestra una pantalla de carga mientras se verifica el token
    if (isAuthenticated === null) {
        return <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.2em' }}>Verificando sesión...</div>;
    }

    // Si no está autenticado, muestra la pantalla de Login
    if (isAuthenticated === false) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    // Si está autenticado (isAuthenticated === true), muestra el Dashboard
    return <Dashboard onLogout={handleLogout} />;
}

export default App;