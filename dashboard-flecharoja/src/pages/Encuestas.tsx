import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Encuestas.css'; 
import { Home, Save, CheckCircle, XCircle, Search, Edit } from 'lucide-react';

// =======================================================
// CONSTANTES Y TIPOS
// =======================================================

// URLs y constantes de navegación
const API_URL_BASE = 'https://flecha-roja-satisfaccion.onrender.com/api'; 

// Terminales, Destinos y Experiencias (Sin Cambios)
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


// Tipo para los datos de la encuesta (Añadiendo todos los campos que mencionaste)
interface Survey {
    _id: string; 
    claveEncuestador: string;
    fecha: string;
    noEco?: string; // Número Económico (puede ser opcional)
    folioBoleto: string;
    origenViaje: string;
    destinoFinal: string;
    tipoServicio?: string; // Nuevo campo
    medioAdquisicion: string; // Nuevo campo
    timestampServidor: string; // Marca Temporal

    califExperienciaCompra: string;
    comentExperienciaCompra: string; // ¿Por qué? 1
    
    califServicioConductor: string;
    comentServicioConductor: string; // ¿Por qué? 2
    
    califComodidad: string; // 5. Comodidad
    comentComodidad: string; // ¿Por qué? 4
    
    califLimpieza: string; // 6. Limpieza
    comentLimpieza: string; // ¿Por qué? 5
    
    califSeguridad: string; // 7. Seguridad
    especifSeguridad: string; // Especifique (Seguridad)
    
    cumplioExpectativas: string; // 8. Expectativas (Experiencia Gral.)
    especificarMotivo: string; // Especifique 6
    
    [key: string]: any; 
    validado: 'VALIDADO' | 'NO_VALIDADO' | 'PENDIENTE';
}

// Tipo para el estado de edición
interface EditableState {
    [id: string]: { [field: string]: string | number };
}

// =======================================================
// COMPONENTE PRINCIPAL: ENCUESTAS PAGE
// =======================================================

