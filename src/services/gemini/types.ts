/**
 * Security Urban - Comuna 8 Medellín
 * Tipos e interfaces del servicio de Inteligencia Artificial Gemini
 */

export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico';

export type IncidentCategory = 
  | 'hurto'
  | 'altercado'
  | 'persona_sospechosa'
  | 'iluminacion_fallida'
  | 'emergencia_medica'
  | 'violencia_intrafamiliar'
  | 'zona_vulnerable'
  | 'otro';

export interface IncidentAnalysisRequest {
  titulo: string;
  descripcion: string;
  sector: string;
  horaReporte?: string;
  categoria?: IncidentCategory | string;
}

export interface IncidentAnalysisResponse {
  nivelRiesgo: RiskLevel;
  puntuacionRiesgo: number; // 1 - 100
  categoriaDetectada: string;
  resumenEjecutivo: string;
  recomendacionesInmediatas: string[];
  accionesOperador: string[];
  prioridadDespacho: 'urgente' | 'alta' | 'media' | 'baja';
  cuadranteRecomendado: string;
}

export interface SafeRouteEvaluationRequest {
  origen: string;
  destino: string;
  hora: string;
  medioTransporte: 'a_pie' | 'bicicleta' | 'motocicleta' | 'vehiculo' | 'transporte_publico';
  sectorBarrio: string;
}

export interface SafeRouteEvaluationResponse {
  nivelSeguridad: 'muy_segura' | 'moderada' | 'precaucion_alta' | 'no_recomendada';
  puntuacionSeguridad: number; // 1 - 100
  puntosDeAtencion: string[];
  rutasAlternativasSugeridas: string[];
  consejosSeguridad: string[];
  puntosIluminadosOComerciales: string[];
}

export interface TacticalAdviceRequest {
  cuadrante: string;
  sector: string;
  tipoAlerta: string;
  descripcion: string;
  recursosDisponibles?: string[];
}

export interface TacticalAdviceResponse {
  protocoloRecomendado: string;
  nivelAlertaOperativa: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  pasosAccionInmediata: string[];
  coordinacionInterinstitucional: string[]; // ej. Policía Cuadrante 8, Bomberos, Defensa Civil, Línea 123
  evaluacionImpactoComunal: string;
}

export interface CommunitySummaryRequest {
  incidentesRecientes: Array<{
    titulo: string;
    sector: string;
    categoria: string;
    fecha: string;
  }>;
  periodo: string;
}

export interface CommunitySummaryResponse {
  resumenSituacional: string;
  zonasConMayorAtencion: string[];
  tendenciasObservadas: string[];
  recomendacionesComunitarias: string[];
}

export interface GeminiServiceStatus {
  disponible: boolean;
  modelo: string;
  mensaje?: string;
}
