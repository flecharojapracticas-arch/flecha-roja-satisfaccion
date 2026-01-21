"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Calendar,
  Plus,
  ClipboardList,
  AlertCircle,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Download,
  Search,
  ChevronDown,
  BarChart3,
  PieChart,
} from "lucide-react"
import "./Periodos.css"

const navItems = ["ENCUESTAS", "ANÁLISIS", "RESULTADOS", "RESUMEN", "BIMESTRES"]

const tabRoutes: { [key: string]: string } = {
  ENCUESTAS: "/dashboard/encuestas",
  ANÁLISIS: "/dashboard/analisis",
  RESULTADOS: "/dashboard/resultados",
  RESUMEN: "/dashboard/resumen",
  BIMESTRES: "/dashboard/periodos",
}

const API_ENCUESTAS_URL = "https://flecha-roja-satisfaccion.onrender.com/api/dashboard/encuestas"
const API_PERIODOS_URL = "https://flecha-roja-satisfaccion.onrender.com/api/periodos"

// Colores
const PRIMARY_COLOR = "#2a655f"
const CHART_COLOR_2 = "#90d3d3"
const COLOR_SATISFECHO = PRIMARY_COLOR
const COLOR_INSATISFECHO = CHART_COLOR_2

// Ponderación por defecto (igual que en Resumen)
const DEFAULT_WEIGHTS: { [key: string]: number } = {
  "Muy Buena": 3,
  Buena: 2,
  Regular: 1,
  Mala: 0,
  "Muy Mala": 0,
}

const RATING_KEYS = [
  "califExperienciaCompra",
  "califServicioConductor",
  "califComodidad",
  "califLimpieza",
  "califSeguridad",
]

const RATING_LABELS: { [key: string]: string } = {
  califExperienciaCompra: "Experiencia de Compra",
  califServicioConductor: "Servicio del Conductor",
  califComodidad: "Comodidad",
  califLimpieza: "Limpieza",
  califSeguridad: "Seguridad",
}

interface Survey {
  _id: string
  claveEncuestador: string
  fecha: string
  noEco: string
  folioBoleto: string
  origenViaje: string
  destinoFinal: string
  medioAdquisicion: string
  califExperienciaCompra: string
  comentExperienciaCompra: string
  califServicioConductor: string
  comentServicioConductor: string
  califComodidad: string
  comentComodidad: string
  califLimpieza: string
  comentLimpieza: string
  califSeguridad: string
  especifSeguridad: string
  cumplioExpectativas: string
  especificarMotivo: string
  validado: string
}

interface Periodo {
  id: string
  nombre: string
  fechaInicio: string
  fechaFin: string
  encuestas: Survey[]
  createdAt: string
}

