const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware'); 

// Objeto para mantener la referencia al cliente de MongoDB fuera del router
let mongoClient = null;

// Exportamos esta función para que server.js pueda pasar el cliente
const setMongoClient = (client) => {
    mongoClient = client;
};

// @route   GET /api/metrics
router.get('/', authenticateToken, async (req, res) => {
    // CAMPO CRÍTICO: Nombre del campo de la Pregunta 1 en la BD
    const CAMPO_EXPERIENCIA = 'Cal_Experiencia_Compra'; 

    const client = mongoClient; // Usamos el cliente pasado por server.js
    const DB_NAME = 'flecha_roja_db';
    const COLLECTION_NAME = 'satisfaccion_clientes';

    if (!client) {
        console.error("Error: Cliente de MongoDB no disponible en metrics.js");
        return res.status(500).send({ message: 'Error: Cliente de MongoDB no inicializado.' });
    }
    
    try {
        const database = client.db(DB_NAME);
        const collection = database.collection(COLLECTION_NAME);

        // --- 1. PIPELINE ÚNICO: Cálcula Promedio y Total al mismo tiempo ---
        const pipeline = [
            // Paso 1: Mapear la respuesta de texto a un valor numérico (1-10)
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
            // Paso 2: Agrupar y calcular métricas
            {
                $group: {
                    _id: null,
                    totalEncuestas: { $sum: 1 },
                    satisfaccionPromedioCalculada: { $avg: '$score' }, 
                }
            },
            // Paso 3: Proyectar y redondear
            {
                $project: {
                    _id: 0,
                    totalEncuestas: 1,
                    satisfaccionPromedio: { $round: ['$satisfaccionPromedioCalculada', 1] } 
                }
            }
        ];

        const metricsResult = await collection.aggregate(pipeline).toArray();
        const totalMetrics = metricsResult[0] || { totalEncuestas: 0, satisfaccionPromedio: 0 };
        
        // --- 2. ENCONTRAR EL RESULTADO GENERAL ---
        const commonResultPipeline = [
            {
                $group: {
                    _id: `$${CAMPO_EXPERIENCIA}`, 
                    count: { $sum: 1 } 
                }
            },
            { $sort: { count: -1 } }, 
            { $limit: 1 }
        ];
        
        const commonResult = await collection.aggregate(commonResultPipeline).toArray();
        
        const resultadoGeneral = commonResult.length > 0 
                               ? commonResult[0]._id 
                               : 'Sin datos aún';

        // --- 3. Devolver los resultados finales ---
        res.json({
            totalEncuestas: totalMetrics.totalEncuestas || 0,
            satisfaccionPromedio: totalMetrics.totalEncuestas > 0 
                               ? `${totalMetrics.satisfaccionPromedio.toFixed(1)}/10` 
                               : 'N/A',
            resultadoGeneral: resultadoGeneral
        });

    } catch (err) {
        console.error('Error al calcular métricas (Agregación fallida):', err.message);
        res.status(500).send({ message: 'Error interno del servidor al calcular métricas. Verifique los nombres de los campos de la BD.' });
    }
});

// Exportamos tanto el router como la función de configuración
module.exports = { router, setMongoClient };