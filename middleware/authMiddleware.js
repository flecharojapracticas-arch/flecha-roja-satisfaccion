const jwt = require('jsonwebtoken');

// ⚠️ DEBES USAR LA MISMA CLAVE SECRETA AQUÍ QUE EN server.js y auth.js ⚠️
const USER_SECRET = "FlechaRoja_SATISFACCION-Key-R3d-s3cr3t-2025-Qh7gKx9zP5bYt1mJ"; 

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).send({ message: "Acceso denegado. Token no proporcionado." });
    }

    jwt.verify(token, USER_SECRET, (err, user) => {
        if (err) {
            // Token inválido o expirado
            return res.status(403).send({ message: "Token inválido o expirado." });
        }
        req.user = user;
        next(); // Continuar con la ruta solicitada
    });
}

module.exports = authenticateToken;