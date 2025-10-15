const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router(); 

// NOTA: Usamos el cliente global de app.locals para asegurar la conexión
const getCollection = (req) => {
    // Definiciones de la DB conocidas por server.js
    const DB_NAME = 'flecha_roja_db'; 
    const COLLECTION_NAME = 'satisfaccion_clientes';
    
    if (!req.app.locals.client) {
        // Esto solo ocurriría si el servidor no se conectó correctamente al inicio.
        throw new Error('Database connection client not available in app.locals.');
    }
    return req.app.locals.client.db(DB_NAME).collection(COLLECTION_NAME);
};

// ----------------------------------------------------
// 1. RUTA GET: Obtener Encuestas (Resuelve a /api/encuestas)
// ----------------------------------------------------
router.get('/encuestas', async (req, res) => {
    try {
        const collection = getCollection(req);
        const { validado } = req.query;
        
        const filter = {};
        if (validado) {
            filter.validado = validado; 
        }

        const data = await collection.find(filter).sort({ timestampServidor: -1 }).toArray();
        
        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener encuestas:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// ----------------------------------------------------
// 2. RUTA PUT: Actualizar una encuesta (Edición y Validar)
// Resuelve a /api/encuestas/:id
// ----------------------------------------------------
router.put('/encuestas/:id', async (req, res) => {
    try {
        const collection = getCollection(req);
        const { id } = req.params;
        const updateData = req.body;

        delete updateData._id; 
        delete updateData.timestampServidor;

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Encuesta no encontrada.' });
        }
        
        res.status(200).json({ message: 'Encuesta actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la encuesta:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ----------------------------------------------------
// 3. RUTA DELETE: Eliminar una encuesta (Marca como ELIMINADO)
// Resuelve a /api/encuestas/:id
// ----------------------------------------------------
router.delete('/encuestas/:id', async (req, res) => {
    try {
        const collection = getCollection(req);
        const { id } = req.params;
        
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { validado: 'ELIMINADO' } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Encuesta no encontrada.' });
        }

        res.status(200).json({ message: 'Encuesta marcada como ELIMINADA (estado cambiado).' });

    } catch (error) {
        console.error('Error al eliminar la encuesta:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;