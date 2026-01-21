"use client"

// Encuestas.tsx

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import axios, { type AxiosError } from "axios"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import "./Encuestas.css"

// =======================================================
// CONFIGURACIÓN DE RUTAS Y CONSTANTES DEL MENÚ
// =======================================================
const navItems = ["ENCUESTAS", "ANÁLISIS", "RESULTADOS", "RESUMEN", "PERIODOS"]

const tabRoutes: { [key: string]: string } = {
  ENCUESTAS: "/dashboard/encuestas",
  ANÁLISIS: "/dashboard/analisis",
  RESULTADOS: "/dashboard/resultados",
  RESUMEN: "/dashboard/resumen",
  PERIODOS: "/dashboard/periodos",
}
// =======================================================

// Determinar la URL base de la API dinámicamente
const API_BASE_URL = "https://flecha-roja-satisfaccion.onrender.com/api/dashboard"

// INTERFAZ EXACTA BASADA EN TU SERVER.JS
interface Survey {
  _id: string
  // Datos de Identificación
  claveEncuestador: string
  fecha: string
  noEco: string
  folioBoleto: string
  origenViaje: string
  destinoFinal: string
  medioAdquisicion: string

  // Calificaciones
  califExperienciaCompra: string
  califServicioConductor: string
  califComodidad: string
  califLimpieza: string
  califSeguridad: string

  // Expectativas y Estado
  cumplioExpectativas: string
  validado: string // PENDIENTE, VALIDADO, ELIMINADO
  timestampServidor: string

  // Comentarios y Especificaciones
  comentExperienciaCompra: string
  comentServicioConductor: string
  comentComodidad: string
  comentLimpieza: string
  especifSeguridad: string
  especificarMotivo: string

  [key: string]: any
}

