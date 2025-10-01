// IMPORTACIONES NECESARIAS
// Importamos 'ObjectId' de 'mongodb' para poder buscar, actualizar y eliminar documentos por su ID único.
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb'); 
const app = express();

const port = process.env.PORT || 3000;

// *******************************************************************
// *** ⚠️ REEMPLAZA ESTA CADENA CON TU URI DE CONEXIÓN DE ATLAS ⚠️ ***
// *******************************************************************
const uri = "mongodb+srv://flecharojapracticas_db_user:Viva031120@flecharoja-satisfaccion.ohop4mb.mongodb.net/?retryWrites=true&w=majority&appName=FlechaRoja-Satisfaccion-DB";

const client = new MongoClient(uri);

// Nombres de la base de datos y la colección
const DB_NAME = 'flecha_roja_db'; 
const COLLECTION_NAME = 'satisfaccion_clientes';

// Middleware para procesar las peticiones JSON
app.use(express.json());

// *******************************************************************
// 1. ENDPOINT: CREATE (POST /api/save_data) - Desde Google Forms
// *******************************************************************
app.post('/api/save_data', async (req, res) => {
    const datos = req.body;
    if (!datos || Object.keys(datos).length === 0) {
        return res.status(400).send('Error: No se recibieron datos.');
    }

    try {
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        const datosConMarca = { 
            ...datos, 
            timestampServidor: new Date() // Añadir fecha y hora del servidor
        };

        const resultado = await collection.insertOne(datosConMarca);
        console.log(`Documento insertado en Atlas con _id: ${resultado.insertedId}`);

        res.status(200).send('Datos guardados correctamente en Atlas.');

    } catch (error) {
        console.error("Error al guardar datos en Atlas:", error);
        res.status(500).send('Error interno del servidor.');
    }
});

// *******************************************************************
// 2. ENDPOINT: READ ALL (GET /api/data) - Mostrar Todos
// *******************************************************************
app.get('/api/data', async (req, res) => {
    try {
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // Consulta todos los documentos en la colección
        const data = await collection.find({}).toArray();

        // Envía los datos como respuesta JSON al cliente (React)
        res.status(200).json(data);

    } catch (error) {
        console.error("Error al obtener datos de Atlas:", error);
        res.status(500).json({ 
            message: 'Error interno del servidor al obtener datos.',
            error: error.message 
        });
    }
});

// *******************************************************************
// 3. ENDPOINT: READ ONE (GET /api/data/:id) - Mostrar Uno por ID
// *******************************************************************
app.get('/api/data/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // Búsqueda por ObjectId
        const data = await collection.findOne({ _id: new ObjectId(id) });

        if (!data) {
            return res.status(404).json({ message: 'Documento no encontrado.' });
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Error al obtener documento de Atlas:", error);
        res.status(500).json({ 
            message: 'Error al obtener el documento.',
            error: error.message 
        });
    }
});


// *******************************************************************
// 4. ENDPOINT: UPDATE (PUT /api/data/:id) - Actualizar por ID
// *******************************************************************
app.put('/api/data/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const newData = req.body;
        
        if (!newData || Object.keys(newData).length === 0) {
            return res.status(400).send('Datos de actualización faltantes.');
        }

        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // Actualiza el documento por ID. $set asegura que solo se actualicen los campos pasados.
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: newData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Documento no encontrado para actualizar.' });
        }

        res.status(200).json({ message: 'Documento actualizado correctamente.', updatedCount: result.modifiedCount });

    } catch (error) {
        console.error("Error al actualizar documento en Atlas:", error);
        res.status(500).json({ 
            message: 'Error interno del servidor al actualizar.',
            error: error.message 
        });
    }
});


// *******************************************************************
// 5. ENDPOINT: DELETE (DELETE /api/data/:id) - Eliminar por ID
// *******************************************************************
app.delete('/api/data/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // Elimina el documento por ID
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Documento no encontrado para eliminar.' });
        }

        res.status(200).json({ message: 'Documento eliminado correctamente.' });

    } catch (error) {
        console.error("Error al eliminar documento de Atlas:", error);
        res.status(500).json({ 
            message: 'Error interno del servidor al eliminar.',
            error: error.message 
        });
    }
});


// *******************************************************************
// FUNCIÓN PARA VERIFICAR LA CONEXIÓN INICIAL A MONGO DB Y ARRANCAR
// *******************************************************************
async function runServer() {
    try {
        await client.connect();
        console.log("Conexión inicial a MongoDB Atlas exitosa. Base de datos lista.");

        app.listen(port, () => {
            console.log(`Servidor escuchando en el puerto ${port}`);
            console.log("¡API RESTful CRUD para Flecha Roja lista!");
        });

    } catch (err) {
        console.error("===============================================");
        console.error("ERROR FATAL: Fallo al conectar a MongoDB Atlas");
        console.error("===============================================");
        console.error(err);
        process.exit(1); 
    }
}

runServer();