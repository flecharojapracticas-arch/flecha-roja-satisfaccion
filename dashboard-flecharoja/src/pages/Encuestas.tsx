// Encuestas.tsx

import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
// Importamos useNavigate para la navegación
import { useNavigate } from 'react-router-dom'; 
import './Encuestas.css'; 

const API_BASE_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/dashboard';

interface Survey {
    _id: string;
    claveEncuestador: string;
    fecha: string;
    noEco: string;
    folioBoleto: string;
    origenViaje: string;
    destinoFinal: string;
    cumplioExpectativas: string;
    califExperienciaCompra: string;
    comentExperienciaCompra: string; // Nuevo Campo
    califServicioConductor: string;
    comentServicioConductor: string; // Nuevo Campo
    califComodidad: string;
    comentComodidad: string; // Nuevo Campo
    califLimpieza: string;
    comentLimpieza: string; // Nuevo Campo
    califSeguridad: string;
    especifSeguridad: string; // Nuevo Campo
    validado?: 'VALIDADO' | 'PENDIENTE' | 'ELIMINADO' | string; 
    timestampServidor: string; // Usado para 'Marca Temporal'
    [key: string]: any; 
}

// Opciones de Filtro (Definidas por el usuario)
const terminales = [
    'Acambay', 'Atlacomulco', 'Cadereyta', 'Chalma', 'Cuernavaca', 'El Yaqui',
    'Ixtlahuaca', 'Ixtapan de la Sal', 'Mexico Poniente', 'Mexico Norte', 'Naucalpan',
    'Querétaro', 'San Juan del Rio', 'Taxco', 'Tenancingo', 'Tepotzotlán', 'Tenango',
    'Temoaya', 'Toluca', 'Santiago Tianguistengo', 'San Mateo Atenco', 'Xalatlaco',
    'Villa Victoria'
];

const destinos = [
    'Acambay', 'Atlacomulco', 'Cadereyta', 'Chalma', 'Cuernavaca', 'El Yaqui',
    'Ixtlahuaca', 'México Poniente Zona Sur', 'Ixtapan de la Sal', 'México Poniente Zona Centro',
    'Mexico Norte', 'Naucalpan', 'Querétaro', 'San Juan del Rio', 'Taxco', 'Tenancingo',
    'Tepotzotlán', 'Tenango', 'Temoaya', 'Toluca', 'Santiago Tianguistengo',
    'San Mateo Atenco', 'Xalatlaco'
];

const expectativas = ['Muy Buena', 'Buena', 'Regular', 'Mala', 'Muy Mala'];

// 🚨 NUEVOS ENCABEZADOS DE LA TABLA - ORDEN EXACTO SOLICITADO
const tableHeaders = [
    'Marca Temporal', 'Clave de encuestador', 'Fecha', 'No. Eco', 'No. Boleto', 
    'Terminal', 'Destino', 'Medio de Adquisición', 
    '1. Evalúe su experiencia de compra', '¿Por qué?', 
    '2. Evalúe el servicio del conductor', '¿Por qué?2', 
    '5. ¿Cómo califica la comodidad a bordo?', '¿Por qué?4', 
    '6. ¿Cómo califica la limpieza a bordo?', '¿Por qué?5', 
    '7. ¿Qué tan seguro consideró su viaje?', 'Especifique', 
    '8. Conforme a nuestra promesa de viaje, ¿se cumplió con sus expectativas de salida?', 
    'Especifique 6', 'Estado', 'Acciones'
];

// 🚨 MAPEO DE CAMPOS ACTUALIZADO
const tableFieldMap: { [key: string]: keyof Survey } = {
    'Marca Temporal': 'timestampServidor', // Usaremos el timestamp del servidor para la hora
    'Clave de encuestador': 'claveEncuestador',
    'Fecha': 'fecha',
    'No. Eco': 'noEco',
    'No. Boleto': 'folioBoleto',
    'Terminal': 'origenViaje',
    'Destino': 'destinoFinal',
    'Medio de Adquisición': 'medioAdquisicion',
    '1. Evalúe su experiencia de compra': 'califExperienciaCompra',
    '¿Por qué?': 'comentExperienciaCompra',
    '2. Evalúe el servicio del conductor': 'califServicioConductor',
    '¿Por qué?2': 'comentServicioConductor',
    '5. ¿Cómo califica la comodidad a bordo?': 'califComodidad',
    '¿Por qué?4': 'comentComodidad',
    '6. ¿Cómo califica la limpieza a bordo?': 'califLimpieza',
    '¿Por qué?5': 'comentLimpieza',
    '7. ¿Qué tan seguro consideró su viaje?': 'califSeguridad',
    'Especifique': 'especifSeguridad',
    '8. Conforme a nuestra promesa de viaje, ¿se cumplió con sus expectativas de salida?': 'cumplioExpectativas',
    'Especifique 6': 'especificarMotivo', // Asumo que el campo especifidad de cumplioExpectativas es 'especificarMotivo'
    'Estado': 'validado',
};


