const express = require('express');
const router = express.Router();
// Nota: authenticateToken ya se usa en server.js, aquí solo lo incluimos si fuera necesario,
// pero lo quitamos de la exportación final para simplificar el uso en server.js.

// @route   GET /api/metrics (Protegido por authenticateToken en server.js)
router.get('/', async (req, res) => {
    // CAMPO CRÍTICO: Nombre del campo de la Pregunta 1 en la BD
    const CAMPO_EXPERIENCIA = 'Cal_Experiencia_Compra'; 

    // **PASO CRÍTICO:** Accedemos al cliente que guardamos en app.locals
    const client = req.app.locals.client; 
    const DB_NAME = 'flecha_roja_db';
    const COLLECTION_NAME = 'satisfaccion_clientes';

    if (!client) {
        console.error("Error: Cliente de MongoDB no disponible en metrics.js (Fallo al acceder a app.locals)");
        return res.status(500).send({ message: 'Error: Cliente de MongoDB no inicializado.' });
    }
    
    try {
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // --- LÓGICA DE AGREGACIÓN SIN CAMBIOS ---
        const pipeline = [
            {
                $addFields: {
                    score: {
                        $switch: {
                            branches: [
                                { case: { $eq: [`$${CAMPO_EXPERIENCIA}`, 'Muy Buena'] }, then: 10 },
                                { case: { $eq: [`$${CAMPO_EXPERIENCIA}`, 'Buena'] }, then: 8 },
                                { case: { $eq: [`$${CAMPO_EXPERIENCIA}`, 'Regular'] }, then: 5 },
                                { case: { $eq: [`$${CAMPO_EXPERIENCIA}`, 'Mala'] }, then: 3 },
                                { case: { $eq: [`$${CAMPO_EXPERIENCIA}`, 'Muy Mala'] }, then: 1 }
                            ],
                            default: 0
                        }
                    }
                }
            },
            { $group: {
                _id: null,
                totalEncuestas: { $sum: 1 },
                satisfaccionPromedioCalculada: { $avg: '$score' }, 
            }},
            { $project: {
                _id: 0,
                totalEncuestas: 1,
                satisfaccionPromedio: { $round: ['$satisfaccionPromedioCalculada', 1] } 
            }}
        ];

        const metricsResult = await collection.aggregate(pipeline).toArray();
        const totalMetrics = metricsResult[0] || { totalEncuestas: 0, satisfaccionPromedio: 0 };
        
        const commonResultPipeline = [
            { $group: { _id: `$${CAMPO_EXPERIENCIA}`, count: { $sum: 1 } }},
            { $sort: { count: -1 } }, 
            { $limit: 1 }
        ];
        
        const commonResult = await collection.aggregate(commonResultPipeline).toArray();
        
        const resultadoGeneral = commonResult.length > 0 
                               ? commonResult[0]._id 
                               : 'Sin datos aún';

        // --- Devolver los resultados finales ---
        res.json({
            totalEncuestas: totalMetrics.totalEncuestas || 0,
            satisfaccionPromedio: totalMetrics.totalEncuestas > 0 
                               ? `${totalMetrics.satisfaccionPromedio.toFixed(1)}/10` 
                               : 'N/A',
            resultadoGeneral: resultadoGeneral
        });

    } catch (err) {
        console.error('Error al calcular métricas (Agregación fallida):', err.message);
        res.status(500).send({ message: 'Error interno del servidor al calcular métricas. Verifique que los campos de la BD sean correctos.' });
    }
});

module.exports = router;