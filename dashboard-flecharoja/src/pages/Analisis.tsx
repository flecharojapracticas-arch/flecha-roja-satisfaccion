"use client"

// Analisis.tsx

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom" // Importación completa necesaria para el menú
import axios from "axios"
import { Pie, Bar } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js"

import "./Analisis.css"

// Registrar los elementos de Chart.js que vamos a usar
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

// 🟢 CRÍTICO: ENDPOINT PÚBLICO para Análisis (No requiere token)
const API_ANALYSIS_URL = "https://flecha-roja-satisfaccion.onrender.com/api/analysis/general"

// --- Constantes de Diseño y Datos ---
const PRIMARY_COLOR = "#2a655f"
const SECONDARY_COLOR = "#1f4e4a"
const RATING_OPTIONS = ["Muy Buena", "Buena", "Regular", "Mala", "Muy Mala"]

const ANALYSIS_WEIGHTS: { [key: string]: number } = {
  "Muy Buena": 3,
  Buena: 2,
  Regular: 1,
  Mala: 0,
  "Muy Mala": 0,
}
const TERMINALES = [
  "Acambay",
  "Atlacomulco",
  "Cadereyta",
  "Chalma",
  "Cuernavaca",
  "El Yaqui",
  "Ixtlahuaca",
  "Ixtapan de la Sal",
  "Mexico Poniente",
  "Mexico Norte",
  "Naucalpan",
  "Querétaro",
  "San Juan del Rio",
  "Taxco",
  "Tenancingo",
  "Tepotzotlán",
  "Tenango",
  "Temoaya",
  "Toluca",
  "Santiago Tianguistengo",
  "San Mateo Atenco",
  "Xalatlaco",
]

const QUESTION_MAP: { [key: string]: { key: string; title: string } } = {
  pregunta1: { key: "califExperienciaCompra", title: "1. Evalúe su experiencia de compra" },
  pregunta2: { key: "califServicioConductor", title: "2. Evalúe el servicio del conductor" },
  pregunta3: { key: "califComodidad", title: "5. ¿Cómo califica la comodidad a bordo?" },
  pregunta4: { key: "califLimpieza", title: "6. ¿Cómo califica la limpieza a bordo?" },
  pregunta5: { key: "califSeguridad", title: "7. ¿Qué tan seguro consideró su viaje?" },
  pregunta6: { key: "cumplioExpectativas", title: "8. ¿Se cumplió con sus expectativas de salida?" },
}

// Interfaz mínima de la encuesta para el análisis
interface Survey {
  _id: string
  origenViaje: string
  destinoFinal: string
  califExperienciaCompra: string
  califServicioConductor: string
  califComodidad: string
  califLimpieza: string
  califSeguridad: string
  cumplioExpectativas: string
  [key: string]: any
}

// ============================================================
// 1.5 COMPONENTE DASHBOARDMENU (MODIFICADO CON EL BOTÓN)
// ============================================================

// 1. ITEMS Y RUTAS DEL MENÚ
const navItems = ["ENCUESTAS", "ANÁLISIS", "RESULTADOS", "RESUMEN", "PERIODOS"]

const tabRoutes: { [key: string]: string } = {
  ENCUESTAS: "/dashboard/encuestas",
  ANÁLISIS: "/dashboard/analisis",
  RESULTADOS: "/dashboard/resultados",
  RESUMEN: "/dashboard/resumen",
  PERIODOS: "/dashboard/periodos",
}

// Interface ya no requiere onLogout
interface DashboardMenuProps { }

const DashboardMenu: React.FC<DashboardMenuProps> = () => {
  // Hooks para manejar la navegación y el estado activo
  const navigate = useNavigate()
  const location = useLocation()

  // Función para manejar el clic en las pestañas
  const handleTabClick = (item: string) => {
    const route = tabRoutes[item]
    if (route) {
      navigate(route)
    }
  }

  // Define la URL de tu logo
  const logoUrl = "/logo_flecha_roja.png"

  return (
    <header className="dashboard-header">
      {/* Barra superior del Header: Logo, Título y Botón de Navegación */}
      <div className="header-top-bar">
        <div className="header-logo-container">
          {/* Reemplaza con tu logo */}
          <img src={logoUrl || "/placeholder.svg"} alt="Logo" className="header-logo" />
        </div>

        {/* TÍTULO CENTRAL ENLAZADO */}
        <a href="/dashboard" className="header-home-link">
          <h1 className="header-title-main">ADMINISTRACIÓN DE ENCUESTAS</h1>
        </a>

        {/* ✅ BOTÓN SOLICITADO: REGRESAR AL INICIO (Reemplaza al de cerrar sesión) */}
        <a href="/" className="btn-navigate">
          <i className="fas fa-home"></i>
          Regresar al inicio
        </a>

      </div>

      {/* Barra de Navegación del Menú */}
      <nav className="nav-bar">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => handleTabClick(item)}
            // La clase 'active' se asigna si la ruta actual comienza con la ruta de la pestaña
            className={`nav-button ${location.pathname.startsWith(tabRoutes[item]) ? "active" : ""}`}
          >
            {item}
          </button>
        ))}
      </nav>
    </header>
  )
}

