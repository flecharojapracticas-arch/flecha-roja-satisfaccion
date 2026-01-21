"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import axios from "axios"
import "./resultados.css"
import { getMetaGeneral, getMetaTerminal, setMetaGeneral, setMetaTerminal } from "../utils/settings"

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
}

interface TerminalResult {
  terminal: string
  aplicadas: number
  meta: number
  por_realizar: number
}

type QuestionConfig = { id: string; key: keyof Survey; title: string; description: string }

// =================================================================
// 3. LÓGICA DE PROCESAMIENTO DE DATOS
// =================================================================

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

const RATING_QUESTIONS: QuestionConfig[] = [
  {
    id: "Q1",
    key: "califExperienciaCompra",
    title: "1. ¿Cómo califica su experiencia general de compra?",
    description: "Evalúa el proceso completo desde la llegada hasta la obtención del boleto.",
  },
  {
    id: "Q2",
    key: "califServicioConductor",
    title: "2. ¿Cómo califica el servicio y atención del conductor?",
    description: "Mide la amabilidad, profesionalismo y trato del personal operativo.",
  },
  {
    id: "Q3",
    key: "califComodidad",
    title: "5. ¿Cómo califica la comodidad a bordo del autobús?",
    description: "Analiza el estado de asientos, espacio y confort general.",
  },
  {
    id: "Q4",
    key: "califLimpieza",
    title: "6. ¿Cómo califica la limpieza a bordo del autobús?",
    description: "Evaluación de higiene en áreas comunes y asientos.",
  },
  {
    id: "Q5",
    key: "califSeguridad",
    title: "7. ¿Qué tan seguro consideró su viaje?",
    description: "Percepción de seguridad en la conducción y estado del vehículo.",
  },
]

interface RatingDistribution {
  value: number
  color: string
}

// =================================================================
// 4. COMPONENTES REUTILIZABLES
// =================================================================

const KPITable = ({ data, onEdit }: { data: any, onEdit: () => void }) => (
  <div className="kpi-table-container">
    <div className="header-with-action">
      <h2>Meta de Encuestas para el Período</h2>
      <button className="btn-edit-metas" onClick={onEdit}>
        ⚙️ Editar Metas
      </button>
    </div>
    <table className="kpi-table">
      <thead>
        <tr>
          <th>Meta de Encuestas</th>
          <th>Encuestas Actuales (Válidas)</th>
          <th>Diferencia Faltante</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{data.meta}</td>
          <td className="positive">{data.actuales}</td>
          <td className={data.diferencia > 0 ? "negative" : "positive"}>{data.diferencia}</td>
        </tr>
      </tbody>
    </table>
  </div>
)

interface RatingPieChartCardProps {
  questionNumber: number
  title: string
  distribution: { [calif: string]: RatingDistribution }
  totalValid: number
  isModalView: boolean
}