// Función para calcular el porcentaje de satisfacción de un bimestre
const calcularSatisfaccionBimestre = (encuestas: Survey[], weights: { [key: string]: number }): number => {
  const validSurveys = encuestas.filter((s) => s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR")

  if (validSurveys.length === 0) return 0

  const maxWeight = Math.max(...Object.values(weights))
  let totalWeightedScore = 0
  let totalResponses = 0

  validSurveys.forEach((survey) => {
    RATING_KEYS.forEach((key) => {
      const calif = (survey as any)[key] as string
      if (calif && weights[calif] !== undefined) {
        totalWeightedScore += weights[calif]
        totalResponses += 1
      }
    })
  })

  const maxPossibleScore = totalResponses * maxWeight
  return maxPossibleScore > 0 ? (totalWeightedScore / maxPossibleScore) * 100 : 0
}

const calcularSatisfaccionPorCategoria = (
  encuestas: Survey[],
  weights: { [key: string]: number },
): { [key: string]: number } => {
  const validSurveys = encuestas.filter((s) => s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR")
  const maxWeight = Math.max(...Object.values(weights))
  const resultados: { [key: string]: number } = {}

  RATING_KEYS.forEach((key) => {
    let totalScore = 0
    let count = 0

    validSurveys.forEach((survey) => {
      const calif = (survey as any)[key] as string
      if (calif && weights[calif] !== undefined) {
        totalScore += weights[calif]
        count += 1
      }
    })

    resultados[key] = count > 0 ? (totalScore / (count * maxWeight)) * 100 : 0
  })

  return resultados
}

const obtenerMejorYPeorCategoria = (categorias: { [key: string]: number }): {
  mejor: { key: string; value: number } | null
  peor: { key: string; value: number } | null
  todasIguales: boolean
  variacion: number
} => {
  const entries = Object.entries(categorias)
  if (entries.length === 0) return { mejor: null, peor: null, todasIguales: true, variacion: 0 }

  let mejor = entries[0]
  let peor = entries[0]

  entries.forEach(([key, value]) => {
    if (value > mejor[1]) mejor = [key, value]
    if (value < peor[1]) peor = [key, value]
  })

  const variacion = mejor[1] - peor[1]
  const todasIguales = variacion < 0.1 // Si la diferencia es menor a 0.1%, consideramos que son iguales

  return {
    mejor: { key: mejor[0], value: mejor[1] },
    peor: { key: peor[0], value: peor[1] },
    todasIguales,
    variacion,
  }
}

const obtenerAnalisisInteligente = (
  encuestas: Survey[],
  categorias: { [key: string]: number },
  satisfaccionGeneral: number,
): {
  puntoFuerte: string
  areaMejora: string
  mensaje: string
  nivel: "excelente" | "bueno" | "regular" | "necesitaMejora"
} => {
  const analisis = obtenerMejorYPeorCategoria(categorias)

  // Determinar nivel general
  let nivel: "excelente" | "bueno" | "regular" | "necesitaMejora"
  if (satisfaccionGeneral >= 90) nivel = "excelente"
  else if (satisfaccionGeneral >= 80) nivel = "bueno"
  else if (satisfaccionGeneral >= 60) nivel = "regular"
  else nivel = "necesitaMejora"

  // Si todas las categorías son iguales
  if (analisis.todasIguales) {
    const valorUniforme = analisis.mejor?.value || 0
    if (valorUniforme >= 90) {
      return {
        puntoFuerte: "Todas las áreas con excelente desempeño",
        areaMejora: "Sin áreas críticas identificadas",
        mensaje: `Desempeño uniforme y excelente (${valorUniforme.toFixed(1)}%) en todas las categorías.`,
        nivel,
      }
    } else if (valorUniforme >= 80) {
      return {
        puntoFuerte: "Desempeño consistente en todas las áreas",
        areaMejora: "Oportunidad de mejora general",
        mensaje: `Desempeño uniforme (${valorUniforme.toFixed(1)}%) - Se recomienda mejorar todas las áreas proporcionalmente.`,
        nivel,
      }
    } else {
      return {
        puntoFuerte: "Consistencia en el servicio",
        areaMejora: "Todas las áreas requieren atención",
        mensaje: `Desempeño uniforme bajo (${valorUniforme.toFixed(1)}%) - Se necesita un plan de mejora integral.`,
        nivel,
      }
    }
  }

  // Caso normal: hay diferencias entre categorías
  const puntoFuerte = analisis.mejor
    ? `${RATING_LABELS[analisis.mejor.key]} (${analisis.mejor.value.toFixed(1)}%)`
    : "N/A"

  const areaMejora = analisis.peor ? `${RATING_LABELS[analisis.peor.key]} (${analisis.peor.value.toFixed(1)}%)` : "N/A"

  let mensaje = ""
  if (analisis.mejor && analisis.peor) {
    const diferencia = analisis.mejor.value - analisis.peor.value
    if (diferencia > 20) {
      mensaje = `Existe una brecha significativa de ${diferencia.toFixed(1)}% entre las áreas. Se recomienda enfocarse en mejorar ${RATING_LABELS[analisis.peor.key]}.`
    } else if (diferencia > 10) {
      mensaje = `Diferencia moderada entre áreas. ${RATING_LABELS[analisis.mejor.key]} destaca positivamente.`
    } else {
      mensaje = `Desempeño balanceado con pequeñas variaciones entre categorías.`
    }
  }

  return { puntoFuerte, areaMejora, mensaje, nivel }
}

const SatisfactionPieChart: React.FC<{
  satisfiedPercentage: number
  size?: number
  showLegend?: boolean
}> = ({ satisfiedPercentage, size = 200, showLegend = true }) => {
  const unsatisfiedPercentage = 100 - satisfiedPercentage

  const data = [
    { name: "Satisfecho", value: satisfiedPercentage, color: COLOR_SATISFECHO },
    { name: "Insatisfecho", value: unsatisfiedPercentage, color: COLOR_INSATISFECHO },
  ]

  const center = size / 2
  const radius = size * 0.4

  if (satisfiedPercentage === 100) {
    return (
      <div className="satisfaction-pie-container">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill={COLOR_SATISFECHO} stroke="white" strokeWidth="2" />
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={size * 0.08}
            fontWeight="700"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
          >
            100%
          </text>
        </svg>
        {showLegend && (
          <div className="pie-legend">
            <div className="pie-legend-item">
              <span className="pie-legend-color" style={{ backgroundColor: COLOR_SATISFECHO }}></span>
              <span>Satisfecho: 100.0%</span>
            </div>
            <div className="pie-legend-item">
              <span className="pie-legend-color" style={{ backgroundColor: COLOR_INSATISFECHO }}></span>
              <span>Insatisfecho: 0.0%</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (satisfiedPercentage === 0) {
    return (
      <div className="satisfaction-pie-container">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill={COLOR_INSATISFECHO} stroke="white" strokeWidth="2" />
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#1f4e4a"
            fontSize={size * 0.08}
            fontWeight="700"
          >
            0%
          </text>
        </svg>
        {showLegend && (
          <div className="pie-legend">
            <div className="pie-legend-item">
              <span className="pie-legend-color" style={{ backgroundColor: COLOR_SATISFECHO }}></span>
              <span>Satisfecho: 0.0%</span>
            </div>
            <div className="pie-legend-item">
              <span className="pie-legend-color" style={{ backgroundColor: COLOR_INSATISFECHO }}></span>
              <span>Insatisfecho: 100.0%</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Caso normal: hay valores en ambos
  let currentAngle = 0

  return (
    <div className="satisfaction-pie-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, index) => {
          if (item.value === 0) return null // Solo saltar si es exactamente 0 en caso normal

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
              <path d={pathData} fill={item.color} stroke="white" strokeWidth="2" />
              {item.value > 5 && (
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isDarkColor ? "white" : "#1f4e4a"}
                  fontSize={size * 0.06}
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
      {showLegend && (
        <div className="pie-legend">
          <div className="pie-legend-item">
            <span className="pie-legend-color" style={{ backgroundColor: COLOR_SATISFECHO }}></span>
            <span>Satisfecho: {satisfiedPercentage.toFixed(1)}%</span>
          </div>
          <div className="pie-legend-item">
            <span className="pie-legend-color" style={{ backgroundColor: COLOR_INSATISFECHO }}></span>
            <span>Insatisfecho: {unsatisfiedPercentage.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

const CalendarioSelector: React.FC<{
  selectedDate: string
  onDateSelect: (date: string) => void
  label: string
  periodos?: Periodo[]
  excludePeriodoId?: string
}> = ({ selectedDate, onDateSelect, label, periodos = [], excludePeriodoId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    const days: (number | null)[] = []
    for (let i = 0; i < startingDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  const formatDateString = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = String(currentMonth.getMonth() + 1).padStart(2, "0")
    const dayStr = String(day).padStart(2, "0")
    return `${year}-${month}-${dayStr}`
  }

  const isSelected = (day: number) => selectedDate === formatDateString(day)

  const isDayInPeriodo = (day: number): boolean => {
    const dateStr = formatDateString(day)
    const dateToCheck = new Date(dateStr)

    return periodos.some((periodo) => {
      if (excludePeriodoId && periodo.id === excludePeriodoId) return false
      const fechaInicio = new Date(periodo.fechaInicio)
      const fechaFin = new Date(periodo.fechaFin)
      fechaFin.setHours(23, 59, 59, 999)
      return dateToCheck >= fechaInicio && dateToCheck <= fechaFin
    })
  }

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]
  const dayNames = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"]

  return (
    <div className="calendario-container">
      <label className="calendario-label">{label}</label>
      <div className="calendario-widget">
        <div className="calendario-header">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="calendario-nav-btn"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="calendario-month-year">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="calendario-nav-btn"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="calendario-days-header">
          {dayNames.map((day) => (
            <span key={day} className="calendario-day-name">
              {day}
            </span>
          ))}
        </div>
        <div className="calendario-days-grid">
          {getDaysInMonth(currentMonth).map((day, index) => (
            <button
              key={index}
              type="button"
              className={`calendario-day ${day === null ? "empty" : ""} ${day && isSelected(day) ? "selected" : ""} ${day && isDayInPeriodo(day) ? "ocupado" : ""}`}
              onClick={() => day && onDateSelect(formatDateString(day))}
              disabled={day === null}
            >
              {day}
            </button>
          ))}
        </div>
        {selectedDate && (
          <div className="calendario-selected-display">
            <strong>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            </strong>
          </div>
        )}
        <div className="calendario-legend">
          <span className="legend-item">
            <span className="legend-color ocupado"></span>
            Bimestre existente
          </span>
        </div>
      </div>
    </div>
  )
}

const Periodos: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [nombrePeriodo, setNombrePeriodo] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [todasEncuestas, setTodasEncuestas] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCrearModal, setShowCrearModal] = useState(false)
  const [showEncuestasModal, setShowEncuestasModal] = useState(false)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<Periodo | null>(null)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState<Survey | null>(null)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [periodoEditando, setPeriodoEditando] = useState<Periodo | null>(null)
  const [nombrePeriodoEdit, setNombrePeriodoEdit] = useState("")
  const [fechaInicioEdit, setFechaInicioEdit] = useState("")
  const [fechaFinEdit, setFechaFinEdit] = useState("")
  const [paginaActual, setPaginaActual] = useState(1)
  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("TODOS")
  const encuestasPorPagina = 15
  const [usarAPI] = useState(false)

  const [showComparacionModal, setShowComparacionModal] = useState(false)
  const [bimestre1Id, setBimestre1Id] = useState<string>("")
  const [bimestre2Id, setBimestre2Id] = useState<string>("")
  const [weights] = useState<{ [key: string]: number }>(DEFAULT_WEIGHTS)

  const [showResumenRapidoModal, setShowResumenRapidoModal] = useState(false)
  const [periodoResumen, setPeriodoResumen] = useState<Periodo | null>(null)

  useEffect(() => {
    fetchEncuestas()
    cargarPeriodos()
  }, [])

  const cargarPeriodos = async () => {
    if (usarAPI) {
      try {
        const response = await fetch(API_PERIODOS_URL)
        if (response.ok) {
          const data = await response.json()
          setPeriodos(data)
          return
        }
      } catch (err) {
        console.log("API no disponible, usando localStorage")
      }
    }
    const periodosGuardados = localStorage.getItem("periodos_evaluacion")
    if (periodosGuardados) {
      const parsed = JSON.parse(periodosGuardados)
      setPeriodos(parsed)
    }
  }

  const guardarPeriodos = (nuevosPeriodos: Periodo[]) => {
    localStorage.setItem("periodos_evaluacion", JSON.stringify(nuevosPeriodos))
    setPeriodos(nuevosPeriodos)
  }

  const fetchEncuestas = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(API_ENCUESTAS_URL)
      if (!response.ok) throw new Error("Error al obtener las encuestas")
      const data = await response.json()
      setTodasEncuestas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const filtrarEncuestasPorFechas = (inicio: string, fin: string): Survey[] => {
    const fechaInicioDate = new Date(inicio)
    const fechaFinDate = new Date(fin)
    fechaFinDate.setHours(23, 59, 59, 999)
    return todasEncuestas.filter((encuesta) => {
      if (!encuesta.fecha) return false
      let fechaEncuesta: Date
      if (encuesta.fecha.includes("/")) {
        const partes = encuesta.fecha.split("/")
        if (partes.length === 3) fechaEncuesta = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`)
        else return false
      } else if (encuesta.fecha.includes("-")) {
        fechaEncuesta = new Date(encuesta.fecha)
      } else return false
      return fechaEncuesta >= fechaInicioDate && fechaEncuesta <= fechaFinDate
    })
  }

  const verificarSolapamiento = (inicio: string, fin: string, idExcluir?: string): boolean => {
    const fechaInicioNueva = new Date(inicio)
    const fechaFinNueva = new Date(fin)
    return periodos.some((periodo) => {
      if (idExcluir && periodo.id === idExcluir) return false
      const fechaInicioPeriodo = new Date(periodo.fechaInicio)
      const fechaFinPeriodo = new Date(periodo.fechaFin)
      return fechaInicioNueva <= fechaFinPeriodo && fechaFinNueva >= fechaInicioPeriodo
    })
  }

  const agregarPeriodo = () => {
    if (!nombrePeriodo.trim() || !fechaInicio || !fechaFin) {
      alert("Por favor, complete todos los campos")
      return
    }
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      alert("La fecha de inicio no puede ser mayor a la fecha de fin")
      return
    }
    if (verificarSolapamiento(fechaInicio, fechaFin)) {
      if (!window.confirm("Las fechas se solapan con otro bimestre. ¿Continuar?")) return
    }
    const encuestasFiltradas = filtrarEncuestasPorFechas(fechaInicio, fechaFin)
    const nuevoPeriodo: Periodo = {
      id: Date.now().toString(),
      nombre: nombrePeriodo,
      fechaInicio,
      fechaFin,
      encuestas: encuestasFiltradas,
      createdAt: new Date().toISOString(),
    }

    setPeriodos((prev) => {
      const nuevos = [...prev, nuevoPeriodo]
      localStorage.setItem("periodos_evaluacion", JSON.stringify(nuevos))
      return nuevos
    })

    setNombrePeriodo("")
    setFechaInicio("")
    setFechaFin("")
    setShowCrearModal(false)
  }

  const eliminarPeriodo = (id: string) => {
    if (window.confirm("¿Eliminar este bimestre?")) {
      setPeriodos((prev) => {
        const nuevos = prev.filter((p) => p.id !== id)
        localStorage.setItem("periodos_evaluacion", JSON.stringify(nuevos))
        return nuevos
      })
    }
  }

  const abrirEditarPeriodo = (periodo: Periodo) => {
    setPeriodoEditando(periodo)
    setNombrePeriodoEdit(periodo.nombre)
    setFechaInicioEdit(periodo.fechaInicio)
    setFechaFinEdit(periodo.fechaFin)
    setShowEditarModal(true)
  }

  const guardarEdicionPeriodo = () => {
    if (!periodoEditando) return
    if (!nombrePeriodoEdit.trim() || !fechaInicioEdit || !fechaFinEdit) {
      alert("Complete todos los campos")
      return
    }
    if (new Date(fechaInicioEdit) > new Date(fechaFinEdit)) {
      alert("Fecha inicio no puede ser mayor a fin")
      return
    }
    if (verificarSolapamiento(fechaInicioEdit, fechaFinEdit, periodoEditando.id)) {
      if (!window.confirm("Las fechas se solapan. ¿Continuar?")) return
    }
    const encuestasActualizadas = filtrarEncuestasPorFechas(fechaInicioEdit, fechaFinEdit)

    setPeriodos((prev) => {
      const nuevos = prev.map((p) =>
        p.id === periodoEditando.id
          ? {
            ...p,
            nombre: nombrePeriodoEdit,
            fechaInicio: fechaInicioEdit,
            fechaFin: fechaFinEdit,
            encuestas: encuestasActualizadas,
          }
          : p,
      )
      localStorage.setItem("periodos_evaluacion", JSON.stringify(nuevos))
      return nuevos
    })

    setShowEditarModal(false)
    setPeriodoEditando(null)
  }

  const exportarAExcel = (encuestas: Survey[], nombrePeriodo: string) => {
    if (encuestas.length === 0) {
      alert("No hay encuestas para exportar")
      return
    }
    const headers = [
      "Fecha",
      "Clave Encuestador",
      "No. Eco",
      "Folio Boleto",
      "Origen",
      "Destino",
      "Medio Adquisición",
      "Calif. Experiencia Compra",
      "Coment. Experiencia",
      "Calif. Servicio Conductor",
      "Coment. Conductor",
      "Calif. Comodidad",
      "Coment. Comodidad",
      "Calif. Limpieza",
      "Coment. Limpieza",
      "Calif. Seguridad",
      "Especif. Seguridad",
      "Cumplió Expectativas",
      "Motivo",
      "Estado",
    ]
    const rows = encuestas.map((e) => [
      e.fecha || "",
      e.claveEncuestador || "",
      e.noEco || "",
      e.folioBoleto || "",
      e.origenViaje || "",
      e.destinoFinal || "",
      e.medioAdquisicion || "",
      e.califExperienciaCompra || "",
      e.comentExperienciaCompra || "",
      e.califServicioConductor || "",
      e.comentServicioConductor || "",
      e.califComodidad || "",
      e.comentComodidad || "",
      e.califLimpieza || "",
      e.comentLimpieza || "",
      e.califSeguridad || "",
      e.especifSeguridad || "",
      e.cumplioExpectativas || "",
      e.especificarMotivo || "",
      e.validado || "",
    ])
    let xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="Encuestas"><Table>\n<Row>\n'
    headers.forEach((h) => {
      xml += `<Cell><Data ss:Type="String">${h}</Data></Cell>\n`
    })
    xml += "</Row>\n"
    rows.forEach((row) => {
      xml += "<Row>\n"
      row.forEach((cell) => {
        const escaped = String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        xml += `<Cell><Data ss:Type="String">${escaped}</Data></Cell>\n`
      })
      xml += "</Row>\n"
    })
    xml += "</Table></Worksheet></Workbook>"
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${nombrePeriodo.replace(/\s+/g, "_")}_encuestas.xls`
    link.click()
  }

  const getEncuestasFiltradas = (): Survey[] => {
    if (!periodoSeleccionado) return []
    let encuestas = periodoSeleccionado.encuestas
    if (filtroTexto) {
      const texto = filtroTexto.toLowerCase()
      encuestas = encuestas.filter((e) =>
        [e.claveEncuestador, e.noEco, e.folioBoleto, e.origenViaje, e.destinoFinal].some((c) =>
          c?.toLowerCase().includes(texto),
        ),
      )
    }
    if (filtroEstado !== "TODOS") encuestas = encuestas.filter((e) => e.validado === filtroEstado)
    return encuestas
  }

  const encuestasFiltradas = getEncuestasFiltradas()
  const totalPaginas = Math.ceil(encuestasFiltradas.length / encuestasPorPagina)
  const encuestasPaginadas = encuestasFiltradas.slice(
    (paginaActual - 1) * encuestasPorPagina,
    paginaActual * encuestasPorPagina,
  )

  const esPeriodoFuturo = (fechaInicio: string): boolean => new Date(fechaInicio) > new Date()
  const formatearFecha = (fecha: string): string =>
    new Date(fecha).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })
  const handleTabClick = (tab: string) => {
    const route = tabRoutes[tab]
    if (route) navigate(route)
  }
  const abrirModalCrear = () => {
    setNombrePeriodo("")
    setFechaInicio("")
    setFechaFin("")
    setShowCrearModal(true)
  }
  const verDetallesPeriodo = (periodo: Periodo) => {
    const encuestasActualizadas = filtrarEncuestasPorFechas(periodo.fechaInicio, periodo.fechaFin)
    const periodoActualizado = { ...periodo, encuestas: encuestasActualizadas }

    setPeriodos((prev) => {
      const nuevos = prev.map((p) => (p.id === periodo.id ? periodoActualizado : p))
      localStorage.setItem("periodos_evaluacion", JSON.stringify(nuevos))
      return nuevos
    })

    setPeriodoSeleccionado(periodoActualizado)
    setPaginaActual(1)
    setFiltroTexto("")
    setFiltroEstado("TODOS")
    setShowEncuestasModal(true)
  }
  const verDetalleEncuesta = (encuesta: Survey) => {
    setEncuestaSeleccionada(encuesta)
    setShowDetalleModal(true)
  }
  const getStatusClass = (status: string) => {
    switch (status) {
      case "VALIDADO":
        return "validado"
      case "ELIMINADO":
      case "ELIMINADO_Y_BORRAR":
        return "eliminado"
      default:
        return "pendiente"
    }
  }

  const abrirComparacion = () => {
    setBimestre1Id("")
    setBimestre2Id("")
    setShowComparacionModal(true)
  }

  const abrirResumenRapido = (periodo: Periodo) => {
    setPeriodoResumen(periodo)
    setShowResumenRapidoModal(true)
  }

  const bimestre1 = periodos.find((p) => p.id === bimestre1Id)
  const bimestre2 = periodos.find((p) => p.id === bimestre2Id)

  const satisfaccion1 = bimestre1 ? calcularSatisfaccionBimestre(bimestre1.encuestas, weights) : 0
  const satisfaccion2 = bimestre2 ? calcularSatisfaccionBimestre(bimestre2.encuestas, weights) : 0

  const categorias1 = bimestre1 ? calcularSatisfaccionPorCategoria(bimestre1.encuestas, weights) : {}
  const categorias2 = bimestre2 ? calcularSatisfaccionPorCategoria(bimestre2.encuestas, weights) : {}

  const analisis1 = bimestre1 ? obtenerAnalisisInteligente(bimestre1.encuestas, categorias1, satisfaccion1) : null
  const analisis2 = bimestre2 ? obtenerAnalisisInteligente(bimestre2.encuestas, categorias2, satisfaccion2) : null

  const satisfaccionResumen = periodoResumen ? calcularSatisfaccionBimestre(periodoResumen.encuestas, weights) : 0
  const categoriasResumen = periodoResumen ? calcularSatisfaccionPorCategoria(periodoResumen.encuestas, weights) : {}
  const analisisResumen = periodoResumen
    ? obtenerAnalisisInteligente(periodoResumen.encuestas, categoriasResumen, satisfaccionResumen)
    : null

  const renderMiniCategoryBars = (periodo: Periodo) => {
    const categorias = calcularSatisfaccionPorCategoria(periodo.encuestas, weights)
    const entries = Object.entries(categorias)

    // Ordenar por valor descendente y tomar las top 3
    const top3 = entries.sort(([, a], [, b]) => b - a).slice(0, 3)

    return (
      <div className="mini-category-bars">
        {top3.map(([key, value]) => (
          <div key={key} className="mini-bar-item">
            <span className="mini-bar-label">{RATING_LABELS[key]?.split(" ")[0] || key}</span>
            <div className="mini-bar-container">
              <div
                className="mini-bar-fill"
                style={{
                  width: `${value}%`,
                  backgroundColor: value >= 80 ? PRIMARY_COLOR : value >= 60 ? "#f0ad4e" : "#dc3545",
                }}
              />
            </div>
            <span className="mini-bar-value">{value.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    )
  }

  const getQuickInsight = (
    periodo: Periodo,
  ): { icon: string; text: string; type: "success" | "warning" | "danger" } => {
    const categorias = calcularSatisfaccionPorCategoria(periodo.encuestas, weights)
    const analisis = obtenerMejorYPeorCategoria(categorias)
    const satisfaccion = calcularSatisfaccionBimestre(periodo.encuestas, weights)

    if (satisfaccion >= 90) {
      return { icon: "★", text: "Excelente desempeño general", type: "success" }
    } else if (satisfaccion >= 80) {
      if (analisis.peor && analisis.peor.value < 70) {
        return { icon: "!", text: `Mejorar: ${RATING_LABELS[analisis.peor.key]?.split(" ")[0]}`, type: "warning" }
      }
      return { icon: "✓", text: "Buen desempeño general", type: "success" }
    } else if (satisfaccion >= 60) {
      return {
        icon: "!",
        text: analisis.peor ? `Atención: ${RATING_LABELS[analisis.peor.key]?.split(" ")[0]}` : "Requiere atención",
        type: "warning",
      }
    } else {
      return { icon: "✗", text: "Necesita mejora urgente", type: "danger" }
    }
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-top-bar">
          <div className="header-logo-container">
            <img src="/logo_flecha_roja.png" alt="Logo" className="header-logo" />
          </div>
          <h1 className="header-title-main">SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA</h1>
          <a href="/" className="btn-navigate">
            <i className="fas fa-home"></i>
            Regresar al inicio
          </a>
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
          <h2 className="welcome-title">BIMESTRES DE EVALUACIÓN</h2>
          <p className="welcome-subtitle">
            Gestione los bimestres de evaluación para agrupar y analizar las encuestas.
          </p>
        </div>

        <div className="crear-periodo-section">
          <button onClick={abrirModalCrear} className="btn-crear-periodo-principal">
            <Plus size={18} />
            <span>Crear Bimestre</span>
          </button>
          {periodos.length >= 2 && (
            <button onClick={abrirComparacion} className="btn-comparar-bimestres">
              <BarChart3 size={18} />
              <span>Comparar Bimestres</span>
            </button>
          )}
        </div>

        <div className="periodos-list-container">
          <div className="periodos-list-header">
            <Calendar size={20} />
            <h3>Bimestres Creados</h3>
            <span className="periodos-count">{periodos.length} bimestre(s)</span>
          </div>

          {isLoading ? (
            <div className="loading-state">Cargando encuestas...</div>
          ) : error ? (
            <div className="error-state">
              <AlertCircle size={24} color="#E74C3C" />
              <p>Error: {error}</p>
            </div>
          ) : periodos.length === 0 ? (
            <div className="no-periodos-state">
              <ClipboardList size={48} color="#888" />
              <p>No hay bimestres creados aún</p>
              <span>Cree un nuevo bimestre utilizando el botón de arriba</span>
            </div>
          ) : (
            <div className="periodos-grid">
              {periodos.map((periodo) => {
                const satisfaccionPeriodo = calcularSatisfaccionBimestre(periodo.encuestas, weights)
                const isSatisfecho = satisfaccionPeriodo >= 80
                const validSurveys = periodo.encuestas.filter(
                  (s) => s.validado !== "ELIMINADO" && s.validado !== "ELIMINADO_Y_BORRAR",
                )
                const quickInsight = periodo.encuestas.length > 0 ? getQuickInsight(periodo) : null

                return (
                  <div
                    key={periodo.id}
                    className={`periodo-card ${esPeriodoFuturo(periodo.fechaInicio) ? "periodo-futuro" : ""}`}
                  >
                    <div className="periodo-card-header">
                      <h4>{periodo.nombre}</h4>
                      <div className="periodo-badges">
                        {esPeriodoFuturo(periodo.fechaInicio) && <span className="badge-futuro">Programado</span>}
                      </div>
                      <div className="periodo-card-actions">
                        <button
                          onClick={() => abrirEditarPeriodo(periodo)}
                          className="btn-accion-periodo"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => eliminarPeriodo(periodo.id)}
                          className="btn-accion-periodo"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="periodo-card-body">
                      <div className="periodo-card-dates">
                        <div className="date-item">
                          <span className="date-label">Inicio:</span>
                          <span className="date-value">{formatearFecha(periodo.fechaInicio)}</span>
                        </div>
                        <div className="date-item">
                          <span className="date-label">Fin:</span>
                          <span className="date-value">{formatearFecha(periodo.fechaFin)}</span>
                        </div>
                      </div>

                      {/* Sección visual mejorada */}
                      <div className="periodo-card-visual">
                        {periodo.encuestas.length > 0 ? (
                          <>
                            {/* Mini gráfica de pie */}
                            <div className="periodo-mini-chart">
                              <SatisfactionPieChart
                                satisfiedPercentage={satisfaccionPeriodo}
                                size={100}
                                showLegend={false}
                              />
                            </div>

                            {/* Stats y categorías */}
                            <div className="periodo-stats-section">
                              <div className="periodo-card-stats">
                                <div className="stat-item-enhanced">
                                  <span className="stat-value-big">{validSurveys.length}</span>
                                  <span className="stat-label-small">Encuestas</span>
                                </div>
                                <div className="stat-item-enhanced">
                                  <span className="stat-value-big">{satisfaccionPeriodo.toFixed(0)}%</span>
                                  <span className="stat-label-small">Satisfacción</span>
                                </div>
                              </div>

                              {/* Mini barras de categorías */}
                              {renderMiniCategoryBars(periodo)}
                            </div>
                          </>
                        ) : (
                          <div className="periodo-empty-state">
                            <ClipboardList size={40} strokeWidth={1.5} />
                            <span>Sin encuestas</span>
                            <span className="empty-hint">Las encuestas se asignarán automáticamente</span>
                          </div>
                        )}
                      </div>

                      {/* Badge de satisfacción e insight */}
                      {periodo.encuestas.length > 0 && (
                        <div className="periodo-status-section">
                          <div className={`periodo-satisfaction-badge ${isSatisfecho ? "satisfied" : "unsatisfied"}`}>
                            {isSatisfecho ? "✓ SATISFECHO" : "✗ INSATISFECHO"} ({satisfaccionPeriodo.toFixed(1)}%)
                          </div>
                          {quickInsight && (
                            <div className={`periodo-quick-insight insight-${quickInsight.type}`}>
                              <span className="insight-icon">{quickInsight.icon}</span>
                              <span className="insight-text">{quickInsight.text}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Fin de la nueva sección */}

                    <button onClick={() => verDetallesPeriodo(periodo)} className="btn-ver-encuestas">
                      <Eye size={18} />
                      Ver Detalles
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear Bimestre */}
      {showCrearModal && (
        <div className="modal-overlay" onClick={() => setShowCrearModal(false)}>
          <div className="modal-crear-periodo" onClick={(e) => e.stopPropagation()}>
            <div className="modal-crear-header">
              <h2>Crear Nuevo Bimestre</h2>
              <button onClick={() => setShowCrearModal(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-crear-body">
              <div className="form-group-modal">
                <label htmlFor="nombrePeriodoModal">Nombre del Bimestre</label>
                <input
                  type="text"
                  id="nombrePeriodoModal"
                  value={nombrePeriodo}
                  onChange={(e) => setNombrePeriodo(e.target.value)}
                  placeholder="Ej: Primer Bimestre 2025"
                  className="form-input-modal"
                />
              </div>
              <div className="calendarios-container">
                <CalendarioSelector
                  selectedDate={fechaInicio}
                  onDateSelect={setFechaInicio}
                  label="Fecha de Inicio"
                  periodos={periodos}
                />
                <CalendarioSelector
                  selectedDate={fechaFin}
                  onDateSelect={setFechaFin}
                  label="Fecha de Fin"
                  periodos={periodos}
                />
              </div>
              {fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin) && (
                <div className="error-fechas">
                  <AlertCircle size={14} />
                  La fecha de inicio no puede ser mayor a la de fin
                </div>
              )}
              {fechaInicio && fechaFin && verificarSolapamiento(fechaInicio, fechaFin) && (
                <div className="warning-solapamiento">
                  <AlertCircle size={14} />
                  Las fechas se solapan con otro bimestre
                </div>
              )}
            </div>
            <div className="modal-crear-footer">
              <button onClick={() => setShowCrearModal(false)} className="btn-cancelar">
                Cancelar
              </button>
              <button
                onClick={agregarPeriodo}
                className="btn-confirmar-crear"
                disabled={
                  !nombrePeriodo.trim() || !fechaInicio || !fechaFin || new Date(fechaInicio) > new Date(fechaFin)
                }
              >
                <Plus size={16} />
                Crear Bimestre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Bimestre */}
      {showEditarModal && periodoEditando && (
        <div className="modal-overlay" onClick={() => setShowEditarModal(false)}>
          <div className="modal-crear-periodo" onClick={(e) => e.stopPropagation()}>
            <div className="modal-crear-header">
              <h2>Editar Bimestre</h2>
              <button onClick={() => setShowEditarModal(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-crear-body">
              <div className="form-group-modal">
                <label htmlFor="nombrePeriodoEdit">Nombre del Bimestre</label>
                <input
                  type="text"
                  id="nombrePeriodoEdit"
                  value={nombrePeriodoEdit}
                  onChange={(e) => setNombrePeriodoEdit(e.target.value)}
                  className="form-input-modal"
                />
              </div>
              <div className="calendarios-container">
                <CalendarioSelector
                  selectedDate={fechaInicioEdit}
                  onDateSelect={setFechaInicioEdit}
                  label="Fecha de Inicio"
                  periodos={periodos}
                  excludePeriodoId={periodoEditando.id}
                />
                <CalendarioSelector
                  selectedDate={fechaFinEdit}
                  onDateSelect={setFechaFinEdit}
                  label="Fecha de Fin"
                  periodos={periodos}
                  excludePeriodoId={periodoEditando.id}
                />
              </div>
              {fechaInicioEdit && fechaFinEdit && new Date(fechaInicioEdit) > new Date(fechaFinEdit) && (
                <div className="error-fechas">
                  <AlertCircle size={14} />
                  La fecha de inicio no puede ser mayor
                </div>
              )}
              {fechaInicioEdit &&
                fechaFinEdit &&
                verificarSolapamiento(fechaInicioEdit, fechaFinEdit, periodoEditando.id) && (
                  <div className="warning-solapamiento">
                    <AlertCircle size={14} />
                    Las fechas se solapan
                  </div>
                )}
            </div>
            <div className="modal-crear-footer">
              <button onClick={() => setShowEditarModal(false)} className="btn-cancelar">
                Cancelar
              </button>
              <button
                onClick={guardarEdicionPeriodo}
                className="btn-confirmar-crear"
                disabled={
                  !nombrePeriodoEdit.trim() ||
                  !fechaInicioEdit ||
                  !fechaFinEdit ||
                  new Date(fechaInicioEdit) > new Date(fechaFinEdit)
                }
              >
                <Edit size={16} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Encuestas del Bimestre */}
      {showEncuestasModal && periodoSeleccionado && (
        <div className="modal-overlay" onClick={() => setShowEncuestasModal(false)}>
          <div className="modal-encuestas-periodo" onClick={(e) => e.stopPropagation()}>
            <div className="modal-encuestas-header">
              <div className="modal-encuestas-title-section">
                <h2>{periodoSeleccionado.nombre}</h2>
                <span className="modal-encuestas-dates">
                  {formatearFecha(periodoSeleccionado.fechaInicio)} - {formatearFecha(periodoSeleccionado.fechaFin)}
                </span>
              </div>
              <div className="modal-encuestas-count">{periodoSeleccionado.encuestas.length} encuestas</div>
              <button
                onClick={() => abrirResumenRapido(periodoSeleccionado)}
                className="btn-resumen-rapido"
                title="Ver Resumen Rápido"
              >
                <PieChart size={16} />
                Resumen Rápido
              </button>
              <button
                onClick={() => exportarAExcel(periodoSeleccionado.encuestas, periodoSeleccionado.nombre)}
                className="btn-exportar-excel"
                title="Exportar a Excel"
              >
                <Download size={16} />
                Excel
              </button>
              <button onClick={() => setShowEncuestasModal(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="encuestas-filtros-bar">
              <div className="filtro-busqueda">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filtroTexto}
                  onChange={(e) => {
                    setFiltroTexto(e.target.value)
                    setPaginaActual(1)
                  }}
                  className="input-busqueda"
                />
              </div>
              <div className="filtro-estado">
                <select
                  value={filtroEstado}
                  onChange={(e) => {
                    setFiltroEstado(e.target.value)
                    setPaginaActual(1)
                  }}
                  className="select-estado"
                >
                  <option value="TODOS">Todos</option>
                  <option value="VALIDADO">Validado</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="ELIMINADO">Eliminado</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
              <span className="filtro-resultado">
                {encuestasFiltradas.length} de {periodoSeleccionado.encuestas.length}
              </span>
            </div>
            <div className="modal-encuestas-body">
              {encuestasFiltradas.length === 0 ? (
                <div className="no-encuestas-modal">
                  <AlertCircle size={48} />
                  <p>No hay encuestas</p>
                </div>
              ) : (
                <>
                  <div className="encuestas-table-wrapper">
                    <table className="encuestas-table-modal">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Clave Enc.</th>
                          <th>No. Eco</th>
                          <th>No. Boleto</th>
                          <th>Terminal</th>
                          <th>Destino</th>
                          <th>Expectativas</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {encuestasPaginadas.map((encuesta) => (
                          <tr key={encuesta._id}>
                            <td>{encuesta.fecha || "N/A"}</td>
                            <td>{encuesta.claveEncuestador || "N/A"}</td>
                            <td>{encuesta.noEco || "N/A"}</td>
                            <td>{encuesta.folioBoleto || "N/A"}</td>
                            <td>{encuesta.origenViaje || "N/A"}</td>
                            <td>{encuesta.destinoFinal || "N/A"}</td>
                            <td>{encuesta.califExperienciaCompra || "N/A"}</td>
                            <td>
                              <span className={`estado-badge ${getStatusClass(encuesta.validado || "PENDIENTE")}`}>
                                {encuesta.validado || "PENDIENTE"}
                              </span>
                            </td>
                            <td className="acciones-cell">
                              <button
                                className="btn-ver-detalle"
                                onClick={() => verDetalleEncuesta(encuesta)}
                                title="Ver Detalle"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPaginas > 1 && (
                    <div className="paginacion-container">
                      <button
                        onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                        disabled={paginaActual === 1}
                        className="btn-paginacion"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="paginacion-info">
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <button
                        onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                        disabled={paginaActual === totalPaginas}
                        className="btn-paginacion"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Encuesta */}
      {showDetalleModal && encuestaSeleccionada && (
        <div className="modal-overlay detail-overlay" onClick={() => setShowDetalleModal(false)}>
          <div className="modal-detalle-encuesta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-detalle-header">
              <h2>Detalle de Encuesta</h2>
              <button className="modal-close-btn" onClick={() => setShowDetalleModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-detalle-body">
              <div className="detalle-section">
                <h3 className="detalle-section-title">Información General</h3>
                <div className="detalle-grid">
                  <div className="detalle-item">
                    <span className="detalle-label">Fecha</span>
                    <span className="detalle-value">{encuestaSeleccionada.fecha || "N/A"}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Clave Encuestador</span>
                    <span className="detalle-value">{encuestaSeleccionada.claveEncuestador || "N/A"}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Estado</span>
                    <span
                      className={` detalle-status-badge ${getStatusClass(encuestaSeleccionada.validado || "PENDIENTE")}`}
                    >
                      {encuestaSeleccionada.validado || "PENDIENTE"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="detalle-section">
                <h3 className="detalle-section-title">Información del Viaje</h3>
                <div className="detalle-grid">
                  <div className="detalle-item">
                    <span className="detalle-label">No. Eco</span>
                    <span className="detalle-value">{encuestaSeleccionada.noEco || "N/A"}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">No. Boleto</span>
                    <span className="detalle-value">{encuestaSeleccionada.folioBoleto || "N/A"}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Terminal Origen</span>
                    <span className="detalle-value">{encuestaSeleccionada.origenViaje || "N/A"}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Destino Final</span>
                    <span className="detalle-value">{encuestaSeleccionada.destinoFinal || "N/A"}</span>
                  </div>
                  <div className="detalle-item">
                    <span className="detalle-label">Medio Adquisición</span>
                    <span className="detalle-value">{encuestaSeleccionada.medioAdquisicion || "N/A"}</span>
                  </div>
                </div>
              </div>
              <div className="detalle-section">
                <h3 className="detalle-section-title">Calificaciones</h3>
                <div className="detalle-grid calificaciones-grid">
                  <div className="calificacion-item">
                    <span className="calificacion-label">Experiencia Compra</span>
                    <span className="calificacion-value">{encuestaSeleccionada.califExperienciaCompra || "N/A"}</span>
                    {encuestaSeleccionada.comentExperienciaCompra && (
                      <span className="calificacion-comentario">{encuestaSeleccionada.comentExperienciaCompra}</span>
                    )}
                  </div>
                  <div className="calificacion-item">
                    <span className="calificacion-label">Servicio Conductor</span>
                    <span className="calificacion-value">{encuestaSeleccionada.califServicioConductor || "N/A"}</span>
                    {encuestaSeleccionada.comentServicioConductor && (
                      <span className="calificacion-comentario">{encuestaSeleccionada.comentServicioConductor}</span>
                    )}
                  </div>
                  <div className="calificacion-item">
                    <span className="calificacion-label">Comodidad</span>
                    <span className="calificacion-value">{encuestaSeleccionada.califComodidad || "N/A"}</span>
                    {encuestaSeleccionada.comentComodidad && (
                      <span className="calificacion-comentario">{encuestaSeleccionada.comentComodidad}</span>
                    )}
                  </div>
                  <div className="calificacion-item">
                    <span className="calificacion-label">Limpieza</span>
                    <span className="calificacion-value">{encuestaSeleccionada.califLimpieza || "N/A"}</span>
                    {encuestaSeleccionada.comentLimpieza && (
                      <span className="calificacion-comentario">{encuestaSeleccionada.comentLimpieza}</span>
                    )}
                  </div>
                  <div className="calificacion-item">
                    <span className="calificacion-label">Seguridad</span>
                    <span className="calificacion-value">{encuestaSeleccionada.califSeguridad || "N/A"}</span>
                    {encuestaSeleccionada.especifSeguridad && (
                      <span className="calificacion-comentario">{encuestaSeleccionada.especifSeguridad}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="detalle-section">
                <h3 className="detalle-section-title">Expectativas</h3>
                <div className="detalle-grid">
                  <div className="detalle-item">
                    <span className="detalle-label">Cumplió Expectativas</span>
                    <span className="expectativas-value">{encuestaSeleccionada.cumplioExpectativas || "N/A"}</span>
                  </div>
                  {encuestaSeleccionada.especificarMotivo && (
                    <div className="detalle-item full-width">
                      <span className="detalle-label">Motivo</span>
                      <span className="detalle-value">{encuestaSeleccionada.especificarMotivo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showComparacionModal && (
        <div className="modal-overlay" onClick={() => setShowComparacionModal(false)}>
          <div className="modal-comparacion" onClick={(e) => e.stopPropagation()}>
            <div className="modal-comparacion-header">
              <h2>Comparación de Bimestres</h2>
              <button onClick={() => setShowComparacionModal(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-comparacion-body">
              <div className="comparacion-selectors">
                <div className="selector-group">
                  <label>Seleccionar Bimestre 1:</label>
                  <select
                    value={bimestre1Id}
                    onChange={(e) => setBimestre1Id(e.target.value)}
                    className="select-bimestre"
                  >
                    <option value="">-- Seleccione un bimestre --</option>
                    {periodos.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.id === bimestre2Id}>
                        {p.nombre} ({p.encuestas.length} encuestas)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="selector-group">
                  <label>Seleccionar Bimestre 2:</label>
                  <select
                    value={bimestre2Id}
                    onChange={(e) => setBimestre2Id(e.target.value)}
                    className="select-bimestre"
                  >
                    <option value="">-- Seleccione un bimestre --</option>
                    {periodos.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.id === bimestre1Id}>
                        {p.nombre} ({p.encuestas.length} encuestas)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {bimestre1 && bimestre2 && (
                <div className="comparacion-charts">
                  <div className="comparacion-chart-item">
                    <h3>{bimestre1.nombre}</h3>
                    <p className="comparacion-fechas">
                      {formatearFecha(bimestre1.fechaInicio)} - {formatearFecha(bimestre1.fechaFin)}
                    </p>
                    <p className="comparacion-encuestas">{bimestre1.encuestas.length} encuestas</p>
                    <SatisfactionPieChart satisfiedPercentage={satisfaccion1} size={220} />
                    <div className={`comparacion-badge ${satisfaccion1 >= 80 ? "satisfied" : "unsatisfied"}`}>
                      {satisfaccion1 >= 80 ? "✓ SATISFECHO" : "✗ INSATISFECHO"} ({satisfaccion1.toFixed(1)}%)
                    </div>
                  </div>

                  <div className="comparacion-vs">VS</div>

                  <div className="comparacion-chart-item">
                    <h3>{bimestre2.nombre}</h3>
                    <p className="comparacion-fechas">
                      {formatearFecha(bimestre2.fechaInicio)} - {formatearFecha(bimestre2.fechaFin)}
                    </p>
                    <p className="comparacion-encuestas">{bimestre2.encuestas.length} encuestas</p>
                    <SatisfactionPieChart satisfiedPercentage={satisfaccion2} size={220} />
                    <div className={`comparacion-badge ${satisfaccion2 >= 80 ? "satisfied" : "unsatisfied"}`}>
                      {satisfaccion2 >= 80 ? "✓ SATISFECHO" : "✗ INSATISFECHO"} ({satisfaccion2.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              )}

              {bimestre1 && bimestre2 && analisis1 && analisis2 && (
                <div className="comparacion-resumen">
                  <h4>Análisis Inteligente de Comparación</h4>
                  <div className="resumen-grid-detallado">
                    {/* Mejor desempeño general */}
                    <div className="resumen-item-destacado">
                      <span className="resumen-label-icon">🏆</span>
                      <span className="resumen-label">Mejor desempeño general:</span>
                      <span className="resumen-value highlight">
                        {satisfaccion1 > satisfaccion2
                          ? `${bimestre1.nombre} (${satisfaccion1.toFixed(1)}%)`
                          : satisfaccion2 > satisfaccion1
                            ? `${bimestre2.nombre} (${satisfaccion2.toFixed(1)}%)`
                            : `Empate (${satisfaccion1.toFixed(1)}%)`}
                      </span>
                    </div>

                    {/* Análisis del Bimestre 1 */}
                    <div className="resumen-bimestre-analisis">
                      <h5>{bimestre1.nombre}</h5>
                      <div className={`analisis-nivel nivel-${analisis1.nivel}`}>
                        {analisis1.nivel === "excelente" && "⭐ Excelente"}
                        {analisis1.nivel === "bueno" && "✓ Bueno"}
                        {analisis1.nivel === "regular" && "◐ Regular"}
                        {analisis1.nivel === "necesitaMejora" && "⚠ Necesita mejora"}
                      </div>
                      <div className="analisis-item mejor">
                        <span className="analisis-icon">▲</span>
                        <span className="analisis-label">Punto fuerte:</span>
                        <span className="analisis-value">{analisis1.puntoFuerte}</span>
                      </div>
                      <div className="analisis-item peor">
                        <span className="analisis-icon">▼</span>
                        <span className="analisis-label">Área de oportunidad:</span>
                        <span className="analisis-value">{analisis1.areaMejora}</span>
                      </div>
                      <div className="analisis-mensaje">
                        <p>{analisis1.mensaje}</p>
                      </div>
                    </div>

                    {/* Análisis del Bimestre 2 */}
                    <div className="resumen-bimestre-analisis">
                      <h5>{bimestre2.nombre}</h5>
                      <div className={`analisis-nivel nivel-${analisis2.nivel}`}>
                        {analisis2.nivel === "excelente" && "⭐ Excelente"}
                        {analisis2.nivel === "bueno" && "✓ Bueno"}
                        {analisis2.nivel === "regular" && "◐ Regular"}
                        {analisis2.nivel === "necesitaMejora" && "⚠ Necesita mejora"}
                      </div>
                      <div className="analisis-item mejor">
                        <span className="analisis-icon">▲</span>
                        <span className="analisis-label">Punto fuerte:</span>
                        <span className="analisis-value">{analisis2.puntoFuerte}</span>
                      </div>
                      <div className="analisis-item peor">
                        <span className="analisis-icon">▼</span>
                        <span className="analisis-label">Área de oportunidad:</span>
                        <span className="analisis-value">{analisis2.areaMejora}</span>
                      </div>
                      <div className="analisis-mensaje">
                        <p>{analisis2.mensaje}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showResumenRapidoModal && periodoResumen && analisisResumen && (
        <div className="modal-overlay resumen-overlay" onClick={() => setShowResumenRapidoModal(false)}>
          <div className="modal-resumen-rapido" onClick={(e) => e.stopPropagation()}>
            <div className="modal-resumen-header">
              <h2>Resumen Rápido</h2>
              <button onClick={() => setShowResumenRapidoModal(false)} className="modal-close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-resumen-body">
              <div className="resumen-rapido-titulo">
                <h3>{periodoResumen.nombre}</h3>
                <p className="resumen-rapido-fechas">
                  {formatearFecha(periodoResumen.fechaInicio)} - {formatearFecha(periodoResumen.fechaFin)}
                </p>
                <p className="resumen-rapido-encuestas">{periodoResumen.encuestas.length} encuestas analizadas</p>
              </div>

              <div className="resumen-rapido-grafica">
                <SatisfactionPieChart satisfiedPercentage={satisfaccionResumen} size={250} />
                <div className={`resumen-rapido-badge ${satisfaccionResumen >= 80 ? "satisfied" : "unsatisfied"}`}>
                  {satisfaccionResumen >= 80 ? "✓ SATISFECHO" : "✗ INSATISFECHO"} ({satisfaccionResumen.toFixed(1)}%)
                </div>
              </div>

              <div className="resumen-rapido-analisis">
                <h4>Análisis del Bimestre</h4>
                <div className={`analisis-nivel-grande nivel-${analisisResumen.nivel}`}>
                  {analisisResumen.nivel === "excelente" && "⭐ Desempeño Excelente"}
                  {analisisResumen.nivel === "bueno" && "✓ Buen Desempeño"}
                  {analisisResumen.nivel === "regular" && "◐ Desempeño Regular"}
                  {analisisResumen.nivel === "necesitaMejora" && "⚠ Necesita Mejora"}
                </div>

                <div className="resumen-rapido-items">
                  <div className="resumen-rapido-item punto-fuerte">
                    <div className="item-header">
                      <span className="item-icon">▲</span>
                      <span className="item-label">Punto Fuerte</span>
                    </div>
                    <span className="item-value">{analisisResumen.puntoFuerte}</span>
                  </div>

                  <div className="resumen-rapido-item area-mejora">
                    <div className="item-header">
                      <span className="item-icon">▼</span>
                      <span className="item-label">Área de Oportunidad</span>
                    </div>
                    <span className="item-value">{analisisResumen.areaMejora}</span>
                  </div>
                </div>

                <div className="resumen-rapido-mensaje">
                  <p>{analisisResumen.mensaje}</p>
                </div>

                {/* Desglose por categorías */}
                <div className="resumen-rapido-categorias">
                  <h5>Desglose por Categoría</h5>
                  <div className="categorias-lista">
                    {Object.entries(categoriasResumen)
                      .sort(([, a], [, b]) => b - a)
                      .map(([key, value]) => (
                        <div key={key} className="categoria-item">
                          <span className="categoria-nombre">{RATING_LABELS[key]}</span>
                          <div className="categoria-barra-container">
                            <div
                              className="categoria-barra"
                              style={{
                                width: `${value}%`,
                                backgroundColor: value >= 80 ? PRIMARY_COLOR : value >= 60 ? "#f0ad4e" : "#e74c3c",
                              }}
                            ></div>
                          </div>
                          <span className="categoria-valor">{value.toFixed(1)}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Periodos