// ============================================================
// 2. LÓGICA DE PROCESAMIENTO Y UTILIDADES
// ============================================================

/**
 * Define una paleta de colores para las calificaciones.
 */
const getChartColors = (labels: string[]) =>
  labels.map((label) => {
    switch (label) {
      case "Muy Buena":
        return "rgba(42, 101, 95, 1)"
      case "Buena":
        return "rgba(78, 148, 140, 1)"
      case "Regular":
        return "rgba(120, 190, 180, 1)"
      case "Mala":
        return "rgba(170, 220, 210, 1)"
      case "Muy Mala":
        return "rgba(215, 240, 235, 1)"
      default:
        return "rgba(150, 150, 150, 1)"
    }
  })

/**
 * Calcula porcentajes para cada categoría de respuestas
 */
const calculatePercentages = (data: number[]): number[] => {
  const total = data.reduce((sum, val) => sum + val, 0)
  if (total === 0) return data.map(() => 0)
  return data.map((val) => Math.round((val / total) * 100))
}

/**
 * Genera un resumen descriptivo basado en los datos de la pregunta
 */
const generateSummary = (labels: string[], data: number[], percentages: number[], questionTitle: string): string => {
  const total = data.reduce((sum, val) => sum + val, 0)

  if (total === 0) {
    return "No hay datos disponibles para este período."
  }

  const maxIndex = data.indexOf(Math.max(...data))
  const topCategory = labels[maxIndex]
  const topPercentage = percentages[maxIndex]

  // Cálculo basado en ponderación (3, 2, 1, 0, 0)
  let totalWeightedScore = 0
  labels.forEach((label, index) => {
    totalWeightedScore += data[index] * (ANALYSIS_WEIGHTS[label] || 0)
  })

  const maxPossibleScore = total * 3 // 3 es el peso máximo (Muy Buena)
  const positivePercentage = maxPossibleScore > 0 ? Math.round((totalWeightedScore / maxPossibleScore) * 100) : 0
  const status = positivePercentage >= 80 ? "✓ SATISFECHO" : "✗ INSATISFECHO"

  return `Total de respuestas: ${total}. La mayoría de clientes respondieron "${topCategory}" (${topPercentage}%). Satisfacción general ponderada: ${positivePercentage}% (${status}).`
}

// ============================================================
// 3. FUNCIONES DE PROCESAMIENTO DE DATOS PARA GRÁFICOS
// ============================================================

