import React, { useState, useEffect, useCallback } from 'react';
import './Encuestas.css';
// Supongo que tienes un logo en esta ruta
import logo from '../assets/images/logo-flecha-roja.png';
// Importa el hook para la autenticación si existe
// import useAuth from '../hooks/useAuth'; 

// Definición de tipos para la encuesta (ajusta según tu esquema de MongoDB)
interface Survey {
    _id: string;
    folioBoleto: string;
    origenViaje: string;
    destinoFinal: string;
    cumplioExpectativas: 'Muy Buena' | 'Buena' | 'Regular' | 'Mala' | 'Muy Mala' | string;
    califExperienciaCompra: string;
    califServicioConductor: string;
    califComodidad: string;
    califLimpieza: string;
    timestampServidor: string;
    // Campo que manejaremos en el frontend/backend para el estado de validación
    validado: boolean; 
}

// Lista de opciones para los filtros (sin números)
const terminales = [
    "Acambay", "Atlacomulco", "Cadereyta", "Chalma", "Cuernavaca", "El Yaqui", 
    "Ixtlahuaca", "Ixtapan de la Sal", "Mexico Poniente", "Mexico Norte", 
    "Naucalpan", "Querétaro", "San Juan del Rio", "Taxco", "Tenancingo", 
    "Tepotzotlán", "Tenango", "Temoaya", "Toluca", "Santiago Tianguistengo", 
    "San Mateo Atenco", "Xalatlaco", "Villa Victoria"
];

const destinos = [
    "Acambay", "Atlacomulco", "Cadereyta", "Chalma", "Cuernavaca", "El Yaqui", 
    "Ixtlahuaca", "México Poniente Zona Sur", "Ixtapan de la Sal", 
    "México Poniente Zona Centro", "Mexico Norte", "Naucalpan", "Querétaro", 
    "San Juan del Rio", "Taxco", "Tenancingo", "Tepotzotlán", "Tenango", 
    "Temoaya", "Toluca", "Santiago Tianguistengo", "San Mateo Atenco", "Xalatlaco"
];

const experiencias = ["Muy Buena", "Buena", "Regular", "Mala", "Muy Mala"];

const API_BASE_URL = '/api/dashboard/surveys'; // Se define en server.js

