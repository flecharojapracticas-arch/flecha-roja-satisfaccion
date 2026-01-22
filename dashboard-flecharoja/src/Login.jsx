"use client"

import { useState } from "react"
import "./Login.css"

// URL de tu API de Render
const API_BASE_URL = "https://flecha-roja-satisfaccion.onrender.com"

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // **********************************
  // 1. FUNCIÓN PRINCIPAL DE INICIO DE SESIÓN
  // **********************************
  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)

    // **********************************
    // 0. BYPASS PARA USUARIO DE VISUALIZACIÓN
    // **********************************
    if (username === "usuario" && password === "12345") {
      localStorage.setItem("auth-token", "bypass-token-usuario")
      localStorage.setItem("auth-user", "usuario")
      setMessage({ text: "Iniciando sesión...", type: "success" })
      setTimeout(onLoginSuccess, 100)
      setIsLoading(false)
      return
    }

    // Usar 'admin' como username si el campo está vacío, para la primera vez
    const userToLogin = username || "admin"

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: userToLogin, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Éxito: Guardar el token, el usuario y notificar
        localStorage.setItem("auth-token", data.token)
        localStorage.setItem("auth-user", userToLogin) // Guardamos el usuario para decidir la ruta
        setMessage({ text: "Iniciando sesión...", type: "success" })
        // Redirigir según el tipo de usuario
        setTimeout(onLoginSuccess, 100)
      } else {
        setMessage({ text: data.message || "Error de conexión. Intente más tarde.", type: "error" })
      }
    } catch (error) {
      console.error("Error de red durante el login:", error)
      setMessage({ text: "No se pudo conectar al servidor de Render.", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  // **********************************
  // 3. FUNCIONES PARA CAMBIO DE CREDENCIALES
  // **********************************
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [changeStep, setChangeStep] = useState(1) // 1: Verificar, 2: Nuevos datos
  const [currentUsername, setCurrentUsername] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [changeMessage, setChangeMessage] = useState(null)

  const handleOpenChangeModal = () => {
    setShowChangeModal(true)
    setChangeStep(1)
    setCurrentUsername(username) // Pre-llenar con lo que esté en el login principal
    setChangeMessage(null)
  }

  const handleVerifyCurrent = async (e) => {
    e.preventDefault()
    setChangeMessage(null)
    setIsLoading(true)

    try {
      // Usamos el mismo endpoint de login para verificar
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUsername, password: currentPassword }),
      })

      if (response.ok) {
        setChangeStep(2)
        setNewUsername(currentUsername)
      } else {
        const data = await response.json()
        setChangeMessage({ text: data.message || "Usuario o contraseña actual incorrecta.", type: "error" })
      }
    } catch (error) {
      setChangeMessage({ text: "Error de conexión.", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinalChange = async (e) => {
    e.preventDefault()
    setChangeMessage(null)

    if (newPassword && newPassword !== confirmNewPassword) {
      setChangeMessage({ text: "Las contraseñas no coinciden.", type: "error" })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUsername,
          currentPassword,
          newUsername,
          newPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setChangeMessage({ text: "¡Cambio exitoso! Ya puedes iniciar sesión.", type: "success" })
        setTimeout(() => {
          setShowChangeModal(false)
          setUsername(newUsername)
          setPassword("")
        }, 2000)
      } else {
        setChangeMessage({ text: data.message || "Error al actualizar.", type: "error" })
      }
    } catch (error) {
      setChangeMessage({ text: "Error de conexión.", type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* INICIO: Header Superior (Logo Fuera de la Caja) */}
      <div className="main-header">
        <img src="/logo_flecha_roja.png" alt="Logo Flecha Roja" />
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
        <p className="welcome">Bienvenido al sistema de satisfacción del cliente Flecha Roja</p>

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
            <button
              type="button"
              className="btn-forgot-password"
              onClick={handleOpenChangeModal}
            >
              ¿Cambiar contraseña o usuario?
            </button>
          </div>

          <button type="submit" className="btn-login" disabled={isLoading}>
            {isLoading ? "Cargando..." : "Iniciar Sesión"}
          </button>
        </form>

        {/* Área para mensajes de éxito/error */}
        {message && <div className={`message-box ${message.type}`}>{message.text}</div>}
      </div>

      {/* Modal de Cambio de Credenciales */}
      {showChangeModal && (
        <div className="login-modal-overlay">
          <div className="login-modal-content">
            <button className="close-btn" onClick={() => setShowChangeModal(false)}>&times;</button>

            {changeStep === 1 ? (
              <div className="change-step-container">
                <h3>Verificar Datos Actuales</h3>
                <p>Por seguridad, ingrese sus credenciales actuales.</p>
                <form onSubmit={handleVerifyCurrent}>
                  <div className="form-group">
                    <label>Nombre de Usuario Actual</label>
                    <input
                      type="text"
                      value={currentUsername}
                      onChange={(e) => setCurrentUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contraseña Actual</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-login" disabled={isLoading}>
                    {isLoading ? "Verificando..." : "Siguiente"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="change-step-container">
                <h3>Nuevas Credenciales</h3>
                <p>Establezca su nuevo usuario y/o contraseña.</p>
                <form onSubmit={handleFinalChange}>
                  <div className="form-group">
                    <label>Nuevo Nombre de Usuario</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nueva Contraseña</label>
                    <input
                      type="password"
                      placeholder="Dejar vacío si no desea cambiarla"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  {newPassword && (
                    <div className="form-group">
                      <label>Confirmar Nueva Contraseña</label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <button type="submit" className="btn-login" disabled={isLoading}>
                    {isLoading ? "Actualizando..." : "Confirmar Cambios"}
                  </button>
                </form>
              </div>
            )}

            {changeMessage && (
              <div className={`message-box ${changeMessage.type}`} style={{ marginTop: '15px' }}>
                {changeMessage.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
