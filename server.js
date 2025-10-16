// server.js

// El método dotenv fue removido para usar la configuración directa en el código.

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 

// Importar los módulos de ruta y middleware
const authRouter = require('./routes/auth');
const authenticateToken = require('./middleware/authMiddleware');
const metricsRouter = require('./routes/metrics'); 
const surveysRouter = require('./routes/surveys');

const app = express();


// *****************************************************************
// *** CONFIGURACIÓN CRÍTICA DIRECTA ***
// *****************************************************************
const uri = "mongodb+srv://flecharoja_app:BXbwrRn5YMNi8hRk@flecha-roja-satisfaccion.bntkyvm.mongodb.net/?retryWrites=true&w=majority&appName=flecha-roja-satisfaccion"; 
const port = 3000;
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

// 🟢 CORRECCIÓN DE CORS: Configuración explícita para evitar errores de preflight desde localhost
app.use(cors({
    // Permitimos explícitamente el origen de desarrollo local (Vite/React) y el propio dominio de Render.
    origin: ['http://localhost:5173', 'https://flecha-roja-satisfaccion.onrender.com'], 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
})); 
// FIN DE CORRECCIÓN DE CORS

// Establecer el secret key en el router de autenticación
authRouter.setUserSecret(USER_SECRET); 

// Montar el Router de Autenticación
authRouter.setMongoClient(client); 
app.use('/api/auth', authRouter.router); // ✅ Soluciona 404 de /api/auth/forgot-password

// Middleware para inyectar la base de datos
const injectDbMiddleware = (req, res, next) => {
    if (!req.app.locals.client) {
        return res.status(503).json({ message: "Servicio no disponible: Conexión a DB fallida." });
    }
    req.db = req.app.locals.client.db(DB_NAME); 
    req.COLLECTION_NAME = COLLECTION_NAME; 
    next();
};

// RUTA PROTEGIDA: Obtener todos los datos (para el dashboard principal después del login)
// ✅ Esta ruta MANTIENE su protección de token.
app.get('/api/data', authenticateToken, injectDbMiddleware, async (req, res) => {
    try {
        const collection = req.db.collection(req.COLLECTION_NAME);
        const data = await collection.find({}).toArray();
        res.json(data);
        
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).send({ message: 'Error interno del servidor al obtener datos.' });
    }
});

// 🟢 RUTA PÚBLICA DE ANÁLISIS GENERAL 
//    NO utiliza 'authenticateToken' para resolver el error 401 del frontend de Análisis.
app.get('/api/analysis/general', injectDbMiddleware, async (req, res) => {
    try {
        const collection = req.db.collection(req.COLLECTION_NAME);
        const data = await collection.find({}).toArray();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener datos de análisis público:', error);
        res.status(500).send({ message: 'Error interno del servidor al obtener datos de análisis público.' });
    }
});


// Montar el Router de Métricas
app.use('/api/metrics', authenticateToken, injectDbMiddleware, metricsRouter); 

// Montar el Router de Encuestas
// 🚨 CRÍTICO: No se usa authenticateToken aquí para permitir la carga de la tabla (GET)
app.use('/api/dashboard/encuestas', injectDbMiddleware, surveysRouter);

// RUTA POST: Recibir datos del formulario (Pública)
app.post('/api/save_data', async (req, res) => {
    const receivedData = req.body || {}; 
    
    const surveyDocument = {
        // Campos de Identificación y Filtros
        claveEncuestador: receivedData.claveEncuestador || "",
        fecha: receivedData.fecha || "",
        noEco: receivedData.noEco || "",
        folioBoleto: receivedData.folioBoleto || "",
        origenViaje: receivedData.origenViaje || "",
        destinoFinal: receivedData.destinoFinal || "",
        medioAdquisicion: receivedData.medioAdquisicion || "",

        // Calificaciones y Expectativas (Visibles en la tabla)
        califExperienciaCompra: receivedData.califExperienciaCompra || "",
        califServicioConductor: receivedData.califServicioConductor || "",
        califComodidad: receivedData.califComodidad || "",
        califLimpieza: receivedData.califLimpieza || "",
        califSeguridad: receivedData.califSeguridad || "",
        cumplioExpectativas: receivedData.cumplioExpectativas || "", 
        
        // Estado de Validación y Datos automáticos
        validado: 'PENDIENTE', // <== Estado inicial para la validación
        timestampServidor: new Date().toISOString(),

        // [Otros campos de comentarios/especificación]
        comentExperienciaCompra: receivedData.comentExperienciaCompra || "",
        comentServicioConductor: receivedData.comentServicioConductor || "",
        comentComodidad: receivedData.comentComodidad || "",
        comentLimpieza: receivedData.comentLimpieza || "",
        especifSeguridad: receivedData.especifSeguridad || "",
        especificarMotivo: receivedData.especificarMotivo || "",
    };

    try {
        const database = app.locals.client.db(DB_NAME); 
        const collection = database.collection(COLLECTION_NAME);
        
        const result = await collection.insertOne(surveyDocument); 
        
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
// *** ARRANQUE DEL SERVIDOR ***
// ********************************************

async function runServer() {
    try {
        await client.connect(); 
        console.log("Conexión inicial a MongoDB Atlas exitosa.");
        app.locals.client = client; 
        
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
        console.error("ERROR FATAL: Fallo al conectar a MongoDB Atlas. Verifique la URI y el firewall.", err);
        process.exit(1); 
    }
}
runServer();