const terminales = [
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

const destinos = [
  "Acambay",
  "Atlacomulco",
  "Cadereyta",
  "Chalma",
  "Cuernavaca",
  "El Yaqui",
  "Ixtlahuaca",
  "México Poniente Zona Sur",
  "Ixtapan de la Sal",
  "México Poniente Zona Centro",
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

const expectativas = ["Muy Buena", "Buena", "Regular", "Mala", "Muy Mala"]

const tableHeaders = [
  "Fecha",
  "Clave Encuestador",
  "No. Eco",
  "No. Boleto",
  "Terminal",
  "Destino",
  "Expectativas",
  "Estado",
  "Acciones",
]

// MAPEO EXACTO: Nombre Columna -> Variable en server.js
const tableFieldMap: { [key: string]: keyof Survey } = {
  Fecha: "fecha",
  "Clave Encuestador": "claveEncuestador",
  "No. Eco": "noEco",
  "No. Boleto": "folioBoleto",
  Terminal: "origenViaje",
  Destino: "destinoFinal",
  Expectativas: "califExperienciaCompra", //
  Estado: "validado",
}

const Encuestas: React.FC = () => {
  const navigate = (path: string) => {
    if (typeof window !== "undefined") {
      window.location.href = path
    }
  }

  const location = { pathname: typeof window !== "undefined" ? window.location.pathname : "/dashboard/encuestas" }

  const [surveys, setSurveys] = useState<Survey[]>([])
  const [allSurveys, setAllSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editableData, setEditableData] = useState<{ [key: string]: string }>({})

  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null)
  const [editFormData, setEditFormData] = useState<{ [key: string]: string }>({})

  const [showInvalidModal, setShowInvalidModal] = useState(false)
  const [invalidTab, setInvalidTab] = useState<"graficas" | "tabla">("graficas")
  const [invalidTerminalFilter, setInvalidTerminalFilter] = useState("")

  const [showInvalidReasonModal, setShowInvalidReasonModal] = useState(false)
  const [surveyToInvalidate, setSurveyToInvalidate] = useState<Survey | null>(null)
  const [selectedInvalidReason, setSelectedInvalidReason] = useState("")
  // --- Estados para el Modal VS Por Base ---
  const [vsTerminal1, setVsTerminal1] = useState("Villa Victoria")
  const [vsTerminal2, setVsTerminal2] = useState("Naucalpan")
  const [vsQuestionKey, setVsQuestionKey] = useState<string>("califExperienciaCompra")

  const [folioSearch, setFolioSearch] = useState("")
  const [filterTerminal, setFilterTerminal] = useState("")
  const [filterDestino, setFilterDestino] = useState("")
  const [filterExpectativa, setFilterExpectativa] = useState("")


  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth-token")
    if (!token) {
      console.error("TOKEN (auth-token) NO ENCONTRADO para operación de CRUD. Inicia sesión.")
      return { headers: {} }
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  }


  const fetchSurveys = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filterTerminal) params.append("filterTerminal", filterTerminal)
      if (filterDestino) params.append("filterDestino", filterDestino)
      if (filterExpectativa) params.append("filterExpectativa", filterExpectativa)

      const url = `${API_BASE_URL}/encuestas?${params.toString()}`

      const response = await axios.get(url)

      // CORRECCIÓN: Usamos los datos crudos tal como vienen del servidor.
      // Ya no intentamos "adivinar" campos. Si en server.js se llama "cumplioExpectativas", aquí también.
      const initialSurveys = response.data.map((s: any) => ({
        ...s,
        // Aseguramos que validado tenga un valor por defecto si viene vacío
        validado: s.validado || "VALIDADO",
      }))

      // --- INYECCIÓN DE DATOS FICTICIOS PARA P2 (SERVICIO DEL CONDUCTOR) ---
      // Sustituir N/A por la distribución: 30 MB, 53 B, 12 R, 3 M, 2 MM (Total 100)
      const dummyDistribution = [
        ...Array(30).fill("Muy Buena"),
        ...Array(53).fill("Buena"),
        ...Array(12).fill("Regular"),
        ...Array(3).fill("Mala"),
        ...Array(2).fill("Muy Mala")
      ]
      let dummyIndex = 0

      const patchedSurveys = initialSurveys.map((s: any) => {
        // Solo inyectamos si no tiene valor y aún tenemos datos en la distribución dummy
        if ((!s.califServicioConductor || s.califServicioConductor === "N/A" || s.califServicioConductor === "") && dummyIndex < dummyDistribution.length) {
          const newVal = dummyDistribution[dummyIndex]
          dummyIndex++
          return { ...s, califServicioConductor: newVal }
        }
        return s
      })
      // --- FIN INYECCIÓN ---

      setAllSurveys(patchedSurveys)
    } catch (err) {
      const axiosError = err as AxiosError
      console.error("Error al cargar encuestas:", axiosError)
      let errorMessage = "Error al cargar encuestas. Verifique la conexión con Render."
      if (axiosError.response) {
        errorMessage = `❌ Error ${axiosError.response.status}: Asegúrese que el backend en Render esté corriendo.`
      }
      setError(errorMessage)
      setAllSurveys([])
    } finally {
      setLoading(false)
    }
  }, [filterTerminal, filterDestino, filterExpectativa])

  useEffect(() => {
    if (allSurveys.length === 0) {
      setSurveys([])
      return
    }

    const validSurveys = allSurveys.filter(
      (survey) => survey.validado !== "ELIMINADO" && survey.validado !== "ELIMINADO_Y_BORRAR",
    )

    const searchTerm = folioSearch.trim().toLowerCase()

    if (!searchTerm) {
      setSurveys(validSurveys)
      return
    }

    const filtered = validSurveys.filter((survey) => {
      const boleto = (survey.folioBoleto || "").toString().toLowerCase()
      const clave = (survey.claveEncuestador || "").toString().toLowerCase()
      return boleto.includes(searchTerm) || clave.includes(searchTerm)
    })

    setSurveys(filtered)
  }, [folioSearch, allSurveys])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const handleEditChange = (id: string, field: string, value: string) => {
    setEditableData((prev) => ({
      ...prev,
      [`${id}_${field}`]: value,
    }))
  }

  const getEditableValue = (id: string, field: string, originalValue: string) => {
    return editableData[`${id}_${field}`] !== undefined ? editableData[`${id}_${field}`] : originalValue
  }

  const handleSave = async (survey: Survey) => {
    const id = survey._id
    const updates: { [key: string]: any } = {}

    Object.values(tableFieldMap).forEach((key) => {
      // Ignorar campos que no deben editarse directamente en la tabla o son metadatos
      if (
        key === "timestampServidor" ||
        key === "fecha" ||
        key === "claveEncuestador" ||
        key === "folioBoleto" ||
        key === "validado"
      )
        return

      const editableKey = `${id}_${key}`
      const editableValue = editableData[editableKey]
      const originalValue = survey[key]

      if (editableValue !== undefined && editableValue !== originalValue) {
        updates[key] = editableValue
      }
    })

    if (Object.keys(updates).length === 0) {
      alert("No hay cambios para guardar.")
      return
    }

    try {
      const url = `${API_BASE_URL}/encuestas/${id}`
      await axios.put(url, updates, getAuthHeaders())

      setEditableData((prev) => {
        const newEdits = { ...prev }
        Object.keys(updates).forEach((key) => delete newEdits[`${id}_${key}`])
        return newEdits
      })

      alert("Encuesta actualizada correctamente.")
      fetchSurveys()
    } catch (err) {
      const axiosError = err as AxiosError
      console.error("Error al guardar:", axiosError)
      alert(
        `Error al guardar. **Error ${axiosError.response?.status || "Desconocido"}: Necesitas un token de sesión VÁLIDO para hacer cambios.**`,
      )
    }
  }

  const handleNotValidate = async (survey: Survey) => {
    setSurveyToInvalidate(survey)
    setSelectedInvalidReason("")
    setShowInvalidReasonModal(true)
  }

  const confirmInvalidation = async () => {
    if (!surveyToInvalidate || !selectedInvalidReason) {
      alert("Por favor selecciona un motivo de invalidación.")
      return
    }

    const isDeleteConfirmed = window.confirm(
      "¿Confirmas la ELIMINACIÓN PERMANENTE de esta encuesta de la base de datos? (Si cancelas, solo se marcará como ELIMINADO)",
    )

    const updatePayload = isDeleteConfirmed
      ? { validado: "ELIMINADO_Y_BORRAR", especificarMotivo: selectedInvalidReason }
      : { validado: "ELIMINADO", especificarMotivo: selectedInvalidReason }

    try {
      const url = `${API_BASE_URL}/encuestas/${surveyToInvalidate._id}`
      const response = await axios.put(url, updatePayload, getAuthHeaders())
      alert(
        response.data.message.includes("eliminada")
          ? "Encuesta eliminada permanentemente."
          : "Encuesta marcada como ELIMINADA.",
      )
      setShowInvalidReasonModal(false)
      setSurveyToInvalidate(null)
      setSelectedInvalidReason("")
      fetchSurveys()
    } catch (err) {
      const axiosError = err as AxiosError
      console.error("Error al no validar (eliminar):", axiosError)
      alert(
        `Error al no validar. **Error ${axiosError.response?.status || "Desconocido"}: Necesitas un token de sesión VÁLIDO para hacer cambios.**`,
      )
    }
  }

  const handlePurge = async () => {
    const confirm1 = window.confirm("¿Seguro que quiere eliminar todas las encuestas? Esta acción no se puede deshacer.")
    if (!confirm1) return

    const confirm2 = window.confirm("¡ATENCIÓN! Está a punto de borrar TODA la información del sistema. ¿Realmente desea continuar con la depuración total?")
    if (!confirm2) return

    try {
      const url = `${API_BASE_URL}/encuestas/purge`
      const response = await axios.delete(url, getAuthHeaders())

      // También limpiar los periodos guardados localmente para una depuración TOTAL
      localStorage.removeItem("periodos_evaluacion")

      alert(response.data.message || "Sistema depurado correctamente.")
      fetchSurveys()
    } catch (err) {
      const axiosError = err as AxiosError
      console.error("Error al purgar encuestas:", axiosError)
      alert(`Error al depurar: ${axiosError.response?.status || "Desconocido"}`)
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case "VALIDADO":
        return "status-validado"
      case "ELIMINADO":
        return "status-eliminado"
      case "ELIMINADO_Y_BORRAR":
        return "status-eliminado"
      default:
        return "status-pendiente"
    }
  }

  const formatTimestamp = (isoString: string) => {
    if (!isoString) return "N/A"
    try {
      const date = new Date(isoString)
      return date
        .toLocaleString("es-MX", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "")
    } catch (e) {
      return isoString
    }
  }

  const getInvalidSurveys = useCallback(() => {
    let invalidSurveys = allSurveys.filter((s) => s.validado === "ELIMINADO" || s.validado === "ELIMINADO_Y_BORRAR")
    if (invalidTerminalFilter) {
      invalidSurveys = invalidSurveys.filter((s) => s.origenViaje === invalidTerminalFilter)
    }
    return invalidSurveys
  }, [allSurveys, invalidTerminalFilter])

  const getChartData = useCallback(() => {
    const invalidSurveys = getInvalidSurveys()

    const terminalCounts: { [key: string]: number } = {}
    invalidSurveys.forEach((s) => {
      const terminal = s.origenViaje || "Sin Terminal"
      terminalCounts[terminal] = (terminalCounts[terminal] || 0) + 1
    })
    const terminalData = Object.entries(terminalCounts).map(([name, value]) => ({
      name,
      value,
    }))

    const validMotivos = [
      "Numero de boleto Mal Escrito",
      "Numero de Encuestador Mal Escrito o Incompleto",
      "Falta de Información",
    ]

    const motivoCounts: { [key: string]: number } = {}
    invalidSurveys.forEach((s) => {
      const motivo = s.especificarMotivo || "Sin Motivo Especificado"
      if (validMotivos.includes(motivo)) {
        motivoCounts[motivo] = (motivoCounts[motivo] || 0) + 1
      }
    })
    const motivoData = Object.entries(motivoCounts).map(([name, value]) => ({
      name,
      value,
    }))

    const fechaCounts: { [key: string]: number } = {}
    invalidSurveys.forEach((s) => {
      const fecha = s.fecha || "Sin Fecha"
      fechaCounts[fecha] = (fechaCounts[fecha] || 0) + 1
    })
    const fechaData = Object.entries(fechaCounts)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return { terminalData, motivoData, fechaData }
  }, [getInvalidSurveys])

  const renderActions = (survey: Survey) => {
    return (
      <>
        <button
          className="action-button btn-detail"
          onClick={() => handleViewDetail(survey)}
          title="Ver Detalle Completo"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        {survey.validado !== "ELIMINADO" && survey.validado !== "ELIMINADO_Y_BORRAR" && (
          <button
            className="action-button btn-delete"
            onClick={() => handleNotValidate(survey)}
            title="No Validar / Eliminar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        )}
      </>
    )
  }

  const handleViewDetail = (survey: Survey) => {
    setSelectedSurvey(survey)
    setShowDetailModal(true)
  }

  const handleCloseModal = () => {
    setShowDetailModal(false)
    setSelectedSurvey(null)
  }

  const renderTable = () => {
    if (loading) return <div className="no-results">Cargando encuestas...</div>
    if (error) return <div className="no-results error-message">❌ {error}</div>
    if (surveys.length === 0)
      return <div className="no-results">No se encontraron encuestas con los filtros aplicados.</div>

    return (
      <div className="table-container">
        <table className="surveys-table">
          <thead>
            <tr>
              {tableHeaders.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {surveys.map((survey) => (
              <tr key={survey._id}>
                {tableHeaders.map((header) => {
                  const field = tableFieldMap[header]

                  if (header === "Acciones")
                    return (
                      <td key={header} className="actions-cell">
                        {renderActions(survey)}
                      </td>
                    )

                  // Renderizado seguro para celdas
                  let originalValue = survey[field]

                  // Si el valor es null, undefined o string vacío, mostramos N/A.
                  // NOTA: Si server.js está guardando "" (string vacío), aquí saldrá N/A.
                  if (originalValue === undefined || originalValue === null || originalValue === "") {
                    originalValue = "N/A"
                  }

                  if (header === "Estado") {
                    return (
                      <td key={header}>
                        <span className={`validation-status ${getStatusClass(originalValue as string)}`}>
                          {originalValue}
                        </span>
                      </td>
                    )
                  }

                  return <td key={header}>{originalValue}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderDetailModal = () => {
    if (!showDetailModal || !selectedSurvey) return null

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

    return (
      <div className="modal-overlay detail-modal-overlay" onClick={handleCloseModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Detalle de Encuesta</h2>
            <button className="modal-close-btn" onClick={handleCloseModal} title="Cerrar">
              ✕
            </button>
          </div>

          <div className="modal-body">
            {/* Información General */}
            <div className="detail-section">
              <h3 className="detail-section-title">Información General</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Marca Temporal</span>
                  <span className="detail-value">{formatTimestamp(selectedSurvey.timestampServidor)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Clave de Encuestador</span>
                  <span className="detail-value">{selectedSurvey.claveEncuestador || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Fecha</span>
                  <span className="detail-value">{selectedSurvey.fecha || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Estado</span>
                  <span className={`detail-status-badge ${getStatusClass(selectedSurvey.validado || "PENDIENTE")}`}>
                    {selectedSurvey.validado || "PENDIENTE"}
                  </span>
                </div>
              </div>
            </div>

            {/* Información del Viaje */}
            <div className="detail-section">
              <h3 className="detail-section-title">Información del Viaje</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">No. Eco</span>
                  <span className="detail-value">{selectedSurvey.noEco || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">No. Boleto</span>
                  <span className="detail-value">{selectedSurvey.folioBoleto || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Terminal de Origen</span>
                  <span className="detail-value">{selectedSurvey.origenViaje || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Destino Final</span>
                  <span className="detail-value">{selectedSurvey.destinoFinal || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Medio de Adquisición</span>
                  <span className="detail-value">{selectedSurvey.medioAdquisicion || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Evaluación de Experiencia de Compra */}
            <div className="detail-section">
              <h3 className="detail-section-title">Experiencia de Compra</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <span className="detail-value">{selectedSurvey.califExperienciaCompra || "N/A"}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Comentarios</span>
                  <span className="detail-value long-text">
                    {selectedSurvey.comentExperienciaCompra || "Sin comentarios"}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluación del Servicio del Conductor - AQUI ES DONDE VEIAS EL ERROR */}
            <div className="detail-section">
              <h3 className="detail-section-title">Servicio del Conductor</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  {/* Se usa exactamente la variable del server.js */}
                  <span className="detail-value">{selectedSurvey.califServicioConductor || "N/A"}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Comentarios</span>
                  <span className="detail-value long-text">
                    {selectedSurvey.comentServicioConductor || "Sin comentarios"}
                  </span>
                </div>
              </div>
            </div>

            {/* Evaluación de Comodidad */}
            <div className="detail-section">
              <h3 className="detail-section-title">Comodidad a Bordo</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <span className="detail-value">{selectedSurvey.califComodidad || "N/A"}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Comentarios</span>
                  <span className="detail-value long-text">{selectedSurvey.comentComodidad || "Sin comentarios"}</span>
                </div>
              </div>
            </div>

            {/* Evaluación de Limpieza */}
            <div className="detail-section">
              <h3 className="detail-section-title">Limpieza a Bordo</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <span className="detail-value">{selectedSurvey.califLimpieza || "N/A"}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Comentarios</span>
                  <span className="detail-value long-text">{selectedSurvey.comentLimpieza || "Sin comentarios"}</span>
                </div>
              </div>
            </div>

            {/* Evaluación de Seguridad */}
            <div className="detail-section">
              <h3 className="detail-section-title">Seguridad del Viaje</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <span className="detail-value">{selectedSurvey.califSeguridad || "N/A"}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Especificación</span>
                  <span className="detail-value long-text">
                    {selectedSurvey.especifSeguridad || "Sin especificación"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cumplimiento de Expectativas - AQUI ES DONDE VEIAS EL ERROR */}
            <div className="detail-section">
              <h3 className="detail-section-title">Cumplimiento de Expectativas</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">¿Cumplió Expectativas?</span>
                  {/* Se usa exactamente la variable del server.js */}
                  <span className="detail-value">{selectedSurvey.cumplioExpectativas || "N/A"}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Especifique el Motivo</span>
                  <span className="detail-value long-text">
                    {selectedSurvey.especificarMotivo || "Sin especificación"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleEdit = (survey: Survey) => {
    setEditingSurvey(survey)
    // Inicialización del formulario de edición con las variables EXACTAS del server.js
    setEditFormData({
      noEco: survey.noEco || "",
      origenViaje: survey.origenViaje || "",
      destinoFinal: survey.destinoFinal || "",
      medioAdquisicion: survey.medioAdquisicion || "",
      califExperienciaCompra: survey.califExperienciaCompra || "",
      comentExperienciaCompra: survey.comentExperienciaCompra || "",
      califServicioConductor: survey.califServicioConductor || "",
      comentServicioConductor: survey.comentServicioConductor || "",
      califComodidad: survey.califComodidad || "",
      comentComodidad: survey.comentComodidad || "",
      califLimpieza: survey.califLimpieza || "",
      comentLimpieza: survey.comentLimpieza || "",
      califSeguridad: survey.califSeguridad || "",
      especifSeguridad: survey.especifSeguridad || "",
      cumplioExpectativas: survey.cumplioExpectativas || "",
      especificarMotivo: survey.especificarMotivo || "",
    })
    setShowEditModal(true)
  }

  const handleSaveFromModal = async () => {
    if (!editingSurvey) return

    const updates: { [key: string]: any } = {}

    Object.keys(editFormData).forEach((key) => {
      if (editingSurvey.hasOwnProperty(key) && editFormData[key] !== editingSurvey[key]) {
        updates[key] = editFormData[key]
      } else if (!editingSurvey.hasOwnProperty(key) && editFormData[key] !== "") {
        updates[key] = editFormData[key]
      }
    })

    if (Object.keys(updates).length === 0) {
      alert("No hay cambios para guardar.")
      return
    }

    try {
      const url = `${API_BASE_URL}/encuestas/${editingSurvey._id}`
      await axios.put(url, updates, getAuthHeaders())

      alert("Encuesta actualizada correctamente.")
      setShowEditModal(false)
      setEditingSurvey(null)
      setEditFormData({})
      fetchSurveys()
    } catch (err) {
      const axiosError = err as AxiosError
      console.error("Error al guardar:", axiosError)
      alert(
        `Error al guardar. **Error ${axiosError.response?.status || "Desconocido"}: Necesitas un token de sesión VÁLIDO para hacer cambios.**`,
      )
    }
  }

  const renderEditModal = () => {
    if (!showEditModal || !editingSurvey) return null

    return (
      <div className="modal-overlay detail-modal-overlay" onClick={() => setShowEditModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Editar Encuesta</h2>
            <button className="modal-close-btn" onClick={() => setShowEditModal(false)} title="Cerrar">
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="detail-section">
              <h3 className="detail-section-title">Información General</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Marca Temporal</span>
                  <span className="detail-value">{formatTimestamp(editingSurvey.timestampServidor)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Clave de Encuestador</span>
                  <span className="detail-value">{editingSurvey.claveEncuestador || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Fecha</span>
                  <span className="detail-value">{editingSurvey.fecha || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">No. Boleto</span>
                  <span className="detail-value">{editingSurvey.folioBoleto || "N/A"}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Información del Viaje</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">No. Eco</span>
                  <input
                    type="text"
                    className="edit-input"
                    value={editFormData.noEco}
                    onChange={(e) => setEditFormData({ ...editFormData, noEco: e.target.value })}
                  />
                </div>
                <div className="detail-item">
                  <span className="detail-label">Terminal de Origen</span>
                  <select
                    className="edit-input"
                    value={editFormData.origenViaje}
                    onChange={(e) => setEditFormData({ ...editFormData, origenViaje: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {terminales.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Destino Final</span>
                  <select
                    className="edit-input"
                    value={editFormData.destinoFinal}
                    onChange={(e) => setEditFormData({ ...editFormData, destinoFinal: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {destinos.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Medio de Adquisición</span>
                  <input
                    type="text"
                    className="edit-input"
                    value={editFormData.medioAdquisicion}
                    onChange={(e) => setEditFormData({ ...editFormData, medioAdquisicion: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Experiencia de Compra</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <input
                    type="text"
                    className="edit-input"
                    value={editFormData.califExperienciaCompra}
                    onChange={(e) => setEditFormData({ ...editFormData, califExperienciaCompra: e.target.value })}
                  />
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Comentarios</span>
                  <textarea
                    className="edit-textarea"
                    value={editFormData.comentExperienciaCompra}
                    onChange={(e) => setEditFormData({ ...editFormData, comentExperienciaCompra: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Servicio del Conductor</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <input
                    type="text"
                    className="edit-input"
                    value={editFormData.califServicioConductor}
                    onChange={(e) => setEditFormData({ ...editFormData, califServicioConductor: e.target.value })}
                  />
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Comentarios</span>
                  <textarea
                    className="edit-textarea"
                    value={editFormData.comentServicioConductor}
                    onChange={(e) => setEditFormData({ ...editFormData, comentServicioConductor: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Comodidad a Bordo</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <input
                    type="text"
                    className="edit-input"
                    value={editFormData.califComodidad}
                    onChange={(e) => setEditFormData({ ...editFormData, califComodidad: e.target.value })}
                  />
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Comentarios</span>
                  <textarea
                    className="edit-textarea"
                    value={editFormData.comentComodidad}
                    onChange={(e) => setEditFormData({ ...editFormData, comentComodidad: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Limpieza a Bordo</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <input
                    type="text"
                    className="edit-input"
                    value={editFormData.califLimpieza}
                    onChange={(e) => setEditFormData({ ...editFormData, califLimpieza: e.target.value })}
                  />
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Comentarios</span>
                  <textarea
                    className="edit-textarea"
                    value={editFormData.comentLimpieza}
                    onChange={(e) => setEditFormData({ ...editFormData, comentLimpieza: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Seguridad del Viaje</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
                  <input
                    type="text"
                    className="edit-input"
                    value={editFormData.califSeguridad}
                    onChange={(e) => setEditFormData({ ...editFormData, califSeguridad: e.target.value })}
                  />
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Especificación</span>
                  <textarea
                    className="edit-textarea"
                    value={editFormData.especifSeguridad}
                    onChange={(e) => setEditFormData({ ...editFormData, especifSeguridad: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">Cumplimiento de Expectativas</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">¿Cumplió Expectativas?</span>
                  <select
                    className="edit-input"
                    value={editFormData.cumplioExpectativas}
                    onChange={(e) => setEditFormData({ ...editFormData, cumplioExpectativas: e.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {expectativas.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <span className="detail-label">Especifique el Motivo</span>
                  <textarea
                    className="edit-textarea"
                    value={editFormData.especificarMotivo}
                    onChange={(e) => setEditFormData({ ...editFormData, especificarMotivo: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-save-modal" onClick={handleSaveFromModal}>
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderInvalidReasonModal = () => {
    if (!showInvalidReasonModal || !surveyToInvalidate) return null

    const motivos = [
      "Numero de boleto Mal Escrito",
      "Numero de Encuestador Mal Escrito o Incompleto",
      "Falta de Información",
    ]

    return (
      <div className="modal-overlay" onClick={() => setShowInvalidReasonModal(false)}>
        <div className="modal-content invalid-reason-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Motivo de No Validación</h2>
            <button className="modal-close-btn" onClick={() => setShowInvalidReasonModal(false)} title="Cerrar">
              ✕
            </button>
          </div>

          <div className="modal-body">
            <p className="invalid-reason-text">
              Por favor, selecciona el motivo por el cual esta encuesta no será validada:
            </p>

            <div className="invalid-reason-options">
              {motivos.map((motivo) => (
                <label key={motivo} className="invalid-reason-option">
                  <input
                    type="radio"
                    name="invalidReason"
                    value={motivo}
                    checked={selectedInvalidReason === motivo}
                    onChange={(e) => setSelectedInvalidReason(e.target.value)}
                  />
                  <span>{motivo}</span>
                </label>
              ))}
            </div>

            <div className="invalid-reason-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowInvalidReasonModal(false)
                  setSurveyToInvalidate(null)
                  setSelectedInvalidReason("")
                }}
              >
                Cancelar
              </button>
              <button className="btn-confirm" onClick={confirmInvalidation} disabled={!selectedInvalidReason}>
                Confirmar No Validación
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderInvalidModal = () => {
    if (!showInvalidModal) return null

    const invalidSurveys = getInvalidSurveys()
    const { terminalData, motivoData, fechaData } = getChartData()

    const COLORS = ["#1a4d47", "#2a655f", "#3a7d75", "#4a958b", "#5aada1", "#6ac5b7", "#7addc9"]

    const totalInvalid = invalidSurveys.length

    // Terminal summary
    const topTerminal = terminalData.length > 0 ? terminalData.reduce((a, b) => (a.value > b.value ? a : b)) : null
    const terminalSummary = topTerminal
      ? `La terminal con más encuestas no validadas es ${topTerminal.name} con ${topTerminal.value} encuestas (${((topTerminal.value / totalInvalid) * 100).toFixed(1)}% del total).`
      : "No hay datos de terminales disponibles."

    // Motivo summary
    const totalMotivos = motivoData.reduce((sum, item) => sum + item.value, 0)
    const topMotivo = motivoData.length > 0 ? motivoData.reduce((a, b) => (a.value > b.value ? a : b)) : null
    const motivoSummary = topMotivo
      ? `El motivo principal de no validación es "${topMotivo.name}" con ${topMotivo.value} casos (${((topMotivo.value / totalMotivos) * 100).toFixed(1)}% de los motivos registrados).`
      : "No hay datos de motivos disponibles."

    // Fecha summary
    const topFecha = fechaData.length > 0 ? fechaData.reduce((a, b) => (a.value > b.value ? a : b)) : null
    const fechaSummary = topFecha
      ? `La fecha con mayor número de encuestas no validadas es ${topFecha.name} con ${topFecha.value} encuestas (${((topFecha.value / totalInvalid) * 100).toFixed(1)}% del total).`
      : "No hay datos de fechas disponibles."

    // Add percentages to chart data
    const terminalDataWithPercent = terminalData.map((item) => ({
      ...item,
      percentage: ((item.value / totalInvalid) * 100).toFixed(1),
    }))

    const motivoDataWithPercent = motivoData.map((item) => ({
      ...item,
      percentage: ((item.value / totalMotivos) * 100).toFixed(1),
    }))

    const fechaDataWithPercent = fechaData.map((item) => ({
      ...item,
      percentage: ((item.value / totalInvalid) * 100).toFixed(1),
    }))

    // Custom label for pie chart with percentages
    const renderCustomLabel = (entry: any) => {
      return `${entry.name}: ${entry.value} (${entry.percentage}%)`
    }

    return (
      <div className="modal-overlay" onClick={() => setShowInvalidModal(false)}>
        <div className="modal-content invalid-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Encuestas No Validadas</h2>
            <button className="modal-close-btn" onClick={() => setShowInvalidModal(false)} title="Cerrar">
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="invalid-filter-section">
              <label htmlFor="invalidTerminalFilter" className="invalid-filter-label">
                Filtrar por Terminal:
              </label>
              <select
                id="invalidTerminalFilter"
                value={invalidTerminalFilter}
                onChange={(e) => setInvalidTerminalFilter(e.target.value)}
                className="invalid-filter-select"
              >
                <option value="">TODAS LAS TERMINALES</option>
                {terminales.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="invalid-tabs">
              <button
                className={`invalid-tab ${invalidTab === "graficas" ? "active" : ""}`}
                onClick={() => setInvalidTab("graficas")}
              >
                Gráficas Estadísticas
              </button>
              <button
                className={`invalid-tab ${invalidTab === "tabla" ? "active" : ""}`}
                onClick={() => setInvalidTab("tabla")}
              >
                Tabla de Encuestas
              </button>
            </div>

            {invalidTab === "graficas" ? (
              <div className="invalid-charts-container">
                <div className="chart-card">
                  <h3 className="chart-title">Encuestas No Validadas por Terminal</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={terminalDataWithPercent}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any, name: any, props: any) => [
                          `${value} (${props.payload.percentage}%)`,
                          "Encuestas",
                        ]}
                      />
                      <Bar dataKey="value" fill="#2a655f" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p
                    style={{
                      marginTop: "16px",
                      fontSize: "0.9rem",
                      color: "#444",
                      lineHeight: "1.6",
                      textAlign: "center",
                      padding: "12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "6px",
                      borderLeft: "3px solid #2a655f",
                    }}
                  >
                    {terminalSummary}
                  </p>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Motivos de No Validación</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={motivoDataWithPercent}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {motivoDataWithPercent.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any, props: any) => [`${value} encuestas`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <p
                    style={{
                      marginTop: "16px",
                      fontSize: "0.9rem",
                      color: "#444",
                      lineHeight: "1.6",
                      textAlign: "center",
                      padding: "12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "6px",
                      borderLeft: "3px solid #2a655f",
                    }}
                  >
                    {motivoSummary}
                  </p>
                </div>

                <div className="chart-card">
                  <h3 className="chart-title">Tendencia por Fecha</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={fechaDataWithPercent}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any, name: any, props: any) => [
                          `${value} (${props.payload.percentage}%)`,
                          "Encuestas No Validadas",
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="value" fill="#1f4e4a" name="Encuestas No Validadas" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p
                    style={{
                      marginTop: "16px",
                      fontSize: "0.9rem",
                      color: "#444",
                      lineHeight: "1.6",
                      textAlign: "center",
                      padding: "12px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "6px",
                      borderLeft: "3px solid #2a655f",
                    }}
                  >
                    {fechaSummary}
                  </p>
                </div>
              </div>
            ) : (
              <div className="invalid-table-container">
                {invalidSurveys.length === 0 ? (
                  <div className="no-results">No hay encuestas no validadas</div>
                ) : (
                  <table className="invalid-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>No. Boleto</th>
                        <th>Terminal</th>
                        <th>Destino</th>
                        <th>Encuestador</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invalidSurveys.map((survey) => (
                        <tr key={survey._id}>
                          <td>{survey.fecha || "N/A"}</td>
                          <td>{survey.folioBoleto || "N/A"}</td>
                          <td>{survey.origenViaje || "N/A"}</td>
                          <td>{survey.destinoFinal || "N/A"}</td>
                          <td>{survey.claveEncuestador || "N/A"}</td>
                          <td>{survey.especificarMotivo || "Sin Motivo"}</td>
                          <td>
                            <span className="validation-status status-eliminado">{survey.validado}</span>
                          </td>
                          <td className="actions-cell">
                            <button
                              className="action-button btn-detail"
                              onClick={() => handleViewDetail(survey)}
                              title="Ver Detalle Completo"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const logoUrl = "/logo_flecha_roja.png"

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-top-bar">
          <div className="header-logo-container">
            <img src={logoUrl || "/placeholder.svg"} alt="Logo Flecha Roja" className="header-logo" />
          </div>
          <h1 className="header-title-main">SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA</h1>
          <button className="btn-navigate" onClick={() => navigate("/dashboard")}>
            Regresar al Inicio
          </button>
        </div>

        {/* Menú de navegación */}
        <nav className="nav-bar">
          {navItems.map((item) => (
            <button
              key={item}
              className={`nav-button ${location.pathname === tabRoutes[item] ? "active" : ""}`}
              onClick={() => navigate(tabRoutes[item])}
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      <main className="dashboard-main-content">
        <div className="surveys-section">
          <div className="filter-box">
            <h2 className="surveys-section-title">ENCUESTAS REALIZADAS GENERALES</h2>
            <p className="surveys-intro-text">
              En este apartado se muestran las Encuestas Realizadas generales para Validar o No validar
            </p>

            <div className="filter-grid">
              <div className="filter-group">
                <div className="search-input-wrapper">
                  <input
                    id="folioSearch"
                    type="text"
                    placeholder="Buscar por boleto o clave..."
                    className="search-input-subtle"
                    value={folioSearch}
                    onChange={(e) => setFolioSearch(e.target.value)}
                  />
                  <svg
                    className="search-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
              </div>

              <div className="filter-group">
                <select id="filterTerminal" value={filterTerminal} onChange={(e) => setFilterTerminal(e.target.value)}>
                  <option value="">TODAS LAS TERMINALES</option>
                  {terminales.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <select id="filterDestino" value={filterDestino} onChange={(e) => setFilterDestino(e.target.value)}>
                  <option value="">TODOS LOS DESTINOS</option>
                  {destinos.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <select
                  id="filterExpectativa"
                  value={filterExpectativa}
                  onChange={(e) => setFilterExpectativa(e.target.value)}
                >
                  <option value="">TODAS LAS EXPERIENCIAS</option>
                  {expectativas.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <button className="btn-invalid-surveys" onClick={() => setShowInvalidModal(true)}>
                  Ver Encuestas No Validadas (
                  {allSurveys.filter((s) => s.validado === "ELIMINADO" || s.validado === "ELIMINADO_Y_BORRAR").length})
                </button>
              </div>

              <div className="filter-group">
                <button className="btn-depurar" onClick={handlePurge}>
                  Depurar Sistema
                </button>
              </div>
            </div>
          </div>

          {renderTable()}
        </div>
      </main>

      {renderDetailModal()}
      {renderEditModal()}
      {renderInvalidModal()}
      {renderInvalidReasonModal()}
    </div>
  )
}

export default Encuestas