const Encuestas: React.FC = () => {
    const navigate = useNavigate(); // Hook para la navegación
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editableData, setEditableData] = useState<{ [key: string]: string }>({});

    // --- Estados de Filtro ---
    const [folioSearch, setFolioSearch] = useState('');
    const [filterTerminal, setFilterTerminal] = useState('');
    const [filterDestino, setFilterDestino] = useState('');
    const [filterExpectativa, setFilterExpectativa] = useState('');

    /**
     * Obtiene los headers de autorización para operaciones de CRUD (PUT)
     */
    const getAuthHeaders = () => {
        const token = localStorage.getItem('aut-token');
        
        if (!token) {
            console.error("TOKEN (aut-token) NO ENCONTRADO para operación de CRUD. Inicia sesión.");
            // No se interrumpe la ejecución, pero PUT fallará (Error 401/403)
            return { headers: {} }; 
        }

        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    // Función para obtener las encuestas con filtros (SIN AUTENTICACIÓN)
    const fetchSurveys = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSurveys([]); 

        try {
            const params = new URLSearchParams();
            if (folioSearch) params.append('folioBoleto', folioSearch);
            if (filterTerminal) params.append('filterTerminal', filterTerminal); 
            if (filterDestino) params.append('filterDestino', filterDestino);
            if (filterExpectativa) params.append('filterExpectativa', filterExpectativa);
            
            const url = `${API_BASE_URL}/encuestas?${params.toString()}`;
            
            const response = await axios.get(url); 
            
            const initialSurveys = response.data.map((s: Survey) => ({
                ...s,
                validado: s.validado || 'PENDIENTE', 
            }));
            
            setSurveys(initialSurveys);
            
        } catch (err) {
            const axiosError = err as AxiosError;
            console.error('Error al cargar encuestas:', axiosError);
            
            let errorMessage = 'Error al cargar encuestas. Verifique la conexión con Render.';
            if (axiosError.response) {
                errorMessage = `❌ Error ${axiosError.response.status}: Asegúrese que el backend en Render esté corriendo.`;
            }
            
            setError(errorMessage);
            setSurveys([]);
        } finally {
            setLoading(false);
        }
    }, [folioSearch, filterTerminal, filterDestino, filterExpectativa]);

    // Cargar datos al montar y al cambiar filtros
    useEffect(() => {
        fetchSurveys();
    }, [fetchSurveys]);


    // --- Lógica de Edición y CRUD (Usa Autenticación) ---

    const handleEditChange = (id: string, field: string, value: string) => {
        setEditableData(prev => ({
            ...prev,
            [`${id}_${field}`]: value,
        }));
    };

    const getEditableValue = (id: string, field: string, originalValue: string) => {
        return editableData[`${id}_${field}`] !== undefined ? editableData[`${id}_${field}`] : originalValue;
    };

    const handleSave = async (survey: Survey) => {
        const id = survey._id;
        const updates: { [key: string]: any } = {};
        
        Object.values(tableFieldMap).forEach(key => {
            if (key === 'timestampServidor' || key === 'fecha') return; // Excluir campos no editables

            const editableKey = `${id}_${key}`;
            const editableValue = editableData[editableKey];
            const originalValue = survey[key];

            if (editableValue !== undefined && editableValue !== originalValue) {
                updates[key] = editableValue;
            }
        });

        if (Object.keys(updates).length === 0) {
            alert("No hay cambios para guardar.");
            return;
        }

        try {
            const url = `${API_BASE_URL}/encuestas/${id}`;
            await axios.put(url, updates, getAuthHeaders());
            
            setEditableData(prev => {
                const newEdits = { ...prev };
                Object.keys(updates).forEach(key => delete newEdits[`${id}_${key}`]);
                return newEdits;
            });

            alert('Encuesta actualizada correctamente.');
            fetchSurveys(); 

        } catch (err) {
             const axiosError = err as AxiosError;
            console.error('Error al guardar:', axiosError);
            alert(`Error al guardar. **Error ${axiosError.response?.status || 'Desconocido'}: Necesitas un token de sesión VÁLIDO para hacer cambios.**`);
        }
    };

    const handleValidate = async (id: string) => {
        try {
            const url = `${API_BASE_URL}/encuestas/${id}`;
            await axios.put(url, { validado: 'VALIDADO' }, getAuthHeaders());
            alert('Encuesta marcada como VALIDADA.');
            fetchSurveys();
        } catch (err) {
             const axiosError = err as AxiosError;
            console.error('Error al validar:', axiosError);
            alert(`Error al validar. **Error ${axiosError.response?.status || 'Desconocido'}: Necesitas un token de sesión VÁLIDO para hacer cambios.**`);
        }
    };

    const handleNotValidate = async (id: string) => {
        if (!window.confirm("¿Estás seguro de que quieres NO VALIDAR esta encuesta? Se marcará como ELIMINADA.")) return;
        
        const isDeleteConfirmed = window.confirm("¿Confirmas la ELIMINACIÓN PERMANENTE de esta encuesta de la base de datos? (Si cancelas, solo se marcará como ELIMINADO)");
        
        const updatePayload = isDeleteConfirmed ? 
            { validado: 'ELIMINADO_Y_BORRAR' } : 
            { validado: 'ELIMINADO' };

        try {
            const url = `${API_BASE_URL}/encuestas/${id}`;
            const response = await axios.put(url, updatePayload, getAuthHeaders()); 
            
            alert(response.data.message.includes("eliminada") 
                ? 'Encuesta eliminada permanentemente.' 
                : 'Encuesta marcada como ELIMINADA.');

            fetchSurveys();
        } catch (err) {
             const axiosError = err as AxiosError;
            console.error('Error al no validar (eliminar):', axiosError);
            alert(`Error al no validar. **Error ${axiosError.response?.status || 'Desconocido'}: Necesitas un token de sesión VÁLIDO para hacer cambios.**`);
        }
    };

    const handleResetFilters = () => {
        setFolioSearch('');
        setFilterTerminal('');
        setFilterDestino('');
        setFilterExpectativa('');
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'VALIDADO': return 'status-validado';
            case 'ELIMINADO': return 'status-eliminado';
            default: return 'status-pendiente';
        }
    };
    
    // Función para formatear la Marca Temporal (ISO string a Fecha/Hora)
    const formatTimestamp = (isoString: string) => {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('es-MX', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(',', ''); 
        } catch (e) {
            return isoString;
        }
    };


    const renderActions = (survey: Survey) => {
        const isModified = Object.keys(editableData).some(key => key.startsWith(survey._id) && editableData[key] !== undefined);
        const isPending = survey.validado === 'PENDIENTE';

        return (
            <>
                <button
                    className="action-button btn-save"
                    onClick={() => handleSave(survey)}
                    disabled={!isModified && !isPending}
                    title={isModified ? 'Guardar Cambios Editados' : 'Haga click para entrar en modo edición/guardado'}
                >
                    {isModified ? 'Guardar' : 'Editar'}
                </button>
                
                {isPending && (
                    <>
                        <button
                            className="action-button btn-validate"
                            onClick={() => handleValidate(survey._id)}
                            title="Aprobar Encuesta"
                        >
                            Validar
                        </button>
                        <button
                            className="action-button btn-delete"
                            onClick={() => handleNotValidate(survey._id)}
                            title="Marcar como Eliminada/No Validada"
                        >
                            No Validar
                        </button>
                    </>
                )}
            </>
        );
    };

    const renderTable = () => {
        if (loading) return <div className="no-results">Cargando encuestas...</div>;
        if (error) return <div className="no-results error-message">❌ {error}</div>;
        if (surveys.length === 0) return <div className="no-results">No se encontraron encuestas con los filtros aplicados.</div>;

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
                        {surveys.map(survey => (
                            <tr key={survey._id}>
                                {tableHeaders.map(header => {
                                    const field = tableFieldMap[header];
                                    
                                    // Columna de Acciones
                                    if (header === 'Acciones') return <td key={header} className="actions-cell">{renderActions(survey)}</td>;

                                    const originalValue = survey[field] || 'N/A';
                                    
                                    // Columna de Marca Temporal
                                    if (header === 'Marca Temporal') {
                                        return <td key={header}>{formatTimestamp(originalValue as string)}</td>;
                                    }

                                    // Columna de Estado
                                    if (header === 'Estado') {
                                        return (
                                            <td key={header}>
                                                <span className={`validation-status ${getStatusClass(originalValue as string)}`}>
                                                    {originalValue}
                                                </span>
                                            </td>
                                        );
                                    }

                                    // Celdas Editables (Todos los demás campos)
                                    return (
                                        <td key={header} className="editable-cell">
                                            <input
                                                type="text"
                                                value={getEditableValue(survey._id, field, originalValue as string)}
                                                onChange={(e) => handleEditChange(survey._id, field, e.target.value)}
                                                // Deshabilitar la edición para Fecha y Clave (ya que son campos de registro inalterables)
                                                disabled={header === 'Fecha' || header === 'Clave de encuestador' || header === 'No. Boleto'} 
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const logoUrl = '/logo_flecha_roja.png'; // Ruta corregida según tu indicación

    return (
        <div className="dashboard-container">
            {/* Encabezado fijo */}
            <header className="dashboard-header">
                <div className="header-top-bar">
                    <div className="header-logo-container">
                        <img src={logoUrl} alt="Logo Flecha Roja" className="header-logo" />
                        {/* ❌ ELIMINADO: <span className="logo-name">Flecha Roja S.A. de C.V.</span> */}
                    </div>
                    <h1 className="header-title-main">ENCUESTAS REALIZADAS GENERALES</h1>
                    <button 
                        className="btn-navigate" 
                        onClick={() => navigate('/dashboard')} // Navegación al dashboard.tsx
                    >
                        Dashboard
                    </button>
                </div>
            </header>

            <main className="dashboard-main-content">
                <div className="surveys-section">
                    
                    <p className="surveys-intro-text">
                        En este apartado se muestran las **Encuestas Realizadas generales** para Validar o No validar.
                    </p>

                    {/* Contenedor de Filtros */}
                    <div className="filter-box">
                        <div className="filter-grid">
                            
                            {/* 1. FILTRO POR FOLIO DE BOLETO Y BOTÓN DE BÚSQUEDA */}
                            <div className="filter-group">
                                <div className="search-input-group">
                                    <input
                                        id="folioSearch"
                                        type="text"
                                        placeholder="BUSCAR BOLETO"
                                        value={folioSearch}
                                        onChange={(e) => setFolioSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchSurveys()}
                                    />
                                    <button 
                                        className="btn-search" 
                                        onClick={fetchSurveys}
                                        title="Buscar por folio exacto"
                                    >
                                        BUSCAR
                                    </button>
                                </div>
                            </div>

                            {/* 2. FILTRO POR TERMINAL (ORIGEN) */}
                            <div className="filter-group">
                                <select
                                    id="filterTerminal"
                                    value={filterTerminal}
                                    onChange={(e) => setFilterTerminal(e.target.value)}
                                    // Cambiado el texto del placeholder
                                >
                                    <option value="">TODAS LAS TERMINALES</option>
                                    {terminales.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. FILTRO POR DESTINO */}
                            <div className="filter-group">
                                <select
                                    id="filterDestino"
                                    value={filterDestino}
                                    onChange={(e) => setFilterDestino(e.target.value)}
                                >
                                    <option value="">TODOS LOS DESTINOS</option>
                                    {destinos.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 4. FILTRO POR EXPERIENCIA (EXPECTATIVAS) */}
                            <div className="filter-group">
                                <select
                                    id="filterExpectativa"
                                    value={filterExpectativa}
                                    onChange={(e) => setFilterExpectativa(e.target.value)}
                                >
                                    <option value="">TODAS LAS EXPERIENCIAS</option>
                                    {expectativas.map(e => (
                                        <option key={e} value={e}>{e}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* BOTÓN DE REINICIAR - lo ocultamos, se puede usar el 'TODOS' de los select */}
                        </div>
                    </div>

                    {renderTable()}
                </div>
            </main>
        </div>
    );
};

export default Encuestas;