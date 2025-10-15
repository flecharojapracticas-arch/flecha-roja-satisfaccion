import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import './Encuestas.css'; 
// 

const API_BASE_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/dashboard';

// Interfaz de la Encuesta (Asegura la tipificación de los datos)
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
    califServicioConductor: string;
    califComodidad: string;
    califLimpieza: string;
    califSeguridad: string;
    validado?: 'VALIDADO' | 'PENDIENTE' | 'ELIMINADO' | string; 
    [key: string]: any; 
}

// Opciones de Filtro
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

// Mapeo de columnas para la tabla
const tableHeaders = [
    'ID', 'Fecha', 'Boleto', 'Origen', 'Destino', 'Expectativa', 
    'Compra', 'Conductor', 'Comodidad', 'Limpieza', 'Seguridad', 
    'Estado', 'Acciones'
];

const tableFieldMap: { [key: string]: keyof Survey } = {
    'ID': '_id',
    'Fecha': 'fecha',
    'Boleto': 'folioBoleto',
    'Origen': 'origenViaje',
    'Destino': 'destinoFinal',
    'Expectativa': 'cumplioExpectativas',
    'Compra': 'califExperienciaCompra',
    'Conductor': 'califServicioConductor',
    'Comodidad': 'califComodidad',
    'Limpieza': 'califLimpieza',
    'Seguridad': 'califSeguridad',
    'Estado': 'validado',
};


