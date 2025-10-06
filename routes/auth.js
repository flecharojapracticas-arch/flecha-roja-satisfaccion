const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

// ⚠️ DEBES REEMPLAZAR ESTA CLAVE SECRETA AQUÍ TAMBIÉN ⚠️
const USER_SECRET = "FlechaRoja_SATISFACCION-Key-R3d-s3cr3t-2025-Qh7gKx9zP5bYt1mJ"; 
const DB_NAME = 'flecha_roja_db'; 
const USERS_COLLECTION = 'users';

let mongoClient; 

// Función para recibir el cliente de Mongo desde server.js
const setMongoClient = (client) => {
    mongoClient = client;
};

// 1. LOGIN: Genera un token si las credenciales son correctas
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const database = mongoClient.db(DB_NAME);
        const users = database.collection(USERS_COLLECTION);
        
        const user = await users.findOne({ username });
        
        if (user == null) {
            return res.status(400).send({ message: "Usuario o contraseña inválidos." });
        }

        if (await bcrypt.compare(password, user.passwordHash)) {
            
            // Credenciales correctas: Crear un Token Web JSON (JWT)
            const accessToken = jwt.sign(
                { username: user.username, role: user.role || 'admin' }, 
                USER_SECRET, 
                { expiresIn: '1h' } // Token válido por 1 hora
            );
            
            res.json({ token: accessToken, message: "Inicio de sesión exitoso." });
        } else {
            res.status(400).send({ message: "Usuario o contraseña inválidos." });
        }

    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).send({ message: "Error interno del servidor durante el login." });
    }
});

// 2. RECUPERACIÓN DE CONTRASEÑA (Simulación)
router.post('/forgot-password', (req, res) => {
    res.status(200).send({ 
        message: "Proceso de recuperación iniciado. Por seguridad, la contraseña ha sido restablecida por defecto y un supervisor será notificado para que te la comunique por un canal seguro." 
    });
});

// 3. REGISTRO (Se desactiva el registro público)
router.post('/register', async (req, res) => {
    res.status(403).send({ message: "El registro público está deshabilitado. Contacte a su administrador." });
});


module.exports = { 
    router, 
    setMongoClient 
};