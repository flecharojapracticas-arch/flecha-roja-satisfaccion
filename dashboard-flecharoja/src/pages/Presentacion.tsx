"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import "./Presentacion.css"
import { getMetaGeneral, getMetaTerminal } from "../utils/settings"
import axios from "axios"

// =================================================================
// 1. CONFIGURACIÓN DE API
// =================================================================
const API_SURVEYS_ENDPOINT = "https://flecha-roja-satisfaccion.onrender.com/api/analysis/general"

// =================================================================
// 2. INTERFACES Y TIPOS
// =================================================================
interface Survey {
  _id: string
  validado?: "VALIDADO" | "PENDIENTE" | "ELIMINADO" | string
  origenViaje: string
  destinoFinal: string
  fecha: string
  claveEncuestador: string
  noEco: string
  folioBoleto: string
  califExperienciaCompra: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  califServicioConductor: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  califComodidad: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  califLimpieza: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  califSeguridad: "Muy Buena" | "Buena" | "Regular" | "Mala" | "Muy Mala" | string
  cumplioExpectativas: string
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

// =================================================================
// 3. CONSTANTES DE DISEÑO Y DATOS
// =================================================================
const PRIMARY_COLOR = "#2a655f"
const SECONDARY_COLOR = "#1f4e4a"
const CHART_COLOR_1 = "#56c5b6"
const CHART_COLOR_2 = "#90d3d3"
const DANGER_COLOR = "#00796b"

const COLOR_MUY_BUENA = SECONDARY_COLOR
const COLOR_BUENA = PRIMARY_COLOR
const COLOR_REGULAR = CHART_COLOR_1
const COLOR_MALA = DANGER_COLOR
const COLOR_MUY_MALA = CHART_COLOR_2

const SATISFACTION_ORDER = ["Muy Buena", "Buena", "Regular", "Mala", "Muy Mala"]

const SATISFACTION_COLORS: { [key: string]: string } = {
  "Muy Buena": COLOR_MUY_BUENA,
  Buena: COLOR_BUENA,
  Regular: COLOR_REGULAR,
  Mala: COLOR_MALA,
  "Muy Mala": COLOR_MUY_MALA,
}

const COLOR_SATISFECHO = PRIMARY_COLOR
const COLOR_INSATISFECHO = CHART_COLOR_2

const DEFAULT_WEIGHTS: { [key: string]: number } = {
  "Muy Buena": 3,
  Buena: 2,
  Regular: 1,
  Mala: 0,
  "Muy Mala": 0,
}

const DEFAULT_TERMINALES = [
  "Acambay", "Atlacomulco", "Cadereyta", "Chalma", "Cuernavaca", "El Yaqui",
  "Ixtlahuaca", "Ixtapan de la Sal", "Mexico Poniente", "Mexico Norte",
  "Naucalpan", "Querétaro", "San Juan del Rio", "Taxco", "Tenancingo",
  "Tepotzotlán", "Tenango", "Temoaya", "Toluca", "Santiago Tianguistengo",
  "San Mateo Atenco", "Xalatlaco",
]

type QuestionConfig = { id: string; key: keyof Survey; title: string; description: string }

const RATING_QUESTIONS: QuestionConfig[] = [
  { id: "Q1", key: "califExperienciaCompra", title: "Experiencia de Compra", description: "Evalúa la satisfacción del cliente con el proceso de compra." },
  { id: "Q2", key: "califServicioConductor", title: "Servicio del Conductor", description: "Mide la calidad del servicio brindado por el conductor." },
  { id: "Q3", key: "califComodidad", title: "Comodidad", description: "Analiza el nivel de confort durante el viaje." },
  { id: "Q4", key: "califLimpieza", title: "Limpieza", description: "Evalúa las condiciones de higiene y limpieza." },
  { id: "Q5", key: "califSeguridad", title: "Seguridad", description: "Mide la percepción del cliente sobre la seguridad." },
]

// =================================================================
// 4. LÓGICA DE PROCESAMIENTO
// =================================================================

// =================================================================
// 5. COMPONENTES REUTILIZABLES
// =================================================================

// Componente de Gráfica Pie para Satisfacción General
const SatisfactionPieChart: React.FC<{
  satisfiedPercentage: number
  unsatisfiedPercentage: number
  size?: number
}> = ({ satisfiedPercentage, unsatisfiedPercentage, size = 280 }) => {
  const data = [
    { name: "Satisfecho", value: satisfiedPercentage, color: COLOR_SATISFECHO },
    { name: "Insatisfecho", value: unsatisfiedPercentage, color: COLOR_INSATISFECHO },
  ].filter((item) => item.value > 0)

  let currentAngle = 0
  const center = size / 2
  const radius = size * 0.36

  return (
    <div className="satisfaction-chart-container">
      <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, margin: "0 auto" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((item, index) => {
            const angle = (item.value / 100) * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle

            const startX = center + radius * Math.cos(((startAngle - 90) * Math.PI) / 180)
            const startY = center + radius * Math.sin(((startAngle - 90) * Math.PI) / 180)
            const endX = center + radius * Math.cos(((endAngle - 90) * Math.PI) / 180)
            const endY = center + radius * Math.sin(((endAngle - 90) * Math.PI) / 180)

            const largeArcFlag = angle > 180 ? 1 : 0

            const pathData = [
              `M ${center} ${center}`,
              `L ${startX} ${startY}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `Z`,
            ].join(" ")

            const midAngle = startAngle + angle / 2
            const textRadius = radius * 0.65
            const textX = center + textRadius * Math.cos(((midAngle - 90) * Math.PI) / 180)
            const textY = center + textRadius * Math.sin(((midAngle - 90) * Math.PI) / 180)

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

// Componente de Gráfica Pie para Distribución de Calificaciones
const RatingDistributionPieChart: React.FC<{
  distribution: { [calif: string]: RatingDistribution }
  totalValid: number
  size?: number
}> = ({ distribution, totalValid, size = 300 }) => {
  const dataForChart = SATISFACTION_ORDER.map((calif) => ({
    name: calif,
    value: distribution[calif]?.value || 0,
    color: distribution[calif]?.color || "#ccc",
  })).filter((item) => item.value > 0)

  const total = dataForChart.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = 0
  const center = size / 2
  const radius = size * 0.4

  return (
    <div style={{ position: "relative", width: `${size}px`, height: `${size}px`, margin: "0 auto" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {dataForChart.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          const angle = (percentage / 100) * 360
          const startAngle = currentAngle
          const endAngle = currentAngle + angle

          const startX = center + radius * Math.cos(((startAngle - 90) * Math.PI) / 180)
          const startY = center + radius * Math.sin(((startAngle - 90) * Math.PI) / 180)
          const endX = center + radius * Math.cos(((endAngle - 90) * Math.PI) / 180)
          const endY = center + radius * Math.sin(((endAngle - 90) * Math.PI) / 180)

          const largeArcFlag = angle > 180 ? 1 : 0

          const pathData = [
            `M ${center} ${center}`,
            `L ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `Z`,
          ].join(" ")

          const midAngle = startAngle + angle / 2
          const textRadius = radius * 0.65
          const textX = center + textRadius * Math.cos(((midAngle - 90) * Math.PI) / 180)
          const textY = center + textRadius * Math.sin(((midAngle - 90) * Math.PI) / 180)

          currentAngle = endAngle

          const isDarkColor = [SECONDARY_COLOR, PRIMARY_COLOR, DANGER_COLOR].includes(item.color)

          return (
            <g key={index}>
              <path d={pathData} fill={item.color} stroke="white" strokeWidth="3" />
              {percentage > 5 && (
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isDarkColor ? "white" : "#1f4e4a"}
                  fontSize="13"
                  fontWeight="700"
                  style={{ textShadow: isDarkColor ? "1px 1px 2px rgba(0,0,0,0.8)" : "none" }}
                >
                  {percentage.toFixed(1)}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <div style={{ marginTop: "15px" }}>
        {dataForChart.map((item, index) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0
          return (
            <div key={index} className="pie-legend-item">
              <span className="pie-legend-item-color" style={{ backgroundColor: item.color }}></span>
              <span style={{ fontWeight: "600" }}>{`${item.name}: ${item.value} (${percent.toFixed(1)}%)`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Tarjeta de Terminal para la selección
const TerminalCard: React.FC<{
  terminal: string
  encuestas: number
  satisfaccion: number
  meta: number
  faltantes: number
  onClick: () => void
}> = ({ terminal, encuestas, satisfaccion, meta, faltantes, onClick }) => {
  const isSatisfied = satisfaccion >= 80
  const progreso = meta > 0 ? Math.min((encuestas / meta) * 100, 100) : 0

  return (
    <div className="terminal-card" onClick={onClick}>
      <div className="terminal-card-header">
        <span className="terminal-card-title" style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 700 }}>
          {terminal}
        </span>
      </div>
      <div className="terminal-card-body">
        <div className="terminal-stat">
          <span className="terminal-stat-label">Encuestas</span>
          <span className="terminal-stat-value">{encuestas} / {meta}</span>
        </div>
        <div className="terminal-progress-bar">
          <div
            className="terminal-progress-fill"
            style={{ width: `${progreso}%`, backgroundColor: progreso >= 100 ? '#2a655f' : '#56c5b6' }}
          />
        </div>
        <div className="terminal-stat">
          <span className="terminal-stat-label">Satisfacción</span>
          <span className={`terminal-stat-value ${isSatisfied ? "positive" : "negative"}`}>
            {satisfaccion.toFixed(1)}%
          </span>
        </div>
        <div className={`terminal-status-badge ${isSatisfied ? "satisfied" : "unsatisfied"}`}>
          {isSatisfied ? "SATISFECHO" : "INSATISFECHO"}
        </div>
      </div>
      <div className="terminal-card-footer">
        <span className="view-details-link">Ver detalles</span>
      </div>
    </div>
  )
}

// Modal de Detalle de Pregunta
const QuestionDetailModal: React.FC<{
  question: QuestionConfig
  summary: QuestionSummary
  totalEncuestas: number
  questions: QuestionConfig[]
  onClose: () => void
}> = ({ question, summary, totalEncuestas, questions, onClose }) => {
  const questionNumber = questions.findIndex((q: QuestionConfig) => q.id === question.id) + 1

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
            <div className="modal-chart-section">
              <p className="chart-description">
                Distribución de respuestas. Base de encuestas válidas: <strong>{totalEncuestas}</strong>.
              </p>
              <RatingDistributionPieChart distribution={summary.distribution} totalValid={totalEncuestas} size={320} />
              <div className={`modal-satisfaction-badge ${summary.isSatisfied ? "satisfied" : "unsatisfied"}`}>
                {summary.isSatisfied ? "✓ SATISFECHO" : "✗ INSATISFECHO"} ({summary.satisfiedPercentage.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div className="modal-table-container">
            <h3>Detalle de Distribución de Calificaciones</h3>
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
                  {SATISFACTION_ORDER.map((calif, index) => {
                    const value = summary.distribution[calif]?.value || 0
                    const percentage = totalEncuestas > 0 ? (value / totalEncuestas) * 100 : 0
                    return (
                      <tr key={index}>
                        <td>{calif}</td>
                        <td style={{ textAlign: "center" }}>{value}</td>
                        <td style={{ textAlign: "center" }}>{percentage.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td style={{ fontWeight: "700" }}>TOTALES</td>
                    <td style={{ fontWeight: "700", textAlign: "center" }} className="positive">
                      {totalEncuestas}
                    </td>
                    <td style={{ fontWeight: "700", textAlign: "center" }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =================================================================
// 6. COMPONENTE PRINCIPAL
// =================================================================
interface PresentacionProps {
  onLogout: () => void
}

const Presentacion: React.FC<PresentacionProps> = ({ onLogout }) => {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionConfig | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Fetch data
  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(API_SURVEYS_ENDPOINT)
      setSurveys(response.data)
    } catch (err) {
      console.error("Error al cargar datos:", err)
      setError("Error al cargar los datos. Intente nuevamente.")
      setSurveys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const processTerminalData = useCallback((surveys: Survey[], terminal: string, weights: { [key: string]: number }) => {
    const terminalSurveys = surveys.filter(
      (s) => s.origenViaje === terminal && s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR"
    )
    const totalEncuestas = terminalSurveys.length
    const maxWeight = Math.max(...Object.values(weights))

    const questionSummaries: QuestionSummary[] = RATING_QUESTIONS.map((q) => {
      const distribution: { [calif: string]: RatingDistribution } = {}
      SATISFACTION_ORDER.forEach((calif) => {
        distribution[calif] = { value: 0, color: SATISFACTION_COLORS[calif] }
      })

      let totalWeightedScore = 0
      let totalResponses = 0

      terminalSurveys.forEach((s) => {
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
    terminalSurveys.forEach((survey) => {
      RATING_QUESTIONS.forEach((q) => {
        const calif = survey[q.key] as string
        if (calif && weights[calif] !== undefined) {
          totalWeightedScoreAll += weights[calif]
          totalResponsesAll += 1
        }
      })
    })

    const maxScaleAll = totalResponsesAll * maxWeight
    const overallSatisfied = maxScaleAll > 0 ? (totalWeightedScoreAll / maxScaleAll) * 100 : 0

    const metaTerminal = getMetaTerminal()
    return {
      totalEncuestas,
      metaTerminal,
      encuestasFaltantes: Math.max(0, metaTerminal - totalEncuestas),
      questionSummaries,
      overallSatisfiedPercentage: overallSatisfied,
      overallUnsatisfiedPercentage: 100 - overallSatisfied,
      isOverallSatisfied: overallSatisfied >= 80,
    }
  }, [RATING_QUESTIONS])

  // Calcular datos para todas las terminales
  const terminalStats = DEFAULT_TERMINALES.map((terminal: string) => {
    const data = processTerminalData(surveys, terminal, DEFAULT_WEIGHTS)
    return {
      terminal,
      ...data,
    }
  })

  // Datos de la terminal seleccionada
  const selectedTerminalData = selectedTerminal
    ? processTerminalData(surveys, selectedTerminal, DEFAULT_WEIGHTS)
    : null

  // Encuestas de la terminal seleccionada
  const selectedTerminalSurveys = selectedTerminal
    ? surveys.filter(
      (s: Survey) => s.origenViaje === selectedTerminal && s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR"
    )
    : []

  // Calcular estadisticas generales
  const totalEncuestasGeneral = terminalStats.reduce((acc: number, stat: any) => acc + stat.totalEncuestas, 0)
  const metaGeneral = getMetaGeneral()
  const terminalesSatisfechas = terminalStats.filter((stat: any) => stat.isOverallSatisfied).length
  const terminalesInsatisfechas = terminalStats.filter((stat: any) => !stat.isOverallSatisfied).length
  const promedioSatisfaccionGeneral = terminalStats.length > 0
    ? terminalStats.reduce((acc: number, stat: any) => acc + stat.overallSatisfiedPercentage, 0) / terminalStats.length
    : 0

  // Renderizar vista de selección de terminales
  const renderTerminalSelection = () => (
    <div className="terminal-selection-container">
      {/* Resumen General */}
      <div className="general-stats-banner">
        <div className="general-stat-item">
          <span className="general-stat-value">{totalEncuestasGeneral}</span>
          <span className="general-stat-label">Encuestas Totales</span>
        </div>
        <div className="general-stat-divider" />
        <div className="general-stat-item">
          <span className="general-stat-value">{metaGeneral}</span>
          <span className="general-stat-label">Meta General</span>
        </div>
        <div className="general-stat-divider" />
        <div className="general-stat-item">
          <span className="general-stat-value positive">{terminalesSatisfechas}</span>
          <span className="general-stat-label">Terminales Satisfechas</span>
        </div>
        <div className="general-stat-divider" />
        <div className="general-stat-item">
          <span className="general-stat-value negative">{terminalesInsatisfechas}</span>
          <span className="general-stat-label">Terminales Insatisfechas</span>
        </div>
        <div className="general-stat-divider" />
        <div className="general-stat-item">
          <span className={`general-stat-value ${promedioSatisfaccionGeneral >= 80 ? 'positive' : 'negative'}`}>
            {promedioSatisfaccionGeneral.toFixed(1)}%
          </span>
          <span className="general-stat-label">Promedio Satisfacción</span>
        </div>
      </div>

      <div className="terminals-grid">
        {terminalStats.map((stat) => (
          <TerminalCard
            key={stat.terminal}
            terminal={stat.terminal}
            encuestas={stat.totalEncuestas}
            satisfaccion={stat.overallSatisfiedPercentage}
            meta={stat.metaTerminal}
            faltantes={stat.encuestasFaltantes}
            onClick={() => setSelectedTerminal(stat.terminal)}
          />
        ))}
      </div>
    </div>
  )

  // Renderizar vista de detalle de terminal
  const renderTerminalDetail = () => {
    if (!selectedTerminalData) return null

    const progreso = selectedTerminalData.metaTerminal > 0
      ? Math.min((selectedTerminalData.totalEncuestas / selectedTerminalData.metaTerminal) * 100, 100)
      : 0

    return (
      <div className="terminal-detail-container">
        {/* Header Principal con Nombre de Terminal */}
        <div className="detail-header-banner">
          <button className="btn-back-modern" onClick={() => setSelectedTerminal(null)}>
            <span className="btn-back-icon">&#8592;</span>
            <span>Regresar</span>
          </button>
          <div className="detail-header-center">
            <h1 className="detail-terminal-name">{selectedTerminal}</h1>
            <div className="detail-header-subtitle">Reporte de Satisfaccion al Cliente</div>
          </div>
          <div className={`detail-status-chip ${selectedTerminalData.isOverallSatisfied ? "satisfied" : "unsatisfied"}`}>
            <span className="status-icon">{selectedTerminalData.isOverallSatisfied ? "✓" : "✗"}</span>
            <span className="status-text">{selectedTerminalData.isOverallSatisfied ? "SATISFECHO" : "INSATISFECHO"}</span>
            <span className="status-percentage">{selectedTerminalData.overallSatisfiedPercentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* KPIs Mejorados */}
        <div className="kpi-section">
          <div className="kpi-grid-modern">
            <div className="kpi-card-modern">
              <div className="kpi-icon-wrapper blue">
                <span className="kpi-icon">&#128203;</span>
              </div>
              <div className="kpi-content">
                <div className="kpi-value-modern">{selectedTerminalData.totalEncuestas}</div>
                <div className="kpi-label-modern">Encuestas Realizadas</div>
              </div>
            </div>
            <div className="kpi-card-modern">
              <div className="kpi-icon-wrapper green">
                <span className="kpi-icon">&#127919;</span>
              </div>
              <div className="kpi-content">
                <div className="kpi-value-modern">{selectedTerminalData.metaTerminal}</div>
                <div className="kpi-label-modern">Meta de Encuestas</div>
              </div>
            </div>
            <div className="kpi-card-modern">
              <div className={`kpi-icon-wrapper ${selectedTerminalData.encuestasFaltantes > 0 ? 'orange' : 'green'}`}>
                <span className="kpi-icon">&#9888;</span>
              </div>
              <div className="kpi-content">
                <div className={`kpi-value-modern ${selectedTerminalData.encuestasFaltantes > 0 ? "negative" : "positive"}`}>
                  {selectedTerminalData.encuestasFaltantes}
                </div>
                <div className="kpi-label-modern">Encuestas Faltantes</div>
              </div>
            </div>
            <div className="kpi-card-modern">
              <div className={`kpi-icon-wrapper ${selectedTerminalData.overallSatisfiedPercentage >= 80 ? 'green' : 'orange'}`}>
                <span className="kpi-icon">&#128200;</span>
              </div>
              <div className="kpi-content">
                <div className={`kpi-value-modern ${selectedTerminalData.overallSatisfiedPercentage >= 80 ? "positive" : "negative"}`}>
                  {selectedTerminalData.overallSatisfiedPercentage.toFixed(1)}%
                </div>
                <div className="kpi-label-modern">Satisfaccion General</div>
              </div>
            </div>
          </div>

          {/* Barra de Progreso General */}
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-title">Avance de Meta</span>
              <span className="progress-value">{progreso.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-large">
              <div
                className="progress-fill-large"
                style={{
                  width: `${progreso}%`,
                  backgroundColor: progreso >= 100 ? '#2a655f' : progreso >= 50 ? '#56c5b6' : '#ff9800'
                }}
              />
            </div>
            <div className="progress-labels">
              <span>0</span>
              <span>{selectedTerminalData.metaTerminal}</span>
            </div>
          </div>
        </div>

        {/* Gráfica de Satisfacción General */}
        <div className="resumen-general-card">
          <h3 className="card-title">Índice de Satisfacción General</h3>
          <div className="resumen-general-content">
            <div className="resumen-chart-section">
              <SatisfactionPieChart
                satisfiedPercentage={selectedTerminalData.overallSatisfiedPercentage}
                unsatisfiedPercentage={selectedTerminalData.overallUnsatisfiedPercentage}
              />
            </div>
            <div className="resumen-info-section">
              <div className="resumen-stats">
                <div className="stat-item">
                  <span className="stat-label">Total de Encuestas Válidas</span>
                  <span className="stat-value positive">{selectedTerminalData.totalEncuestas}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Preguntas Evaluadas</span>
                  <span className="stat-value">{RATING_QUESTIONS.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Preguntas Satisfechas</span>
                  <span className="stat-value positive">
                    {selectedTerminalData.questionSummaries.filter((q) => q.isSatisfied).length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Preguntas Insatisfechas</span>
                  <span className="stat-value negative">
                    {selectedTerminalData.questionSummaries.filter((q) => !q.isSatisfied).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menú de Preguntas Mejorado */}
        <div className="questions-section">
          <div className="section-header-modern">
            <h3 className="section-title-modern">Analisis por Pregunta</h3>
            <p className="section-desc-modern">Haga clic en cualquier pregunta para ver el analisis detallado</p>
          </div>
          <div className="questions-grid-modern">
            {RATING_QUESTIONS.map((question: QuestionConfig, index: number) => {
              const summary = selectedTerminalData.questionSummaries.find((q: QuestionSummary) => q.questionKey === question.key)
              return (
                <div
                  key={question.id}
                  className={`question-card-modern ${summary?.isSatisfied ? "satisfied" : "unsatisfied"}`}
                  onClick={() => setSelectedQuestion(question)}
                >
                  <div className="question-card-header">
                    <span className="question-badge">{index + 1}</span>
                    <span className={`question-chip ${summary?.isSatisfied ? "satisfied" : "unsatisfied"}`}>
                      {summary?.isSatisfied ? "Satisfecho" : "Insatisfecho"}
                    </span>
                  </div>
                  <h4 className="question-card-title">{question.title}</h4>
                  <div className="question-card-stats">
                    <div className="question-stat-item">
                      <span className="question-stat-label">Satisfaccion</span>
                      <span className={`question-stat-value ${summary?.isSatisfied ? "positive" : "negative"}`}>
                        {summary?.satisfiedPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="question-stat-item">
                      <span className="question-stat-label">Respuestas</span>
                      <span className="question-stat-value">{summary?.totalResponses || 0}</span>
                    </div>
                  </div>
                  <div className="question-progress-mini">
                    <div
                      className="question-progress-fill"
                      style={{
                        width: `${summary?.satisfiedPercentage || 0}%`,
                        backgroundColor: summary?.isSatisfied ? '#2a655f' : '#ff9800'
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabla de Resumen por Pregunta */}
        <div className="resumen-table-card">
          <h3>Resumen de Satisfacción por Pregunta</h3>
          <div className="table-wrapper">
            <table className="chart-data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pregunta</th>
                  <th style={{ textAlign: "center" }}>Respuestas</th>
                  <th style={{ textAlign: "center" }}>% Satisfacción</th>
                  <th style={{ textAlign: "center" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {selectedTerminalData.questionSummaries.map((summary, index) => (
                  <tr key={summary.questionKey}>
                    <td>{index + 1}</td>
                    <td>{summary.title}</td>
                    <td style={{ textAlign: "center" }}>{summary.totalResponses}</td>
                    <td
                      style={{ textAlign: "center", fontWeight: "600" }}
                      className={summary.isSatisfied ? "positive" : "negative"}
                    >
                      {summary.satisfiedPercentage.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`status-badge ${summary.isSatisfied ? "satisfied" : "unsatisfied"}`}>
                        {summary.isSatisfied ? "SATISFECHO" : "INSATISFECHO"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de Últimas Encuestas */}
        {selectedTerminalSurveys.length > 0 && (
          <div className="resumen-table-card">
            <h3>Últimas Encuestas de la Terminal ({Math.min(10, selectedTerminalSurveys.length)} más recientes)</h3>
            <div className="table-wrapper">
              <table className="chart-data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Encuestador</th>
                    <th>Destino</th>
                    <th style={{ textAlign: "center" }}>Exp. Compra</th>
                    <th style={{ textAlign: "center" }}>Conductor</th>
                    <th style={{ textAlign: "center" }}>Comodidad</th>
                    <th style={{ textAlign: "center" }}>Limpieza</th>
                    <th style={{ textAlign: "center" }}>Seguridad</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTerminalSurveys.slice(0, 10).map((survey) => (
                    <tr key={survey._id}>
                      <td>{survey.fecha || "N/A"}</td>
                      <td>{survey.claveEncuestador || "N/A"}</td>
                      <td>{survey.destinoFinal || "N/A"}</td>
                      <td style={{ textAlign: "center" }}>{survey.califExperienciaCompra || "N/A"}</td>
                      <td style={{ textAlign: "center" }}>{survey.califServicioConductor || "N/A"}</td>
                      <td style={{ textAlign: "center" }}>{survey.califComodidad || "N/A"}</td>
                      <td style={{ textAlign: "center" }}>{survey.califLimpieza || "N/A"}</td>
                      <td style={{ textAlign: "center" }}>{survey.califSeguridad || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Renderizado principal
  return (
    <div className="presentacion-container">
      {/* Header */}
      <header className="presentacion-header">
        <div className="header-top-bar">
          <div className="header-logo-container">
            <img src="/logo_flecha_roja.png" alt="Logo Flecha Roja" className="header-logo" />
          </div>
          <h1 className="header-title-main">SISTEMA DE SATISFACCIÓN AL CLIENTE - FLECHA ROJA</h1>
          <button onClick={() => setShowSettingsModal(true)} className="btn-settings-header">
            Ajustes
          </button>
          <button onClick={onLogout} className="btn-logout">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="presentacion-main-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando datos...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="btn-retry" onClick={fetchSurveys}>
              Reintentar
            </button>
          </div>
        ) : selectedTerminal ? (
          renderTerminalDetail()
        ) : (
          renderTerminalSelection()
        )}
      </main>

      {/* Modal de Pregunta */}
      {selectedQuestion && selectedTerminalData && (
        <QuestionDetailModal
          question={selectedQuestion}
          summary={selectedTerminalData.questionSummaries.find((q: QuestionSummary) => q.questionKey === selectedQuestion.key)!}
          totalEncuestas={selectedTerminalData.totalEncuestas}
          questions={RATING_QUESTIONS}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  )
}

export default Presentacion
