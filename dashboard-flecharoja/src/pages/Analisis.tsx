// Analisis.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

import './Analisis.css'; 

// Registrar los elementos de Chart.js que vamos a usar
ChartJS.register(
    ArcElement, 
    Tooltip, 
    Legend,
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title
);

const API_BASE_URL = 'https://flecha-roja-satisfaccion.onrender.com/api'; // Usaremos el endpoint /data

// --- Constantes ---
const PRIMARY_COLOR = '#2a655f';
const SECONDARY_COLOR = '#1f4e4a';
const RATING_OPTIONS = ['Muy Buena', 'Buena', 'Regular', 'Mala', 'Muy Mala'];
const TERMINALES = [
    'Acambay', 'Atlacomulco', 'Cadereyta', 'Chalma', 'Cuernavaca', 'El Yaqui',
    'Ixtlahuaca', 'Ixtapan de la Sal', 'Mexico Poniente', 'Mexico Norte', 'Naucalpan',
    'Querétaro', 'San Juan del Rio', 'Taxco', 'Tenancingo', 'Tepotzotlán', 'Tenango',
    'Temoaya', 'Toluca', 'Santiago Tianguistengo', 'San Mateo Atenco', 'Xalatlaco',
    'Villa Victoria'
];

// Mapeo de preguntas a las claves de la base de datos
const QUESTION_MAP: { [key: string]: { key: keyof Survey, title: string } } = {
    'pregunta1': { key: 'califExperienciaCompra', title: '1. Evalúe su experiencia de compra' },
    'pregunta2': { key: 'califServicioConductor', title: '2. Evalúe el servicio del conductor' },
    'pregunta3': { key: 'califComodidad', title: '5. ¿Cómo califica la comodidad a bordo?' },
    'pregunta4': { key: 'califLimpieza', title: '6. ¿Cómo califica la limpieza a bordo?' },
    'pregunta5': { key: 'califSeguridad', title: '7. ¿Qué tan seguro consideró su viaje?' },
    'pregunta6': { key: 'cumplioExpectativas', title: '8. ¿Se cumplió con sus expectativas de salida?' },
};

// Interfaz mínima de la encuesta para el análisis
interface Survey {
    _id: string;
    origenViaje: string;
    destinoFinal: string;
    califExperienciaCompra: string;
    califServicioConductor: string;
    califComodidad: string;
    califLimpieza: string;
    califSeguridad: string;
    cumplioExpectativas: string;
    [key: string]: any; 
}


