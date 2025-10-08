import React, { useState } from 'react';
import './Login.css'; 

// URL de tu API de Render 
const API_BASE_URL = 'https://flecha-roja-satisfaccion.onrender.com';

function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(null); 
    const [isLoading, setIsLoading] = useState(false);

    // **********************************
    // 1. FUNCIÓN PRINCIPAL DE INICIO DE SESIÓN
    // **********************************
    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage(null);
        setIsLoading(true);

        // Usar 'admin' como username si el campo está vacío, para la primera vez
        const userToLogin = username || 'admin'; 

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: userToLogin, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Éxito: Guardar el token y notificar
                localStorage.setItem('auth-token', data.token);
                setMessage({ text: 'Iniciando sesión...', type: 'success' });
                // Redirigir al Dashboard
                setTimeout(onLoginSuccess, 100); 
            } else {
                setMessage({ text: data.message || 'Error de conexión. Intente más tarde.', type: 'error' });
            }
        } catch (error) {
            console.error('Error de red durante el login:', error);
            setMessage({ text: 'No se pudo conectar al servidor de Render.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // **********************************
    // 2. FUNCIÓN DE RECUPERACIÓN DE CONTRASEÑA (Simulación)
    // **********************************
    const handleForgotPassword = async () => {
        setMessage(null);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ text: data.message, type: 'success' });
            } else {
                setMessage({ text: data.message || 'Error al procesar la solicitud.', type: 'error' });
            }
        } catch (error) {
            console.error('Error de red durante la recuperación:', error);
            setMessage({ text: 'No se pudo contactar al servidor para la recuperación.', type: 'error' });
        }
    };


    return (
        <div className="login-container">
            
            {/* INICIO: Header Superior (Logo Fuera de la Caja) */}
            <div className="main-header">
                <img 
                    src="/logo_flecha_roja.png" 
                    alt="Logo Flecha Roja" 
                />
            </div>
            {/* FIN: Header Superior */}
            
            <div className="login-box">
                
                {/* Logo dentro de la caja si es necesario, si no, usa solo el título */}
                {/* <img 
                    src="/logo_flecha_roja.png" 
                    alt="Logo Flecha Roja" 
                    className="logo-box-img"
                /> */}
                
                <p className="subtitle">SISTEMA DE SATISFACCIÓN AL CLIENTE</p>
                <p className="welcome">
                    Bienvenido al sistema de satisfacción del cliente Flecha Roja
                </p>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="username">Usuario o correo electrónico</label>
                        <input
                            type="text"
                            id="username"
                            placeholder="Ingrese su correo electrónico"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            placeholder="Ingrese su contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="options-group">
                        <label>
                            <input type="checkbox" /> Recordarme
                        </label>
                        <a onClick={handleForgotPassword}>¿Olvidaste tu contraseña?</a>
                    </div>

                    <button type="submit" className="btn-login" disabled={isLoading}>
                        {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                {/* Área para mensajes de éxito/error */}
                {message && (
                    <div className={`message-box ${message.type}`}>
                        {message.text}
                    </div>
                )}
                
                <div className="options-group" style={{ marginTop: '20px', justifyContent: 'center' }}>
                    {/* El enlace de crear cuenta se deja no funcional */}
                    <span>¿No tienes cuenta? <a onClick={() => setMessage({ text: "Solo el administrador puede crear cuentas.", type: 'error' })}>Crear cuenta nueva</a></span>
                </div>
            </div>
        </div>
    );
}

export default Login;