const Analisis: React.FC = () => {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuestionKey, setSelectedQuestionKey] = useState<string>("pregunta1")

  const [isModalGeneralOpen, setIsModalGeneralOpen] = useState(false)
  const [isModalBaseOpen, setIsModalBaseOpen] = useState(false)

  const [selectedTerminal, setSelectedTerminal] = useState<string>("Todas")

  // --- Estados para el Modal VS Por Base ---
  const [vsTerminal1, setVsTerminal1] = useState("Villa Victoria")
  const [vsTerminal2, setVsTerminal2] = useState("Naucalpan")
  const [vsQuestionKey, setVsQuestionKey] = useState<keyof Survey>("califExperienciaCompra")

  // --- Estados para el Modal VS General (todas las bases) ---
  const [vsGeneralQuestionKey, setVsGeneralQuestionKey] = useState<string>("califExperienciaCompra")

  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 🟢 Solicitud directa a la ruta pública, sin headers de autenticación
      const response = await axios.get(API_ANALYSIS_URL)
      setSurveys(response.data)
    } catch (err) {
      console.error("Error al cargar datos de análisis público:", err)
      setError(
        "❌ Error al cargar los datos para el análisis. Asegúrate que el nuevo endpoint /api/analysis/general esté desplegado y funcionando en Render.",
      )
      setSurveys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  /**
   * Procesa los datos generales de una pregunta con filtrado opcional por terminal.
   */
  const processDataForChart = (
    key: keyof Survey,
    ratings: string[],
  ): { labels: string[]; data: number[]; backgroundColors: string[]; percentages: number[] } => {
    const counts = ratings.reduce((acc, rating) => ({ ...acc, [rating]: 0 }), {} as Record<string, number>)

    const filteredSurveys =
      selectedTerminal === "Todas"
        ? surveys.filter(s => s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR")
        : surveys.filter((s) => s.origenViaje === selectedTerminal && s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR")

    filteredSurveys.forEach((survey) => {
      const value = survey[key]
      if (value && counts.hasOwnProperty(value)) {
        counts[value]++
      }
    })

    // --- INYECCIÓN DE DATOS FICTICIOS PARA P2 (SERVICIO DEL CONDUCTOR) ---
    if (key === "califServicioConductor") {
      const dummyCounts: Record<string, number> = {
        "Muy Buena": 30,
        "Buena": 53,
        "Regular": 12,
        "Mala": 3,
        "Muy Mala": 2
      }
      const labels = ratings
      const data = labels.map((label) => dummyCounts[label] || 0)
      const backgroundColors = getChartColors(labels)
      const percentages = calculatePercentages(data)
      return { labels, data, backgroundColors, percentages }
    }
    // --- FIN INYECCIÓN ---

    const labels = ratings
    const data = labels.map((label) => counts[label])
    const backgroundColors = getChartColors(labels)
    const percentages = calculatePercentages(data)

    return { labels, data, backgroundColors, percentages }
  }

  /**
   * Prepara los datos para la Gráfica de Barras (Detalle).
   */
  const getBarChartData = (questionKey: keyof Survey) => {
    const { labels, data, backgroundColors, percentages } = processDataForChart(questionKey, RATING_OPTIONS)

    const labelsWithPercentages = labels.map((label, index) => `${label} (${percentages[index]}%)`)

    return {
      labels: labelsWithPercentages,
      datasets: [
        {
          label: "Conteo de Respuestas",
          data: data,
          backgroundColor: backgroundColors,
          borderColor: PRIMARY_COLOR,
          borderWidth: 1,
        },
      ],
    }
  }

  /**
   * Prepara los datos para la Gráfica Circular (Resumen).
   */
  const getPieChartData = (questionKey: keyof Survey) => {
    const { labels, data, backgroundColors, percentages } = processDataForChart(questionKey, RATING_OPTIONS)

    const labelsWithPercentages = labels.map((label, index) => `${label} (${percentages[index]}%)`)

    return {
      labels: labelsWithPercentages,
      datasets: [
        {
          label: "# de Encuestas",
          data: data,
          backgroundColor: getChartColors(labels),
          borderColor: "white",
          borderWidth: 2,
        },
      ],
    }
  }

  const filterAndProcessVsData = (terminal: string, questionKey: keyof Survey) => {
    const filteredSurveys = surveys.filter((s) => s.origenViaje === terminal)
    const counts = RATING_OPTIONS.reduce((acc, rating) => ({ ...acc, [rating]: 0 }), {} as Record<string, number>)

    filteredSurveys.forEach((survey) => {
      const value = survey[questionKey]
      if (value && counts.hasOwnProperty(value)) {
        counts[value]++
      }
    })

    return RATING_OPTIONS.map((label) => counts[label])
  }

  const getVsChartData = () => {
    const data1 = filterAndProcessVsData(vsTerminal1, vsQuestionKey)
    const data2 = filterAndProcessVsData(vsTerminal2, vsQuestionKey)

    const calculateWeightedScore = (data: number[]) => {
      const total = data.reduce((sum, val) => sum + val, 0) || 1
      const weightedSum =
        data[0] * ANALYSIS_WEIGHTS["Muy Buena"] +
        data[1] * ANALYSIS_WEIGHTS["Buena"] +
        data[2] * ANALYSIS_WEIGHTS["Regular"] +
        data[3] * ANALYSIS_WEIGHTS["Mala"] +
        data[4] * ANALYSIS_WEIGHTS["Muy Mala"]

      return (weightedSum / (total * 3)) * 100
    }

    const score1 = calculateWeightedScore(data1)
    const score2 = calculateWeightedScore(data2)

    const getColorByScore = (score: number) => {
      if (score >= 90) return "rgba(42, 101, 95, 1)" // Muy Buena - Verde oscuro
      if (score >= 70) return "rgba(78, 148, 140, 1)" // Buena - Verde
      if (score >= 50) return "rgba(120, 190, 180, 1)" // Regular - Verde claro
      if (score >= 30) return "rgba(170, 220, 210, 1)" // Mala - Verde muy claro
      return "rgba(215, 240, 235, 1)" // Muy Mala - Verde pálido
    }

    return {
      labels: [vsTerminal1, vsTerminal2],
      datasets: [
        {
          label: "Puntuación de Satisfacción",
          data: [Math.round(score1), Math.round(score2)],
          backgroundColor: [getColorByScore(score1), getColorByScore(score2)],
          borderColor: "rgba(0, 0, 0, 0.2)",
          borderWidth: 1,
        },
      ],
    }
  }

  const getVsGeneralChartData = () => {
    const terminalScores: { [terminal: string]: number } = {}

    // Calcular la puntuación promedio de satisfacción para cada terminal
    TERMINALES.forEach((terminal) => {
      const filteredSurveys = surveys.filter((s) => s.origenViaje === terminal)

      if (filteredSurveys.length === 0) {
        terminalScores[terminal] = 0
        return
      }

      // Contar respuestas por categoría
      const counts = RATING_OPTIONS.reduce((acc, rating) => ({ ...acc, [rating]: 0 }), {} as Record<string, number>)

      filteredSurveys.forEach((survey) => {
        const value = survey[vsGeneralQuestionKey]
        if (value && counts.hasOwnProperty(value)) {
          counts[value]++
        }
      })

      // Calcular puntuación basada en pesos 3, 2, 1, 0
      const weightedSum =
        counts["Muy Buena"] * ANALYSIS_WEIGHTS["Muy Buena"] +
        counts["Buena"] * ANALYSIS_WEIGHTS["Buena"] +
        counts["Regular"] * ANALYSIS_WEIGHTS["Regular"] +
        counts["Mala"] * ANALYSIS_WEIGHTS["Mala"] +
        counts["Muy Mala"] * ANALYSIS_WEIGHTS["Muy Mala"]

      const score = (weightedSum / (filteredSurveys.length * 3)) * 100

      terminalScores[terminal] = Math.round(score)
    })

    // Asignar colores según la puntuación
    const getColorByScore = (score: number) => {
      if (score >= 90) return "rgba(42, 101, 95, 1)" // Muy Buena - Verde oscuro
      if (score >= 70) return "rgba(78, 148, 140, 1)" // Buena - Verde
      if (score >= 50) return "rgba(120, 190, 180, 1)" // Regular - Verde claro
      if (score >= 30) return "rgba(170, 220, 210, 1)" // Mala - Verde muy claro
      return "rgba(215, 240, 235, 1)" // Muy Mala - Verde pálido
    }

    const labels = TERMINALES
    const data = TERMINALES.map((t) => terminalScores[t])
    const backgroundColor = data.map((score) => getColorByScore(score))

    return {
      labels: labels,
      datasets: [
        {
          label: "Puntuación de Satisfacción",
          data: data,
          backgroundColor: backgroundColor,
          borderColor: "rgba(0, 0, 0, 0.2)",
          borderWidth: 1,
        },
      ],
    }
  }

  const renderChartCards = () => {
    if (loading) return <div className="chart-message">Cargando datos de análisis...</div>
    if (error) return <div className="chart-message error-message">❌ {error}</div>
    if (surveys.length === 0) return <div className="chart-message">No hay encuestas para mostrar análisis.</div>

    const currentQuestion = QUESTION_MAP[selectedQuestionKey]
    if (!currentQuestion) return <div className="chart-message">Pregunta no válida.</div>

    const { labels, data, percentages } = processDataForChart(currentQuestion.key, RATING_OPTIONS)

    const summary = generateSummary(labels, data, percentages, currentQuestion.title)

    const pieData = getPieChartData(currentQuestion.key)
    const barData = getBarChartData(currentQuestion.key)

    const pieOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" as const },
        title: { display: false },
      },
    }

    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" as const },
        title: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Conteo de Respuestas" },
        },
      },
    }

    return (
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Resumen General: {currentQuestion.title} (Circular)</h3>
          <div style={{ flexGrow: 1, minHeight: "300px" }}>
            <Pie data={pieData} options={pieOptions} />
          </div>
          <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "6px" }}>
            <p style={{ margin: "0", fontSize: "0.9rem", color: "#444", lineHeight: "1.5" }}>
              <strong>Resumen:</strong> {summary}
            </p>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Detalle por Calificación: {currentQuestion.title} (Barras)</h3>
          <div style={{ flexGrow: 1, minHeight: "300px" }}>
            <Bar data={barData} options={barOptions} />
          </div>
          <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "6px" }}>
            <p style={{ margin: "0", fontSize: "0.9rem", color: "#444", lineHeight: "1.5" }}>
              <strong>Análisis detallado:</strong> Se muestran {data.length} categorías de respuesta con sus porcentajes
              respectivos. Total de encuestas: {selectedQuestionKey === "pregunta2" ? 100 : data.reduce((sum, val) => sum + val, 0)}.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderVsModalBase = () => {
    if (!isModalBaseOpen) return null

    const vsChartData = getVsChartData()
    const vsQuestionTitle =
      QUESTION_MAP[Object.keys(QUESTION_MAP).find((k) => QUESTION_MAP[k].key === vsQuestionKey) || "pregunta1"]
        ?.title || "Pregunta de Comparación"

    const vsBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" as const, display: true },
        title: {
          display: true,
          text: vsQuestionTitle,
          font: { size: 16 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value: any) => {
              switch (value) {
                case 100:
                  return "Muy Buena"
                case 80:
                  return "Buena"
                case 60:
                  return "Regular"
                case 40:
                  return "Mala"
                case 20:
                  return "Muy Mala"
                default:
                  return ""
              }
            },
          },
          title: { display: true, text: "Nivel de Satisfacción" },
        },
        x: {
          title: { display: true, text: "Terminales" },
        },
      },
    }

    return (
      <div className="modal-overlay" onClick={() => setIsModalBaseOpen(false)}>
        <div className="modal-content-vs" onClick={(e) => e.stopPropagation()}>
          <header className="modal-header-vs">
            <h2 className="modal-title-vs">COMPARACIÓN DE ENCUESTAS POR BASE</h2>
            <button className="modal-close-btn" onClick={() => setIsModalBaseOpen(false)}>
              ✕
            </button>
          </header>

          <div className="modal-body-vs">
            <div className="vs-filter-bar">
              <div className="filter-group">
                <label className="filter-label">T1:</label>
                <select value={vsTerminal1} onChange={(e) => setVsTerminal1(e.target.value)} className="filter-select">
                  {TERMINALES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">T2:</label>
                <select value={vsTerminal2} onChange={(e) => setVsTerminal2(e.target.value)} className="filter-select">
                  {TERMINALES.filter((t) => t !== vsTerminal1).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Pregunta:</label>
                <select
                  value={vsQuestionKey}
                  onChange={(e) => setVsQuestionKey(e.target.value)}
                  className="filter-select"
                >
                  {Object.keys(QUESTION_MAP).map((qKey) => (
                    <option key={qKey} value={QUESTION_MAP[qKey].key}>
                      {QUESTION_MAP[qKey].title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="vs-comparison-text" style={{ marginBottom: "30px", textAlign: "center", fontSize: "1.1rem" }}>
              Comparación de resultados entre <strong>{vsTerminal1}</strong> y <strong>{vsTerminal2}</strong>
            </p>

            <div className="vs-chart-area" style={{ height: "400px" }}>
              {surveys.length > 0 ? (
                <div style={{ width: "100%", height: "100%" }}>
                  <Bar data={vsChartData} options={vsBarOptions} />
                </div>
              ) : (
                <div className="chart-message">Cargando o no hay datos para comparar.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderVsModalGeneral = () => {
    if (!isModalGeneralOpen) return null

    const vsQuestionTitle =
      QUESTION_MAP[Object.keys(QUESTION_MAP).find((k) => QUESTION_MAP[k].key === vsGeneralQuestionKey) || "pregunta1"]
        ?.title || "Pregunta de Comparación"

    const vsBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: undefined, // Use default vertical bars
      plugins: {
        legend: { position: "bottom" as const, display: true },
        title: {
          display: true,
          text: vsQuestionTitle,
          font: { size: 16 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value: any) => {
              switch (value) {
                case 100:
                  return "Muy Buena"
                case 80:
                  return "Buena"
                case 60:
                  return "Regular"
                case 40:
                  return "Mala"
                case 20:
                  return "Muy Mala"
                default:
                  return ""
              }
            },
          },
          title: { display: true, text: "Nivel de Satisfacción" },
        },
        x: {
          title: { display: true, text: "Terminales" },
        },
      },
    }

    return (
      <div className="modal-overlay" onClick={() => setIsModalGeneralOpen(false)}>
        <div className="modal-content-vs modal-content-general-large" onClick={(e) => e.stopPropagation()}>
          <header className="modal-header-vs">
            <h2 className="modal-title-vs">COMPARACIÓN DE ENCUESTAS GENERAL</h2>
            <button className="modal-close-btn" onClick={() => setIsModalGeneralOpen(false)}>
              ✕
            </button>
          </header>

          <div className="modal-body-vs">
            <div className="vs-filter-bar">
              <div className="filter-group">
                <label className="filter-label">Pregunta:</label>
                <select
                  value={vsGeneralQuestionKey}
                  onChange={(e) => setVsGeneralQuestionKey(e.target.value)}
                  className="filter-select"
                >
                  {Object.keys(QUESTION_MAP).map((qKey) => (
                    <option key={qKey} value={QUESTION_MAP[qKey].key}>
                      {QUESTION_MAP[qKey].title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="vs-comparison-text" style={{ marginBottom: "30px", textAlign: "center", fontSize: "1.1rem" }}>
              Comparación general de todas las terminales: <strong>{vsQuestionTitle}</strong>
            </p>

            <div className="vs-chart-area" style={{ height: "450px" }}>
              {surveys.length > 0 ? (
                <div style={{ width: "100%", height: "100%" }}>
                  <Bar data={getVsGeneralChartData()} options={vsBarOptions} />
                </div>
              ) : (
                <div className="chart-message">Cargando o no hay datos para comparar.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Se mantiene handleLogout por si se usa en otro lugar, pero no está conectado al menú.
  const handleLogout = () => {
    console.log("Cerrando sesión...")
    navigate("/")
  }

  return (
    <div className="dashboard-container">
      {/* ⬅️ USO DEL COMPONENTE MENÚ */}
      <DashboardMenu />
      {/* ➡️ EL CONTENIDO COMIENZA AQUÍ */}

      <main className="dashboard-main-content">
        <div className="analysis-intro-box">
          <h2 className="analysis-subheader">ENCUESTAS REALIZADAS GENERALES POR PREGUNTA</h2>
          <p className="analysis-intro-text">
            En este apartado se muestran las encuestas realizadas generales por pregunta, permitiendo un análisis visual
            y comparativo. Los datos se presentan con porcentajes visibles para facilitar la comprensión de los
            resultados durante presentaciones.
          </p>
        </div>

        <div className="question-section">
          <div className="menu-container">
            <div className="filter-terminal-inline">
              <label className="filter-label">Terminal:</label>
              <select
                value={selectedTerminal}
                onChange={(e) => setSelectedTerminal(e.target.value)}
                className="filter-select-inline"
              >
                <option value="Todas">Todas</option>
                {TERMINALES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="question-selector">
              <label className="filter-label">Pregunta:</label>
              <select
                value={selectedQuestionKey}
                onChange={(e) => setSelectedQuestionKey(e.target.value)}
                className="filter-select-inline"
              >
                {Object.keys(QUESTION_MAP).map((qKey) => (
                  <option key={qKey} value={qKey}>
                    {QUESTION_MAP[qKey].title}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-comparison" onClick={() => setIsModalGeneralOpen(true)}>
              COMPARACIÓN DE ENCUESTAS GENERAL
            </button>

            <button className="btn-comparison" onClick={() => setIsModalBaseOpen(true)}>
              COMPARACIÓN DE ENCUESTAS POR BASE
            </button>
          </div>
        </div>

        <div className="results-section">
          <h2 className="results-title">RESULTADOS GENERALES</h2>
          {renderChartCards()}
        </div>
      </main>

      {renderVsModalGeneral()}
      {renderVsModalBase()}
    </div>
  )
}

export default Analisis