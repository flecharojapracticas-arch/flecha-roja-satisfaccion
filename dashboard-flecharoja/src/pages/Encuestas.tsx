import React, { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import './Encuestas.css'; 

// URL de la API base
const API_BASE_URL = 'https://flecha-roja-satisfaccion.onrender.com/api/dashboard';

// Definición de la interfaz de la encuesta
interface Survey {
    _id: string;
    claveEncuestador: string;
    fecha: string;
    noEco: string;
    folioBoleto: string;
    origenViaje: string;
    destinoFinal: string;
    cumplioExpectativas: 'Muy Buena' | 'Buena' | 'Regular' | 'Mala' | 'Muy Mala' | string;
    califExperienciaCompra: string;
    califServicioConductor: string;
    califComodidad: string;
    califLimpieza: string;
    califSeguridad: string;
    validado?: 'VALIDADO' | 'PENDIENTE' | 'ELIMINADO' | string; 
    [key: string]: any; 
}

// Opciones de Filtro (Se mantienen)
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

// Definición de las columnas de la tabla
const tableHeaders = [
    'ID', 'Fecha', 'Boleto', 'Origen', 'Destino', 'Expectativa', 
    'Compra', 'Conductor', 'Comodidad', 'Limpieza', 'Seguridad', 
    'Estado', 'Acciones'
];

// Mapeo de campos
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
     * FUNCIÓN CRÍTICA DE AUTENTICACIÓN (Solo para PUT/CRUD)
     */
    const getAuthHeaders = () => {
        const token = localStorage.getItem('aut-token');
        
        if (!token) {
            console.error("TOKEN (aut-token) NO ENCONTRADO para operación de CRUD.");
            // Devolvemos headers vacíos, el backend debería devolver 403
            return { headers: {} }; 
        }

        return {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        };
    };

    // Función para obtener las encuestas con filtros
    const fetchSurveys = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSurveys([]); 

        try {
            const params = new URLSearchParams();
            if (folioSearch) params.append('folioBoleto', folioSearch);
            if (filterTerminal) params.append('origenViaje', filterTerminal);
            if (filterDestino) params.append('destinoFinal', filterDestino);
            if (filterExpectativa) params.append('cumplioExpectativas', filterExpectativa);
            
            const url = `${API_BASE_URL}/encuestas?${params.toString()}`;
            
            // 🚨 CAMBIO CLAVE: Ya no enviamos getAuthHeaders() para que la tabla cargue
            const response = await axios.get(url); 
            
            const initialSurveys = response.data.map((s: Survey) => ({
                ...s,
                validado: s.validado || 'PENDIENTE', 
            }));
            
            setSurveys(initialSurveys);
            
        } catch (err) {
            const axiosError = err as AxiosError;
            console.error('Error al cargar encuestas:', axiosError);
            
            let errorMessage = 'Error al cargar encuestas. Confirma que el servidor de Render esté activo.';

            if (axiosError.response && axiosError.response.status === 403) {
                 // Este mensaje solo debería aparecer si el backend aún tiene el middleware en el GET
                 errorMessage = `❌ Error 403: El servidor de Render todavía está protegiendo la ruta de lectura (GET). Sube los cambios del backend.`;
            } else if (axiosError.response) {
                errorMessage = `❌ Error ${axiosError.response.status}: Ocurrió un error en el servidor.`;
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

    // Función de Guardar/Actualizar
    const handleSave = async (survey: Survey) => {
        // ... (cálculo de updates)
        const id = survey._id;
        const updates: { [key: string]: any } = {};
        
        Object.values(tableFieldMap).forEach(key => {
            const editableKey = `${id}_${key}`;
            if (editableData[editableKey] !== undefined && editableData[editableKey] !== survey[key]) {
                updates[key] = editableData[editableKey];
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
            alert(`Error al guardar la encuesta. Estado: ${axiosError.response?.status || 'Desconocido'}. **Necesitas un token de sesión VÁLIDO para hacer cambios.**`);
        }
    };

    // Función para Validar
    const handleValidate = async (id: string) => {
        try {
            const url = `${API_BASE_URL}/encuestas/${id}`;
            await axios.put(url, { validado: 'VALIDADO' }, getAuthHeaders());
            alert('Encuesta marcada como VALIDADA.');
            fetchSurveys();
        } catch (err) {
             const axiosError = err as AxiosError;
            console.error('Error al validar:', axiosError);
            alert(`Error al validar la encuesta. Estado: ${axiosError.response?.status || 'Desconocido'}. **Necesitas un token de sesión VÁLIDO para hacer cambios.**`);
        }
    };

    // Función para No Validar (ELIMINADO)
    const handleNotValidate = async (id: string) => {
        if (!window.confirm("¿Estás seguro de que quieres NO VALIDAR esta encuesta? Será marcada como ELIMINADA.")) return;
        
        try {
            const url = `${API_BASE_URL}/encuestas/${id}`;
            await axios.put(url, { validado: 'ELIMINADO' }, getAuthHeaders()); 
            alert('Encuesta marcada como ELIMINADA.');
            fetchSurveys();
        } catch (err) {
             const axiosError = err as AxiosError;
            console.error('Error al no validar (eliminar):', axiosError);
            alert(`Error al no validar la encuesta. Estado: ${axiosError.response?.status || 'Desconocido'}. **Necesitas un token de sesión VÁLIDO para hacer cambios.**`);
        }
    };

    // ... (El resto de las funciones de soporte se mantienen)
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

        return (
            <>
                <button
                    className="action-button btn-save"
                    onClick={() => handleSave(survey)}
                    disabled={!isModified && !isPending && survey.validado !== 'VALIDADO' && survey.validado !== 'ELIMINADO'}
                    title={isModified ? 'Guardar Cambios' : 'Actualizar Campos'}
                >
                    {isModified ? 'Guardar' : 'Actualizar'}
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
                                    if (!field) return <td key={header} className="actions-cell">{renderActions(survey)}</td>;

                                    const originalValue = survey[field] || 'N/A';
                                    const displayValue = header === 'ID' ? survey._id.slice(-5) : originalValue;

                                    if (header === 'Estado') {
                                        return (
                                            <td key={header}>
                                                <span className={`validation-status ${getStatusClass(originalValue as string)}`}>
                                                    {originalValue}
                                                </span>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={header} className="editable-cell">
                                            <input
                                                type="text"
                                                value={getEditableValue(survey._id, field, originalValue as string)}
                                                onChange={(e) => handleEditChange(survey._id, field, e.target.value)}
                                                disabled={header === 'ID'}
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
            {/* Encabezado fijo */}
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
                            
                            {/* 1. FILTRO POR FOLIO DE BOLETO */}
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
                                    <option value="">-- Seleccionar Terminal --</option>
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
                                    <option value="">-- Seleccionar Destino --</option>
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
                                    <option value="">-- Seleccionar Experiencia --</option>
                                    {expectativas.map(e => (
                                        <option key={e} value={e}>{e}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* BOTÓN DE REINICIAR */}
                            <div className="filter-group" style={{gridColumn: '4 / 5'}}>
                                <button className="btn-reset" onClick={handleResetFilters}>
                                    Reiniciar Filtros
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* Tabla de Encuestas */}
                    <h2>Tabla de Encuestas de Satisfacción</h2>
                    {renderTable()}
                </div>
            </main>
        </div>
    );
};

export default Encuestas;