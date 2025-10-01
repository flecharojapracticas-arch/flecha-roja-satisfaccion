import { useState, useEffect } from 'react';
import './App.css'; 

// *******************************************************************
// ⚠️ REEMPLAZA ESTA URL CON TU URL REAL DE RENDER ⚠️
// *******************************************************************
const API_URL = "https://flecha-roja-satisfaccion.onrender.com/api/data"; 
// *******************************************************************

function App() {
  // 1. Estados para almacenar datos:
  const [data, setData] = useState([]); // Array para los datos de la encuesta
  const [loading, setLoading] = useState(true); // Indica si la carga está en curso
  const [error, setError] = useState(null); // Para manejar errores de conexión

  // 2. useEffect: Función que se ejecuta al iniciar el componente
  useEffect(() => {
    // Función asíncrona para obtener los datos de la API
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result); // Guarda los datos en el estado
        
      } catch (err) {
        console.error("Fallo al obtener datos:", err);
        setError(err.message); // Guarda el mensaje de error
        
      } finally {
        setLoading(false); // Detiene el estado de carga
      }
    };

    fetchData(); // Ejecuta la función de obtención de datos
  }, []); // El array vacío [] asegura que solo se ejecute una vez al montar

  // 3. Renderizado Condicional:
  
  // Muestra un mensaje de carga
  if (loading) {
    return <div className="loading">Cargando datos de la API de Render...</div>;
  }
  
  // Muestra un mensaje de error
  if (error) {
    return <div className="error">Error al conectar con el servidor: {error}. Por favor, verifica tu URL de Render.</div>;
  }
  
  // Muestra el mensaje si no hay datos
  if (data.length === 0) {
    return <div className="no-data">No hay datos de satisfacción para mostrar.</div>;
  }

  // 4. Renderizado de la Tabla de Datos (Si hay datos)
  return (
    <div className="dashboard-container">
      <h1>Dashboard de Satisfacción de Clientes</h1>
      <h2>Total de Encuestas Recibidas: {data.length}</h2>
      
      <table className="data-table">
        <thead>
          <tr>
            {/* Usamos las claves del primer objeto para generar los encabezados de la tabla */}
            {Object.keys(data[0]).map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Iteramos sobre todos los documentos */}
          {data.map((item, index) => (
            <tr key={item._id || index}>
              {/* Iteramos sobre los valores de cada documento */}
              {Object.values(item).map((value, idx) => (
                <td key={idx}>{String(value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;