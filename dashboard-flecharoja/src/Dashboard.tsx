import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css'; 
import { BarChart2 } from "lucide-react"; 
// 1. Importamos Chart.js directamente
import Chart from 'chart.js/auto'; 

// La ruta corregida que ahora devuelve TODOS los datos crudos
const API_METRICS_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/metrics';
const navItems = ['ENCUESTAS', 'ANÁLISIS', 'RESULTADOS', 'RESUMEN'];

interface Survey {
    claveEncuestador: string;
    fecha: string;
    // Campos de calificación para el gráfico
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
    
    // Mapeo de campos y etiquetas para el gráfico
    const chartLabels: { [key: string]: string } = {
        'califExperienciaCompra': 'Experiencia de Compra',
        'califServicioConductor': 'Servicio del Conductor',
        'califComodidad': 'Comodidad',
        'califLimpieza': 'Limpieza',
        'califSeguridad': 'Seguridad'
    };

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
            if (avg >= 8.0) return 'rgba(75, 192, 192, 0.8)'; 
            if (avg >= 5.0) return 'rgba(255, 206, 86, 0.8)'; 
            return 'rgba(255, 99, 132, 0.8)'; 
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
                    borderColor: backgroundColors.map(c => c.replace('0.8', '1')),
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
                        title: {
                            display: true,
                            text: 'Puntaje Promedio'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Categoría de Servicio'
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Comparación de Puntaje Promedio por Categoría',
                        font: { size: 16 }
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
  
    const MetricCard: React.FC<{ title: string; value: string | number; subtext: string }> = ({ title, value, subtext }) => {
        const iconToRender = BarChart2;
        const colorClass = title === 'TOTAL DE ENCUESTAS' ? 'metric-color-red' : 'metric-color-default'; 
        
        const displayValue = metrics.isLoading ? '...' : 
                             metrics.error ? 'ERROR' : 
                             value; 

        return (
            <div className="metric-card">
                <div className="metric-header">
                    <h3 className="metric-title">{title}</h3>
                    <div className={`metric-icon-container ${colorClass}`}>
                        {metrics.isLoading ? null : (
                            React.createElement(iconToRender, { className: "metric-icon" })
                        )}
                    </div>
                </div>
                
                <div className="metric-content">
                    <div className="metric-value-wrapper">
                        <p className={`metric-value ${colorClass} ${metrics.isLoading ? 'loading-state' : metrics.error ? 'error-state' : ''}`}>
                            {displayValue}
                        </p>
                    </div>
                    <p className="metric-subtext">{subtext}</p>
                </div>
            </div>
        );
    };
  
    return (
      <div className="dashboard-container">
        
        <header className="dashboard-header">
          <div className="header-top-bar">
            <div className="header-logo-container">
              <img 
                  src="/logo_flecha_roja.png" 
                  alt="Logo Flecha Roja" 
                  className="header-logo"
              />
            </div>
            <h1 className="header-title">
                SISTEMA DE SATISFACCION DEL CLIENTE FLECHA ROJA
            </h1>
            <button onClick={onLogout} className="btn-logout">Cerrar Sesión</button>
          </div>
  
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
              <h2 className="welcome-title">
                  Panel de Control
              </h2>
              <p className="welcome-subtitle">
                  Bienvenido al sistema de Satisfacción del Cliente Flecha Roja
              </p>
          </div>
  
          <div className="metrics-grid">
            
            <MetricCard 
              title="TOTAL DE ENCUESTAS"
              value={metrics.totalEncuestas}
              subtext="Encuestas Realizadas en Total"
            />
          </div>

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
          
        </main>
      </div>
    );
  };
  
  export default Dashboard;