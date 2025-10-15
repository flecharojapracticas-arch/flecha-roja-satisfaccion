// routes/surveys.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware'); 
const { ObjectId } = require('mongodb'); 

// RUTA GET (Lectura de la tabla) - SIN AUTENTICACIÓN
router.get('/', async (req, res) => {
    try {
        const filters = {};
        if (req.query.folioBoleto) filters.folioBoleto = req.query.folioBoleto;
        if (req.query.origenViaje) filters.origenViaje = req.query.origenViaje;
        if (req.query.destinoFinal) filters.destinoFinal = req.query.destinoFinal;
        if (req.query.cumplioExpectativas) filters.cumplioExpectativas = req.query.cumplioExpectativas;
        
        // Asumiendo que 'req.db' es la instancia de la base de datos inyectada por el middleware
        const surveys = await req.db.collection('surveys').find(filters).toArray();
        res.json(surveys);
    } catch (error) {
        console.error("Error al obtener encuestas:", error);
        res.status(500).json({ message: "Error al obtener encuestas", error: error.message });
    }
});

// RUTA PUT (Actualizar) - CON AUTENTICACIÓN
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await req.db.collection('surveys').updateOne(
            { _id: new ObjectId(req.params.id) }, 
            { $set: req.body }
        );
        if (result.matchedCount === 0) return res.status(404).json({ message: "Encuesta no encontrada" });
        res.json({ message: "Encuesta actualizada correctamente" });
    } catch (error) {
        console.error("Error al actualizar:", error);
        res.status(500).json({ message: "Error al actualizar", error: error.message });
    }
});

// ... (Si tienes más rutas como POST o DELETE, también deben usar authenticateToken)

module.exports = router;