const Analisis: React.FC = () => {
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<string>('pregunta1');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // --- Estados para el Modal VS ---
    const [vsTerminal1, setVsTerminal1] = useState('Villa Victoria');
    const [vsTerminal2, setVsTerminal2] = useState('Naucalpan');
    const [vsQuestionKey, setVsQuestionKey] = useState<keyof Survey>('califExperienciaCompra');

    // ----------------------------------------------------
    // --- Lógica de Obtención de Datos ---
    // ----------------------------------------------------

    const fetchAllSurveys = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Nota: Se asume que GET /api/data devuelve TODAS las encuestas.
            // Se usa el token, aunque la tabla de encuestas lo omitía para GET.
            const token = localStorage.getItem('aut-token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.get(`${API_BASE_URL}/data`, { headers });
            setSurveys(response.data);
            
        } catch (err) {
            console.error('Error al cargar datos de análisis:', err);
            setError('Error al cargar los datos para el análisis. Asegúrate de iniciar sesión y que el servidor de Render esté activo.');
            setSurveys([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllSurveys();
    }, [fetchAllSurveys]);

    // ----------------------------------------------------
    // --- Lógica de Procesamiento de Datos para Gráficos ---
    // ----------------------------------------------------

    /**
     * Procesa los datos generales de una pregunta para el gráfico.
     * @param key La clave del campo de la encuesta (e.g., 'califExperienciaCompra').
     * @param ratings Las opciones de respuesta esperadas.
     * @returns Un objeto con etiquetas (labels) y datos (data) para Chart.js.
     */
    const processDataForChart = (key: keyof Survey, ratings: string[]): { labels: string[], data: number[], backgroundColors: string[] } => {
        const counts = ratings.reduce((acc, rating) => ({ ...acc, [rating]: 0 }), {} as Record<string, number>);
        
        surveys.forEach(survey => {
            const value = survey[key];
            if (value && counts.hasOwnProperty(value)) {
                counts[value]++;
            }
        });

        const labels = ratings;
        const data = labels.map(label => counts[label]);
        
        // Define una paleta de colores para las calificaciones
        const backgroundColors = labels.map(label => {
            switch(label) {
                case 'Muy Buena': return 'rgba(42, 101, 95, 1)'; // primary-color
                case 'Buena': return 'rgba(76, 175, 80, 1)';    // success-color (verde más claro)
                case 'Regular': return 'rgba(255, 193, 7, 1)';   // warning-color (amarillo)
                case 'Mala': return 'rgba(255, 152, 0, 1)';     // warning-color (naranja)
                case 'Muy Mala': return 'rgba(244, 67, 54, 1)';  // danger-color (rojo)
                default: return 'rgba(150, 150, 150, 1)';
            }
        });
        
        return { labels, data, backgroundColors };
    };

    /**
     * Prepara los datos para la Gráfica de Barras de la pregunta seleccionada.
     */
    const getBarChartData = (questionKey: keyof Survey) => {
        const { labels, data, backgroundColors } = processDataForChart(questionKey, RATING_OPTIONS);
        
        return {
            labels: labels,
            datasets: [
                {
                    label: 'Conteo de Respuestas',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: PRIMARY_COLOR,
                    borderWidth: 1,
                },
            ],
        };
    };

    /**
     * Prepara los datos para la Gráfica Circular de la pregunta seleccionada (resumen).
     */
    const getPieChartData = (questionKey: keyof Survey) => {
        const { labels, data, backgroundColors } = processDataForChart(questionKey, RATING_OPTIONS);
        
        // Puedes agrupar las respuestas o mantener el detalle. Usaremos el detalle.
        return {
            labels: labels,
            datasets: [
                {
                    label: '# de Encuestas',
                    data: data,
                    backgroundColor: backgroundColors.map(color => color.replace('1)', '0.8)')), // Ligeramente transparente
                    borderColor: 'white', // Borde blanco para separar las rebanadas
                    borderWidth: 2,
                },
            ],
        };
    };

    // ----------------------------------------------------
    // --- Lógica para el Modal de Comparación (VS) ---
    // ----------------------------------------------------
    
    const filterAndProcessVsData = (terminal: string, questionKey: keyof Survey) => {
        const filteredSurveys = surveys.filter(s => s.origenViaje === terminal);
        const counts = RATING_OPTIONS.reduce((acc, rating) => ({ ...acc, [rating]: 0 }), {} as Record<string, number>);
        
        filteredSurveys.forEach(survey => {
            const value = survey[questionKey];
            if (value && counts.hasOwnProperty(value)) {
                counts[value]++;
            }
        });
        
        return RATING_OPTIONS.map(label => counts[label]);
    };
    
    const getVsChartData = () => {
        const data1 = filterAndProcessVsData(vsTerminal1, vsQuestionKey);
        const data2 = filterAndProcessVsData(vsTerminal2, vsQuestionKey);
        const questionTitle = QUESTION_MAP[Object.keys(QUESTION_MAP).find(k => QUESTION_MAP[k].key === vsQuestionKey) || 'pregunta1']?.title || 'Pregunta de Comparación';
        
        return {
            labels: RATING_OPTIONS,
            datasets: [
                {
                    label: vsTerminal1,
                    data: data1,
                    backgroundColor: PRIMARY_COLOR,
                },
                {
                    label: vsTerminal2,
                    data: data2,
                    backgroundColor: SECONDARY_COLOR,
                },
            ],
        };
    };


    // ----------------------------------------------------
    // --- Componentes de Renderizado ---
    // ----------------------------------------------------

    const renderChartCards = () => {
        if (loading) return <div className="chart-message">Cargando datos de análisis...</div>;
        if (error) return <div className="chart-message error-message">❌ {error}</div>;
        if (surveys.length === 0) return <div className="chart-message">No hay encuestas para mostrar análisis.</div>;

        const currentQuestion = QUESTION_MAP[selectedQuestion];
        if (!currentQuestion) return <div className="chart-message">Pregunta no válida.</div>;

        const pieData = getPieChartData(currentQuestion.key);
        const barData = getBarChartData(currentQuestion.key);
        
        // Opciones de Gráfica Circular
        const pieOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' as const },
                title: { display: false },
            },
        };

        // Opciones de Gráfica de Barras
        const barOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' as const },
                title: { display: false },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Conteo de Respuestas' }
                },
            },
        };


        return (
            <div className="chart-grid">
                
                {/* GRÁFICA 1: Circular (Resumen General) */}
                <div className="chart-card">
                    <h3 className="chart-title">Resumen General: {currentQuestion.title} (Circular)</h3>
                    <div style={{ flexGrow: 1, minHeight: '300px' }}>
                        <Pie data={pieData} options={pieOptions} />
                    </div>
                </div>

                {/* GRÁFICA 2: Barras (Detalle de Calificaciones) */}
                <div className="chart-card">
                    <h3 className="chart-title">Detalle por Calificación: {currentQuestion.title} (Barras)</h3>
                    <div style={{ flexGrow: 1, minHeight: '300px' }}>
                        <Bar data={barData} options={barOptions} />
                    </div>
                </div>
            </div>
        );
    };

    const renderVsModal = () => {
        if (!isModalOpen) return null;

        const vsChartData = getVsChartData();
        const vsQuestionTitle = QUESTION_MAP[Object.keys(QUESTION_MAP).find(k => QUESTION_MAP[k].key === vsQuestionKey) || 'pregunta1']?.title || 'Pregunta de Comparación';

        const vsBarOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' as const },
                title: { display: true, text: `Comparación de Respuestas: ${vsQuestionTitle}`, font: { size: 16, weight: 'bold' } },
            },
            scales: {
                x: { stacked: false },
                y: { 
                    stacked: false,
                    beginAtZero: true,
                    title: { display: true, text: 'Conteo de Respuestas' }
                },
            },
        };

        return (
            <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                <div className="modal-content-vs" onClick={(e) => e.stopPropagation()}>
                    <header className="modal-header-vs">
                        <h2 className="modal-title-vs">ANÁLISIS DE COMPARACIÓN POR ORIGEN</h2>
                        <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
                    </header>

                    <div className="modal-body-vs">
                        <div className="vs-filter-bar">
                            
                            {/* Filtro 1: Origen 1 */}
                            <div className="filter-group">
                                <select 
                                    value={vsTerminal1} 
                                    onChange={(e) => setVsTerminal1(e.target.value)}
                                >
                                    {TERMINALES.map(t => (
                                        <option key={t} value={t}>{t} (Origen 1)</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtro 2: Origen 2 */}
                            <div className="filter-group">
                                <select 
                                    value={vsTerminal2} 
                                    onChange={(e) => setVsTerminal2(e.target.value)}
                                >
                                    {TERMINALES.filter(t => t !== vsTerminal1).map(t => (
                                        <option key={t} value={t}>{t} (Origen 2)</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Filtro 3: Pregunta a Comparar */}
                            <div className="filter-group">
                                <select 
                                    value={vsQuestionKey} 
                                    onChange={(e) => setVsQuestionKey(e.target.value as keyof Survey)}
                                >
                                    {Object.keys(QUESTION_MAP).map(qKey => (
                                        <option key={qKey} value={QUESTION_MAP[qKey].key}>
                                            {QUESTION_MAP[qKey].title.split(': ')[0]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="vs-chart-area">
                            {surveys.length > 0 ? (
                                <div style={{ width: '90%', height: '500px' }}>
                                    <Bar data={vsChartData} options={vsBarOptions} />
                                </div>
                            ) : (
                                <div className="chart-message">Cargando o no hay datos para comparar.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const logoUrl = '/logo_flecha_roja.png'; 

    return (
        <div className="dashboard-container">
            {/* Encabezado fijo */}
            <header className="dashboard-header">
                <div className="header-top-bar">
                    <div className="header-logo-container">
                        <img src={logoUrl} alt="Logo Flecha Roja" className="header-logo" />
                    </div>
                    <h1 className="header-title-main">SISTEMA DE SATISFACCIÓN AL CLIENTE</h1>
                    <button 
                        className="btn-navigate" 
                        onClick={() => navigate('/dashboard')} 
                    >
                        Regresar al Inicio
                    </button>
                </div>
            </header>

            <main className="dashboard-main-content">
                <div className="analysis-intro-box">
                    <p className="analysis-intro-text">
                        En este apartado se muestran las **Encuestas Realizadas Generales por pregunta**, permitiendo un análisis visual y comparativo.
                    </p>
                    
                    {/* Botones de Preguntas */}
                    <div className="question-menu">
                        {Object.keys(QUESTION_MAP).map(qKey => (
                            <button
                                key={qKey}
                                className={`btn-question ${selectedQuestion === qKey ? 'active' : ''}`}
                                onClick={() => setSelectedQuestion(qKey)}
                            >
                                {QUESTION_MAP[qKey].title.split(':')[0]}
                            </button>
                        ))}
                        
                        {/* Botón para abrir el Modal VS */}
                        <button
                            className="btn-question"
                            onClick={() => setIsModalOpen(true)}
                        >
                            ANALIZAR POR ORIGEN (VS)
                        </button>
                    </div>
                </div>

                {/* Área de Gráficos de la Pregunta General */}
                <div className="surveys-section">
                    {renderChartCards()}
                </div>
            </main>

            {/* Modal de Análisis por Origen (VS) */}
            {renderVsModal()}
        </div>
    );
};

export default Analisis;