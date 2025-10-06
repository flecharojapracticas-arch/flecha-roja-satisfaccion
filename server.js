const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 

// Importar los módulos de ruta y middleware
const authRouter = require('./routes/auth');
const authenticateToken = require('./middleware/authMiddleware');

const app = express();

// *****************************************************************
// ⚠️ VARIABLES CRÍTICAS (TU URI INCLUIDA) ⚠️
// *****************************************************************
const uri = "mongodb+srv://flecharojapracticas_db_user:Viva031120@flecharoja-satisfaccion.ohop4mb.mongodb.net/?retryWrites=true&w=majority&appName=FlechaRoja-Satisfaccion-DB";
const port = process.env.PORT || 3000;
const USER_SECRET = "FlechaRoja_SATISFACCION-Key-R3d-s3cr3t-2025-Qh7gKx9zP5bYt1mJ"; 
const DB_NAME = 'flecha_roja_db'; 
const COLLECTION_NAME = 'satisfaccion_clientes';
const USERS_COLLECTION = 'users'; 
const DEFAULT_ADMIN_USER = "admin";
const DEFAULT_ADMIN_PASS = "admin123"; 
// *****************************************************************

const client = new MongoClient(uri);

// Middlewares Globales
app.use(express.json());
app.use(cors()); 

// ********************************************
// *** ENRUTAMIENTO Y CONEXIÓN DE MÓDULOS ***
// ********************************************

// Montar el Router de Autenticación
authRouter.setMongoClient(client); // Pasar el cliente de Mongo
app.use('/api/auth', authRouter.router); // Todas las rutas de auth.js inician con /api/auth

// RUTA PROTEGIDA: Obtener todos los datos
// Solo usuarios con JWT válido pueden acceder
app.get('/api/data', authenticateToken, async (req, res) => {
    try {
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);
        
        const data = await collection.find({}).toArray();
        res.json(data);
        
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).send({ message: 'Error interno del servidor al obtener datos.' });
    }
});

// RUTA POST: Recibir datos del formulario (Pública, no protegida)
app.post('/api/save_data', async (req, res) => {
    const receivedData = req.body;
    receivedData.timestampServidor = new Date().toISOString();

    try {
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);
        
        const result = await collection.insertOne(receivedData);
        
        res.status(200).json({ 
            message: "Datos recibidos y guardados correctamente.", 
            insertedId: result.insertedId 
        });

    } catch (error) {
        console.error('Error al guardar datos:', error);
        res.status(500).send({ message: 'Error interno del servidor al guardar datos.' });
    }
});


// ********************************************
// *** ARRANQUE DEL SERVIDOR Y CREACIÓN DE ADMIN POR DEFECTO ***
// ********************************************

async function runServer() {
    try {
        await client.connect(); 
        console.log("Conexión inicial a MongoDB Atlas exitosa.");
        
        const database = client.db(DB_NAME);
        const usersCollection = database.collection(USERS_COLLECTION);
        
        // --- Lógica para asegurar que siempre haya un usuario admin ---
        const adminCount = await usersCollection.countDocuments({});
        if (adminCount === 0) {
            console.log(`\n⚠️ CREANDO USUARIO ADMINISTRADOR POR DEFECTO: ${DEFAULT_ADMIN_USER}`);
            
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASS, salt);

            await usersCollection.insertOne({
                username: DEFAULT_ADMIN_USER,
                passwordHash: passwordHash,
                role: 'admin',
                createdAt: new Date()
            });
            console.log(`✅ Usuario Admin creado. Credenciales: Usuario=${DEFAULT_ADMIN_USER} / Contraseña=${DEFAULT_ADMIN_PASS}`);
        }
        // -------------------------------------------------------------------

        app.listen(port, () => {
            console.log(`Servidor escuchando en el puerto ${port}`);
        });

    } catch (err) {
        console.error("ERROR FATAL: Fallo al conectar a MongoDB Atlas", err);
        process.exit(1); 
    }
}
runServer();