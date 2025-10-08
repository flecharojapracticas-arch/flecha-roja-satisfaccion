const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
let userSecret; // Se inicializa con setUserSecret desde server.js
let mongoClient; // Se inicializa con setMongoClient desde server.js

// **********************************************
// Funciones de configuración (Settters)
// **********************************************

/**
 * Establece la clave secreta usada para firmar los JSON Web Tokens (JWT).
 * @param {string} secret - La clave secreta.
 */
function setUserSecret(secret) {
    userSecret = secret;
}

/**
 * Establece el cliente de MongoDB conectado para que las rutas puedan acceder a la DB.
 * @param {MongoClient} client - El cliente de MongoDB conectado.
 */
function setMongoClient(client) {
    mongoClient = client;
}

// **********************************************
// Rutas de API
// **********************************************

// RUTA POST: /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!mongoClient) {
        return res.status(500).json({ message: 'Error de servidor: Conexión a DB no inicializada.' });
    }

    try {
        const database = mongoClient.db('flecha_roja_db');
        const usersCollection = database.collection('users');
        
        const user = await usersCollection.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: 'Usuario o contraseña inválida.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Usuario o contraseña inválida.' });
        }
        
        // Crear Payload del token
        const payload = { 
            id: user._id, 
            username: user.username, 
            role: user.role 
        };
        
        // Firmar el token (asegurándose de usar la clave secreta inyectada)
        const token = jwt.sign(payload, userSecret, { expiresIn: '1h' });

        res.json({ token, username: user.username, role: user.role });

    } catch (error) {
        console.error('Error durante el login:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Exportar el router y las funciones de configuración
module.exports = {
    router,
    setUserSecret,
    setMongoClient
};
