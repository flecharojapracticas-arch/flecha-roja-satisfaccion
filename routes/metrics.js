const express = require('express');
const router = express.Router();

// Define el nombre de la colección que usaremos
const COLLECTION_NAME = 'satisfaccion_clientes';

// Ruta para obtener todos los datos de la encuesta (crudos)
router.get('/', async (req, res) => {
    // Asume que el cliente de MongoDB está adjunto a la aplicación
    const client = req.app.locals.client; 
    const DB_NAME = 'flecha_roja_db'; 
    
    if (!client) {
        return res.status(500).json({ message: 'Error: Cliente de MongoDB no inicializado.' });
    }
    
    try {
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // Recupera todos los documentos
        const allSurveys = await collection.find({}).toArray();

        // Enviamos el array completo de encuestas
        res.json(allSurveys); 

    } catch (err) {
        console.error('Error en /api/metrics:', err.message);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;