// server.js

// El método dotenv fue removido para usar la configuración directa en el código.

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors'); // <--- CORREGIDO: Importación necesaria
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
// ⚠️ ATENCIÓN: Esta es la NUEVA URI de conexión de MongoDB Atlas.
// Se recomienda usar variables de entorno para mayor seguridad en producción.
const uri = "mongodb+srv://flecharoja_app:BXbwrRn5YMNi8hRk@flecha-roja-satisfaccion.bntkyvm.mongodb.net/?retryWrites=true&w=majority&appName=flecha-roja-satisfaccion"; 

// Variables de configuración de la base de datos
const port = 3000;
const USER_SECRET = "FlechaRoja_SATISFACCION-Key-R3d-s3cr3t-2025-Qh7gKx9zP5bYt1mJ"; 
const DB_NAME = 'flecha_roja_db'; 
const COLLECTION_NAME = 'satisfaccion_clientes';
const USERS_COLLECTION = 'users'; 

// Credenciales por defecto del admin
const DEFAULT_ADMIN_USER = "admin";
const DEFAULT_ADMIN_PASS = "admin123"; 
// *****************************************************************

const client = new MongoClient(uri);

// Middlewares Globales
app.use(express.json());

// 🔑 CORRECCIÓN CRÍTICA 1: Configuración de CORS explícita
const allowedOrigins = [
    'http://localhost:5173', // Tu React local (Vite)
    'http://localhost:3000', // Si usas CRA
    'https://flecha-roja-satisfaccion.onrender.com' // Tu dominio en Render (por si acaso)
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));
// -----------------------------------------------------------------


// Establecer el secret key en el router de autenticación
authRouter.setUserSecret(USER_SECRET); 

// Montar el Router de Autenticación
authRouter.setMongoClient(client); 
app.use('/api/auth', authRouter.router); 

// Montar el Router de Métricas
app.use('/api/metrics', authenticateToken, metricsRouter); 

// Middleware para inyectar la DB, usado en las rutas protegidas del dashboard
const injectDbMiddleware = (req, res, next) => {
    // Comprobación de seguridad para evitar errores si el cliente de MongoDB no está conectado
    if (!req.app.locals.client) {
        console.error("Cliente de MongoDB no disponible en app.locals.");
        return res.status(503).json({ message: "Servicio no disponible temporalmente." });
    }
    // Inyectar la base de datos y el nombre de la colección (necesario para surveys.js)
    req.db = req.app.locals.client.db(DB_NAME); 
    req.COLLECTION_NAME = COLLECTION_NAME; 
    next();
};

// *****************************************************************************
// 🔑 CORRECCIÓN CRÍTICA 2: Montaje de Ruta del SurveysRouter
// Monta surveysRouter en la ruta /api/dashboard. 
// Esto mapea router.get('/encuestas') en surveys.js a /api/dashboard/encuestas
// *****************************************************************************
app.use('/api/dashboard/encuestas', authenticateToken, injectDbMiddleware, surveysRouter); 
// *****************************************************************************


// RUTA PROTEGIDA: Obtener todos los datos (para el dashboard)
app.get('/api/data', authenticateToken, async (req, res) => {
    try {
        const database = app.locals.client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);
        
        const data = await collection.find({}).toArray();
        res.json(data);
        
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).send({ message: 'Error interno del servidor al obtener datos.' });
    }
});


// RUTA POST: Recibir datos del formulario (Pública)
app.post('/api/save_data', async (req, res) => {
    // 1. Aseguramos que req.body sea un objeto, incluso si está vacío.
    const receivedData = req.body || {}; 
    
    // 2. Mapeo explícito para garantizar que todos los campos existan en MongoDB.
    // Usamos el operador OR (|| "") para asignar una cadena vacía si el campo es undefined/null.
    const surveyDocument = {
        // Campos de Identificación
        claveEncuestador: receivedData.claveEncuestador || "",
        fecha: receivedData.fecha || "",
        noEco: receivedData.noEco || "",
        folioBoleto: receivedData.folioBoleto || "",
        origenViaje: receivedData.origenViaje || "",
        otroDestino: receivedData.otroDestino || "",
        destinoFinal: receivedData.destinoFinal || "",
        medioAdquisicion: receivedData.medioAdquisicion || "",

        // Calificaciones y Comentarios (Experiencia de Compra)
        califExperienciaCompra: receivedData.califExperienciaCompra || "",
        comentExperienciaCompra: receivedData.comentExperienciaCompra || "",
        
        // Calificaciones y Comentarios (Servicio del Conductor)
        califServicioConductor: receivedData.califServicioConductor || "", 
        comentServicioConductor: receivedData.comentServicioConductor || "",
        
        // Calificaciones y Comentarios (Comodidad a bordo)
        califComodidad: receivedData.califComodidad || "",
        comentComodidad: receivedData.comentComodidad || "",
        
        // Calificaciones y Comentarios (Limpieza a bordo)
        califLimpieza: receivedData.califLimpieza || "",
        comentLimpieza: receivedData.comentLimpieza || "",
        
        // Seguridad y Expectativas
        califSeguridad: receivedData.califSeguridad || "",
        especifSeguridad: receivedData.especifSeguridad || "",
        
        cumplioExpectativas: receivedData.cumplioExpectativas || "", 
        especificarMotivo: receivedData.especificarMotivo || "",
        
        // Datos automáticos
        timestampServidor: new Date().toISOString(),
    };

    try {
        // Acceder al cliente a través de app.locals
        const database = app.locals.client.db(DB_NAME); 
        const collection = database.collection(COLLECTION_NAME);
        
        const result = await collection.insertOne(surveyDocument); 
        
        res.status(200).json({ 
            message: "Datos recibidos y guardados correctamente con integridad de campos.", 
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

        // *** CRÍTICO: Guardar el cliente conectado en app.locals ***
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