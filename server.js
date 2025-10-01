const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();

// Usaremos el puerto que el servidor de Render nos asigne (Ej. 10000).
// Si corres localmente, usará el 3000 como fallback.
const port = process.env.PORT || 3000;

// *******************************************************************
// *** TU CADENA DE CONEXIÓN DE MONGODB ATLAS FINAL ***
// *******************************************************************
const uri = "mongodb+srv://flecharojapracticas_db_user:Viva031120@flecharoja-satisfaccion.ohop4mb.mongodb.net/?retryWrites=true&w=majority&appName=FlechaRoja-Satisfaccion-DB";

const client = new MongoClient(uri);

// Nombres de la base de datos y la colección
const DB_NAME = 'flecha_roja_db'; 
const COLLECTION_NAME = 'satisfaccion_clientes';

// Middleware para procesar las peticiones JSON (crucial para Google Forms)
app.use(express.json());

// *******************************************************************
// ENDPOINT PRINCIPAL: RECIBE LOS DATOS DEL FORMULARIO
// *******************************************************************
app.post('/api/save_data', async (req, res) => {
  const datos = req.body;
  if (!datos || Object.keys(datos).length === 0) {
    return res.status(400).send('Error: No se recibieron datos.');
  }

  try {
    // 1. Conexión/Reutilización del pool
    // Usamos el cliente ya conectado globalmente
    const database = client.db(DB_NAME);
    const collection = database.collection(COLLECTION_NAME);

    // 2. Prepara el documento para guardar
    const datosConMarca = { 
      ...datos, 
      timestampServidor: new Date() // Añadir fecha y hora del servidor (Auditoría)
    };

    // 3. Inserta el documento
    const resultado = await collection.insertOne(datosConMarca);
    console.log(`Documento insertado en Atlas con _id: ${resultado.insertedId}`);

    // Respuesta que Google Apps Script recibirá
    res.status(200).send('Datos guardados correctamente en Atlas.');

  } catch (error) {
    console.error("Error al guardar datos en Atlas (Revisar URI o IP en Atlas):", error);
    res.status(500).send('Error interno del servidor.');
  }
  // IMPORTANTE: NO CERRAMOS LA CONEXIÓN (client.close()) AQUÍ 
  // para mantener el pool de conexiones activo y estable.
});

// *******************************************************************
// FUNCIÓN PARA VERIFICAR LA CONEXIÓN INICIAL A MONGO DB
// *******************************************************************
async function runServer() {
    try {
        // Intenta conectar el cliente de MongoDB antes de iniciar el servidor HTTP
        await client.connect();
        console.log("Conexión inicial a MongoDB Atlas exitosa. Base de datos lista.");

        // Solo arranca el servidor Express si la conexión a Mongo fue exitosa
        app.listen(port, () => {
            console.log(`Servidor escuchando en el puerto ${port}`);
            console.log("¡Listo para recibir datos del formulario de Flecha Roja!");
        });

    } catch (err) {
        console.error("===============================================");
        console.error("ERROR FATAL: Fallo al conectar a MongoDB Atlas");
        console.error("===============================================");
        console.error(err);
        process.exit(1); // Detiene la aplicación si no puede conectar a la BD
    }
}

// Inicia el proceso de conexión y arranque del servidor
runServer();