import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Asegúrate de que tu componente principal del dashboard (ej: App.jsx) importe el CSS global
// import '../Dashboard.css'; 
import './Encuestas.css'; // Estilos específicos de esta página
import { LogOut, Save, CheckCircle, XCircle, Search, Edit } from 'lucide-react';

// =======================================================
// CONSTANTES Y TIPOS
// =======================================================

// Define las rutas para la navegación de tabs
const tabRoutes: { [key: string]: string } = {
    'RESUMEN': '/dashboard/resumen',
    'ANÁLISIS': '/dashboard/analisis',
    'RESULTADOS': '/dashboard/resultados',
    'ENCUESTAS': '/dashboard/encuestas',
};
const navItems = ['RESUMEN', 'ANÁLISIS', 'RESULTADOS', 'ENCUESTAS']; // Ordena tus tabs aquí
// URL base de tu API alojada en Render
const API_URL_BASE = 'https://flecha-roja-satisfaccion.onrender.com/api'; 

// Terminales y Destinos (simplificados)
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


// Tipo para los datos de la encuesta
interface Survey {
    _id: string; // ID de MongoDB para las operaciones
    claveEncuestador: string;
    fecha: string;
    folioBoleto: string;
    origenViaje: string;
    destinoFinal: string;
    tipoServicio: string;
    medioAdquisicion: string;
    califExperienciaCompra: string;
    razonExperienciaCompra: string;
    califServicioConductor: string;
    razonServicioConductor: string;
    cumplioExpectativas: string; // Campo para el filtro de Experiencias
    // ... otros campos del formulario que quieras mostrar
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
    
    // ESTADOS
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<EditableState>({});
    
    // ESTADOS DE FILTRO (Inputs y Selects)
    const [folioSearch, setFolioSearch] = useState('');
    const [filterTerminal, setFilterTerminal] = useState('');
    const [filterDestino, setFilterDestino] = useState('');
    const [filterExperiencia, setFilterExperiencia] = useState('');


    // LÓGICA DE NAVEGACIÓN
    const handleTabClick = (tab: string) => {
        navigate(tabRoutes[tab]);
    };

    // LÓGICA DE FETCHING DE DATOS (Con Filtros)
    const fetchSurveys = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem('auth-token');
        if (!token) {
            setError('Sesión expirada. Por favor, inicia sesión de nuevo.');
            setIsLoading(false);
            return;
        }

        // Construir Query Parameters (filtros)
        const params = new URLSearchParams();
        // Solo se añade a los params si el valor no es vacío
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

    // Ejecutar fetch al montar y cuando cambian los filtros (Terminal, Destino, Experiencia)
    useEffect(() => {
        // Ejecutamos el fetch si cambia cualquier filtro de SELECT
        if (filterTerminal || filterDestino || filterExperiencia) {
            fetchSurveys();
        }
    }, [filterTerminal, filterDestino, filterExperiencia, fetchSurveys]);

