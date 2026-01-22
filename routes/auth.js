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

/**
 * RUTA POST: /api/auth/change-credentials
 * Permite cambiar el nombre de usuario y/o la contraseña tras verificar las actuales.
 */
router.post('/change-credentials', async (req, res) => {
    const { username, currentPassword, newUsername, newPassword } = req.body;

    if (!mongoClient) {
        return res.status(500).json({ message: 'Error de servidor: Conexión a DB no inicializada.' });
    }

    try {
        const database = mongoClient.db('flecha_roja_db');
        const usersCollection = database.collection('users');

        // 1. Buscar usuario actual (insensible a mayúsculas y espacios)
        const searchUsername = username ? username.trim() : "";
        let user = await usersCollection.findOne({
            username: { $regex: new RegExp(`^${searchUsername}$`, "i") }
        });

        // -- CASO ESPECIAL: Si es el usuario bypass y no está en la DB todavía o el nombre varió ligeramente --
        if (!user && searchUsername.toLowerCase() === 'usuario' && currentPassword === '12345') {
            console.log("🛠️ Sincronizando usuario bypass 'usuario' con la base de datos...");
            const salt = await bcrypt.genSalt(10);
            const initialHash = await bcrypt.hash("12345", salt);
            const newUser = {
                username: "usuario",
                passwordHash: initialHash,
                role: 'user',
                createdAt: new Date()
            };
            await usersCollection.insertOne(newUser);
            user = await usersCollection.findOne({ username: "usuario" });
        }

        if (!user) {
            console.error(`❌ Intento de cambio de credenciales fallido: Usuario '${searchUsername}' no encontrado.`);
            return res.status(404).json({ message: 'Usuario no encontrado. Asegúrate de haber escrito bien el nombre actual.' });
        }

        // 2. Verificar contraseña actual
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
        }

        // 3. Preparar actualización
        const updateData = {};

        if (newUsername && newUsername !== username) {
            // Verificar si el nuevo nombre de usuario ya existe
            const existingUser = await usersCollection.findOne({ username: newUsername });
            if (existingUser) {
                return res.status(400).json({ message: 'El nuevo nombre de usuario ya está en uso.' });
            }
            updateData.username = newUsername;
        }

        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            updateData.passwordHash = await bcrypt.hash(newPassword, salt);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron nuevos datos para actualizar.' });
        }

        // 4. Ejecutar actualización
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: updateData }
        );

        res.json({ message: 'Credenciales actualizadas correctamente.' });

    } catch (error) {
        console.error('Error al cambiar credenciales:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar credenciales.' });
    }
});

// Exportar el router y las funciones de configuración
module.exports = {
    router,
    setUserSecret,
    setMongoClient
};
