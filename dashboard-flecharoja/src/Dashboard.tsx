import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css'; 
import { BarChart2 } from "lucide-react"; 
import Chart from 'chart.js/auto'; 

// ... (Las interfaces, constantes y funciones ratingToScore/processDataForChart se mantienen igual) ...

const API_METRICS_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/metrics';
const navItems = ['ENCUESTAS', 'ANÁLISIS', 'RESULTADOS', 'RESUMEN'];

interface Survey {
    claveEncuestador: string;
    fecha: string;
    califExperienciaCompra: string;
    califServicioConductor: string;
    califComodidad: string;
    califLimpieza: string;
    califSeguridad: string;
}

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    const [metrics, setMetrics] = useState({
      totalEncuestas: 0, 
      isLoading: true,
      error: null as string | null,
      data: null as Survey[] | null,
      activeTab: 'ENCUESTAS',
    });
    
    const chartLabels: { [key: string]: string } = {
        'califExperienciaCompra': 'Experiencia de Compra',
        'califServicioConductor': 'Servicio del Conductor',
        'califComodidad': 'Comodidad',
        'califLimpieza': 'Limpieza',
        'califSeguridad': 'Seguridad'
    };
    
    // ... (Mantén las funciones ratingToScore, processDataForChart, y los useEffects de carga de datos y dibujo de gráfico) ...

    /** Convierte la calificación de texto a un valor numérico (1-10) */
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

    /** Procesa los datos y calcula el promedio de cada categoría (1-10) */
    const processDataForChart = (surveyData: Survey[]): number[] => {
        const fieldScores: { [key: string]: { sum: number, count: number } } = {};
        Object.keys(chartLabels).forEach(key => fieldScores[key] = { sum: 0, count: 0 });
        
        surveyData.forEach(doc => {
            Object.keys(fieldScores).forEach(field => {
                // TypeScript requiere un casting para acceder a propiedades dinámicas
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

        return averages;
    };
    
    // Lógica de carga de datos
    useEffect(() => {
        const fetchMetrics = async () => {
            const token = localStorage.getItem('auth-token');
            if (!token) {
                setMetrics(prev => ({ ...prev, isLoading: false, error: 'No autenticado.' }));
                return;
            }

            setMetrics(prev => ({ ...prev, isLoading: true, error: null }));
    
            try {
                // Llama a la ruta /api/metrics que ahora devuelve el array de encuestas
                const response = await fetch(API_METRICS_URL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: No se pudieron obtener los datos de la encuesta.`);
                }

                // El backend ahora devuelve un array directo
                const surveyData: Survey[] = await response.json(); 
                
                setMetrics(prevMetrics => ({
                    ...prevMetrics,
                    totalEncuestas: surveyData.length,
                    data: surveyData,
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
        
        fetchMetrics();
        const intervalId = setInterval(fetchMetrics, 30000); 
        return () => clearInterval(intervalId);
    }, []);


    // Lógica de dibujo del gráfico (Se ejecuta cuando cambian los datos)
    useEffect(() => {
        if (!metrics.data || metrics.isLoading || metrics.error || !chartRef.current) return;

        // 1. Destruir la instancia anterior (para evitar superposiciones)
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }
        
        if (metrics.data.length === 0) return;
        
        // 2. Procesar y obtener los promedios
        const averages = processDataForChart(metrics.data);
        const ctx = chartRef.current.getContext('2d');
        
        // 3. Colores basados en el rendimiento (Verde >= 8, Amarillo >= 5, Rojo < 5)
        const backgroundColors = averages.map(avg => {
            // El color principal del diseño es #2A655F (verde oscuro)
            // Usaremos un tono Aqua para las barras, como en la imagen
            return '#56C5B6'; 
        });
        
        // 4. Crear la nueva instancia del gráfico
        chartInstance.current = new Chart(ctx!, { 
            type: 'bar',
            data: {
                labels: Object.values(chartLabels),
                datasets: [{
                    label: 'Puntaje Promedio (Escala 1-10)',
                    data: averages,
                    backgroundColor: backgroundColors,
                    borderColor: '#2A655F', // Borde verde oscuro
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        title: { display: false }, // Ocultar título y hacerlo más limpio
                        grid: { color: '#E0E0E0' } // Líneas de grid más suaves
                    },
                    x: {
                        title: { display: false },
                        grid: { display: false } // Ocultar líneas de grid horizontales
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Comparación de Puntaje Promedio por Categoría',
                        font: { size: 16, weight: 'bold' },
                        color: '#2A655F' // Color del título
                    }
                }
            }
        });
        
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };

    }, [metrics.data, metrics.isLoading, metrics.error]);

    const handleTabClick = (tab: string) => {
        if (tab === 'ENCUESTAS') {
            window.open('/encuestas', '_blank');
        } else {
            setMetrics(prevMetrics => ({ ...prevMetrics, activeTab: tab }));
        }
    };
  
    // Componente de la tarjeta de métrica (Ajustado para el nuevo diseño)
    const MetricCard: React.FC<{ title: string; value: string | number; subtext: string }> = ({ title, value, subtext }) => {
        const displayValue = metrics.isLoading ? '...' : 
                             metrics.error ? 'ERROR' : 
                             value; 

        return (
            <div className="metric-card sidebar-card">
                {/* Título de la tarjeta en una banda superior */}
                <div className="card-header-band">
                    {title}
                </div>
                
                {/* Contenido principal: Número y Subtexto */}
                <div className="card-content-body">
                    <p className={`metric-value ${metrics.isLoading ? 'loading-state' : metrics.error ? 'error-state-red' : ''}`}>
                        {displayValue}
                    </p>
                    <p className="metric-subtext">{subtext}</p>
                </div>
            </div>
        );
    };
  
    return (
      <div className="dashboard-container">
        
        <header className="dashboard-header">
          <div className="header-top-bar">
            {/* Se centra el logo y el título arriba */}
            <div className="header-logo-container">
              {/* Nota: Usar el logo que tienes en tu proyecto */}
              <img 
                  src="/logo_flecha_roja.png" 
                  alt="Logo Flecha Roja" 
                  className="header-logo"
              />
            </div>
            
            <h1 className="header-title-main">
                SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA
            </h1>
            
            <button onClick={onLogout} className="btn-logout">Cerrar Sesión</button>
          </div>
  
          {/* La barra de navegación se mantiene pero el estilo cambia en CSS */}
          <nav className="nav-bar">
            {navItems.map(item => (
              <button
                key={item}
                onClick={() => handleTabClick(item)}
                className={`nav-button ${metrics.activeTab === item ? 'active' : ''}`}
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
  
          {/* NUEVO: Contenedor de dos columnas para la tarjeta y la gráfica */}
          <div className="main-layout-grid">
            
            {/* Columna Izquierda: Tarjeta de Métrica */}
            <div className="sidebar-metrics">
                <MetricCard 
                    title="TOTAL DE ENCUESTAS"
                    value={metrics.totalEncuestas}
                    subtext="Encuestas Realizadas"
                />
            </div>
            
            {/* Columna Derecha: Gráfica */}
            <div className="chart-container-wrapper">
                <div className="chart-area">
                    {metrics.isLoading ? (
                        <p className="loading-state">Cargando datos del gráfico...</p>
                    ) : metrics.error ? (
                        <p className="error-state">Error al cargar la gráfica: {metrics.error}</p>
                    ) : metrics.data && metrics.data.length > 0 ? (
                        <div className="chart-wrapper">
                            <canvas ref={chartRef} id="satisfactionChart"></canvas>
                        </div>
                    ) : (
                        <p className="no-data-state">No hay datos de encuestas para mostrar el gráfico.</p>
                    )}
                </div>
            </div>
          </div>
          
        </main>
      </div>
    );
  };
  
  export default Dashboard;
