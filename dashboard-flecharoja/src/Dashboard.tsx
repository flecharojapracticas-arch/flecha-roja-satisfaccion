import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import './Dashboard.css'; 
import { Star, FileText } from "lucide-react"; 
import Chart from 'chart.js/auto'; 
import 'chartjs-plugin-annotation'; 
import { AnnotationOptions } from 'chartjs-plugin-annotation';


// =======================================================
// CONFIGURACIÓN DE RUTAS Y CONSTANTES (CORREGIDA)
// =======================================================
const navItems = ['ENCUESTAS', 'ANÁLISIS', 'RESULTADOS', 'RESUMEN'];
const tabRoutes: { [key: string]: string } = {
    'ENCUESTAS': '/dashboard/encuestas',
    'ANÁLISIS': '/dashboard/analisis', // <--- CORREGIDO: Apunta a su propia ruta
    'RESULTADOS': '/dashboard/resultados',
    'RESUMEN': '/dashboard/resumen',
};

const API_METRICS_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/metrics';

// =======================================================
// TIPOS DE DATOS (Mantenidos de tu código)
// =======================================================
interface Survey {
    claveEncuestador: string;
    fecha: string;
    califExperienciaCompra: string;
    califServicioConductor: string;
    califComodidad: string;
    califLimpieza: string;
    califSeguridad: string;
}

interface MetricsState {
    totalEncuestas: number;
    globalAverage: number;
    isLoading: boolean;
    error: string | null;
    data: Survey[] | null;
}

// =======================================================
// LÓGICA DE CÁLCULO DE DATOS (Mantenida)
// =======================================================
const chartLabels: { [key: string]: string } = {
    'califExperienciaCompra': 'Experiencia de Compra',
    'califServicioConductor': 'Servicio del Conductor',
    'califComodidad': 'Comodidad',
    'califLimpieza': 'Limpieza',
    'califSeguridad': 'Seguridad'
};

const ratingToScore = (ratingText: string): number => {
    const lowerCaseText = String(ratingText).toLowerCase().trim();
    switch (lowerCaseText) {
        case 'muy buena': return 10;
        case 'buena': return 8;
        case 'regular': return 5;
        case 'mala': return 3;
        case 'muy mala': return 1;
        default: return 0;
    }
};

const processDataForMetrics = (surveyData: Survey[]): { globalAverage: number, averages: number[] } => {
    const fieldScores: { [key: string]: { sum: number, count: number } } = {};
    Object.keys(chartLabels).forEach(key => fieldScores[key] = { sum: 0, count: 0 });
    
    surveyData.forEach(doc => {
        Object.keys(fieldScores).forEach(field => {
            const score = ratingToScore(doc[field as keyof Survey] as string);
            if (score > 0) {
                fieldScores[field].sum += score;
                fieldScores[field].count += 1;
            }
        });
    });

    const averages = Object.keys(fieldScores).map(field => {
        const { sum, count } = fieldScores[field];
        return count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    });

    const totalSumOfAverages = averages.reduce((sum, avg) => sum + avg, 0);
    const globalAverage = averages.length > 0 
        ? parseFloat((totalSumOfAverages / averages.length).toFixed(2)) 
        : 0;
        
    return { globalAverage, averages };
};


