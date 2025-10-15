import React from 'react';

// Asegúrate de que el nombre del componente coincida con el export default
const AnalisisPage = ({ onLogout }) => { 
    return (
        // ... Contenido de esta página ...
        <h1>Análisis Page Content</h1>
    );
};

// ESTA LÍNEA ES LA CRÍTICA: Debe usar 'default'
export default AnalisisPage;