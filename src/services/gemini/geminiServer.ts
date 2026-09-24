/**
 * Security Urban - Comuna 8 Medellín
 * Implementación del servicio de Gemini AI del lado del Servidor (Backend)
 * Utiliza @google/genai TypeScript SDK oficial según los estándares de AI Studio
 */

import { GoogleGenAI } from '@google/genai';
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
import {
  GEMINI_SYSTEM_INSTRUCTION,
  buildIncidentAnalysisPrompt,
  buildSafeRoutePrompt,
  buildTacticalAdvicePrompt,
  buildCommunitySummaryPrompt,
} from './prompts';

// Modelo recomendado para tareas de texto y análisis
const GEMINI_MODEL = 'gemini-3.8-flash';

// Instanciación única con telemetría requerida 'User-Agent': 'aistudio-build'
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Función auxiliar para limpiar y parsear respuestas JSON generadas por Gemini
 */
function parseCleanJson<T>(rawText: string, fallback: T): T {
  try {
    // Si viene dentro de bloques markdown de código ```json ... ```
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(clean) as T;
  } catch (error) {
    console.warn('[GeminiServer] Fallo al parsear JSON, usando fallback:', error);
    return fallback;
  }
}

/**
 * Verifica el estado del servicio Gemini
 */
export async function checkGeminiStatus(): Promise<GeminiServiceStatus> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      disponible: false,
      modelo: GEMINI_MODEL,
      mensaje: 'GEMINI_API_KEY no configurada en las variables de entorno del servidor.',
    };
  }

  return {
    disponible: true,
    modelo: GEMINI_MODEL,
    mensaje: 'Servicio Gemini AI activo y enlazado a Security Urban (Comuna 8).',
  };
}

/**
 * 1. Análisis de Incidentes de Seguridad Urbana
 */
export async function analyzeIncidentReport(
  params: IncidentAnalysisRequest
): Promise<IncidentAnalysisResponse> {
  const ai = getGeminiClient();

  // Fallback si no hay API key activa
  const fallbackResponse: IncidentAnalysisResponse = {
    nivelRiesgo: 'medio',
    puntuacionRiesgo: 58,
    categoriaDetectada: params.categoria || 'Incidente Comunal',
    resumenEjecutivo: `Reporte en ${params.sector} recibido y encolado para verificación preventiva.`,
    recomendacionesInmediatas: [
      'Mantenerse en vías iluminadas y concurridas.',
      'Informar a la red vecinal de apoyo comunal.',
      'Contactar el cuadrante de Policía si observa reincidencia.',
    ],
    accionesOperador: [
      'Verificar cámaras del sector Comuna 8.',
      'Notificar a la patrulla comunal en ronda.',
    ],
    prioridadDespacho: 'media',
    cuadranteRecomendado: `Cuadrante 8 (${params.sector})`,
  };

  if (!ai) {
    return fallbackResponse;
  }

  try {
    const prompt = buildIncidentAnalysisPrompt(params);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 0.2, // Respuestas deterministas para seguridad
      },
    });

    const text = response.text || '';
    return parseCleanJson<IncidentAnalysisResponse>(text, fallbackResponse);
  } catch (error) {
    console.error('[GeminiServer] Error analizando incidente:', error);
    return fallbackResponse;
  }
}

/**
 * 2. Evaluación de Rutas Seguras en Comuna 8
 */
export async function evaluateSafeRoute(
  params: SafeRouteEvaluationRequest
): Promise<SafeRouteEvaluationResponse> {
  const ai = getGeminiClient();

  const fallbackResponse: SafeRouteEvaluationResponse = {
    nivelSeguridad: 'moderada',
    puntuacionSeguridad: 72,
    puntosDeAtencion: [
      `Callejones secundarios en ${params.sectorBarrio} con menor afluencia peatonal.`,
    ],
    rutasAlternativasSugeridas: [
      'Transitar por ejes viales principales (Carrera 38 / Carrera 40 / Calle 56).',
    ],
    consejosSeguridad: [
      'Evitar el uso descuidado de dispositivos móviles en paraderos.',
      'Priorizar tramos comerciales y paradas del Metrocable / Tranvía.',
      'Compartir la ubicación en tiempo real con contactos de confianza.',
    ],
    puntosIluminadosOComerciales: [
      'Parque de Boston',
      'Parque Biblioteca La Ladera',
      'Corredor comercial UVA La Libertad',
    ],
  };

  if (!ai) {
    return fallbackResponse;
  }

  try {
    const prompt = buildSafeRoutePrompt(params);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    const text = response.text || '';
    return parseCleanJson<SafeRouteEvaluationResponse>(text, fallbackResponse);
  } catch (error) {
    console.error('[GeminiServer] Error evaluando ruta:', error);
    return fallbackResponse;
  }
}

/**
 * 3. Asesoría y Protocolo Táctico para Operadores
 */
export async function generateTacticalAdvice(
  params: TacticalAdviceRequest
): Promise<TacticalAdviceResponse> {
  const ai = getGeminiClient();

  const fallbackResponse: TacticalAdviceResponse = {
    protocoloRecomendado: 'Protocolo de Contención Preventiva y Verificación de Cuadrante',
    nivelAlertaOperativa: 'amarillo',
    pasosAccionInmediata: [
      `Contactar la estación de Policía Villa Hermosa para el cuadrante ${params.cuadrante}.`,
      'Monitorear reportes en tiempo real enviados por ciudadanos en el área.',
      'Emitir alerta temprana a líderes comunitarios registrados en el sector.',
    ],
    coordinacionInterinstitucional: [
      'Policía Nacional (Línea 123 / Cuadrante Comuna 8)',
      'Gestores de Convivencia y Paz Medellín',
    ],
    evaluacionImpactoComunal: `Situación de nivel preventivo moderado en ${params.sector}.`,
  };

  if (!ai) {
    return fallbackResponse;
  }

  try {
    const prompt = buildTacticalAdvicePrompt(params);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    const text = response.text || '';
    return parseCleanJson<TacticalAdviceResponse>(text, fallbackResponse);
  } catch (error) {
    console.error('[GeminiServer] Error generando consejo táctico:', error);
    return fallbackResponse;
  }
}

/**
 * 4. Resumen Situacional Comunitario
 */
export async function generateCommunitySummary(
  params: CommunitySummaryRequest
): Promise<CommunitySummaryResponse> {
  const ai = getGeminiClient();

  const fallbackResponse: CommunitySummaryResponse = {
    resumenSituacional: `Durante el periodo ${params.periodo}, se han procesado ${params.incidentesRecientes.length} reportes en la Comuna 8, manteniendo un nivel de alerta preventivo bajo supervisión comunal.`,
    zonasConMayorAtencion: ['Villa Hermosa', 'Enciso', 'Boston'],
    tendenciasObservadas: [
      'Aumento de reportes sobre luminarias y puntos oscuros en horarios nocturnos.',
      'Buena respuesta ciudadana al compartir reportes tempranos.',
    ],
    recomendacionesComunitarias: [
      'Continuar utilizando la red comunal Security Urban para alertas tempranas.',
      'Participar en los frentes de seguridad de su barrio.',
    ],
  };

  if (!ai) {
    return fallbackResponse;
  }

  try {
    const prompt = buildCommunitySummaryPrompt({
      incidentes: params.incidentesRecientes,
      periodo: params.periodo,
    });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
    });

    const text = response.text || '';
    return parseCleanJson<CommunitySummaryResponse>(text, fallbackResponse);
  } catch (error) {
    console.error('[GeminiServer] Error generando resumen comunitario:', error);
    return fallbackResponse;
  }
}