const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    
    // =======================================================
    // ESTADO Y HOOKS DE NAVEGACIÓN
    // =======================================================
    const [metrics, setMetrics] = useState<MetricsState>({
        totalEncuestas: 0, 
        globalAverage: 0, 
        isLoading: true,
        error: null,
        data: null,
    });
    
    const navigate = useNavigate(); 
    const location = useLocation(); 
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    // Bandera para saber si estamos en la ruta principal
    const isMainDashboardRoute = location.pathname === '/dashboard';


    // =======================================================
    // EFECTO DE FETCHING DE DATOS (Mantenido)
    // =======================================================
    useEffect(() => {
        const fetchMetrics = async () => {
            // ... (Tu lógica de fetching de datos)
            const token = localStorage.getItem('auth-token');
            if (!token) {
                setMetrics(prev => ({ ...prev, isLoading: false, error: 'No autenticado.' }));
                return;
            }

            setMetrics(prev => ({ ...prev, isLoading: true, error: null }));
    
            try {
                const response = await fetch(API_METRICS_URL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: No se pudieron obtener los datos.`);
                }

                const surveyData: Survey[] = await response.json(); 
                
                const { globalAverage } = processDataForMetrics(surveyData);

                setMetrics(prevMetrics => ({
                    ...prevMetrics,
                    totalEncuestas: surveyData.length,
                    data: surveyData,
                    globalAverage: globalAverage, 
                    isLoading: false,
                    error: null,
                }));
    
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar.';
                console.error("Error al cargar datos:", errorMessage);
                setMetrics(prevMetrics => ({
                    ...prevMetrics,
                    isLoading: false,
                    error: errorMessage,
                }));
            }
        };
        
        // Solo hacemos el fetch si estamos en la ruta principal para optimizar
        if (isMainDashboardRoute) {
            fetchMetrics();
            const intervalId = setInterval(fetchMetrics, 30000); 
            return () => clearInterval(intervalId);
        }

    }, [isMainDashboardRoute]); // Depende de si es la ruta principal


    // =======================================================
    // EFECTO DE DIBUJO DEL GRÁFICO (Condicional)
    // =======================================================
    useEffect(() => {
        // Solo dibuja el gráfico si estamos en la ruta principal
        if (!isMainDashboardRoute) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }

        if (!metrics.data || metrics.isLoading || metrics.error || !chartRef.current) return;
        
        // ... (Tu lógica de Chart.js para dibujar el gráfico) ...
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        if (metrics.data.length === 0) return;
        
        const { averages } = processDataForMetrics(metrics.data); 
        const ctx = chartRef.current.getContext('2d');
        
        // Colores Dinámicos
const backgroundColors = averages.map(avg => {
    // Color base (verde institucional)
    const baseColor = '#2A655F';

    // Según el promedio, aclaramos u oscurecemos el tono del color base
    if (avg >= 8.5) return baseColor; // tono normal
    if (avg >= 7) return '#245952';   // un poco más oscuro
    if (avg >= 5) return '#1E4D47';   // tono medio oscuro
    return '#173E38';                 // mucho más oscuro
});
        
        // Anotaciones
        const annotations: { [key: string]: AnnotationOptions } = {
            satisfactionLine: {
                type: 'line', yMin: 8.5, yMax: 8.5, borderColor: '#2a655f', borderWidth: 2, borderDash: [6, 6],
                label: { content: 'Nivel de Excelencia (>=8.5)', display: true, position: 'end', color: '#2a655f', font: { weight: 'bold' } }
            },
            alertLine: {
                type: 'line', yMin: 7, yMax: 7, borderColor: '#E74C3C', borderWidth: 2, borderDash: [6, 6],
                label: { content: 'Advertencia (<7.0)', display: true, position: 'end', color: '#E74C3C', font: { weight: 'bold' } }
            }
        };

        // Crear la nueva instancia del gráfico
        chartInstance.current = new Chart(ctx!, { 
            type: 'bar',
            data: {
                labels: Object.values(chartLabels),
                datasets: [{
                    label: 'Puntaje Promedio',
                    data: averages,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color + 'AA'), 
                    borderWidth: 1,
                    borderRadius: 4, 
                    hoverBackgroundColor: backgroundColors.map(color => color + 'B0'),
                    hoverBorderColor: backgroundColors.map(color => color + 'FF'),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1000, easing: 'easeOutQuart' },
                scales: {
                    y: { beginAtZero: true, max: 10, ticks: { stepSize: 1, color: '#666' }, title: { display: true, text: 'Puntaje Promedio (1-10)', color: '#444' }, grid: { color: '#EBEBEB', drawBorder: false } },
                    x: { ticks: { color: '#444' }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Índice de Satisfacción por Área (Promedio General)', font: { size: 18, weight: '900' }, color: '#2A655F' },
                    tooltip: {
                        callbacks: {
                            title: (context) => context[0].label,
                            label: (context) => `Puntaje: ${context.formattedValue} / 10`,
                            afterLabel: (context) => {
                                const score = context.parsed.y;
                                if (score >= 8.5) return 'Estado: EXCELENCIA (Alto)';
                                if (score >= 7) return 'Estado: ALERTA (Mejora Requerida)';
                                return 'Estado: CRÍTICO (Bajo)';
                            }
                        }
                    },
                    annotation: { annotations: annotations } as any 
                }
            }
        });
        
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };

    }, [metrics.data, metrics.isLoading, metrics.error, isMainDashboardRoute]);


    // =======================================================
    // LÓGICA DE NAVEGACIÓN Y RENDERIZADO
    // =======================================================
    const handleTabClick = (tab: string) => {
        const route = tabRoutes[tab];
        if (route) {
            navigate(route); // Redirección real
        }
    };
  
    // Tarjeta Métrica (Componente local)
    const MetricCard: React.FC<{ title: string; value: string | number; subtext: string; icon: React.ReactNode }> = ({ title, value, subtext, icon }) => {
        // ... (Tu renderizado de MetricCard)
        const displayValue = metrics.isLoading ? '...' : 
                             metrics.error ? 'ERROR' : 
                             value; 

        const isGlobalMetric = title.includes('SATISFACCIÓN');
        let valueClass = '';
        if (isGlobalMetric && typeof value === 'number') {
            if (value >= 8.5) valueClass = 'high-score';
            else if (value >= 7) valueClass = 'medium-score';
            else valueClass = 'low-score';
        }

        return (
            <div className="metric-card sidebar-card">
                <div className="card-header-band">
                    {title}
                </div>
                
                <div className="card-content-body">
                    {icon} 
                    <p className={`metric-value ${metrics.isLoading ? 'loading-state' : metrics.error ? 'error-state-red' : valueClass}`}>
                        {displayValue}
                    </p>
                    <p className="metric-subtext">{subtext}</p>
                </div>
            </div>
        );
    };


    // =======================================================
    // RENDERIZADO DEL DASHBOARD (LAYOUT FIJO)
    // =======================================================
  
    return (
      <div className="dashboard-container">
        
        {/* HEADER FIJO */}
        <header className="dashboard-header">
          <div className="header-top-bar">
            <div className="header-logo-container">
              <img src="/logo_flecha_roja.png" alt="Logo Flecha Roja" className="header-logo" />
            </div>
            
            <h1 className="header-title-main">
                SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA
            </h1>
            
            <button onClick={onLogout} className="btn-logout">Cerrar Sesión</button>
          </div>
  
          {/* BARRA DE NAVEGACIÓN */}
          <nav className="nav-bar">
            {navItems.map(item => (
              <button
                key={item}
                onClick={() => handleTabClick(item)}
                // Determinar botón activo usando location.pathname
                className={`nav-button ${location.pathname === tabRoutes[item] ? 'active' : ''}`}
              >
                {item}
              </button>
            ))}
          </nav>
        </header>
  
        <main className="dashboard-main-content">
          
          <div className="welcome-box">
              <h2 className="welcome-title">Panel de Control</h2>
              <p className="welcome-subtitle">Bienvenido al Sistema de Satisfaccion al Cliente Flecha Roja</p>
          </div>
  
          {/* CONDICIÓN FINAL: SOLO RENDERIZA EL GRÁFICO Y TARJETAS si es la ruta PRINCIPAL (/dashboard) */}
          {isMainDashboardRoute ? (
            <div className="main-layout-grid-extended">
            
              {/* Columna Izquierda: Tarjetas de Métrica */}
              <div className="sidebar-metrics">
                    <MetricCard 
                        title="SATISFACCIÓN GLOBAL"
                        value={metrics.globalAverage}
                        subtext="Puntaje Promedio General / 10"
                        icon={<Star size={36} color="#F9A825" strokeWidth={2.5}/>} 
                    />

                    <MetricCard 
                        title="TOTAL DE ENCUESTAS"
                        value={metrics.totalEncuestas}
                        subtext="Encuestas Realizadas"
                        icon={<FileText size={36} color="#2A655F" strokeWidth={2.5}/>} 
                    />
              </div>
            
              {/* Columna Derecha: EL GRÁFICO */}
              <div className="chart-container-wrapper">
                    <div className="chart-area">
                        {metrics.isLoading ? (
                            <p className="loading-state">Cargando datos del gráfico...</p>
                        ) : metrics.error ? (
                            <p className="error-state">Error al cargar la gráfica: {metrics.error}</p>
                        ) : metrics.data && metrics.data.length > 0 ? (
                            <div className="chart-wrapper">
                                <div style={{ height: '400px' }}>
                                    <canvas ref={chartRef} id="satisfactionChart"></canvas>
                                </div>
                            </div>
                        ) : (
                            <p className="no-data-state">No hay datos de encuestas para mostrar el gráfico.</p>
                        )}
                    </div>
              </div>
            </div>
          ) : (
                // Si la ruta NO es /dashboard (ej: /dashboard/analisis), no mostramos el contenido.
                // React Router se encarga de mostrar el componente de la página secundaria (AnalisisPage, EncuestasPage, etc.).
                null
            )}
          
        </main>
      </div>
    );
  };
  
  export default Dashboard;