export const Encuestas: React.FC = () => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para los filtros
    const [ticketFilter, setTicketFilter] = useState('');
    const [terminalFilter, setTerminalFilter] = useState('');
    const [destinationFilter, setDestinationFilter] = useState('');
    const [experienceFilter, setExperienceFilter] = useState('');
    const [searchTicketInput, setSearchTicketInput] = useState(''); // Input temporal

    // Simula el uso del token de autenticación
    // const { token, logout } = useAuth();
    const token = 'YOUR_AUTH_TOKEN_HERE'; // Reemplaza con el token real

    // Función principal para obtener encuestas con filtros
    const fetchSurveys = useCallback(async () => {
        setLoading(true);
        setError(null);

        // Construir la cadena de consulta (query string) para la API
        const params = new URLSearchParams();
        if (ticketFilter) params.append('folioBoleto', ticketFilter);
        if (terminalFilter) params.append('origenViaje', terminalFilter);
        if (destinationFilter) params.append('destinoFinal', destinationFilter);
        if (experienceFilter) params.append('cumplioExpectativas', experienceFilter);
        
        const url = `${API_BASE_URL}?${params.toString()}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al cargar las encuestas');
            }

            const data: Survey[] = await response.json();
            setSurveys(data);
        } catch (err: any) {
            console.error('Error fetching surveys:', err);
            setError(err.message || 'Fallo la conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    }, [token, ticketFilter, terminalFilter, destinationFilter, experienceFilter]);

    // Ejecutar la búsqueda al cargar el componente y cuando cambian los filtros
    useEffect(() => {
        fetchSurveys();
    }, [fetchSurveys]); 

    // Función para manejar el botón de "Buscar" boleto
    const handleTicketSearch = () => {
        setTicketFilter(searchTicketInput); // Actualiza el filtro y dispara fetchSurveys
    };

    // Función para manejar las acciones CRUD
    const handleAction = async (id: string, action: 'update' | 'validate' | 'delete', data?: any) => {
        // Lógica de confirmación
        if (action === 'delete' && !window.confirm('¿Está seguro de que desea eliminar esta encuesta?')) {
            return;
        }

        if (action === 'validate' && !window.confirm('¿Desea validar permanentemente esta encuesta?')) {
            return;
        }

        // Determinar el endpoint y el método
        let url = `${API_BASE_URL}/${id}`;
        let method = 'PUT'; // Por defecto es PUT para update/validate
        let body: any = { validado: true }; // Por defecto para validar

        if (action === 'delete') {
            method = 'DELETE';
            body = undefined;
        } else if (action === 'update' && data) {
            // Lógica para abrir modal/formulario de edición y luego hacer el PUT
            alert('Funcionalidad de Edición (Update) aún no implementada en este ejemplo.');
            return;
        } else if (action === 'validate') {
             // En el backend, manejaremos el cambio de validación
             body = { validado: true }; // O el campo que uses
        } else {
            // Manejar la invalidación
            body = { validado: false };
        }


        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error en la acción ${action}`);
            }

            // Recargar la lista después de la acción
            alert(`Encuesta ${id} ${action}da con éxito.`);
            fetchSurveys(); 

        } catch (err) {
            console.error(`Error al ${action} la encuesta:`, err);
            alert(`Error al ${action} la encuesta. Consulte la consola.`);
        }
    };
    
    // Función para renderizar el estado de la tabla
    const renderTableContent = () => {
        if (loading) {
            return <div className="table-empty-state">Cargando encuestas...</div>;
        }

        if (error) {
            return <div className="table-empty-state" style={{ color: '#f44336' }}>Error: {error}</div>;
        }

        if (surveys.length === 0) {
            return <div className="table-empty-state">No se encontraron encuestas con los filtros seleccionados.</div>;
        }

        return (
            <div className="surveys-table-wrapper">
                <table className="surveys-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Folio Boleto</th>
                            <th>Origen</th>
                            <th>Destino</th>
                            <th>Expectativa</th>
                            <th>Compra</th>
                            <th>Conductor</th>
                            <th>Comodidad</th>
                            <th>Limpieza</th>
                            <th>Fecha/Hora</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {surveys.map((survey) => (
                            <tr key={survey._id}>
                                <td>{survey._id.substring(18)}...</td>
                                <td>{survey.folioBoleto}</td>
                                <td>{survey.origenViaje}</td>
                                <td>{survey.destinoFinal}</td>
                                <td>{survey.cumplioExpectativas}</td>
                                <td>{survey.califExperienciaCompra}</td>
                                <td>{survey.califServicioConductor}</td>
                                <td>{survey.califComodidad}</td>
                                <td>{survey.califLimpieza}</td>
                                <td>{new Date(survey.timestampServidor).toLocaleString()}</td>
                                <td>
                                    <span className={`validation-status status-${survey.validado ? 'validado' : 'pendiente'}`}>
                                        {survey.validado ? 'Validada' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="actions-cell">
                                    <button 
                                        className="btn-action btn-edit" 
                                        onClick={() => handleAction(survey._id, 'update')}
                                        title="Modificar los datos de la encuesta"
                                    >
                                        Editar
                                    </button>
                                    <button 
                                        className="btn-action btn-validate" 
                                        onClick={() => handleAction(survey._id, 'validate')}
                                        disabled={survey.validado}
                                        title="Validar la encuesta (Conservar)"
                                    >
                                        Validar
                                    </button>
                                    <button 
                                        className="btn-action btn-delete" 
                                        onClick={() => handleAction(survey._id, 'delete')}
                                        title="Eliminar la encuesta (No Validar)"
                                    >
                                        No Validar (Eliminar)
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="dashboard-container">
            {/* -------------------- HEADER FIJO -------------------- */}
            <header className="dashboard-header">
                <div className="header-top-bar">
                    <div className="header-logo-container">
                        <img src={logo} alt="Logo Flecha Roja" className="header-logo" />
                        <span className="logo-name">Flecha Roja</span>
                    </div>
                    <h1 className="header-title-main">Dashboard - Encuestas de Satisfacción</h1>
                    <button className="btn-logout" /*onClick={logout}*/>
                        Cerrar Sesión
                    </button>
                </div>
                {/* Aquí iría la barra de navegación (nav-bar) si hubiera más pestañas.
                    Para simplificar, solo mostramos el header top bar. 
                */}
            </header>

            {/* -------------------- CONTENIDO PRINCIPAL -------------------- */}
            <main className="dashboard-main-content">
                <div className="surveys-page-container">
                    
                    {/* Caja de Filtros */}
                    <div className="filters-box">
                        
                        {/* 1. Filtro por Folio de Boleto */}
                        <div className="filter-group" style={{ flexGrow: 0, minWidth: 'unset' }}>
                            <label htmlFor="ticket-search">Buscar por Boleto</label>
                            <input
                                id="ticket-search"
                                type="text"
                                placeholder="Escriba el Folio"
                                value={searchTicketInput}
                                onChange={(e) => setSearchTicketInput(e.target.value)}
                            />
                        </div>
                        <button className="btn-search-ticket" onClick={handleTicketSearch}>
                            Buscar
                        </button>
                        
                        {/* 2. Filtro por Terminal (origenViaje) */}
                        <div className="filter-group">
                            <label htmlFor="terminal-filter">Todas las Terminales</label>
                            <select
                                id="terminal-filter"
                                value={terminalFilter}
                                onChange={(e) => {
                                    setTerminalFilter(e.target.value);
                                    setTicketFilter(''); // Limpia otros filtros
                                    setSearchTicketInput('');
                                }}
                            >
                                <option value="">--- Todas ---</option>
                                {terminales.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* 3. Filtro por Destino (destinoFinal) */}
                        <div className="filter-group">
                            <label htmlFor="destination-filter">Todos los Destinos</label>
                            <select
                                id="destination-filter"
                                value={destinationFilter}
                                onChange={(e) => {
                                    setDestinationFilter(e.target.value);
                                    setTicketFilter('');
                                    setSearchTicketInput('');
                                }}
                            >
                                <option value="">--- Todos ---</option>
                                {destinos.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        {/* 4. Filtro por Experiencia (cumplioExpectativas) */}
                        <div className="filter-group">
                            <label htmlFor="experience-filter">Todas las Experiencias</label>
                            <select
                                id="experience-filter"
                                value={experienceFilter}
                                onChange={(e) => {
                                    setExperienceFilter(e.target.value);
                                    setTicketFilter('');
                                    setSearchTicketInput('');
                                }}
                            >
                                <option value="">--- Todas ---</option>
                                {experiencias.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>

                    </div>
                    
                    {/* Contenedor de la Tabla */}
                    {renderTableContent()}

                </div>
            </main>
        </div>
    );
};