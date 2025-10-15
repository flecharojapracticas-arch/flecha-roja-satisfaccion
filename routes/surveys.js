// surveys.js (CORREGIDO)
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

// NOTA: Usamos el cliente global de app.locals para asegurar la conexión
const getCollection = (req) => {
    // Definiciones de la DB conocidas por server.js
    const DB_NAME = 'flecha_roja_db';
    const COLLECTION_NAME = 'satisfaccion_clientes';

    if (!req.app.locals.client) {
        throw new Error('Database connection client not available in app.locals.');
    }
    return req.app.locals.client.db(DB_NAME).collection(COLLECTION_NAME);
};

// ----------------------------------------------------
// 1. RUTA GET: Obtener Encuestas y Manejo de Filtros
// Mapea a /api/dashboard/encuestas
// ----------------------------------------------------
router.get('/', async (req, res) => { // La ruta es solo '/' porque está montada en /api/dashboard/encuestas
    try {
        const collection = getCollection(req);

        // 1. EXTRAER TODOS LOS PARÁMETROS DE FILTRO (req.query)
        const { folioBoleto, origenViaje, destinoFinal, cumplioExpectativas, validado } = req.query;

        // 2. CONSTRUIR EL OBJETO DE FILTRO PARA MONGODB
        // { $ne: 'ELIMINADO' } muestra todas las encuestas no eliminadas por defecto
        let filter = { validado: { $ne: 'ELIMINADO' } };
        
        // Si el cliente pide encuestas eliminadas, ajustamos el filtro.
        if (validado === 'ELIMINADO') {
            filter = { validado: 'ELIMINADO' };
        } else if (validado) {
            filter.validado = validado;
        }

        // Filtro por Folio de Boleto
        if (folioBoleto) {
            filter.folioBoleto = folioBoleto; // Busca el folio exacto
        }

        // Filtro por Origen del Viaje (Terminal)
        if (origenViaje) {
            filter.origenViaje = origenViaje;
        }

        // Filtro por Destino Final
        if (destinoFinal) {
            filter.destinoFinal = destinoFinal;
        }

        // Filtro por Expectativas
        if (cumplioExpectativas) {
            filter.cumplioExpectativas = cumplioExpectativas;
        }
        
        const data = await collection.find(filter).sort({ timestampServidor: -1 }).toArray();

        res.status(200).json(data);
    } catch (error) {
        console.error('Error al obtener encuestas con filtros:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// ----------------------------------------------------
// 2. RUTA PUT: Actualizar una encuesta (Edición y Validar/No Validar)
// Mapea a /api/dashboard/encuestas/:id
// ----------------------------------------------------
router.put('/:id', async (req, res) => { // La ruta es solo '/:id'
    try {
        const collection = getCollection(req);
        const { id } = req.params;
        const updateData = req.body;

        // Limpiar campos internos antes de la actualización
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
// 3. RUTA DELETE: (Ya no es necesario, el PUT maneja ELIMINADO)
// Mantenemos la ruta DELETE por si acaso, aunque el frontend usa PUT con 'ELIMINADO'
// ----------------------------------------------------
router.delete('/:id', async (req, res) => {
    try {
        const collection = getCollection(req);
        const { id } = req.params;

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { validado: 'ELIMINADO' } } // Marca como ELIMINADO
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