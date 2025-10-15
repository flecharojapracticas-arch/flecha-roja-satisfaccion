const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router(); 

const getCollection = (req) => {
    if (!req.db || !req.COLLECTION_NAME) {
        throw new Error('Database or Collection name not injected into request object.');
    }
    return req.db.collection(req.COLLECTION_NAME);
};

// RUTA GET: Obtener Encuestas (Resuelve a /api/encuestas)
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

// RUTA PUT: Actualizar una encuesta (Edición y Validar)
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


// RUTA DELETE: Eliminar una encuesta (Marca como ELIMINADO)
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