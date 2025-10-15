import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Encuestas.css'; 
import { Home, Save, CheckCircle, XCircle, Search, Edit } from 'lucide-react';

// =======================================================
// CONSTANTES Y TIPOS
// =======================================================
// ⚠️ ATENCIÓN: Ajuste esta URL a su entorno (local o producción)
const API_URL_BASE = 'https://flecha-roja-satisfaccion.onrender.com/api'; 
const API_URL_DASHBOARD_ENCUESTAS = `${API_URL_BASE}/dashboard/encuestas`; 

// Listas de datos para los filtros de Select
const TERMINALES = [
    'Acambay', 'Atlacomulco', 'Cadereyta', 'Chalma', 'Cuernavaca', 'El Yaqui', 
    'Ixtlahuaca', 'Ixtapan de la Sal', 'Mexico Poniente', 'Mexico Norte', 'Naucalpan', 
    'Querétaro', 'San Juan del Rio', 'Taxco', 'Tenancingo', 'Tepotzotlán', 
    'Tenango', 'Temoaya', 'Toluca', 'Santiago Tianguistengo', 'San Mateo Atenco', 
    'Xalatlaco', 'Villa Victoria'
];

const DESTINOS = [
    'Acambay', 'Atlacomulco', 'Cadereyta', 'Chalma', 'Cuernavaca', 'El Yaqui', 
    'Ixtlahuaca', 'México Poniente Zona Sur', 'Ixtapan de la Sal', 'México Poniente Zona Centro', 
    'Mexico Norte', 'Naucalpan', 'Querétaro', 'San Juan del Rio', 'Taxco', 
    'Tenancingo', 'Tepotzotlán', 'Tenango', 'Temoaya', 'Toluca', 'Santiago Tianguistengo', 
    'San Mateo Atenco', 'Xalatlaco'
];

const EXPERIENCIAS = ['Muy Buena', 'Buena', 'Regular', 'Mala', 'Muy Mala'];

// Definición de la estructura de la encuesta
interface Survey {
    _id: string; 
    claveEncuestador: string;
    fecha: string;
    noEco?: string; 
    folioBoleto: string;
    origenViaje: string;
    destinoFinal: string;
    tipoServicio?: string; 
    medioAdquisicion: string; 
    timestampServidor: string; 
    califExperienciaCompra: string;
    comentExperienciaCompra: string; 
    califServicioConductor: string;
    comentServicioConductor: string; 
    califComodidad: string; 
    comentComodidad: string; 
    califLimpieza: string; 
    comentLimpieza: string; 
    califSeguridad: string; 
    especifSeguridad: string; 
    cumplioExpectativas: string; 
    especificarMotivo: string; 
    [key: string]: any; 
    validado: 'VALIDADO' | 'NO_VALIDADO' | 'PENDIENTE' | 'ELIMINADO'; 
}

// Estado para manejar la edición en línea de múltiples filas
interface EditableState {
    [id: string]: { [field: string]: string | number };
}

// =======================================================
// COMPONENTE PRINCIPAL: ENCUESTAS PAGE
// =======================================================