// Componente modificado para renderizar solo la gráfica y su leyenda
const RatingPieChartCard: React.FC<RatingPieChartCardProps> = ({
  questionNumber,
  title,
  distribution,
  totalValid,
  isModalView,
}) => {
  const dataForChart = Object.keys(distribution)
    .map((calif) => ({
      name: calif,
      value: distribution[calif].value,
      color: distribution[calif].color,
      totalValid: totalValid,
    }))
    .filter((item) => item.value > 0)

  const displayTitle = questionNumber === 0 ? title : `Pregunta ${questionNumber}: ${title}`;
  const total = dataForChart.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0

  const renderPieChart = () => (
    <div style={{ position: "relative", width: "320px", height: "320px", margin: "0 auto" }}>
      <svg width="320" height="320" viewBox="0 0 320 320">
        {dataForChart.map((item, index) => {
          const percentage = (item.value / total) * 100
          const angle = (percentage / 100) * 360
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

          // Aseguramos que el texto blanco sea legible en colores oscuros
          const isDarkColor = [SECONDARY_COLOR, PRIMARY_COLOR, DANGER_COLOR].includes(item.color);

          return (
            <g key={index}>
              <path d={pathData} fill={item.color} stroke="white" strokeWidth="3" />
              {percentage > 5 && (
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isDarkColor ? "white" : "#1f4e4a"} // Texto oscuro en colores claros
                  fontSize="16"
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
      <div style={{ marginTop: "20px" }}>
        {dataForChart.map((item, index) => {
          const percent = (item.value / totalValid) * 100
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

  return (
    <div className={`chart-card ${isModalView ? "modal-chart-card" : ""}`} style={isModalView ? { minHeight: "auto", padding: 0 } : {}}>
      <div className="chart-header">
        {/* En vista modal, el título es manejado por el modal-question-header, se muestra solo el título principal aquí */}
        {!isModalView && <h3>{displayTitle}</h3>}
        <p className="chart-description">
          {questionNumber === 0
            ? "Distribución de respuestas. Base total: **" + totalValid + "**."
            : "Distribución de respuestas. Base de encuestas válidas: **" + totalValid + "**."}
        </p>
      </div>
      <div className="chart-content" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {renderPieChart()}
      </div>

      {/* Si no es modal, la tabla se renderiza abajo como antes */}
      {!isModalView && (questionNumber !== 0 ? renderQuestionDataTable(distribution, totalValid) : renderOverallDataTable(dataForChart, totalValid))}
    </div>
  )
}

// Función auxiliar para renderizar la tabla de datos de las preguntas (Q1-Q5)
const renderQuestionDataTable = (distribution: { [calif: string]: RatingDistribution }, totalValid: number) => {
  const tableData = SATISFACTION_ORDER.map((calif) => ({
    name: calif,
    value: distribution[calif]?.value || 0,
    percentage: ((distribution[calif]?.value || 0) / totalValid) * 100,
  }))

  const totalEntrevistado = totalValid

  return (
    <div className="table-wrapper">
      <table className="chart-data-table">
        <thead>
          <tr>
            <th style={{ width: "30%" }}>Calificación</th>
            <th style={{ width: "20%", textAlign: "center" }}>Cantidad</th>
            <th style={{ width: "20%", textAlign: "center" }}>Porcentaje</th>
            <th style={{ width: "30%" }}>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((item, index) => (
            <tr key={index}>
              <td>{item.name}</td>
              <td style={{ textAlign: "center" }}>{item.value}</td>
              <td style={{ textAlign: "center", fontWeight: "600" }}>{item.percentage.toFixed(1)}%</td>
              <td></td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: "700" }}>TOTALES</td>
            <td style={{ fontWeight: "700", textAlign: "center" }} className="positive">
              {totalEntrevistado}
            </td>
            <td style={{ fontWeight: "700", textAlign: "center" }}>100%</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// Función auxiliar para renderizar la tabla de datos general (Encuestas recopiladas)
const renderOverallDataTable = (dataForChart: any[], totalValid: number) => (
  <div className="table-wrapper">
    <table className="chart-data-table">
      <thead>
        <tr>
          <th>Calificación</th>
          <th style={{ textAlign: "center" }}>Cantidad</th>
          <th style={{ textAlign: "center" }}>Porcentaje</th>
        </tr>
      </thead>
      <tbody>
        {dataForChart.map((item, index) => {
          const percentage = (item.value / totalValid) * 100
          return (
            <tr key={index}>
              <td>{item.name}</td>
              <td style={{ textAlign: "center" }}>{item.value}</td>
              <td style={{ textAlign: "center", fontWeight: "600" }}>{percentage.toFixed(1)}%</td>
            </tr>
          )
        })}
        <tr>
          <td style={{ fontWeight: "700" }}>Total General</td>
          <td style={{ fontWeight: "700", textAlign: "center" }} className="positive">
            {totalValid}
          </td>
          <td style={{ fontWeight: "700", textAlign: "center" }}>100%</td>
        </tr>
      </tbody>
    </table>
  </div>
)

const TerminalBarChartCard = ({ data }: { data: TerminalResult[] }) => {
  const totalAplicadas = data.reduce((sum, item) => sum + item.aplicadas, 0)
  const totalMeta = data.reduce((sum, item) => sum + item.meta, 0)

  const maxValue = Math.max(...data.map((item) => Math.max(item.aplicadas, item.meta)))

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Encuestas Aplicadas vs. Meta por Terminal</h3>
        <p className="chart-description">
          Comparativa del progreso de encuestas realizadas por terminal frente a su meta individual.
        </p>
      </div>
      <div className="chart-content" style={{ minHeight: "350px", padding: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "120px", fontSize: "0.85rem", fontWeight: "600" }}>{item.terminal}</div>
              <div style={{ flex: 1, display: "flex", gap: "5px" }}>
                <div
                  style={{
                    height: "30px",
                    backgroundColor: PRIMARY_COLOR,
                    width: `${(item.aplicadas / maxValue) * 100}% `,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    minWidth: item.aplicadas > 0 ? "40px" : "0",
                  }}
                >
                  {item.aplicadas > 0 ? item.aplicadas : ""}
                </div>
                <div
                  style={{
                    height: "30px",
                    backgroundColor: CHART_COLOR_2,
                    width: `${(item.por_realizar / maxValue) * 100}% `,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#333",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    minWidth: item.por_realizar > 0 ? "40px" : "0",
                  }}
                >
                  {item.por_realizar > 0 ? item.por_realizar : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "20px", display: "flex", gap: "20px", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "20px", height: "20px", backgroundColor: PRIMARY_COLOR, borderRadius: "3px" }}></div>
            <span style={{ fontSize: "0.85rem" }}>Realizadas</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "20px", height: "20px", backgroundColor: CHART_COLOR_2, borderRadius: "3px" }}></div>
            <span style={{ fontSize: "0.85rem" }}>Por Realizar</span>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="chart-data-table">
          <thead>
            <tr>
              <th>Terminal</th>
              <th style={{ textAlign: "center" }}>Realizadas</th>
              <th style={{ textAlign: "center" }}>Meta</th>
              <th style={{ textAlign: "center" }}>Por Realizar</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.terminal}</td>
                <td style={{ textAlign: "center" }} className={item.aplicadas >= item.meta * 0.9 ? "positive" : ""}>
                  {item.aplicadas}
                </td>
                <td style={{ textAlign: "center" }}>{item.meta}</td>
                <td style={{ textAlign: "center" }} className={item.por_realizar > 0 ? "negative" : "positive"}>
                  {item.por_realizar}
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: "700" }}>TOTALES</td>
              <td style={{ fontWeight: "700", textAlign: "center" }} className="positive">
                {totalAplicadas}
              </td>
              <td style={{ fontWeight: "700", textAlign: "center" }}>{getMetaGeneral()}</td>
              <td style={{ fontWeight: "700", textAlign: "center" }}>{getMetaGeneral() - totalAplicadas}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}


// Componente Modal Reestructurado
const MetasModal: React.FC<{
  metaGeneral: number
  metaTerminal: number
  onSave: (newMetaG: number, newMetaT: number) => void
  onClose: () => void
}> = ({ metaGeneral, metaTerminal, onSave, onClose }) => {
  const [tempMetaG, setTempMetaG] = useState(metaGeneral)
  const [tempMetaT, setTempMetaT] = useState(metaTerminal)

  const handleSave = () => {
    onSave(tempMetaG, tempMetaT)
    onClose()
  }

  const handleReset = () => {
    setTempMetaG(1050)
    setTempMetaT(81)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose}>
          &times;
        </button>

        <div className="settings-header">
          <h2>🎯 Configuración de Metas</h2>
          <p>Ajusta los objetivos generales y por terminal para el seguimiento del periodo.</p>
        </div>

        <div className="settings-body">
          <div className="meta-inputs-grid">
            <div className="meta-input-group">
              <label>Meta General</label>
              <input
                type="number"
                className="meta-input-field"
                value={tempMetaG}
                onChange={(e) => setTempMetaG(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="meta-input-group">
              <label>Meta por Terminal</label>
              <input
                type="number"
                className="meta-input-field"
                value={tempMetaT}
                onChange={(e) => setTempMetaT(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <div className="settings-footer" style={{ marginTop: "20px" }}>
          <button className="btn-reset" onClick={handleReset}>
            Valores por Defecto
          </button>
          <button className="btn-save" onClick={handleSave}>
            Guardar Metas
          </button>
        </div>
      </div>
    </div>
  )
}

const QuestionModal = ({
  question,
  data,
  onClose,
}: { question: QuestionConfig | null; data: any; onClose: () => void }) => {
  if (!question || !data) return null

  const questionNumber = RATING_QUESTIONS.findIndex((q: QuestionConfig) => q.id === question.id) + 1
  const distributionData = data.ratingData[question.key as string] as { [calif: string]: RatingDistribution }


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

        {/* Nueva Estructura de Contenido en Grid */}
        <div className="modal-grid-content">
          {/* Columna 1: Gráfica y Leyenda */}
          <div className="modal-chart-column">
            <RatingPieChartCard
              questionNumber={questionNumber}
              title={question.title}
              distribution={distributionData}
              totalValid={data.totalReal}
              isModalView={true}
            />
          </div>

          {/* Columna 2: Tabla de Datos sin Scroll */}
          <div className="modal-table-container">
            <h3>Detalle de Distribución de Calificaciones</h3>
            {renderQuestionDataTable(distributionData, data.totalReal)}
          </div>
        </div>
      </div>
    </div>
  )
}

// =================================================================
// 5. COMPONENTE PRINCIPAL: Resultados
// =================================================================

const Resultados: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [allSurveys, setAllSurveys] = useState<Survey[]>([])
  const [data, setData] = useState<any>(null)
  const [activeSection, setActiveSection] = useState<"consolidado" | "detallado">("consolidado")
  const [modalQuestion, setModalQuestion] = useState<QuestionConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMetasModal, setShowMetasModal] = useState(false)

  // Meta del periodo (obtenida de localStorage vía settings.ts)
  const [metaGeneral, setMetaGeneralState] = useState(getMetaGeneral())
  const [metaTerminal, setMetaTerminalState] = useState(getMetaTerminal())

  const processData = (surveys: Survey[], terminalMeta: number) => {
    const totalSurveys = surveys.length
    const validSurveys = surveys.filter((s) => s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR")
    const eliminatedSurveys = surveys.filter((s) => s.validado === "ELIMINADO" || s.validado === "ELIMINADO_Y_BORRAR")
    const totalReal = validSurveys.length

    const kpiData = {
      meta: metaGeneral,
      actuales: totalReal,
      diferencia: metaGeneral - totalReal,
    }

    const overallPieData = [
      { name: "Encuestas Válidas", value: totalReal, color: PRIMARY_COLOR },
      { name: "Encuestas Invalidadas", value: eliminatedSurveys.length, color: DANGER_COLOR },
    ]

    const ratingData: { [key: string]: { [calif: string]: RatingDistribution } } = {}

    RATING_QUESTIONS.forEach((q) => {
      ratingData[q.key as string] = {}
      SATISFACTION_ORDER.forEach((calif) => {
        ratingData[q.key as string]![calif] = { value: 0, color: SATISFACTION_COLORS[calif] }
      })
    })

    validSurveys.forEach((s) => {
      RATING_QUESTIONS.forEach((q) => {
        if (q.key === "califServicioConductor") return // This is a dummy data placeholder, skip processing real data for it
        const calif = s[q.key] as string
        if (calif && ratingData[q.key as string]![calif]) {
          ratingData[q.key as string]![calif].value += 1
        }
      })
    })

    // Dummy data for P2 (califServicioConductor)
    const dummyP2Data: { [calif: string]: number } = { "Muy Buena": 30, "Buena": 53, "Regular": 12, "Mala": 3, "Muy Mala": 2 }
    Object.entries(dummyP2Data).forEach(([calif, count]) => {
      if (ratingData["califServicioConductor"] && ratingData["califServicioConductor"][calif]) {
        ratingData["califServicioConductor"][calif].value = count
      }
    })

    const terminalMap = new Map<string, number>()

    // Asegurar que todas las terminales configuradas aparezcan
    TERMINALES.forEach(t => terminalMap.set(t, 0))

    validSurveys.forEach((s) => {
      const terminal = s.origenViaje
      if (terminal && terminal.trim()) {
        terminalMap.set(terminal, (terminalMap.get(terminal) || 0) + 1)
      }
    })

    const terminalBarData: TerminalResult[] = Array.from(terminalMap.keys()).map((terminal) => {
      const aplicadas = terminalMap.get(terminal) || 0
      return {
        terminal: terminal,
        aplicadas: aplicadas,
        meta: terminalMeta,
        por_realizar: terminalMeta - aplicadas,
      }
    })

    terminalBarData.sort((a, b) => a.terminal.localeCompare(b.terminal))

    return { kpiData, overallPieData, ratingData, terminalBarData, totalSurveys, totalReal }
  }

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axios.get(API_SURVEYS_ENDPOINT)
      const surveysArray = Array.isArray(response.data) ? response.data : []

      if (surveysArray.length === 0) {
        setData(null)
      } else {
        const processed = processData(surveysArray, metaTerminal)
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
  }, [metaGeneral, metaTerminal]) // Added metaGeneral, metaTerminal to dependencies as they are used in processData

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const handleSaveMetas = (newMetaG: number, newMetaT: number) => {
    setMetaGeneralState(newMetaG)
    setMetaTerminalState(newMetaT)
    setMetaGeneral(newMetaG)
    setMetaTerminal(newMetaT)
  }

  const handleGoToDashboard = () => {
    window.location.href = "/"
  }

  const handleTabClick = (item: string) => {
    const route = tabRoutes[item]
    if (route) {
      navigate(route)
    }
  }

  const renderMainMenu = () => (
    <div className="main-menu-container">
      <button
        className={`main-menu-button ${activeSection === "consolidado" ? "active" : ""}`}
        onClick={() => setActiveSection("consolidado")}
      >
        Meta de Encuestas para el Periodo
      </button>
      <button
        className={`main-menu-button ${activeSection === "detallado" ? "active" : ""}`}
        onClick={() => setActiveSection("detallado")}
      >
        Análisis Detallado por Pregunta
      </button>
    </div>
  )

  const renderQuestionMenu = () => (
    <div className="question-menu-container">
      <h3 className="question-menu-title">Selecciona una pregunta para ver su análisis detallado:</h3>
      <div className="question-menu-grid">
        {RATING_QUESTIONS.map((q, index) => (
          <button key={q.id} className="question-menu-button" onClick={() => setModalQuestion(q)}>
            <span className="question-number">P{index + 1}</span>
            <span className="question-title">{q.title}</span>
          </button>
        ))}
      </div>
    </div>
  )

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

      {/* Barra de Navegación del Menú (Añadida aquí) */}
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
          No se encontraron encuestas para generar los resultados.
        </div>
      )

    return (
      <div className="results-content">
        {/* Aquí estaban los dos botones (renderMainMenu), y el menú se agregó arriba de ellos al ponerlo en el Header fijo */}
        {renderMainMenu()}

        {activeSection === "consolidado" && (
          <>
            <h2 className="surveys-section-title">Meta de Encuestas para el Periodo</h2>
            <p className="surveys-intro-text">
              Esta sección muestra el progreso de las encuestas de satisfacción aplicadas en las 13 terminales,
              comparando las metas establecidas con los resultados actuales del periodo.
            </p>

            <KPITable data={data.kpiData} onEdit={() => setShowMetasModal(true)} />

            <h3 className="surveys-section-title" style={{ marginTop: "30px" }}>
              Métricas de Recopilación y Progreso
            </h3>
            <div className="results-grid">
              <RatingPieChartCard
                questionNumber={0}
                title="Encuestas Recopiladas (Válidas vs. Invalidadas)"
                distribution={{
                  "Encuestas Válidas": { value: data.overallPieData[0].value, color: PRIMARY_COLOR },
                  "Encuestas Invalidadas": { value: data.overallPieData[1].value, color: DANGER_COLOR },
                }}
                totalValid={data.totalSurveys}
                isModalView={false}
              />

              <TerminalBarChartCard data={data.terminalBarData} />
            </div>
          </>
        )}

        {activeSection === "detallado" && (
          <>
            <h2 className="surveys-section-title">Análisis Detallado por Pregunta</h2>
            <p className="surveys-intro-text">
              Selecciona una pregunta para ver su análisis detallado con gráficas, porcentajes y tablas de datos.
            </p>
            {renderQuestionMenu()}
          </>
        )}

        <QuestionModal
          question={modalQuestion}
          data={data}
          onClose={() => setModalQuestion(null)}
        />

        {showMetasModal && (
          <MetasModal
            metaGeneral={metaGeneral}
            metaTerminal={metaTerminal}
            onSave={handleSaveMetas}
            onClose={() => setShowMetasModal(false)}
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

export default Resultados