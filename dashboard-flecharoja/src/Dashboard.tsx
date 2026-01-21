"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "./Dashboard.css"
import { Star, FileText, CheckCircle, XCircle, Lightbulb } from "lucide-react"
import Chart from "chart.js/auto"
import "chartjs-plugin-annotation"
import type { AnnotationOptions } from "chartjs-plugin-annotation"

// =======================================================
// CONFIGURACIÓN DE RUTAS Y CONSTANTES (CORREGIDA)
// =======================================================
const navItems = ["ENCUESTAS", "ANÁLISIS", "RESULTADOS", "RESUMEN", "PERIODOS"]

// 2. Definimos la ruta para el nuevo botón
const tabRoutes: { [key: string]: string } = {
  ENCUESTAS: "/dashboard/encuestas",
  ANÁLISIS: "/dashboard/analisis",
  RESULTADOS: "/dashboard/resultados",
  RESUMEN: "/dashboard/resumen",
  PERIODOS: "/dashboard/periodos", // Esto direccionará a tu nueva página
}

const API_METRICS_URL = "https://flecha-roja-satisfaccion.onrender.com/api/metrics"

// =======================================================
// TIPOS DE DATOS
// =======================================================
interface Survey {
  claveEncuestador: string
  fecha: string
  califExperienciaCompra: string
  califServicioConductor: string
  califComodidad: string
  califLimpieza: string
  califSeguridad: string
  validado?: string
  comentExperienciaCompra?: string
  comentServicioConductor?: string
  comentComodidad?: string
  comentLimpieza?: string
  especifSeguridad?: string
}

interface MetricsState {
  totalEncuestas: number
  globalAverage: number
  overallSatisfiedPercentage: number
  isOverallSatisfied: boolean
  encuestasValidadas: number
  encuestasInvalidadas: number
  isLoading: boolean
  error: string | null
  data: Survey[] | null
}

const DEFAULT_WEIGHTS: { [key: string]: number } = {
  "Muy Buena": 3,
  Buena: 2,
  Regular: 1,
  Mala: 0,
  "Muy Mala": 0,
}

const RATING_FIELDS: (keyof Survey)[] = [
  "califExperienciaCompra",
  "califServicioConductor",
  "califComodidad",
  "califLimpieza",
  "califSeguridad",
]

// =======================================================
// LÓGICA DE CÁLCULO DE DATOS
// =======================================================
const chartLabels: { [key: string]: string } = {
  califExperienciaCompra: "Experiencia de Compra",
  califServicioConductor: "Servicio del Conductor",
  califComodidad: "Comodidad",
  califLimpieza: "Limpieza",
  califSeguridad: "Seguridad",
}

const ratingToScore = (ratingText: string): number => {
  const lowerCaseText = String(ratingText).toLowerCase().trim()
  switch (lowerCaseText) {
    case "muy buena":
      return 10
    case "buena":
      return 8
    case "regular":
      return 5
    case "mala":
      return 3
    case "muy mala":
      return 1
    default:
      return 0
  }
}

const processDataForMetrics = (surveyData: Survey[]): { globalAverage: number; averages: number[] } => {
  const fieldScores: { [key: string]: { sum: number; count: number } } = {}
  Object.keys(chartLabels).forEach((key) => (fieldScores[key] = { sum: 0, count: 0 }))

  surveyData.forEach((doc) => {
    Object.keys(fieldScores).forEach((field) => {
      const score = ratingToScore(doc[field as keyof Survey] as string)
      if (score > 0) {
        fieldScores[field].sum += score
        fieldScores[field].count += 1
      }
    })
  })

  const averages = Object.keys(fieldScores).map((field) => {
    const { sum, count } = fieldScores[field]
    return count > 0 ? Number.parseFloat((sum / count).toFixed(1)) : 0
  })

  const totalSumOfAverages = averages.reduce((sum, avg) => sum + avg, 0)
  const globalAverage = averages.length > 0 ? Number.parseFloat((totalSumOfAverages / averages.length).toFixed(2)) : 0

  return { globalAverage, averages }
}

