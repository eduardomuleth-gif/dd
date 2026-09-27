/**
 * =======================================================================
 * SECURITY URBAN :: CONFIGURACIÓN DE SIMULACIÓN DE ACTIVIDAD (DEMO ACADÉMICA)
 * =======================================================================
 * 
 * Permite simular actividad comunitaria periódica para demostración del proyecto,
 * generando reportes verificados y aceptados en Firestore con límites estrictos
 * para evitar la saturación del sistema.
 * 
 * Para mostrar el sistema 100% "limpio" sin actividad simulada, cambia:
 *   export const DEMO_MODE = false;
 */

// Toggle maestro para activar / desactivar la simulación de actividad
export const DEMO_MODE = true;

// Intervalo de evaluación del generador (cada 45-60 segundos -> 50s = 50,000 ms)
export const SIMULATION_CHECK_INTERVAL_MS = 50 * 1000;

// Probabilidad de generación por intervalo (75% dentro del rango 70-80% para dinamismo en vivo)
export const SIMULATION_PROBABILITY = 0.75;

// Límite de saturación temporal: tiempo mínimo entre reportes simulados (40s para sostener la cadencia)
export const MIN_INTERVAL_BETWEEN_SIMULATED_REPORTS_MS = 40 * 1000;

// Límite máximo de reportes simulados activos en las últimas 24 horas (rango 25-35)
export const MAX_SIMULATED_REPORTS_24H = 30;

// Claves de almacenamiento local para persistencia del estado de simulación
export const SIMULATION_STORAGE_KEYS = {
  LAST_SIMULATED_AT: 'security_urban_sim_last_at',
  SEEDED_FLAG: 'security_urban_sim_seeded_v1',
};