const Encuestas: React.FC = () => {
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
            // Mapeo a los nombres de variables del Backend (routes/surveys.js)
            if (folioSearch) params.append('folioBoleto', folioSearch);
            if (filterTerminal) params.append('filterTerminal', filterTerminal); 
            if (filterDestino) params.append('filterDestino', filterDestino);
            if (filterExpectativa) params.append('filterExpectativa', filterExpectativa);
            
            const url = `${API_BASE_URL}/encuestas?${params.toString()}`;
            
            // Petición GET sin header de autorización
            const response = await axios.get(url); 
            
            const initialSurveys = response.data.map((s: Survey) => ({
                ...s,
                // Asegurar que el campo 'validado' exista, por defecto 'PENDIENTE'
                validado: s.validado || 'PENDIENTE', 
            }));
            
            setSurveys(initialSurveys);
            
        } catch (err) {
            const axiosError = err as AxiosError;
            console.error('Error al cargar encuestas:', axiosError);
            
            let errorMessage = 'Error al cargar encuestas. Verifique la conexión con Render.';
            if (axiosError.response) {
                errorMessage = `❌ Error ${axiosError.response.status}: Asegúrese que el backend en Render esté corriendo y sin fallos.`;
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
            // Solo considerar campos que no sean _id
            if (key === '_id') return; 

            const editableKey = `${id}_${key}`;
            const editableValue = editableData[editableKey];
            const originalValue = survey[key];

            // Si el valor editado es diferente al valor original en la base de datos
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
            
            // Limpiar datos editables después de guardar
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
        
        // Enviamos un flag especial al backend para que sepa que debe borrar el documento
        const isDeleteConfirmed = window.confirm("¿Confirmas la ELIMINACIÓN PERMANENTE de esta encuesta de la base de datos? (De lo contrario, solo se marcará como ELIMINADO)");
        
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

    const renderActions = (survey: Survey) => {
        const isModified = Object.keys(editableData).some(key => key.startsWith(survey._id) && editableData[key] !== undefined);
        const isPending = survey.validado === 'PENDIENTE';
        const isEditable = isModified || isPending || survey.validado === 'VALIDADO' || survey.validado === 'ELIMINADO';

        return (
            <>
                <button
                    className="action-button btn-save"
                    onClick={() => handleSave(survey)}
                    disabled={!isModified && isPending}
                    title={isModified ? 'Guardar Cambios' : 'Actualizar Campos'}
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
                            {tableHeaders.map(header => (
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
                                    // Mostrar solo los últimos 5 caracteres del ID para ahorrar espacio
                                    const displayValue = header === 'ID' ? String(survey._id).slice(-5) : originalValue;

                                    // Columna de Estado (Tags de color)
                                    if (header === 'Estado') {
                                        return (
                                            <td key={header}>
                                                <span className={`validation-status ${getStatusClass(originalValue as string)}`}>
                                                    {originalValue}
                                                </span>
                                            </td>
                                        );
                                    }

                                    // Celdas Editables
                                    return (
                                        <td key={header} className="editable-cell">
                                            <input
                                                type="text"
                                                value={getEditableValue(survey._id, field, originalValue as string)}
                                                onChange={(e) => handleEditChange(survey._id, field, e.target.value)}
                                                disabled={header === 'ID' || header === 'Fecha'} // No se debe editar ID ni Fecha
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

    const logoUrl = '/assets/logo.png'; 

    return (
        <div className="dashboard-container">
            {/* Encabezado fijo (mantiene tu estructura) */}
            <header className="dashboard-header">
                <div className="header-top-bar">
                    <div className="header-logo-container">
                        <img src={logoUrl} alt="Logo Flecha Roja" className="header-logo" />
                        <span className="logo-name">Flecha Roja S.A. de C.V.</span>
                    </div>
                    <h1 className="header-title-main">ADMINISTRACIÓN DE ENCUESTAS</h1>
                    <button 
                        className="btn-logout" 
                        onClick={() => { 
                            localStorage.removeItem('aut-token'); 
                            window.location.reload(); 
                        }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            <main className="dashboard-main-content">
                <div className="surveys-section">
                    
                    {/* Contenedor de Filtros */}
                    <div className="filter-box">
                        <h3>Filtros de Encuestas</h3>
                        <div className="filter-grid">
                            
                            {/* 1. FILTRO POR FOLIO DE BOLETO (Buscar) */}
                            <div className="filter-group">
                                <label htmlFor="folioSearch">Buscar por Folio de Boleto</label>
                                <div className="search-input-group">
                                    <input
                                        id="folioSearch"
                                        type="text"
                                        placeholder="Escribe el folio..."
                                        value={folioSearch}
                                        onChange={(e) => setFolioSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchSurveys()}
                                    />
                                    <button 
                                        className="btn-search" 
                                        onClick={fetchSurveys}
                                        title="Buscar por folio exacto"
                                    >
                                        Buscar
                                    </button>
                                </div>
                            </div>

                            {/* 2. FILTRO POR TERMINAL (ORIGEN) */}
                            <div className="filter-group">
                                <label htmlFor="filterTerminal">Todas las Terminales (Origen)</label>
                                <select
                                    id="filterTerminal"
                                    value={filterTerminal}
                                    onChange={(e) => setFilterTerminal(e.target.value)}
                                >
                                    <option value="">-- Todas las Terminales --</option>
                                    {terminales.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. FILTRO POR DESTINO */}
                            <div className="filter-group">
                                <label htmlFor="filterDestino">Todos los Destinos</label>
                                <select
                                    id="filterDestino"
                                    value={filterDestino}
                                    onChange={(e) => setFilterDestino(e.target.value)}
                                >
                                    <option value="">-- Todos los Destinos --</option>
                                    {destinos.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 4. FILTRO POR EXPERIENCIA (EXPECTATIVAS) */}
                            <div className="filter-group">
                                <label htmlFor="filterExpectativa">Todas las Experiencias</label>
                                <select
                                    id="filterExpectativa"
                                    value={filterExpectativa}
                                    onChange={(e) => setFilterExpectativa(e.target.value)}
                                >
                                    <option value="">-- Todas las Experiencias --</option>
                                    {expectativas.map(e => (
                                        <option key={e} value={e}>{e}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* BOTÓN DE REINICIAR */}
                            <div className="filter-group">
                                <button className="btn-reset" onClick={handleResetFilters}>
                                    Reiniciar Filtros
                                </button>
                            </div>

                        </div>
                    </div>

                    <h2>Tabla de Encuestas de Satisfacción</h2>
                    {renderTable()}
                </div>
            </main>
        </div>
    );
};

export default Encuestas;