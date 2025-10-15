// Archivo de Rutas para CRUD, Validación y Filtros de Encuestas
const express = require('express');
const { ObjectId } = require('mongodb'); // Necesario para buscar por ID

const router = express.Router();


// Middleware para obtener la colección
// Usa la conexión de BD inyectada en server.js
const getCollection = (req) => {
    // req.db y req.COLLECTION_NAME fueron inyectados en server.js
    return req.db.collection(req.COLLECTION_NAME); 
};


// 1. OBTENER Y FILTRAR ENCUESTAS (GET)
// Endpoint: GET /api/encuestas?folioBoleto=...&origenViaje=...
router.get('/encuestas', async (req, res) => {
    try {
        const collection = getCollection(req);
        
        // Construir el objeto de consulta para MongoDB basado en los query parameters (filtros)
        const query = {};
        const { folioBoleto, origenViaje, destinoFinal, cumplioExpectativas } = req.query;

        // Si se proporciona un filtro, se añade a la query
        if (folioBoleto) {
             // Búsqueda exacta por Folio de Boleto
             query.folioBoleto = folioBoleto; 
        }
        if (origenViaje) query.origenViaje = origenViaje;
        if (destinoFinal) query.destinoFinal = destinoFinal;
        if (cumplioExpectativas) query.cumplioExpectativas = cumplioExpectativas;
        
        
        const encuestas = await collection.find(query).sort({ fecha: -1 }).toArray();
        
        // Aseguramos que el campo 'validado' exista, por si no se guardó al inicio
        const processedEncuestas = encuestas.map(doc => ({
            ...doc,
            validado: doc.validado || 'PENDIENTE'
        }));

        res.status(200).json(processedEncuestas);

    } catch (error) {
        console.error('Error al obtener encuestas:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener encuestas.' });
    }
});


// 2. ACTUALIZAR CAMPO DE ENCUESTA (PUT) - Edición en línea
// Endpoint: PUT /api/encuestas/:id
router.put('/encuestas/:id', async (req, res) => {
    try {
        const collection = getCollection(req);
        const { id } = req.params;
        const updates = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de encuesta inválido.' });
        }

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Encuesta no encontrada o sin cambios.' });
        }

        res.status(200).json({ message: 'Encuesta actualizada correctamente.', updates });

    } catch (error) {
        console.error('Error al actualizar encuesta:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar encuesta.' });
    }
});


// 3. VALIDAR ENCUESTA (PUT para cambiar estado)
// Endpoint: PUT /api/encuestas/validar/:id
router.put('/encuestas/validar/:id', async (req, res) => {
    try {
        const collection = getCollection(req);
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de encuesta inválido.' });
        }

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { validado: 'VALIDADO' } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Encuesta no encontrada o ya estaba validada.' });
        }

        res.status(200).json({ message: 'Encuesta validada correctamente.' });

    } catch (error) {
        console.error('Error al validar encuesta:', error);
        res.status(500).json({ message: 'Error interno del servidor al validar encuesta.' });
    }
});


// 4. NO VALIDAR/ELIMINAR ENCUESTA (DELETE)
// Endpoint: DELETE /api/encuestas/:id
router.delete('/encuestas/:id', async (req, res) => {
    try {
        const collection = getCollection(req);
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de encuesta inválido.' });
        }
        
        // Se elimina la encuesta de la base de datos
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Encuesta no encontrada.' });
        }

        res.status(200).json({ message: 'Encuesta eliminada correctamente (No Validada).' });

    } catch (error) {
        console.error('Error al eliminar encuesta:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar encuesta.' });
    }
});

module.exports = router;