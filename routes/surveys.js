const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// =======================================================
// RUTA 1: GET /api/dashboard/surveys
// Obtener encuestas con filtros
// =======================================================
router.get('/surveys', async (req, res) => {
    // La inyección de req.db y req.COLLECTION_NAME ocurre en server.js
    const db = req.db; 
    const COLLECTION_NAME = req.COLLECTION_NAME;

    if (!db || !COLLECTION_NAME) {
        return res.status(500).json({ message: "Error interno: Base de datos no inicializada en el request." });
    }

    try {
        const collection = db.collection(COLLECTION_NAME);
        const { folioBoleto, origenViaje, destinoFinal, cumplioExpectativas } = req.query;
        
        // Construir el objeto de filtros
        const filter = {};
        if (folioBoleto) filter.folioBoleto = folioBoleto;
        if (origenViaje) filter.origenViaje = origenViaje;
        if (destinoFinal) filter.destinoFinal = destinoFinal;
        if (cumplioExpectativas) filter.cumplioExpectativas = cumplioExpectativas;

        // CRÍTICO: Ordenar por timestamp para mostrar lo más reciente primero
        const sortOptions = { timestampServidor: -1 }; 

        const data = await collection.find(filter).sort(sortOptions).toArray();
        
        // Éxito: devolver JSON
        res.json(data);

    } catch (error) {
        console.error('Error al obtener encuestas con filtros:', error);
        // CRÍTICO: Devolver un error JSON, no HTML
        res.status(500).json({ message: 'Error interno del servidor al obtener las encuestas.', details: error.message });
    }
});

// =======================================================
// RUTA 2: PUT /api/dashboard/surveys/:id (Validar Encuesta)
// =======================================================
router.put('/surveys/:id', async (req, res) => {
    const db = req.db;
    const COLLECTION_NAME = req.COLLECTION_NAME;
    const { id } = req.params;
    const { validado } = req.body; 

    try {
        if (typeof validado !== 'boolean') {
            return res.status(400).json({ message: "El campo 'validado' es requerido y debe ser booleano." });
        }
        
        const collection = db.collection(COLLECTION_NAME);
        
        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { validado: validado, timestampValidacion: new Date().toISOString() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Encuesta no encontrada." });
        }

        res.json({ message: `Encuesta ${id} actualizada a validado: ${validado}.` });
    } catch (error) {
        console.error('Error al validar/actualizar encuesta:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar la encuesta.', details: error.message });
    }
});

// =======================================================
// RUTA 3: DELETE /api/dashboard/surveys/:id (Eliminar)
// =======================================================
router.delete('/surveys/:id', async (req, res) => {
    const db = req.db;
    const COLLECTION_NAME = req.COLLECTION_NAME;
    const { id } = req.params;

    try {
        const collection = db.collection(COLLECTION_NAME);
        
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Encuesta no encontrada para eliminar." });
        }

        res.json({ message: `Encuesta ${id} eliminada con éxito.` });
    } catch (error) {
        console.error('Error al eliminar encuesta:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar la encuesta.', details: error.message });
    }
});

module.exports = router;
