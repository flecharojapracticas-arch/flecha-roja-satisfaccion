"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import "./Resumen.css"
import { getSurveyWeights, setSurveyWeights } from "../utils/settings"
import axios from "axios"

// =================================================================
// 1. ITEMS Y RUTAS DEL MENÚ (CONSTANTES)
// =================================================================
const navItems = ["ENCUESTAS", "ANÁLISIS", "RESULTADOS", "RESUMEN", "PERIODOS"]

const tabRoutes: { [key: string]: string } = {
  ENCUESTAS: "/dashboard/encuestas",
  ANÁLISIS: "/dashboard/analisis",
  RESULTADOS: "/dashboard/resultados",
  RESUMEN: "/dashboard/resumen",
  PERIODOS: "/dashboard/periodos",
}

// =================================================================
// 2. CONSTANTES, TIPOS Y CONFIGURACIÓN DE API
// =================================================================

const API_SURVEYS_ENDPOINT = "https://flecha-roja-satisfaccion.onrender.com/api/analysis/general"

interface Survey {
  _id: string
  validado?: "VALIDADO" | "PENDIENTE" | "ELIMINADO" | string
  origenViaje: string
  califExperienciaCompra: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  califServicioConductor: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  califComodidad: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  califLimpieza: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  califSeguridad: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  cumplioExpectativas: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
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

interface QuestionConfig {
  id: string
  key: keyof Survey
  title: string
  description: string
}

const RATING_QUESTIONS: QuestionConfig[] = [
  {
    id: "Q1",
    key: "califExperienciaCompra",
    title: "1.- Evalúe su experiencia de compra: (a bordo,taquillas,web o app)",
    description: "Evalúa el proceso completo desde la llegada hasta la obtención del boleto.",
  },
  {
    id: "Q2",
    key: "califServicioConductor",
    title: "2. Evalúe el servicio del conductor (amabilidad, atención en el servicio)",
    description: "Mide la amabilidad, profesionalismo y trato del personal operativo.",
  },
  {
    id: "Q3",
    key: "califComodidad",
    title: "4. ¿Cómo califica la comodidad a bordo?",
    description: "Analiza el estado de asientos, espacio y confort general.",
  },
  {
    id: "Q4",
    key: "califLimpieza",
    title: "5.- ¿Cómo califica la limpieza a bordo?",
    description: "Evaluación de higiene en áreas comunes y asientos.",
  },
  {
    id: "Q5",
    key: "califSeguridad",
    title: "6. ¿Cómo considera la seguridad en su viaje? (conducción)",
    description: "Percepción de seguridad en la conducción y estado del vehículo.",
  },
  {
    id: "Q6",
    key: "cumplioExpectativas",
    title: "7. ¿Se cumplió con sus expectativas de inicio de viaje?",
    description: "Mide si el servicio cumplió con lo esperado por el cliente.",
  },
]

const DEFAULT_RATING_WEIGHTS: { [key: string]: number } = {
  "Muy Buena": 3,
  Buena: 2,
  Regular: 1,
  Mala: 0,
  "Muy Mala": 0,
}

interface RatingDistribution {
  value: number
  color: string
}

interface QuestionSummary {
  questionKey: keyof Survey
  title: string
  description: string
  totalResponses: number
  satisfiedCount: number
  unsatisfiedCount: number
  satisfiedPercentage: number
  unsatisfiedPercentage: number
  isSatisfied: boolean
  distribution: { [calif: string]: RatingDistribution }
}

interface ResumenData {
  totalReal: number
  questionSummaries: QuestionSummary[]
  overallSatisfiedPercentage: number
  overallUnsatisfiedPercentage: number
  isOverallSatisfied: boolean
}

const PRIMARY_COLOR = "#2a655f"
const SECONDARY_COLOR = "#1f4e4a"
const CHART_COLOR_1 = "#56c5b6"
const CHART_COLOR_2 = "#90d3d3"
const DANGER_COLOR = "#00796b"

const SATISFACTION_ORDER = ["Muy Buena", "Buena", "Regular", "Mala", "Muy Mala"]
const SATISFACTION_COLORS: { [key: string]: string } = {
  "Muy Buena": SECONDARY_COLOR,
  Buena: PRIMARY_COLOR,
  Regular: CHART_COLOR_1,
  Mala: DANGER_COLOR,
  "Muy Mala": CHART_COLOR_2,
}

const COLOR_SATISFECHO = PRIMARY_COLOR
const COLOR_INSATISFECHO = CHART_COLOR_2
// =================================================================
// 4. COMPONENTES REUTILIZABLES
// =================================================================

// Gráfica de Pie para Satisfecho/Insatisfecho
const SatisfactionPieChart: React.FC<{
  satisfiedPercentage: number
  unsatisfiedPercentage: number
  title: string
  totalResponses: number
}> = ({ satisfiedPercentage, unsatisfiedPercentage, title, totalResponses }) => {
  const data = [
    { name: "Satisfecho", value: satisfiedPercentage, color: COLOR_SATISFECHO },
    { name: "Insatisfecho", value: unsatisfiedPercentage, color: COLOR_INSATISFECHO },
  ].filter((item) => item.value > 0)

  let currentAngle = 0

  return (
    <div className="satisfaction-chart-container">
      <div style={{ position: "relative", width: "280px", height: "280px", margin: "0 auto" }}>
        <svg width="280" height="280" viewBox="0 0 280 280">
          {data.map((item, index) => {
            const angle = (item.value / 100) * 360

            // Caso especial para 100% (Círculo completo)
            if (angle >= 359.9) {
              return (
                <g key={index}>
                  <circle cx="140" cy="140" r="100" fill={item.color} stroke="white" strokeWidth="3" />
                  <text
                    x="140"
                    y="140"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="18"
                    fontWeight="700"
                    style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
                  >
                    100.0%
                  </text>
                </g>
              )
            }

            const startAngle = currentAngle
            const endAngle = currentAngle + angle

            const startX = 140 + 100 * Math.cos(((startAngle - 90) * Math.PI) / 180)
            const startY = 140 + 100 * Math.sin(((startAngle - 90) * Math.PI) / 180)
            const endX = 140 + 100 * Math.cos(((endAngle - 90) * Math.PI) / 180)
            const endY = 140 + 100 * Math.sin(((endAngle - 90) * Math.PI) / 180)

            const largeArcFlag = angle > 180 ? 1 : 0

            const pathData = [
              `M 140 140`,
              `L ${startX} ${startY}`,
              `A 100 100 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `Z`,
            ].join(" ")

            const midAngle = startAngle + angle / 2
            const textX = 140 + 65 * Math.cos(((midAngle - 90) * Math.PI) / 180)
            const textY = 140 + 65 * Math.sin(((midAngle - 90) * Math.PI) / 180)

            currentAngle = endAngle

            const isDarkColor = item.color === COLOR_SATISFECHO

            return (
              <g key={index}>
                <path d={pathData} fill={item.color} stroke="white" strokeWidth="3" />
                {item.value > 5 && (
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isDarkColor ? "white" : "#1f4e4a"}
                    fontSize="14"
                    fontWeight="700"
                    style={{ textShadow: isDarkColor ? "1px 1px 2px rgba(0,0,0,0.8)" : "none" }}
                  >
                    {item.value.toFixed(1)}%
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="chart-legend">
        <div className="pie-legend-item">
          <span className="pie-legend-item-color" style={{ backgroundColor: COLOR_SATISFECHO }}></span>
          <span style={{ fontWeight: "600" }}>Satisfecho: {satisfiedPercentage.toFixed(1)}%</span>
        </div>
        <div className="pie-legend-item">
          <span className="pie-legend-item-color" style={{ backgroundColor: COLOR_INSATISFECHO }}></span>
          <span style={{ fontWeight: "600" }}>Insatisfecho: {unsatisfiedPercentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

const QuestionSatisfactionPieChart: React.FC<{
  questionNumber: number
  title: string
  satisfiedPercentage: number
  unsatisfiedPercentage: number
  totalValid: number
  isSatisfied: boolean
}> = ({ questionNumber, title, satisfiedPercentage, unsatisfiedPercentage, totalValid, isSatisfied }) => {
  const data = [
    { name: "Satisfecho", value: satisfiedPercentage, color: COLOR_SATISFECHO },
    { name: "Insatisfecho", value: unsatisfiedPercentage, color: COLOR_INSATISFECHO },
  ].filter((item) => item.value > 0)

  let currentAngle = 0

  return (
    <div className="modal-chart-section">
      <p className="chart-description">
        Distribución de respuestas. Base de encuestas válidas: <strong>{totalValid}</strong>.
      </p>
      <div style={{ position: "relative", width: "320px", height: "320px", margin: "0 auto" }}>
        <svg width="320" height="320" viewBox="0 0 320 320">
          {data.map((item, index) => {
            const angle = (item.value / 100) * 360

            // Caso especial para 100% (Círculo completo)
            if (angle >= 359.9) {
              return (
                <g key={index}>
                  <circle cx="160" cy="160" r="120" fill={item.color} stroke="white" strokeWidth="3" />
                  <text
                    x="160"
                    y="160"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="20"
                    fontWeight="700"
                    style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
                  >
                    100.0%
                  </text>
                </g>
              )
            }

            const startAngle = currentAngle
            const endAngle = currentAngle + angle

            const startX = 160 + 120 * Math.cos(((startAngle - 90) * Math.PI) / 180)
            const startY = 160 + 120 * Math.sin(((startAngle - 90) * Math.PI) / 180)
            const endX = 160 + 120 * Math.cos(((endAngle - 90) * Math.PI) / 180)
            const endY = 160 + 120 * Math.sin(((endAngle - 90) * Math.PI) / 180)

            const largeArcFlag = angle > 180 ? 1 : 0

            const pathData = [
              `M 160 160`,
              `L ${startX} ${startY}`,
              `A 120 120 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `Z`,
            ].join(" ")

            const midAngle = startAngle + angle / 2
            const textX = 160 + 80 * Math.cos(((midAngle - 90) * Math.PI) / 180)
            const textY = 160 + 80 * Math.sin(((midAngle - 90) * Math.PI) / 180)

            currentAngle = endAngle

            const isDarkColor = item.color === COLOR_SATISFECHO

            return (
              <g key={index}>
                <path d={pathData} fill={item.color} stroke="white" strokeWidth="3" />
                {item.value > 5 && (
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isDarkColor ? "white" : "#1f4e4a"}
                    fontSize="16"
                    fontWeight="700"
                    style={{ textShadow: isDarkColor ? "1px 1px 2px rgba(0,0,0,0.8)" : "none" }}
                  >
                    {item.value.toFixed(1)}%
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div style={{ marginTop: "20px" }}>
        <div className="pie-legend-item">
          <span className="pie-legend-item-color" style={{ backgroundColor: COLOR_SATISFECHO }}></span>
          <span style={{ fontWeight: "600" }}>Satisfecho: {satisfiedPercentage.toFixed(1)}%</span>
        </div>
        <div className="pie-legend-item">
          <span className="pie-legend-item-color" style={{ backgroundColor: COLOR_INSATISFECHO }}></span>
          <span style={{ fontWeight: "600" }}>Insatisfecho: {unsatisfiedPercentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className={`modal-satisfaction-badge ${isSatisfied ? "satisfied" : "unsatisfied"}`}>
        {isSatisfied ? "✓ SATISFECHO" : "✗ INSATISFECHO"} ({satisfiedPercentage.toFixed(1)}%)
      </div>
    </div>
  )
}

const renderQuestionDataTable = (
  distribution: { [calif: string]: RatingDistribution },
  totalValid: number,
  satisfiedPercentage: number,
  isSatisfied: boolean,
) => {
  const tableData = SATISFACTION_ORDER.map((calif) => ({
    name: calif,
    value: distribution[calif]?.value || 0,
    percentage: ((distribution[calif]?.value || 0) / totalValid) * 100,
  }))

  return (
    <div className="table-wrapper">
      <table className="chart-data-table">
        <thead>
          <tr>
            <th style={{ width: "50%" }}>Calificación</th>
            <th style={{ width: "25%", textAlign: "center" }}>Cantidad</th>
            <th style={{ width: "25%", textAlign: "center" }}>Porcentaje</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td style={{ textAlign: "center" }}>{item.value}</td>
              <td style={{ textAlign: "center", fontWeight: "600" }}>{item.percentage.toFixed(1)}%</td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: "700" }}>TOTALES</td>
            <td style={{ fontWeight: "700", textAlign: "center" }} className="positive">
              {totalValid}
            </td>
            <td style={{ fontWeight: "700", textAlign: "center" }}>100%</td>
          </tr>
        </tbody>
      </table>
      <div className={`modal-satisfaction-badge ${isSatisfied ? "satisfied" : "unsatisfied"}`}>
        {isSatisfied ? "✓ SATISFECHO" : "✗ INSATISFECHO"} ({satisfiedPercentage.toFixed(1)}%)
      </div>
    </div>
  )
}

const QuestionModal = ({
  question,
  summary,
  totalReal,
  onClose,
}: { question: QuestionConfig | null; summary: QuestionSummary | null; totalReal: number; onClose: () => void }) => {
  if (!question || !summary) return null

  const questionNumber = RATING_QUESTIONS.findIndex((q) => q.id === question.id) + 1

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose}>
          &times;
        </button>

        <div className="modal-question-header">
          <h2>
            Pregunta {questionNumber}: {question.title}
          </h2>
          <p className="modal-question-description">{question.description}</p>
        </div>

        <div className="modal-grid-content">
          <div className="modal-chart-column">
            <QuestionSatisfactionPieChart
              questionNumber={questionNumber}
              title={question.title}
              satisfiedPercentage={summary.satisfiedPercentage}
              unsatisfiedPercentage={summary.unsatisfiedPercentage}
              totalValid={totalReal}
              isSatisfied={summary.isSatisfied}
            />
          </div>

          <div className="modal-table-container">
            <h3>Detalle de Distribución de Calificaciones</h3>
            {renderQuestionDataTable(summary.distribution, totalReal, summary.satisfiedPercentage, summary.isSatisfied)}
          </div>
        </div>
      </div>
    </div>
  )
}

const SettingsModal: React.FC<{
  weights: { [key: string]: number }
  onSave: (newWeights: { [key: string]: number }) => void
  onClose: () => void
}> = ({ weights, onSave, onClose }) => {
  const [tempWeights, setTempWeights] = useState<{ [key: string]: number }>({ ...weights })

  const handleWeightChange = (calif: string, value: number) => {
    setTempWeights((prev) => ({
      ...prev,
      [calif]: Math.max(0, value),
    }))
  }

  const handleSave = () => {
    onSave(tempWeights)
    onClose()
  }

  const handleReset = () => {
    setTempWeights({ ...DEFAULT_RATING_WEIGHTS })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose}>
          &times;
        </button>

        <div className="settings-header">
          <h2>⚙️ Configuración de Ponderación</h2>
          <p>Ajusta el valor de cada calificación para modificar el cálculo del porcentaje de satisfacción.</p>
        </div>

        <div className="settings-body">
          <h3 className="settings-section-title">📊 Ponderación de Calificaciones</h3>
          {SATISFACTION_ORDER.map((calif) => (
            <div key={calif} className="weight-item">
              <span className="weight-label">
                <span className="weight-color" style={{ backgroundColor: SATISFACTION_COLORS[calif] }}></span>
                {calif}
              </span>
              <div className="weight-controls">
                <button
                  className="weight-btn"
                  onClick={() => handleWeightChange(calif, tempWeights[calif] - 1)}
                  disabled={tempWeights[calif] <= 0}
                >
                  −
                </button>
                <span className="weight-value">{tempWeights[calif]}</span>
                <button className="weight-btn" onClick={() => handleWeightChange(calif, tempWeights[calif] + 1)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="settings-footer">
          <button className="btn-reset" onClick={handleReset}>
            Restablecer Valores
          </button>
          <button className="btn-save" onClick={handleSave}>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}

// =================================================================
// 5. COMPONENTE PRINCIPAL: Resumen
// =================================================================

export default function Resumen() {
  const [allSurveys, setAllSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ResumenData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modalQuestion, setModalQuestion] = useState<QuestionConfig | null>(null)
  const [weights, setWeights] = useState<{ [key: string]: number }>(getSurveyWeights())
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const processResumenData = useCallback((surveys: Survey[], weights: { [key: string]: number }) => {
    const validSurveys = surveys.filter((s) => s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR")
    const totalReal = validSurveys.length
    const maxWeight = Math.max(...Object.values(weights))

    const questionSummaries: QuestionSummary[] = RATING_QUESTIONS.map((q) => {
      const distribution: { [calif: string]: RatingDistribution } = {}
      SATISFACTION_ORDER.forEach((calif) => {
        distribution[calif] = { value: 0, color: SATISFACTION_COLORS[calif] }
      })

      let totalWeightedScore = 0
      let totalResponses = 0

      validSurveys.forEach((s) => {
        const calif = s[q.key] as string
        if (calif && distribution[calif]) {
          distribution[calif].value += 1
          totalWeightedScore += weights[calif] || 0
          totalResponses += 1
        }
      })


      const maxPossible = totalResponses * maxWeight
      const satisfiedPercentage = maxPossible > 0 ? (totalWeightedScore / maxPossible) * 100 : 0

      return {
        questionKey: q.key,
        title: q.title,
        description: q.description,
        totalResponses,
        satisfiedCount: distribution["Muy Buena"].value + distribution["Buena"].value,
        unsatisfiedCount: distribution["Regular"].value + distribution["Mala"].value + distribution["Muy Mala"].value,
        satisfiedPercentage,
        unsatisfiedPercentage: 100 - satisfiedPercentage,
        isSatisfied: satisfiedPercentage >= 80,
        distribution,
      }
    })

    let totalWeightedScoreAll = 0
    let totalResponsesAll = 0
    validSurveys.forEach(s => {
      RATING_QUESTIONS.forEach(q => {
        const calif = s[q.key] as string
        if (calif && weights[calif] !== undefined) {
          totalWeightedScoreAll += weights[calif]
          totalResponsesAll += 1
        }
      })
    })


    const maxScaleAll = totalResponsesAll * maxWeight
    const overallSatisfied = maxScaleAll > 0 ? (totalWeightedScoreAll / maxScaleAll) * 100 : 0

    return {
      totalReal,
      questionSummaries,
      overallSatisfiedPercentage: overallSatisfied,
      overallUnsatisfiedPercentage: 100 - overallSatisfied,
      isOverallSatisfied: overallSatisfied >= 80,
    }
  }, [])

  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(API_SURVEYS_ENDPOINT)
      const surveysArray = Array.isArray(response.data) ? response.data : []

      if (surveysArray.length === 0) {
        setData(null)
      } else {
        const processed = processResumenData(surveysArray, weights)
        setAllSurveys(surveysArray)
        setData(processed)
      }
    } catch (e) {
      const err = e as Error
      console.error("Error al obtener las encuestas:", err)
      setError(`Error de Conexión: ${err.message}. Verifica que el servidor esté activo.`)
    } finally {
      setLoading(false)
    }
  }, [weights, processResumenData])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  useEffect(() => {
    if (allSurveys.length > 0) {
      const processed = processResumenData(allSurveys, weights)
      setData(processed)
    }
  }, [weights, allSurveys, processResumenData])

  const handleGoToDashboard = () => {
    window.location.href = "/"
  }

  const handleTabClick = (item: string) => {
    const route = tabRoutes[item]
    if (route) {
      navigate(route)
    }
  }

  const getSelectedSummary = (): QuestionSummary | null => {
    if (!modalQuestion || !data) return null
    return data.questionSummaries.find((s: QuestionSummary) => s.questionKey === modalQuestion.key) || null
  }

  const handleSaveWeights = (newWeights: { [key: string]: number }) => {
    setWeights(newWeights)
    setSurveyWeights(newWeights)
  }

  const renderHeader = () => (
    <header className="dashboard-header">
      <div className="header-top-bar">
        <div className="header-logo-container">
          <img src="/logo_flecha_roja.png" alt="Logo Flecha Roja" className="header-logo" />
        </div>
        <h1 className="header-title-main">SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA</h1>
        <button className="btn-navigate" onClick={handleGoToDashboard}>
          Regresar al inicio
        </button>
      </div>

      <nav className="nav-bar">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => handleTabClick(item)}
            className={`nav-button ${location.pathname.startsWith(tabRoutes[item]) ? "active" : ""}`}
          >
            {item}
          </button>
        ))}
      </nav>
    </header>
  )

  const renderQuestionMenu = () => (
    <div className="question-menu-container">
      <h3 className="question-menu-title">Selecciona una pregunta para ver su análisis detallado:</h3>
      <div className="question-menu-grid">
        {RATING_QUESTIONS.map((q: QuestionConfig, index: number) => {
          const summary = data?.questionSummaries.find((s: QuestionSummary) => s.questionKey === q.key)
          return (
            <button key={q.id} className="question-menu-button" onClick={() => setModalQuestion(q)}>
              <span className="question-number">P{index + 1}</span>
              <span className="question-title">{q.title}</span>
              {summary && (
                <span className={`question-status ${summary.isSatisfied ? "satisfied" : "unsatisfied"}`}>
                  {summary.isSatisfied ? "Satisfecho" : "Insatisfecho"}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderContent = () => {
    if (loading)
      return (
        <div className="no-results" style={{ borderLeft: `4px solid ${PRIMARY_COLOR}` }}>
          Cargando datos reales de la base de datos... Por favor, espere.
        </div>
      )
    if (error)
      return (
        <div className="no-results" style={{ borderLeft: `4px solid ${DANGER_COLOR}`, color: DANGER_COLOR }}>
          <p>⚠️ ERROR CRÍTICO DE CONEXIÓN A LA API:</p>
          <p style={{ fontSize: "0.9rem", color: "#666" }}>{error}</p>
        </div>
      )
    if (!data || allSurveys.length === 0)
      return (
        <div className="no-results" style={{ borderLeft: `4px solid ${CHART_COLOR_2}` }}>
          No se encontraron encuestas para generar el resumen.
        </div>
      )

    return (
      <div className="resumen-content">
        <div className="settings-button-container">
          <button className="btn-settings" onClick={() => setShowSettingsModal(true)}>
            ⚙️ Ajustes de Ponderación
          </button>
        </div>

        <h2 className="surveys-section-title">Resumen General de Satisfacción</h2>
        <p className="surveys-intro-text">
          Este resumen muestra el nivel de satisfacción general del cliente basado en todas las preguntas de la
          encuesta. Se considera <strong>Satisfecho</strong> si el porcentaje ponderado es ≥80%.
        </p>

        {/* Tarjeta principal de resumen general */}
        <div className="resumen-general-card">
          <div className="resumen-general-content">
            <div className="resumen-chart-section">
              <h3>Satisfacción General del Cliente</h3>
              <SatisfactionPieChart
                satisfiedPercentage={data.overallSatisfiedPercentage}
                unsatisfiedPercentage={data.overallUnsatisfiedPercentage}
                title="Satisfacción General"
                totalResponses={data.totalReal}
              />
            </div>

            <div className="resumen-info-section">
              <div className={`resumen-status-badge ${data.isOverallSatisfied ? "satisfied" : "unsatisfied"}`}>
                {data.isOverallSatisfied ? "✓ SATISFECHO" : "✗ INSATISFECHO"}
              </div>
              <div className="resumen-stats">
                <div className="stat-item">
                  <span className="stat-label">Total de Encuestas Válidas:</span>
                  <span className="stat-value">{data.totalReal}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Porcentaje Satisfecho:</span>
                  <span className="stat-value positive">{data.overallSatisfiedPercentage.toFixed(1)}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Porcentaje Insatisfecho:</span>
                  <span className="stat-value negative">{data.overallUnsatisfiedPercentage.toFixed(1)}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Umbral de Satisfacción:</span>
                  <span className="stat-value">≥ 80%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla resumen por pregunta */}
        <div className="resumen-table-card">
          <h3>Resumen por Pregunta</h3>
          <div className="table-wrapper">
            <table className="chart-data-table">
              <thead>
                <tr>
                  <th>Pregunta</th>
                  <th style={{ textAlign: "center" }}>Total Respuestas</th>
                  <th style={{ textAlign: "center" }}>% Satisfecho</th>
                  <th style={{ textAlign: "center" }}>% Insatisfecho</th>
                  <th style={{ textAlign: "center" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.questionSummaries.map((summary: QuestionSummary, index: number) => (
                  <tr key={summary.questionKey}>
                    <td>
                      <strong>P{index + 1}:</strong> {summary.title}
                    </td>
                    <td style={{ textAlign: "center" }}>{summary.totalResponses}</td>
                    <td style={{ textAlign: "center", fontWeight: "600" }} className="positive">
                      {summary.satisfiedPercentage.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: "center", fontWeight: "600" }} className="negative">
                      {summary.unsatisfiedPercentage.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`status-badge ${summary.isSatisfied ? "satisfied" : "unsatisfied"}`}>
                        {summary.isSatisfied ? "Satisfecho" : "Insatisfecho"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Menú de preguntas */}
        {renderQuestionMenu()}

        {/* Modal de Pregunta */}
        <QuestionModal
          question={modalQuestion}
          summary={getSelectedSummary()}
          totalReal={data.totalReal}
          onClose={() => setModalQuestion(null)}
        />

        {showSettingsModal && (
          <SettingsModal
            weights={weights}
            onSave={handleSaveWeights}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {renderHeader()}
      <main className="dashboard-main-content">{renderContent()}</main>
    </div>
  )
}
