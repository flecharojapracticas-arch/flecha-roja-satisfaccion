/**
 * settings.js - Utilidades para manejar la configuración de metas de encuestas
 */

export const SETTINGS_KEYS = {
    META_GENERAL: 'survey_meta_general',
    META_TERMINAL: 'survey_meta_terminal',
    SURVEY_WEIGHTS: 'survey_weights',
};

export const DEFAULT_SETTINGS = {
    META_GENERAL: 1050,
    META_TERMINAL: 81,
    WEIGHTS: {
        "Muy Buena": 3,
        "Buena": 2,
        "Regular": 1,
        "Mala": 0,
        "Muy Mala": 0,
    }
};

/**
 * Obtiene la meta general de encuestas
 */
export const getMetaGeneral = () => {
    const value = localStorage.getItem(SETTINGS_KEYS.META_GENERAL);
    return value ? parseInt(value, 10) : DEFAULT_SETTINGS.META_GENERAL;
};

/**
 * Guarda la meta general de encuestas
 */
export const setMetaGeneral = (value) => {
    localStorage.setItem(SETTINGS_KEYS.META_GENERAL, value.toString());
};

/**
 * Obtiene la meta por terminal
 */
export const getMetaTerminal = () => {
    const value = localStorage.getItem(SETTINGS_KEYS.META_TERMINAL);
    return value ? parseInt(value, 10) : DEFAULT_SETTINGS.META_TERMINAL;
};

/**
 * Guarda la meta por terminal
 */
export const setMetaTerminal = (value) => {
    localStorage.setItem(SETTINGS_KEYS.META_TERMINAL, value.toString());
};

/**
 * Obtiene las ponderaciones de satisfacción
 */
export const getSurveyWeights = () => {
    const value = localStorage.getItem(SETTINGS_KEYS.SURVEY_WEIGHTS);
    return value ? JSON.parse(value) : DEFAULT_SETTINGS.WEIGHTS;
};

/**
 * Guarda las ponderaciones de satisfacción
 */
export const setSurveyWeights = (weights) => {
    localStorage.setItem(SETTINGS_KEYS.SURVEY_WEIGHTS, JSON.stringify(weights));
};
