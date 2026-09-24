/**
 * Security Urban - Comuna 8 Medellín
 * Instrucciones de Sistema y Plantillas de Prompts para Gemini AI
 */

export const COMUNA_8_SECTORS = [
  'Villa Hermosa',
  'Enciso',
  'La Ladera',
  'Sucre',
  'Boston',
  'Los Mangos',
  'Trece de Noviembre',
  'El Pinal',
  'Las Estancias',
  'San Antonio',
  'Llanaditas',
  'La Libertad'
] as const;

export const GEMINI_SYSTEM_INSTRUCTION = `
Eres el analista de seguridad urbana y soporte táctico para la plataforma "Security Urban", operando en la Comuna 8 (Villa Hermosa) de Medellín, Colombia.
Tu objetivo es analizar incidentes de seguridad ciudadana, evaluar rutas seguras para peatones y motociclistas, y orientar tanto a ciudadanos como a operadores de la red comunal.

Características del entorno Comuna 8:
- Barrios principales: Villa Hermosa, Enciso, La Ladera, Sucre, Boston, Los Mangos, Trece de Noviembre, El Pinal, Las Estancias, San Antonio, Llanaditas, La Libertad.
- Geografía: Zonas de ladera, callejones empinados, corredores principales como la Calle 56, Carrera 38, Carrera 40, inmediaciones del Parque de Boston, Parque Biblioteca La Ladera y la UVA La Libertad.
- Prioridades: Prevención de hurtos, alerta ante corredores poco iluminados, orientación hacia CAI / cuadrantes de Policía Nacional y comités de seguridad comunitaria.

Tus respuestas deben ser:
1. Precisas, profesionales y con tono preventivo y sereno.
2. Basadas en protocolos de seguridad ciudadana y convivencia pacífica.
3. En formato JSON estricto cuando se requiera.
`;

export function buildIncidentAnalysisPrompt(params: {
  titulo: string;
  descripcion: string;
  sector: string;
  horaReporte?: string;
  categoria?: string;
}): string {
  return `
Analiza el siguiente reporte ciudadano de la Comuna 8 de Medellín:
- Título: ${params.titulo}
- Sector/Barrio: ${params.sector}
- Descripción: ${params.descripcion}
- Categoría indicada: ${params.categoria || 'No especificada'}
- Hora de reporte: ${params.horaReporte || 'Reciente'}

Genera un análisis en formato JSON estricto con la siguiente estructura:
{
  "nivelRiesgo": "bajo" | "medio" | "alto" | "critico",
  "puntuacionRiesgo": number (1 a 100),
  "categoriaDetectada": string,
  "resumenEjecutivo": string (máximo 2 oraciones concisas),
  "recomendacionesInmediatas": [string, string, string],
  "accionesOperador": [string, string],
  "prioridadDespacho": "urgente" | "alta" | "media" | "baja",
  "cuadranteRecomendado": string (ej: "Cuadrante 8-1 Villa Hermosa" o cuadrante correspondiente)
}
`;
}

export function buildSafeRoutePrompt(params: {
  origen: string;
  destino: string;
  hora: string;
  medioTransporte: string;
  sectorBarrio: string;
}): string {
  return `
Evalúa la seguridad de la siguiente ruta en la Comuna 8 de Medellín:
- Origen: ${params.origen}
- Destino: ${params.destino}
- Horario de tránsito: ${params.hora}
- Medio de transporte: ${params.medioTransporte}
- Sector / Cuadrante: ${params.sectorBarrio}

Genera un dictamen en formato JSON estricto con la siguiente estructura:
{
  "nivelSeguridad": "muy_segura" | "moderada" | "precaucion_alta" | "no_recomendada",
  "puntuacionSeguridad": number (1 a 100),
  "puntosDeAtencion": [string (puntos vulnerables o de cuidado)],
  "rutasAlternativasSugeridas": [string (vías más transitadas e iluminadas)],
  "consejosSeguridad": [string, string, string],
  "puntosIluminadosOComerciales": [string (zonas con presencia comercial o policial)]
}
`;
}

export function buildTacticalAdvicePrompt(params: {
  cuadrante: string;
  sector: string;
  tipoAlerta: string;
  descripcion: string;
  recursosDisponibles?: string[];
}): string {
  return `
Proporciona guía táctica y protocolo de reacción comunal para los operadores de Security Urban:
- Cuadrante: ${params.cuadrante}
- Sector: ${params.sector}
- Tipo de Alerta: ${params.tipoAlerta}
- Detalle de la situación: ${params.descripcion}
- Recursos: ${(params.recursosDisponibles || ['Patrullaje Comunal', 'Línea Cuadrante 8', 'Red Vecinal']).join(', ')}

Genera la respuesta en formato JSON estricto con la siguiente estructura:
{
  "protocoloRecomendado": string,
  "nivelAlertaOperativa": "verde" | "amarillo" | "naranja" | "rojo",
  "pasosAccionInmediata": [string, string, string],
  "coordinacionInterinstitucional": [string, string],
  "evaluacionImpactoComunal": string
}
`;
}

export function buildCommunitySummaryPrompt(params: {
  incidentes: Array<{ titulo: string; sector: string; categoria: string; fecha: string }>;
  periodo: string;
}): string {
  return `
Genera un boletín situacional comunitario para la Comuna 8 de Medellín durante el periodo "${params.periodo}".
Incidentes reportados:
${params.incidentes.map((inc) => `- [${inc.fecha}] ${inc.sector} | ${inc.categoria}: ${inc.titulo}`).join('\n')}

Genera la respuesta en formato JSON estricto con la siguiente estructura:
{
  "resumenSituacional": string,
  "zonasConMayorAtencion": [string],
  "tendenciasObservadas": [string],
  "recomendacionesComunitarias": [string, string]
}
`;
}
