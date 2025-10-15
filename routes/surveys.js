const express = require('express');
const { ObjectId } = require('mongodb'); // Necesario para trabajar con _id
const router = express.Router();

// Middleware para validar el ObjectId
const validateObjectId = (req, res, next) => {
    if (!ObjectId.isValid(req.params.id)) {
        return res.status(400).send({ message: 'ID de encuesta no válido.' });
    }
    next();
};

/**
 * RUTA GET /api/dashboard/surveys
 * Obtiene todas las encuestas con opción de filtrado.
 */
router.get('/surveys', async (req, res) => {
    try {
        const db = req.db; // Inyectado desde server.js
        const collectionName = req.COLLECTION_NAME; // Inyectado desde server.js
        const collection = db.collection(collectionName);

        // Crear el objeto de filtro dinámicamente
        const filter = {};
        
        // ** Filtros **
        // 1. folioBoleto (Búsqueda exacta)
        if (req.query.folioBoleto) {
            filter.folioBoleto = req.query.folioBoleto;
        }

        // 2. origenViaje (Terminal)
        if (req.query.origenViaje) {
            filter.origenViaje = req.query.origenViaje;
        }

        // 3. destinoFinal
        if (req.query.destinoFinal) {
            filter.destinoFinal = req.query.destinoFinal;
        }

        // 4. cumplioExpectativas (Experiencia)
        if (req.query.cumplioExpectativas) {
            filter.cumplioExpectativas = req.query.cumplioExpectativas;
        }
        
        // Opción: Muestra las no validadas primero por defecto si no hay filtros específicos
        // Si el filtro está vacío, ordenamos por validado (false primero) y luego por fecha
        const sortOptions = { 
             validado: 1, // 1: ascendente (false va antes de true)
             timestampServidor: -1 // -1: descendente (más reciente primero)
        };

        const surveys = await collection.find(filter).sort(sortOptions).toArray();
        
        // Aseguramos que el campo 'validado' exista, por defecto es false si no está
        const safeSurveys = surveys.map(s => ({
            ...s,
            validado: s.validado === true 
        }));

        res.json(safeSurveys);

    } catch (error) {
        console.error('Error al obtener encuestas:', error);
        res.status(500).send({ message: 'Error interno del servidor al obtener encuestas.' });
    }
});


/**
 * RUTA PUT /api/dashboard/surveys/:id
 * Actualiza una encuesta (usado para validación y edición).
 */
router.put('/surveys/:id', validateObjectId, async (req, res) => {
    try {
        const db = req.db;
        const collection = db.collection(req.COLLECTION_NAME);
        const { id } = req.params;
        
        // Solo permitimos la actualización de los campos relevantes (validado, o campos de edición)
        const updateFields = req.body;
        
        // Previene la actualización de campos críticos o inyectados
        delete updateFields._id; 
        delete updateFields.timestampServidor;

        const result = await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ message: 'Encuesta no encontrada.' });
        }

        res.status(200).send({ message: 'Encuesta actualizada correctamente.' });

    } catch (error) {
        console.error('Error al actualizar encuesta:', error);
        res.status(500).send({ message: 'Error interno del servidor al actualizar encuesta.' });
    }
});


/**
 * RUTA DELETE /api/dashboard/surveys/:id
 * Elimina una encuesta (Usado para 'No Validar').
 */
router.delete('/surveys/:id', validateObjectId, async (req, res) => {
    try {
        const db = req.db;
        const collection = db.collection(req.COLLECTION_NAME);
        const { id } = req.params;
        
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).send({ message: 'Encuesta no encontrada.' });
        }

        res.status(200).send({ message: 'Encuesta eliminada correctamente.' });

    } catch (error) {
        console.error('Error al eliminar encuesta:', error);
        res.status(500).send({ message: 'Error interno del servidor al eliminar encuesta.' });
    }
});

module.exports = router;