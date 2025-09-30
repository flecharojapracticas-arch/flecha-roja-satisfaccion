const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();

// Usaremos el puerto que el servidor de Railway (o la nube) nos asigne.
// Si corres localmente, usará el 3000 como fallback.
const port = process.env.PORT || 3000;

// *******************************************************************
// *** IMPORTANTE: TU CADENA DE CONEXIÓN DE MONGODB ATLAS FINAL ***
// *******************************************************************
const uri = "mongodb+srv://flecharojapracticas_db_user:Viva031120@flecharoja-satisfaccion.ohop4mb.mongodb.net/?retryWrites=true&w=majority&appName=FlechaRoja-Satisfaccion-DB";

const client = new MongoClient(uri);

// Nombres de la base de datos y la colección que usarás en Atlas
const DB_NAME = 'flecha_roja_db'; 
const COLLECTION_NAME = 'satisfaccion_clientes';

// Middleware para procesar las peticiones JSON que llegan desde Google Forms
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
    // 1. Conexión a MongoDB Atlas
    await client.connect();
    const database = client.db(DB_NAME);
    const collection = database.collection(COLLECTION_NAME);

    // 2. Prepara el documento para guardar
    const datosConMarca = { 
        ...datos, 
        timestampServidor: new Date() // Añadir fecha y hora del servidor
    };

    // 3. Inserta el documento
    const resultado = await collection.insertOne(datosConMarca);
    console.log(`Documento insertado en Atlas con _id: ${resultado.insertedId}`);

    // Respuesta que Google Apps Script recibirá
    res.status(200).send('Datos guardados correctamente en Atlas.');

  } catch (error) {
    console.error("Error al guardar datos en Atlas:", error);
    res.status(500).send('Error interno del servidor.');
  } finally {
    // 4. Asegurar el cierre de la conexión después de la operación
    // Es buena práctica en entornos Serverless o de despliegue
    await client.close(); 
  }
});

// *******************************************************************
// INICIO DEL SERVIDOR
// *******************************************************************
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
  console.log("¡Listo para recibir datos del formulario de Flecha Roja!");
});