const generateInsights = (surveyData: Survey[]): string[] => {
  if (!surveyData || surveyData.length === 0) return []

  const insights: string[] = []
  const { averages } = processDataForMetrics(surveyData)
  const fieldKeys = Object.keys(chartLabels)

  // Insight 1: Área con mejor calificación
  const maxAverage = Math.max(...averages)
  const maxIndex = averages.indexOf(maxAverage)
  if (maxAverage > 0) {
    const bestArea = Object.values(chartLabels)[maxIndex]
    insights.push(`El área de "${bestArea}" tiene la mejor calificación con ${maxAverage.toFixed(1)}/10 puntos.`)
  }

  // Insight 2: Área que necesita mejora
  const minAverage = Math.min(...averages.filter((a) => a > 0))
  const minIndex = averages.indexOf(minAverage)
  if (minAverage > 0 && minAverage < 7) {
    const worstArea = Object.values(chartLabels)[minIndex]
    insights.push(`El área de "${worstArea}" requiere atención con ${minAverage.toFixed(1)}/10 puntos.`)
  }

  // Insight 3: Análisis de comentarios frecuentes
  const allComments = surveyData
    .flatMap((s) => [
      s.comentExperienciaCompra || "",
      s.comentServicioConductor || "",
      s.comentComodidad || "",
      s.comentLimpieza || "",
      s.especifSeguridad || "",
    ])
    .filter((c) => c.length > 0)

  const commonWords = ["tiempo", "espera", "atención", "limpieza", "conductor", "puntualidad", "comodidad"]
  const wordCounts: { [key: string]: number } = {}

  allComments.forEach((comment) => {
    const lowerComment = comment.toLowerCase()
    commonWords.forEach((word) => {
      if (lowerComment.includes(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1
      }
    })
  })

  const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1])
  if (sortedWords.length > 0 && sortedWords[0][1] > 2) {
    insights.push(
      `Los clientes mencionan con frecuencia "${sortedWords[0][0]}" como tema recurrente en sus comentarios.`,
    )
  }

  // Insight 4: Nivel general de satisfacción
  const { globalAverage } = processDataForMetrics(surveyData)
  if (globalAverage >= 8.5) {
    insights.push(
      `¡Excelente desempeño! La satisfacción global alcanza ${globalAverage.toFixed(2)}/10, superando el nivel de excelencia.`,
    )
  } else if (globalAverage >= 7) {
    insights.push(
      `La satisfacción global es de ${globalAverage.toFixed(2)}/10, dentro del rango aceptable pero con oportunidades de mejora.`,
    )
  } else {
    insights.push(`La satisfacción global de ${globalAverage.toFixed(2)}/10 requiere acciones inmediatas de mejora.`)
  }

  return insights.slice(0, 3) // Retornar máximo 3 insights
}

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  // =======================================================
  // ESTADO Y HOOKS DE NAVEGACIÓN
  // =======================================================
  const [metrics, setMetrics] = useState<MetricsState>({
    totalEncuestas: 0,
    globalAverage: 0,
    overallSatisfiedPercentage: 0,
    isOverallSatisfied: false,
    encuestasValidadas: 0,
    encuestasInvalidadas: 0,
    isLoading: true,
    error: null,
    data: null,
  })

  const navigate = useNavigate()
  const location = useLocation()
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  const isMainDashboardRoute = location.pathname === "/dashboard"

  // =======================================================
  // EFECTO DE FETCHING DE DATOS
  // =======================================================
  useEffect(() => {
    const fetchMetrics = async () => {
      const token = localStorage.getItem("auth-token")
      if (!token) {
        setMetrics((prev) => ({ ...prev, isLoading: false, error: "No autenticado." }))
        return
      }

      setMetrics((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const response = await fetch(API_METRICS_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Error ${response.status}: No se pudieron obtener los datos.`)
        }

        const surveyData: Survey[] = await response.json()

        // Solo mantener como invalidadas las que explícitamente están marcadas como ELIMINADO
        const processedSurveyData = surveyData.map((survey) => ({
          ...survey,
          validado:
            survey.validado === "ELIMINADO" || survey.validado === "ELIMINADO_Y_BORRAR" ? survey.validado : "VALIDADO",
        }))

        const validadasData = processedSurveyData.filter((s) => s.validado === "VALIDADO")
        const validadas = validadasData.length
        const invalidadas = processedSurveyData.filter(
          (s) => s.validado === "ELIMINADO" || s.validado === "ELIMINADO_Y_BORRAR",
        ).length

        const { globalAverage } = processDataForMetrics(validadasData)

        // Cálculo de Satisfacción Ponderada (Lógica de Resumen.tsx)
        const weights = DEFAULT_WEIGHTS
        const maxWeight = Math.max(...Object.values(weights))
        let totalWeightedScoreAll = 0
        let totalResponsesAll = 0

        validadasData.forEach((survey) => {
          RATING_FIELDS.forEach((field) => {
            const calif = survey[field] as string
            if (calif && weights[calif] !== undefined) {
              totalWeightedScoreAll += weights[calif]
              totalResponsesAll += 1
            }
          })
        })

        const maxPossibleScoreAll = totalResponsesAll * maxWeight
        const overallSatisfiedPercentage = maxPossibleScoreAll > 0 ? (totalWeightedScoreAll / maxPossibleScoreAll) * 100 : 0

        setMetrics((prevMetrics) => ({
          ...prevMetrics,
          totalEncuestas: validadas,
          data: processedSurveyData,
          globalAverage: globalAverage,
          overallSatisfiedPercentage: overallSatisfiedPercentage,
          isOverallSatisfied: overallSatisfiedPercentage >= 80,
          encuestasValidadas: validadas,
          encuestasInvalidadas: invalidadas,
          isLoading: false,
          error: null,
        }))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido al cargar."
        console.error("Error al cargar datos:", errorMessage)
        setMetrics((prevMetrics) => ({
          ...prevMetrics,
          isLoading: false,
          error: errorMessage,
        }))
      }
    }

    if (isMainDashboardRoute) {
      fetchMetrics()
      const intervalId = setInterval(fetchMetrics, 30000)
      return () => clearInterval(intervalId)
    }
  }, [isMainDashboardRoute])

  // =======================================================
  // EFECTO DE DIBUJO DEL GRÁFICO
  // =======================================================
  useEffect(() => {
    if (!isMainDashboardRoute) {
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }
      return
    }

    if (!metrics.data || metrics.isLoading || metrics.error || !chartRef.current) return

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    if (metrics.data.length === 0) return

    const { averages } = processDataForMetrics(metrics.data)
    const ctx = chartRef.current.getContext("2d")

    const backgroundColors = averages.map((avg) => {
      const baseColor = "#2A655F"
      if (avg >= 8.5) return baseColor
      if (avg >= 7) return "#245952"
      if (avg >= 5) return "#1E4D47"
      return "#173E38"
    })

    const annotations: { [key: string]: AnnotationOptions } = {
      satisfactionLine: {
        type: "line",
        yMin: 8.5,
        yMax: 8.5,
        borderColor: "#2a655f",
        borderWidth: 2,
        borderDash: [6, 6],
        label: {
          content: "Nivel de Excelencia (>=8.5)",
          display: true,
          position: "end",
          color: "#2a655f",
          font: { weight: "bold" },
        },
      },
      alertLine: {
        type: "line",
        yMin: 7,
        yMax: 7,
        borderColor: "#E74C3C",
        borderWidth: 2,
        borderDash: [6, 6],
        label: {
          content: "Advertencia (<7.0)",
          display: true,
          position: "end",
          color: "#E74C3C",
          font: { weight: "bold" },
        },
      },
    }

    chartInstance.current = new Chart(ctx!, {
      type: "bar",
      data: {
        labels: Object.values(chartLabels),
        datasets: [
          {
            label: "Puntaje Promedio",
            data: averages,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map((color) => color + "AA"),
            borderWidth: 1,
            borderRadius: 4,
            hoverBackgroundColor: backgroundColors.map((color) => color + "B0"),
            hoverBorderColor: backgroundColors.map((color) => color + "FF"),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: "easeOutQuart" },
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            ticks: { stepSize: 1, color: "#666" },
            title: { display: true, text: "Puntaje Promedio (1-10)", color: "#444" },
            grid: { color: "#EBEBEB", drawBorder: false },
          },
          x: { ticks: { color: "#444" }, grid: { display: false } },
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Índice de Satisfacción por Área (Promedio General)",
            font: { size: 16, weight: "bold" },
            color: "#2A655F",
          },
          tooltip: {
            callbacks: {
              title: (context) => context[0].label,
              label: (context) => `Puntaje: ${context.formattedValue} / 10`,
              afterLabel: (context) => {
                const score = context.parsed.y
                if (score === null || score === undefined) return ""
                if (score >= 8.5) return "Estado: EXCELENCIA (Alto)"
                if (score >= 7) return "Estado: ALERTA (Mejora Requerida)"
                return "Estado: CRÍTICO (Bajo)"
              },
            },
          },
          annotation: { annotations: annotations } as any,
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [metrics.data, metrics.isLoading, metrics.error, isMainDashboardRoute])

  // =======================================================
  // LÓGICA DE NAVEGACIÓN Y RENDERIZADO
  // =======================================================
  const handleTabClick = (tab: string) => {
    const route = tabRoutes[tab]
    if (route) {
      navigate(route)
    }
  }

  const MetricCard: React.FC<{ title: string; value: string | number; subtext: string; icon: React.ReactNode }> = ({
    title,
    value,
    subtext,
    icon,
  }) => {
    const displayValue = metrics.isLoading ? "..." : metrics.error ? "ERROR" : value

    const isGlobalMetric = title.includes("SATISFACCIÓN")
    let valueClass = ""
    if (isGlobalMetric && typeof value === "number") {
      if (value >= 8.5) valueClass = "high-score"
      else if (value >= 7) valueClass = "medium-score"
      else valueClass = "low-score"
    }

    return (
      <div className="metric-card sidebar-card">
        <div className="card-header-band">{title}</div>

        <div className="card-content-body">
          {icon}
          <div className="metric-display-area" style={{ textAlign: "center" }}>
            <p
              className={`metric-value ${metrics.isLoading ? "loading-state" : metrics.error ? "error-state-red" : valueClass}`}
            >
              {displayValue}
            </p>
            {title.includes("SATISFACCIÓN GLOBAL") && !metrics.isLoading && !metrics.error && (
              <div className={`resumen-status-badge ${metrics.isOverallSatisfied ? "satisfied" : "unsatisfied"}`} style={{ fontSize: "0.8rem", padding: "4px 8px", marginTop: "5px" }}>
                {metrics.isOverallSatisfied ? "✓ SATISFECHO" : "✗ INSATISFECHO"}
              </div>
            )}
          </div>
          <p className="metric-subtext">{subtext}</p>
        </div>
      </div>
    )
  }

  const InsightsCard: React.FC = () => {
    const insights = metrics.data ? generateInsights(metrics.data) : []

    if (metrics.isLoading || metrics.error || insights.length === 0) {
      return null
    }

    return (
      <div className="insights-card">
        <div className="insights-header">
          <Lightbulb size={24} color="#2A655F" strokeWidth={2.5} />
          <h3 className="insights-title">Análisis Inteligente</h3>
        </div>
        <div className="insights-content">
          {insights.map((insight, index) => (
            <div key={index} className="insight-item">
              <span className="insight-bullet">•</span>
              <p className="insight-text">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // =======================================================
  // RENDERIZADO DEL DASHBOARD
  // =======================================================

  return (
    <div className="dashboard-container">
      {/* HEADER FIJO */}
      <header className="dashboard-header">
        <div className="header-top-bar">
          <div className="header-logo-container">
            <img src="/logo_flecha_roja.png" alt="Logo Flecha Roja" className="header-logo" />
          </div>

          <h1 className="header-title-main">SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA</h1>

          <button onClick={onLogout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>

        <nav className="nav-bar">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => handleTabClick(item)}
              className={`nav-button ${location.pathname === tabRoutes[item] ? "active" : ""}`}
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

        {isMainDashboardRoute ? (
          <div className="main-layout-grid-extended">
            <div className="sidebar-metrics">
              <MetricCard
                title="SATISFACCIÓN GLOBAL"
                value={`${metrics.overallSatisfiedPercentage.toFixed(1)}%`}
                subtext="Porcentaje Ponderado de Satisfacción"
                icon={<Star size={40} color="#F9A825" strokeWidth={2.5} />}
              />

              <MetricCard
                title="TOTAL DE ENCUESTAS"
                value={metrics.totalEncuestas}
                subtext="Encuestas Realizadas"
                icon={<FileText size={40} color="#2A655F" strokeWidth={2.5} />}
              />

              <MetricCard
                title="ENCUESTAS VALIDADAS"
                value={metrics.encuestasValidadas}
                subtext="Encuestas Aprobadas"
                icon={<CheckCircle size={40} color="#27AE60" strokeWidth={2.5} />}
              />

              <MetricCard
                title="ENCUESTAS INVALIDADAS"
                value={metrics.encuestasInvalidadas}
                subtext="Encuestas Rechazadas"
                icon={<XCircle size={40} color="#E74C3C" strokeWidth={2.5} />}
              />
            </div>

            <div className="chart-and-insights-container">
              <div className="chart-container-wrapper">
                <div className="chart-area">
                  {metrics.isLoading ? (
                    <p className="loading-state">Cargando datos del gráfico...</p>
                  ) : metrics.error ? (
                    <p className="error-state">Error al cargar la gráfica: {metrics.error}</p>
                  ) : metrics.data && metrics.data.length > 0 ? (
                    <div className="chart-wrapper">
                      <div style={{ height: "280px" }}>
                        <canvas ref={chartRef} id="satisfactionChart"></canvas>
                      </div>
                    </div>
                  ) : (
                    <p className="no-data-state">No hay datos de encuestas para mostrar el gráfico.</p>
                  )}
                </div>
              </div>

              <InsightsCard />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default Dashboard
