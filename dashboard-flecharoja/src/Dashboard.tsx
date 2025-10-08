import React, { useState, useEffect } from 'react';
import './Dashboard.css'; 

const navItems = ['ENCUESTAS', 'ANÁLISIS', 'RESULTADOS', 'RESUMEN'];

const Dashboard = ({ onLogout }) => {
  const [metrics, setMetrics] = useState({
    totalEncuestas: 0, 
    satisfaccionPromedio: 'N/A',
    resultadoGeneral: 'Cargando...',
    activeTab: 'ENCUESTAS',
    isLoading: true,
    error: null,
  });
  
  useEffect(() => {
    const API_METRICS_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/metrics';
    
    const fetchMetrics = async () => {
      const token = localStorage.getItem('auth-token');
      if (!token) return;

      try {
        const response = await fetch(API_METRICS_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
        });

        if (!response.ok) {
          throw new Error('No se pudieron obtener las métricas del servidor.');
        }

        const data = await response.json();

        setMetrics(prevMetrics => ({
          ...prevMetrics,
          totalEncuestas: data.totalEncuestas,
          satisfaccionPromedio: data.satisfaccionPromedio,
          resultadoGeneral: data.resultadoGeneral,
          isLoading: false,
          error: null,
        }));

      } catch (err) {
        console.error("Error al cargar métricas:", err);
        setMetrics(prevMetrics => ({
            ...prevMetrics,
            isLoading: false,
            error: 'Error al cargar los datos.',
            totalEncuestas: 'Error',
            satisfaccionPromedio: 'Error',
            resultadoGeneral: 'Error',
        }));
      }
    };
    
    fetchMetrics();
    
  }, []);

  const handleTabClick = (tab) => {
    if (tab === 'ENCUESTAS') {
        window.open('/encuestas', '_blank');
    } else {
        setMetrics(prevMetrics => ({ ...prevMetrics, activeTab: tab }));
    }
  };


  const MetricCard = ({ title, value, subtext }) => (
    <div className="metric-card">
      <h3 className="metric-title">{title}</h3>
      <div className="metric-content">
        {metrics.isLoading ? (
            <p className="metric-value loading-state">...</p>
        ) : metrics.error ? (
            <p className="metric-value error-state">ERROR</p>
        ) : (
            <p className="metric-value">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        )}
        
        <p className="metric-subtext">{subtext}</p>
      </div>
    </div>
  );

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
              style={item === 'ENCUESTAS' ? {fontWeight: 'bold'} : {}}
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
            subtext="Encuestas Realizadas"
          />
          
          <MetricCard 
            title="SATISFACCIÓN PROMEDIO"
            value={metrics.satisfaccionPromedio}
            subtext="Sobre las encuestas para determinar la Satisfacción Promedio"
          />

          <MetricCard 
            title="RESULTADO GENERAL"
            value={metrics.resultadoGeneral}
            subtext="Respuesta más común de la pregunta 1"
          />
        </div>
        
      </main>
    </div>
  );
};

export default Dashboard;