    // Ejecutar fetch solo al cargar la página (para mostrar todo por defecto)
    useEffect(() => {
        fetchSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // LÓGICA CRUD EN LA TABLA

    // 1. Manejo del cambio de input en edición (guarda en el estado 'editing')
    const handleInputChange = (id: string, field: string, value: string) => {
        setEditing(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || {}),
                [field]: value
            }
        }));
    };

    // 2. Iniciar/Cancelar Edición
    const toggleEdit = (survey: Survey) => {
        // Si ya está en edición, cancelamos
        if (editing[survey._id]) {
            setEditing(prev => {
                const newState = { ...prev };
                delete newState[survey._id];
                return newState;
            });
            return; 
        }
        
        // Iniciar edición: copiar solo los campos editables
        setEditing(prev => ({
            ...prev,
            [survey._id]: {
                claveEncuestador: survey.claveEncuestador,
                fecha: survey.fecha,
                folioBoleto: survey.folioBoleto,
                // Puedes añadir más campos si decides hacerlos editables
            }
        }));
    };

    // 3. Guardar Actualización (PUT)
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

            // Refrescar datos y salir del modo edición
            setEditing(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
            fetchSurveys(); 
            // alert(`Encuesta ${id} actualizada correctamente.`); // Opcional: Notificación
        } catch (err) {
            setError('Error al guardar los cambios. ' + (err as Error).message);
        }
    };

    // 4. Validar Encuesta (PUT para cambiar estado)
    const handleValidate = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que quieres VALIDAR esta encuesta?')) return;
        
        const token = localStorage.getItem('auth-token');
        if (!token) return setError('Sesión expirada.');

        try {
            // Usa el endpoint /validar
            const response = await fetch(`${API_URL_BASE}/encuestas/validar/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) throw new Error('Fallo al validar en el servidor.');

            // Refrescar la tabla
            fetchSurveys(); 
        } catch (err) {
            setError('Error al validar la encuesta. ' + (err as Error).message);
        }
    };

    // 5. No Validar/Eliminar Encuesta (DELETE)
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

            // Refrescar la tabla
            fetchSurveys(); 
        } catch (err) {
            setError('Error al eliminar la encuesta. ' + (err as Error).message);
        }
    };
    
    // Función de ayuda para obtener el valor editado o el valor original
    const getDisplayValue = (survey: Survey, field: keyof Survey) => {
        if (editing[survey._id] && editing[survey._id][field] !== undefined) {
            return editing[survey._id][field];
        }
        return survey[field];
    };

    // Columnas de la tabla
    const tableHeaders = useMemo(() => [
        { key: 'folioBoleto', label: 'Folio Boleto', editable: true },
        { key: 'fecha', label: 'Fecha', editable: true },
        { key: 'claveEncuestador', label: 'Clave Encuestador', editable: true },
        { key: 'origenViaje', label: 'Terminal Origen' },
        { key: 'destinoFinal', label: 'Destino Final' },
        { key: 'tipoServicio', label: 'Tipo Servicio' },
        { key: 'cumplioExpectativas', label: 'Experiencia Gral.' },
        { key: 'califExperienciaCompra', label: 'Calificación Compra' },
        { key: 'razonExperienciaCompra', label: 'Razón Compra' },
        { key: 'califServicioConductor', label: 'Calificación Conductor' },
        { key: 'razonServicioConductor', label: 'Razón Conductor' },
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
                        {/* Asegúrate que tu logo esté en la carpeta public */}
                        <img src="/logo_flecha_roja.png" alt="Logo Flecha Roja" className="header-logo" />
                    </div>
                    <h1 className="header-title-main">
                        SISTEMA DE SATISFACCION AL CLIENTE FLECHA ROJA
                    </h1>
                    <button onClick={onLogout} className="btn-logout">
                        Cerrar Sesión <LogOut size={16} style={{ marginLeft: '5px' }}/>
                    </button>
                </div>
                <nav className="nav-bar">
                    {navItems.map(item => (
                        <button
                            key={item}
                            onClick={() => handleTabClick(item)}
                            className={`nav-button ${location.pathname === tabRoutes[item] ? 'active' : ''}`}
                        >
                            {item}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="dashboard-main-content">
                {/* Encabezado de la Página */}
                <div className="page-header-encuestas">
                    <h2 className="page-title">ENCUESTAS REALIZADAS GENERALES</h2>
                    <p className="page-subtitle">En este apartado se muestran las Encuestas para su validación, edición o eliminación.</p>
                </div>

                {/* Contenedor de Filtros */}
                <div className="filters-container">
                    
                    {/* 1. Buscar por Folio (Input) */}
                    <div className="filter-group">
                        <input
                            type="text"
                            placeholder="Buscar por Folio de Boleto"
                            className="filter-input"
                            value={folioSearch}
                            onChange={(e) => setFolioSearch(e.target.value)}
                            // Dispara la búsqueda al presionar Enter
                            onKeyDown={(e) => { if (e.key === 'Enter') fetchSurveys(); }}
                        />
                        <button onClick={fetchSurveys} className="filter-button" title="Buscar">
                            <Search size={18} />
                        </button>
                    </div>

                    {/* 2. Filtro por Terminal de Origen (Select) */}
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

                    {/* 3. Filtro por Destino Final (Select) */}
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

                    {/* 4. Filtro por Experiencia (Select) */}
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

                                                if (field === 'actions') {
                                                    return (
                                                        <td key={field}>
                                                            <div className="actions-cell">
                                                                {isEditing ? (
                                                                    <>
                                                                        {/* Botón Guardar */}
                                                                        <button 
                                                                            onClick={() => handleUpdate(survey._id)} 
                                                                            className="action-button" 
                                                                            title="Guardar Cambios"
                                                                        >
                                                                            <Save className="update-icon" />
                                                                        </button>
                                                                        {/* Botón Cancelar */}
                                                                        <button 
                                                                            onClick={() => toggleEdit(survey)} 
                                                                            className="action-button" 
                                                                            title="Cancelar Edición"
                                                                        >
                                                                            <XCircle className="delete-icon" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {/* Botón de Edición (Inicia/Cancela) */}
                                                                        <button 
                                                                            onClick={() => toggleEdit(survey)} 
                                                                            className="action-button" 
                                                                            title="Editar Datos"
                                                                        >
                                                                            <Edit className="update-icon" />
                                                                        </button>

                                                                        {/* Botón Validar (Solo si NO ha sido VALIDADO) */}
                                                                        {survey.validado !== 'VALIDADO' && (
                                                                            <button 
                                                                                onClick={() => handleValidate(survey._id)} 
                                                                                className="action-button" 
                                                                                title="Validar Encuesta"
                                                                            >
                                                                                <CheckCircle className="validate-icon" />
                                                                            </button>
                                                                        )}

                                                                        {/* Botón No Validar/Eliminar */}
                                                                        <button 
                                                                            onClick={() => handleInvalidateAndDelete(survey._id)} 
                                                                            className="action-button" 
                                                                            title="No Validar y Eliminar"
                                                                        >
                                                                            <XCircle className="delete-icon" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                
                                                // Campo de Estado
                                                if (field === 'validado') {
                                                    return (
                                                        <td key={field}>
                                                            <span className={`status-badge ${statusClass}`}>
                                                                {value}
                                                            </span>
                                                        </td>
                                                    );
                                                }

                                                // Campos Editables (con Input si estamos en modo edición)
                                                if (header.editable && isEditing) {
                                                    // Asume que 'fecha' es un campo editable de tipo date
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

                                                // Campos de Solo Lectura
                                                return <td key={field}>{String(value)}</td>;
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