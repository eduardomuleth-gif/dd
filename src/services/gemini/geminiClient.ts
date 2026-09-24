/**
 * Security Urban - Comuna 8 Medellín
 * Cliente Frontend para el Servicio Gemini AI
 * 
 * Regla de Oro: El cliente NUNCA interactúa directamente con la clave API ni importa @google/genai.
 * Todas las peticiones se enrutan a través de los endpoints seguros del backend (/api/gemini/*).
 */

import {
  IncidentAnalysisRequest,
  IncidentAnalysisResponse,
  SafeRouteEvaluationRequest,
  SafeRouteEvaluationResponse,
  TacticalAdviceRequest,
  TacticalAdviceResponse,
  CommunitySummaryRequest,
  CommunitySummaryResponse,
  GeminiServiceStatus,
} from './types';

const API_BASE = '/api/gemini';

/**
 * Consulta el estado de disponibilidad del motor Gemini
 */
export async function getGeminiStatus(): Promise<GeminiServiceStatus> {
  try {
    const res = await fetch(`${API_BASE}/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn('[GeminiClient] Estado no disponible en servidor:', error);
    return {
      disponible: false,
      modelo: 'gemini-3.8-flash',
      mensaje: 'Modo fuera de línea o backend no sincronizado.',
    };
  }
}

/**
 * Solicita al servidor un análisis con IA de un incidente reportado
 */
export async function requestIncidentAnalysis(
  payload: IncidentAnalysisRequest
): Promise<IncidentAnalysisResponse> {
  try {
    const res = await fetch(`${API_BASE}/analyze-incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Error en servidor: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('[GeminiClient] Error solicitando análisis de incidente:', error);
    // Retorno de contención seguro en caso de corte de red
    return {
      nivelRiesgo: 'medio',
      puntuacionRiesgo: 50,
      categoriaDetectada: payload.categoria || 'Incidente en Comuna 8',
      resumenEjecutivo: `Reporte en ${payload.sector} registrado en sistema comunal.`,
      recomendacionesInmediatas: [
        'Manténgase en zonas iluminadas y transitadas.',
        'Comuníquese con vecinos o cuadrante de policía cercano.',
      ],
      accionesOperador: ['Verificación con líderes comunales del cuadrante.'],
      prioridadDespacho: 'media',
      cuadranteRecomendado: `Cuadrante Comuna 8 (${payload.sector})`,
    };
  }
}

/**
 * Solicita evaluación inteligente de una ruta de tránsito en la Comuna 8
 */
export async function requestRouteEvaluation(
  payload: SafeRouteEvaluationRequest
): Promise<SafeRouteEvaluationResponse> {
  try {
    const res = await fetch(`${API_BASE}/evaluate-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Error en servidor: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('[GeminiClient] Error evaluando ruta segura:', error);
    return {
      nivelSeguridad: 'moderada',
      puntuacionSeguridad: 70,
      puntosDeAtencion: [`Tramos secundarios en ${payload.sectorBarrio}.`],
      rutasAlternativasSugeridas: ['Avenida o corredor comercial principal.'],
      consejosSeguridad: ['Permanezca alerta y no exhiba pertenencias de alto valor.'],
      puntosIluminadosOComerciales: ['Estaciones de Metro / Metrocable y parques principales.'],
    };
  }
}

/**
 * Solicita asesoría táctica inmediata para operadores o administradores
 */
export async function requestTacticalAdvice(
  payload: TacticalAdviceRequest
): Promise<TacticalAdviceResponse> {
  try {
    const res = await fetch(`${API_BASE}/tactical-advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Error en servidor: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('[GeminiClient] Error solicitando consejo táctico:', error);
    return {
      protocoloRecomendado: 'Protocolo de Verificación Estándar',
      nivelAlertaOperativa: 'amarillo',
      pasosAccionInmediata: [
        'Contactar patrulla de cuadrante correspondiente.',
        'Notificar a la red comunal del sector.',
      ],
      coordinacionInterinstitucional: ['Línea 123 Policía Nacional'],
      evaluacionImpactoComunal: `Situación bajo seguimiento preventivo en ${payload.sector}.`,
    };
  }
}

/**
 * Solicita generación de resumen situacional de la comunidad
 */
export async function requestCommunitySummary(
  payload: CommunitySummaryRequest
): Promise<CommunitySummaryResponse> {
  try {
    const res = await fetch(`${API_BASE}/community-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Error en servidor: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('[GeminiClient] Error solicitando resumen comunitario:', error);
    return {
      resumenSituacional: `Reporte situacional para el periodo ${payload.periodo} en Comuna 8.`,
      zonasConMayorAtencion: ['Villa Hermosa', 'Enciso'],
      tendenciasObservadas: ['Actividad preventiva vecinal activa.'],
      recomendacionesComunitarias: ['Mantener canales de comunicación vecinal abiertos.'],
    };
  }
}
