"use client"

// Encuestas.tsx

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import axios, { type AxiosError } from "axios"
import { useNavigate } from "react-router-dom"
import "./Encuestas.css"

const API_BASE_URL = "https://flecha-roja-satisfaccion.onrender.com/api/dashboard"

interface Survey {
  _id: string
  claveEncuestador: string
  fecha: string
  noEco: string
  folioBoleto: string
  origenViaje: string
  destinoFinal: string
  cumplioExpectativas: string
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
  validado?: "VALIDADO" | "PENDIENTE" | "ELIMINADO" | string
  timestampServidor: string
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
  "Villa Victoria",
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
  "Marca Temporal",
  "Clave de encuestador",
  "Fecha",
  "No. Eco",
  "No. Boleto",
  "Terminal",
  "Destino",
  "Medio de Adquisición",
  "Experiencia de Compra",
  "¿Por qué?",
  "Servicio del Conductor",
  "¿Por qué?2",
  "Comodidad a Bordo",
  "¿Por qué?4",
  "Limpieza a Bordo",
  "¿Por qué?5",
  "Seguridad del Viaje",
  "Especifique",
  "Cumplió Expectativas",
  "Especifique 6",
  "Estado",
  "Acciones",
]

const tableFieldMap: { [key: string]: keyof Survey } = {
  "Marca Temporal": "timestampServidor",
  "Clave de encuestador": "claveEncuestador",
  Fecha: "fecha",
  "No. Eco": "noEco",
  "No. Boleto": "folioBoleto",
  Terminal: "origenViaje",
  Destino: "destinoFinal",
  "Medio de Adquisición": "medioAdquisicion",
  "Experiencia de Compra": "califExperienciaCompra",
  "¿Por qué?": "comentExperienciaCompra",
  "Servicio del Conductor": "califServicioConductor",
  "¿Por qué?2": "comentServicioConductor",
  "Comodidad a Bordo": "califComodidad",
  "¿Por qué?4": "comentComodidad",
  "Limpieza a Bordo": "califLimpieza",
  "¿Por qué?5": "comentLimpieza",
  "Seguridad del Viaje": "califSeguridad",
  Especifique: "especifSeguridad",
  "Cumplió Expectativas": "cumplioExpectativas",
  "Especifique 6": "especificarMotivo",
  Estado: "validado",
}

const Encuestas: React.FC = () => {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [allSurveys, setAllSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editableData, setEditableData] = useState<{ [key: string]: string }>({})

  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // --- Estados de Filtro ---
  const [folioSearch, setFolioSearch] = useState("")
  const [filterTerminal, setFilterTerminal] = useState("")
  const [filterDestino, setFilterDestino] = useState("")
  const [filterExpectativa, setFilterExpectativa] = useState("")

  /**
   * Obtiene los headers de autorización para operaciones de CRUD (PUT)
   */
  const getAuthHeaders = () => {
    const token = localStorage.getItem("aut-token")

    if (!token) {
      console.error("TOKEN (aut-token) NO ENCONTRADO para operación de CRUD. Inicia sesión.")
      return { headers: {} }
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  }

  /**
   * Función que obtiene las encuestas con filtros (SIN AUTENTICACIÓN)
   */
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

      const initialSurveys = response.data.map((s: Survey) => ({
        ...s,
        validado: s.validado || "PENDIENTE",
      }))

      setAllSurveys(initialSurveys)
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

    const searchTerm = folioSearch.trim().toLowerCase()

    if (!searchTerm) {
      setSurveys(allSurveys)
      return
    }

    const filtered = allSurveys.filter((survey) => {
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

  const handleValidate = async (id: string) => {
    try {
      const url = `${API_BASE_URL}/encuestas/${id}`
      await axios.put(url, { validado: "VALIDADO" }, getAuthHeaders())
      alert("Encuesta marcada como VALIDADA.")
      fetchSurveys()
    } catch (err) {
      const axiosError = err as AxiosError
      console.error("Error al validar:", axiosError)
      alert(
        `Error al validar. **Error ${axiosError.response?.status || "Desconocido"}: Necesitas un token de sesión VÁLIDO para hacer cambios.**`,
      )
    }
  }

  const handleNotValidate = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que quieres NO VALIDAR esta encuesta? Se marcará como ELIMINADA.")) return

    const isDeleteConfirmed = window.confirm(
      "¿Confirmas la ELIMINACIÓN PERMANENTE de esta encuesta de la base de datos? (Si cancelas, solo se marcará como ELIMINADO)",
    )

    const updatePayload = isDeleteConfirmed ? { validado: "ELIMINADO_Y_BORRAR" } : { validado: "ELIMINADO" }

    try {
      const url = `${API_BASE_URL}/encuestas/${id}`
      const response = await axios.put(url, updatePayload, getAuthHeaders())

      alert(
        response.data.message.includes("eliminada")
          ? "Encuesta eliminada permanentemente."
          : "Encuesta marcada como ELIMINADA.",
      )

      fetchSurveys()
    } catch (err) {
      const axiosError = err as AxiosError
      console.error("Error al no validar (eliminar):", axiosError)
      alert(
        `Error al no validar. **Error ${axiosError.response?.status || "Desconocido"}: Necesitas un token de sesión VÁLIDO para hacer cambios.**`,
      )
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

  const renderActions = (survey: Survey) => {
    const isModified = Object.keys(editableData).some((key) => key.startsWith(survey._id))
    const isPending = survey.validado === "PENDIENTE"

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

        <button
          className="action-button btn-save"
          onClick={() => handleSave(survey)}
          title={isModified ? "Guardar Cambios Editados" : "Editar Encuesta"}
          disabled={!isModified && survey.validado !== "PENDIENTE"}
        >
          {isModified ? (
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
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          ) : (
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          )}
        </button>

        {isPending && (
          <>
            <button
              className="action-button btn-validate"
              onClick={() => handleValidate(survey._id)}
              title="Validar Encuesta"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <button
              className="action-button btn-delete"
              onClick={() => handleNotValidate(survey._id)}
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
          </>
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

                  const originalValue =
                    survey[field] === undefined || survey[field] === null || survey[field] === ""
                      ? "N/A"
                      : survey[field]

                  if (header === "Marca Temporal") {
                    return <td key={header}>{formatTimestamp(originalValue as string)}</td>
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

                  return (
                    <td key={header} className="editable-cell">
                      <input
                        type="text"
                        value={getEditableValue(survey._id, field, originalValue as string)}
                        onChange={(e) => handleEditChange(survey._id, field, e.target.value)}
                        disabled={
                          header === "Fecha" ||
                          header === "Marca Temporal" ||
                          header === "Clave de encuestador" ||
                          header === "No. Boleto"
                        }
                      />
                    </td>
                  )
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
      <div className="modal-overlay" onClick={handleCloseModal}>
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

            {/* Evaluación del Servicio del Conductor */}
            <div className="detail-section">
              <h3 className="detail-section-title">Servicio del Conductor</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Calificación</span>
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

            {/* Cumplimiento de Expectativas */}
            <div className="detail-section">
              <h3 className="detail-section-title">Cumplimiento de Expectativas</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">¿Cumplió Expectativas?</span>
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
            </div>
          </div>

          {renderTable()}
        </div>
      </main>

      {renderDetailModal()}
    </div>
  )
}

export default Encuestas
