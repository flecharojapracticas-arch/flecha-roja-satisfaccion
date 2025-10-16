// middleware/authMiddleware.js

const jwt = require("jsonwebtoken")

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1] // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado. Acceso denegado." })
  }

  // Obtener el secret desde las variables de entorno o usar el valor por defecto
  const USER_SECRET = process.env.USER_SECRET || "FlechaRoja_SATISFACCION-Key-R3d-s3cr3t-2025-Qh7gKx9zP5bYt1mJ"

  jwt.verify(token, USER_SECRET, (err, user) => {
    if (err) {
      console.error("Error al verificar token:", err.message)
      return res.status(403).json({ message: "Token inválido o expirado." })
    }

    req.user = user // Adjuntar información del usuario al request
    next()
  })
}

module.exports = authenticateToken
