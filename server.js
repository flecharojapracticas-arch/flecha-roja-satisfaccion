// El método dotenv fue removido para usar la configuración directa en el código.

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs'); 

// Importar los módulos de ruta y middleware
const authRouter = require('./routes/auth');
const authenticateToken = require('./middleware/authMiddleware');
const metricsRouter = require('./routes/metrics'); 
const surveysRouter = require('./routes/surveys'); // Importado correctamente

const app = express();


// *****************************************************************
// *** CONFIGURACIÓN CRÍTICA DIRECTA ***
// *****************************************************************
const uri = "mongodb+srv://flecharoja_app:BXbwrRn5YMNi8hRk@flecha-roja-satisfaccion.bntkyvm.mongodb.net/?retryWrites=true&w=majority&appName=flecha-roja-satisfaccion"; 

// Variables de configuración de la base de datos
const port = 3000;
const USER_SECRET = "FlechaRoja_SATISFACCION-Key-R3d-s3cr3t-2025-Qh7gKx9zP5bYt1mJ"; 
const DB_NAME = 'flecha_roja_db'; 
const COLLECTION_NAME = 'satisfaccion_clientes'; // Usado en la inyección
const USERS_COLLECTION = 'users'; 
// Credenciales por defecto del admin
const DEFAULT_ADMIN_USER = "admin";
const DEFAULT_ADMIN_PASS = "admin123"; 
// *****************************************************************

const client = new MongoClient(uri);

// Middlewares Globales
app.use(express.json());
app.use(cors()); 

// Establecer el secret key en el router de autenticación
authRouter.setUserSecret(USER_SECRET); 

// Montar el Router de Autenticación
authRouter.setMongoClient(client); 
app.use('/api/auth', authRouter.router); 

// Montar el Router de Métricas
app.use('/api/metrics', authenticateToken, metricsRouter); 

// *****************************************************************
// 🔑 MONTAJE CRÍTICO DEL CRUD DE ENCUESTAS (Protegido)
// *****************************************************************
// Esta es la inyección que surveys.js necesita para funcionar, y evita el error 404.
app.use('/api', authenticateToken, (req, res, next) => {
    // 1. Inyectar la base de datos
    req.db = app.locals.client.db(DB_NAME); 
    // 2. Inyectar el nombre de la colección que surveys.js espera (getCollection)
    req.COLLECTION_NAME = COLLECTION_NAME; 
    next();
}, surveysRouter);
// *****************************************************************


// RUTA PROTEGIDA: Obtener todos los datos (para el dashboard principal)
// Mantenemos esta ruta tal como la tenías originalmente, usando app.locals.client
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
// 🚨 REPARACIÓN: Aseguramos que el acceso a app.locals.client se haga correctamente.
app.post('/api/save_data', async (req, res) => {
    const receivedData = req.body || {}; 
    
    const surveyDocument = {
        // Campos de Identificación
        claveEncuestador: receivedData.claveEncuestador || "",
        fecha: receivedData.fecha || "",
        noEco: receivedData.noEco || "",
        folioBoleto: receivedData.folioBoleto || "",
        origenViaje: receivedData.origenViaje || "",
        otroDestino: receivedData.otroDestino || "",
        destinoFinal: receivedData.destinoFinal || "",
        tipoServicio: receivedData.tipoServicio || "", 
        medioAdquisicion: receivedData.medioAdquisicion || "",

        // Calificaciones y Comentarios
        califExperienciaCompra: receivedData.califExperienciaCompra || "",
        comentExperienciaCompra: receivedData.comentExperienciaCompra || "",
        califServicioConductor: receivedData.califServicioConductor || "", 
        comentServicioConductor: receivedData.comentServicioConductor || "",
        califComodidad: receivedData.califComodidad || "",
        comentComodidad: receivedData.comentComodidad || "",
        califLimpieza: receivedData.califLimpieza || "",
        comentLimpieza: receivedData.comentLimpieza || "",
        califSeguridad: receivedData.califSeguridad || "",
        especifSeguridad: receivedData.especifSeguridad || "",
        cumplioExpectativas: receivedData.cumplioExpectativas || "", 
        especificarMotivo: receivedData.especificarMotivo || "",
        
        // Campos de estado
        validado: 'PENDIENTE', 
        
        // Datos automáticos
        timestampServidor: new Date().toISOString(),
    };

    try {
        // 🔑 REPARACIÓN: Acceso al cliente a través de app.locals, tal como lo tenías.
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