const EncuestasPage: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<EditableState>({});
    
    // ESTADOS DE FILTRO
    const [folioSearch, setFolioSearch] = useState('');
    const [filterTerminal, setFilterTerminal] = useState('');
    const [filterDestino, setFilterDestino] = useState('');
    const [filterExperiencia, setFilterExperiencia] = useState('');

    // LÓGICA DE NAVEGACIÓN
    const goToDashboard = () => {
        navigate('/dashboard'); 
    };
    
    // LÓGICA DE FETCHING DE DATOS (Centralizada con filtros)
    const fetchSurveys = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('auth-token');
        if (!token) {
            onLogout(); 
            return;
        }

        const params = new URLSearchParams();
        if (folioSearch) params.append('folioBoleto', folioSearch);
        if (filterTerminal) params.append('origenViaje', filterTerminal);
        if (filterDestino) params.append('destinoFinal', filterDestino);
        if (filterExperiencia) params.append('cumplioExpectativas', filterExperiencia);
        
        const url = `${API_URL_DASHBOARD_ENCUESTAS}?${params.toString()}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.status === 401) {
                onLogout(); 
                return;
            }

            if (!response.ok) {
                throw new Error(`Error ${response.status}: No se pudieron obtener las encuestas.`);
            }

            const data: Survey[] = await response.json();
            // Muestra solo las encuestas que no han sido marcadas como 'ELIMINADO'
            const filteredData = data.filter(s => s.validado !== 'ELIMINADO'); 
            setSurveys(filteredData);
            setEditing({}); // Limpia el estado de edición al recargar
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar encuestas.';
            console.error(errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [folioSearch, filterTerminal, filterDestino, filterExperiencia, onLogout]);

    // Ejecuta la carga inicial y recarga al cambiar los filtros
    useEffect(() => {
        fetchSurveys();
    }, [filterTerminal, filterDestino, filterExperiencia, fetchSurveys]);

    useEffect(() => {
        // Carga inicial al montar el componente
        fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // =======================================================
    // LÓGICA DE EDICIÓN Y CRUD
    // =======================================================
    const handleInputChange = (id: string, field: string, value: string) => {
        setEditing(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: value
            }
        }));
    };

    // Inicia/Cancela el modo de edición de una fila
    const toggleEdit = (survey: Survey) => {
        if (editing[survey._id]) {
            // Cancelar Edición
            setEditing(prev => {
                const newState = { ...prev };
                delete newState[survey._id];
                return newState;
            });
            return; 
        }
        
        // Iniciar Edición (Solo para los campos editables definidos)
        setEditing(prev => ({
            ...prev,
            [survey._id]: {
                claveEncuestador: survey.claveEncuestador,
                fecha: survey.fecha,
                folioBoleto: survey.folioBoleto,
                noEco: survey.noEco || "",
            }
        }));
    };

    // Maneja la actualización (Guardar cambios o cambiar estado)
    const handleUpdate = async (id: string, newStatus?: 'VALIDADO') => {
        const changes = newStatus ? { validado: newStatus } : editing[id];
        
        if (!changes || Object.keys(changes).length === 0) return;

        const token = localStorage.getItem('auth-token');
        if (!token) return setError('Sesión expirada.');

        try {
            const response = await fetch(`${API_URL_DASHBOARD_ENCUESTAS}/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(changes),
            });

            if (!response.ok) throw new Error('Fallo al actualizar en el servidor.');

            // Quita la fila del modo de edición
            setEditing(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
            fetchSurveys(); // Recarga los datos
        } catch (err) {
            setError('Error al guardar los cambios. ' + (err as Error).message);
        }
    };

    // Marca una encuesta como 'VALIDADO'
    const handleValidate = (id: string) => {
        if (!window.confirm('¿Estás seguro de que quieres VALIDAR esta encuesta?')) return;
        handleUpdate(id, 'VALIDADO');
    };
    
    // Marca una encuesta como 'ELIMINADO'
    const handleInvalidateAndDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que quieres ELIMINAR/NO VALIDAR esta encuesta? Esta acción la marca como "ELIMINADO" y la ocultará.')) return;
        
        const token = localStorage.getItem('auth-token');
        if (!token) return setError('Sesión expirada.');

        try {
            const response = await fetch(`${API_URL_DASHBOARD_ENCUESTAS}/${id}`, {
                method: 'DELETE', // El backend debe mapear esto a un cambio de estado a 'ELIMINADO'
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Fallo al eliminar en el servidor.');
            fetchSurveys(); // Recarga los datos sin la encuesta eliminada
        } catch (err) {
            setError('Error al eliminar la encuesta. ' + (err as Error).message);
        }
    };
    
    // Devuelve el valor actual, ya sea el editado o el original
    const getDisplayValue = (survey: Survey, field: keyof Survey) => {
        let value;

        if (editing[survey._id] && editing[survey._id][field] !== undefined) {
            value = editing[survey._id][field];
        } else {
            value = survey[field];
        }

        return value === null || value === undefined ? '' : String(value);
    };

    // Definición de las columnas de la tabla
    const tableHeaders = useMemo(() => [
        { key: 'timestampServidor', label: 'Marca Temporal' }, 
        { key: 'claveEncuestador', label: 'Clave Encuestador', editable: true },
        { key: 'fecha', label: 'Fecha', editable: true },
        { key: 'noEco', label: 'No. Eco', editable: true }, 
        { key: 'folioBoleto', label: 'No. Boleto', editable: true },
        { key: 'origenViaje', label: 'Terminal Origen' },
        { key: 'destinoFinal', label: 'Destino Final' },
        { key: 'tipoServicio', label: 'Tipo de Servicio' }, 
        { key: 'medioAdquisicion', label: 'Medio de Adquisición' }, 
        { key: 'califExperienciaCompra', label: '1. Exp. Compra' },
        { key: 'comentExperienciaCompra', label: '¿Por qué? 1' },
        { key: 'califServicioConductor', label: '2. Cal. Conductor' },
        { key: 'comentServicioConductor', label: '¿Por qué? 2' },
        { key: 'califComodidad', label: '5. Cal. Comodidad' }, 
        { key: 'comentComodidad', label: '¿Por qué? 4' }, 
        { key: 'califLimpieza', label: '6. Cal. Limpieza' }, 
        { key: 'comentLimpieza', label: '¿Por qué? 5' }, 
        { key: 'califSeguridad', label: '7. Cal. Seguridad' }, 
        { key: 'especifSeguridad', label: 'Especifique (Seguridad)' }, 
        { key: 'cumplioExpectativas', label: '8. Cumplió Expectativas' },
        { key: 'especificarMotivo', label: 'Especifique 6' }, 
        { key: 'validado', label: 'Estado' },
        { key: 'actions', label: 'Acciones' },
    ], []);


    // RENDERIZADO
    return (
        <div className="dashboard-container">
            {/* HEADER FIJO */}
            <header className="dashboard-header">
                <div className="header-top-bar">
                    <div className="header-logo-container">
                        {/* Asegúrate de tener /logo_flecha_roja.png en tu carpeta public */}
                        <img src="/logo_flecha_roja.png" alt="Logo Flecha Roja" className="header-logo" />
                    </div>
                    <h1 className="header-title-main">
                        SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA
                    </h1>
                    <button onClick={goToDashboard} className="btn-dashboard-nav">
                        <Home size={18} style={{ marginRight: '5px' }}/> Ir al Dashboard
                    </button>
                </div>
            </header>

            <main className="dashboard-main-content">
                {/* Encabezado de la Página */}
                <div className="page-header-encuestas">
                    <h2 className="page-title">ENCUESTAS REALIZADAS GENERALES</h2>
                    <p className="page-subtitle">En este apartado se muestran las Encuestas para su validación, edición o eliminación.</p>
                </div>

                {/* Contenedor de Filtros */}
                <div className="filters-container">
                    
                    <div className="filter-group">
                        <input
                            type="text"
                            placeholder="Buscar por Folio de Boleto"
                            className="filter-input"
                            value={folioSearch}
                            onChange={(e) => setFolioSearch(e.target.value)}
                            onKeyDown={(e) => {
                                // Dispara la búsqueda al presionar Enter
                                if (e.key === 'Enter') fetchSurveys();
                            }}
                        />
                        <button className="btn-search" onClick={fetchSurveys} title="Aplicar Búsqueda por Folio">
                            <Search size={16} />
                        </button>
                    </div>

                    <div className="filter-group">
                        <select
                            className="filter-select"
                            value={filterTerminal}
                            onChange={(e) => setFilterTerminal(e.target.value)}
                        >
                            <option value="">Terminal Origen</option>
                            {TERMINALES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            className="filter-select"
                            value={filterDestino}
                            onChange={(e) => setFilterDestino(e.target.value)}
                        >
                            <option value="">Destino Final</option>
                            {DESTINOS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            className="filter-select"
                            value={filterExperiencia}
                            onChange={(e) => setFilterExperiencia(e.target.value)}
                        >
                            <option value="">Experiencia (Expectativas)</option>
                            {EXPERIENCIAS.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                </div>
                
                {/* Indicadores de estado */}
                {isLoading && <div className="loading-message">Cargando Encuestas... 🚀</div>}
                {error && <div className="error-message">⚠️ Error: {error}</div>}
                {!isLoading && !error && surveys.length === 0 && (
                    <div className="no-data-message">No se encontraron encuestas con los filtros seleccionados.</div>
                )}

                {/* TABLA DE DATOS */}
                {!isLoading && surveys.length > 0 && (
                    <div className="table-responsive">
                        <table className="surveys-table">
                            <thead>
                                <tr>
                                    {tableHeaders.map((header) => (
                                        <th key={header.key}>{header.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {surveys.map((survey) => {
                                    const isEditing = !!editing[survey._id];
                                    const statusClass = 
                                        survey.validado === 'VALIDADO' ? 'status-validado' :
                                        survey.validado === 'NO_VALIDADO' ? 'status-no-validado' :
                                        'status-pendiente';
                                        
                                    return (
                                        <tr key={survey._id} className={statusClass}>
                                            {tableHeaders.map((header) => (
                                                <td key={header.key} data-label={header.label}>
                                                    {header.key === 'actions' ? (
                                                        <div className="action-buttons">
                                                            {/* Botón de Guardar/Editar */}
                                                            <button 
                                                                className={`btn-action ${isEditing ? 'btn-save' : 'btn-edit'}`} 
                                                                onClick={() => isEditing ? handleUpdate(survey._id) : toggleEdit(survey)}
                                                                title={isEditing ? 'Guardar Cambios' : 'Editar Campos'}
                                                            >
                                                                {isEditing ? <Save size={16} /> : <Edit size={16} />}
                                                            </button>
                                                            
                                                            {/* Botón de Cancelar Edición */}
                                                            {isEditing && (
                                                                <button className="btn-action btn-cancel" onClick={() => toggleEdit(survey)} title="Cancelar Edición">
                                                                    <XCircle size={16} />
                                                                </button>
                                                            )}
                                                            
                                                            {/* Botón de Validar (Solo si NO es VALIDADO) */}
                                                            {survey.validado !== 'VALIDADO' && !isEditing && (
                                                                <button className="btn-action btn-validate" onClick={() => handleValidate(survey._id)} title="Marcar como Validado">
                                                                    <CheckCircle size={16} />
                                                                </button>
                                                            )}

                                                            {/* Botón de Eliminar (Marca como ELIMINADO) */}
                                                            {!isEditing && (
                                                                <button className="btn-action btn-delete" onClick={() => handleInvalidateAndDelete(survey._id)} title="Marcar como ELIMINADO">
                                                                    <XCircle size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : header.editable && isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={getDisplayValue(survey, header.key as keyof Survey)}
                                                            onChange={(e) => handleInputChange(survey._id, header.key, e.target.value)}
                                                            className="editable-input"
                                                        />
                                                    ) : (
                                                        getDisplayValue(survey, header.key as keyof Survey)
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default EncuestasPage;