const EncuestasPage: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ESTADOS (sin cambios)
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<EditableState>({});
    
    // ESTADOS DE FILTRO (sin cambios)
    const [folioSearch, setFolioSearch] = useState('');
    const [filterTerminal, setFilterTerminal] = useState('');
    const [filterDestino, setFilterDestino] = useState('');
    const [filterExperiencia, setFilterExperiencia] = useState('');


    // LÓGICA DE NAVEGACIÓN
    const goToDashboard = () => {
        // 🔑 CORRECCIÓN DE RUTA: Navegamos directamente a la ruta principal del dashboard
        navigate('/dashboard'); 
    };
    
    // LÓGICA DE FETCHING DE DATOS (sin cambios)
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
        
        const url = `${API_URL_BASE}/encuestas?${params.toString()}`;

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
            setSurveys(data);
            setEditing({}); 
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar encuestas.';
            console.error(errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [folioSearch, filterTerminal, filterDestino, filterExperiencia, onLogout]);

    useEffect(() => {
        fetchSurveys();
    }, [filterTerminal, filterDestino, filterExperiencia, fetchSurveys]);

    useEffect(() => {
        fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // LÓGICA CRUD EN LA TABLA (sin cambios relevantes)
    const handleInputChange = (id: string, field: string, value: string) => {
        setEditing(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: value
            }
        }));
    };

    const toggleEdit = (survey: Survey) => {
        if (editing[survey._id]) {
            setEditing(prev => {
                const newState = { ...prev };
                delete newState[survey._id];
                return newState;
            });
            return; 
        }
        
        // Iniciar edición (solo los campos que decidamos que son editables)
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

    const handleUpdate = async (id: string) => {
        const changes = editing[id];
        if (!changes || Object.keys(changes).length === 0) return;

        const token = localStorage.getItem('auth-token');
        if (!token) return setError('Sesión expirada.');

        try {
            const response = await fetch(`${API_URL_BASE}/encuestas/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(changes),
            });

            if (!response.ok) throw new Error('Fallo al actualizar en el servidor.');

            setEditing(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
            fetchSurveys(); 
        } catch (err) {
            setError('Error al guardar los cambios. ' + (err as Error).message);
        }
    };

    const handleValidate = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que quieres VALIDAR esta encuesta?')) return;
        
        const token = localStorage.getItem('auth-token');
        if (!token) return setError('Sesión expirada.');

        try {
            const response = await fetch(`${API_URL_BASE}/encuestas/validar/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Fallo al validar en el servidor.');
            fetchSurveys(); 
        } catch (err) {
            setError('Error al validar la encuesta. ' + (err as Error).message);
        }
    };

    const handleInvalidateAndDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que quieres NO VALIDAR y ELIMINAR esta encuesta? Esta acción es permanente.')) return;
        
        const token = localStorage.getItem('auth-token');
        if (!token) return setError('Sesión expirada.');

        try {
            const response = await fetch(`${API_URL_BASE}/encuestas/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Fallo al eliminar en el servidor.');
            fetchSurveys(); 
        } catch (err) {
            setError('Error al eliminar la encuesta. ' + (err as Error).message);
        }
    };
    
    // Función para manejar undefined/null (sin cambios, ya corrige el error)
    const getDisplayValue = (survey: Survey, field: keyof Survey) => {
        let value;

        if (editing[survey._id] && editing[survey._id][field] !== undefined) {
            value = editing[survey._id][field];
        } else {
            value = survey[field];
        }

        // Si el valor es null, undefined, o no existe, devuelve una cadena vacía
        return value === null || value === undefined ? '' : String(value);
    };

    // 🔑 CAMBIO CRÍTICO: Columnas de la tabla (Añadimos todos los campos solicitados)
    const tableHeaders = useMemo(() => [
        { key: 'timestampServidor', label: 'Marca Temporal' }, // Nuevo
        { key: 'claveEncuestador', label: 'Clave Encuestador', editable: true },
        { key: 'fecha', label: 'Fecha', editable: true },
        { key: 'noEco', label: 'No. Eco', editable: true }, // Nuevo
        { key: 'folioBoleto', label: 'No. Boleto', editable: true },
        { key: 'origenViaje', label: 'Terminal Origen' },
        { key: 'destinoFinal', label: 'Destino Final' },
        { key: 'tipoServicio', label: 'Tipo de Servicio' }, // Nuevo
        { key: 'medioAdquisicion', label: 'Medio de Adquisición' }, // Nuevo
        
        { key: 'califExperienciaCompra', label: '1. Exp. Compra' },
        { key: 'comentExperienciaCompra', label: '¿Por qué? 1' },
        
        { key: 'califServicioConductor', label: '2. Cal. Conductor' },
        { key: 'comentServicioConductor', label: '¿Por qué? 2' },
        
        { key: 'califComodidad', label: '5. Cal. Comodidad' }, // Nuevo
        { key: 'comentComodidad', label: '¿Por qué? 4' }, // Nuevo
        
        { key: 'califLimpieza', label: '6. Cal. Limpieza' }, // Nuevo
        { key: 'comentLimpieza', label: '¿Por qué? 5' }, // Nuevo
        
        { key: 'califSeguridad', label: '7. Cal. Seguridad' }, // Nuevo
        { key: 'especifSeguridad', label: 'Especifique (Seguridad)' }, // Nuevo
        
        { key: 'cumplioExpectativas', label: '8. Cumplió Expectativas' },
        { key: 'especificarMotivo', label: 'Especifique 6' }, // Nuevo
        
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
                        <img src="/logo_flecha_roja.png" alt="Logo Flecha Roja" className="header-logo" />
                    </div>
                    <h1 className="header-title-main">
                        SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA
                    </h1>
                    {/* 🔑 CAMBIO: Botón con mejor estilo */}
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

                {/* Contenedor de Filtros (sin cambios) */}
                <div className="filters-container">
                    
                    <div className="filter-group">
                        <input
                            type="text"
                            placeholder="Buscar por Folio de Boleto"
                            className="filter-input"
                            value={folioSearch}
                            onChange={(e) => setFolioSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') fetchSurveys(); }}
                        />
                        <button onClick={fetchSurveys} className="filter-button" title="Buscar">
                            <Search size={18} />
                        </button>
                    </div>

                    <div className="filter-group">
                        <select
                            className="filter-select"
                            value={filterTerminal}
                            onChange={(e) => setFilterTerminal(e.target.value)}
                        >
                            <option value="">TODAS LAS TERMINALES</option>
                            {TERMINALES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            className="filter-select"
                            value={filterDestino}
                            onChange={(e) => setFilterDestino(e.target.value)}
                        >
                            <option value="">TODOS LOS DESTINOS</option>
                            {DESTINOS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <select
                            className="filter-select"
                            value={filterExperiencia}
                            onChange={(e) => setFilterExperiencia(e.target.value)}
                        >
                            <option value="">TODAS LAS EXPERIENCIAS</option>
                            {EXPERIENCIAS.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                </div>

                {/* Visualización de la Tabla */}
                <div className="table-responsive-container">
                    {error && <div className="error-state">{error}</div>}
                    {isLoading && <div className="loading-state">Cargando encuestas...</div>}
                    {!isLoading && !error && surveys.length === 0 && (
                        <div className="no-data-state">No se encontraron encuestas con los filtros aplicados.</div>
                    )}
                    
                    {!isLoading && surveys.length > 0 && (
                        <table className="surveys-table">
                            <thead>
                                <tr>
                                    {tableHeaders.map(header => (
                                        <th key={header.key}>{header.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {surveys.map((survey) => {
                                    const isEditing = !!editing[survey._id];
                                    const statusClass = 
                                        survey.validado === 'VALIDADO' ? 'valid' : 
                                        survey.validado === 'NO_VALIDADO' ? 'invalid' : 'pending';

                                    return (
                                        <tr key={survey._id}>
                                            {tableHeaders.map(header => {
                                                const field = header.key as keyof Survey;
                                                const value = getDisplayValue(survey, field);

                                                // ... Lógica de Renderizado (sin cambios críticos)
                                                if (field === 'actions') {
                                                    // Renderizado de botones de acción
                                                    return (
                                                        <td key={field}>
                                                            <div className="actions-cell">
                                                                {isEditing ? (
                                                                    <>
                                                                        <button onClick={() => handleUpdate(survey._id)} className="action-button" title="Guardar Cambios"><Save className="update-icon" /></button>
                                                                        <button onClick={() => toggleEdit(survey)} className="action-button" title="Cancelar Edición"><XCircle className="delete-icon" /></button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => toggleEdit(survey)} className="action-button" title="Editar Datos"><Edit className="update-icon" /></button>
                                                                        {survey.validado !== 'VALIDADO' && (
                                                                            <button onClick={() => handleValidate(survey._id)} className="action-button" title="Validar Encuesta"><CheckCircle className="validate-icon" /></button>
                                                                        )}
                                                                        <button onClick={() => handleInvalidateAndDelete(survey._id)} className="action-button" title="No Validar y Eliminar"><XCircle className="delete-icon" /></button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                
                                                if (field === 'validado') {
                                                    return (
                                                        <td key={field}>
                                                            <span className={`status-badge ${statusClass}`}>
                                                                {value}
                                                            </span>
                                                        </td>
                                                    );
                                                }

                                                if (header.editable && isEditing) {
                                                    const inputType = field === 'fecha' ? 'date' : 'text';
                                                    return (
                                                        <td key={field}>
                                                            <input
                                                                type={inputType}
                                                                className="table-input"
                                                                value={String(value)}
                                                                onChange={(e) => handleInputChange(survey._id, field, e.target.value)}
                                                            />
                                                        </td>
                                                    );
                                                }

                                                return <td key={field}>{value}</td>;
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};

export default EncuestasPage;