export type RiskLevel = 'high' | 'moderate' | 'central';

export interface SectorRiskData {
  id: string;
  name: string;
  comuna: string;
  comunaKey: string;
  comunaNumber: number;
  level: RiskLevel;
  levelLabel: string;
  coordinates: { lat: number; lng: number };
  contextNote: string;
  historicalDiagnosis: string;
  citizenAdvice: string;
  quadrant: string;
  verifiedReferenceYear: string;
}

export interface ComunaInfo {
  key: string;
  number: number;
  name: string;
  zone: string;
  center: { lat: number; lng: number };
  zoom: number;
  description: string;
}

export const COMUNA_8_INFO: ComunaInfo = {
  key: 'comuna-8',
  number: 8,
  name: 'Comuna 8 — Villa Hermosa',
  zone: 'Zona Centro-Oriental',
  center: { lat: 6.2476, lng: -75.5458 },
  zoom: 14,
  description: 'Territorio centro-oriental de colinas y laderas de Medellín, articulado por el Tranvía de Ayacucho y Metrocable Líneas H y M.',
};

export const COMUNAS_METADATA: ComunaInfo[] = [COMUNA_8_INFO];

export const COMUNA_8_CENTER = { lat: 6.2476, lng: -75.5458 };
export const COMUNA_8_DEFAULT_ZOOM = 14;

// Backward-compatibility aliases
export const MEDELLIN_PANORAMIC_CENTER = COMUNA_8_CENTER;
export const MEDELLIN_PANORAMIC_ZOOM = COMUNA_8_DEFAULT_ZOOM;

export const COMUNA_8_SECTORS: SectorRiskData[] = [
  // ==========================================
  // COMUNA 8 — VILLA HERMOSA (18 Sectores)
  // ==========================================
  {
    id: 'c8-sucre',
    name: 'Sucre',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2458, lng: -75.5562 },
    contextNote: 'Sector con antecedentes de linderos barriales y corredores de cuidado en laderas orientales. Precaución reforzada en horario nocturno.',
    historicalDiagnosis: 'Reportes de fronteras invisibles históricas y atención focalizada en callejones residenciales según diagnósticos territoriales.',
    citizenAdvice: 'Transitar preferentemente por Calle 56 y Calle 57 (corredor Tranvía) y evitar callejones oscuros después de las 20:00.',
    quadrant: 'Cuadrante 8-2',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-san-miguel',
    name: 'San Miguel',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2505, lng: -75.5535 },
    contextNote: 'Zona limítrofe con historial de disputas barriales y reportes de convivencia ciudadana.',
    historicalDiagnosis: 'Histórico de tensiones entre microsectores y reporte de puntos críticos de hurto en escalinatas peatonales.',
    citizenAdvice: 'Mantenerse sobre los ejes viales principales e informar novedades al cuadrante comunitario.',
    quadrant: 'Cuadrante 8-2',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-villatina',
    name: 'Villatina',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2435, lng: -75.5410 },
    contextNote: 'Sector de ladera con antecedentes de vulnerabilidad social y afectaciones históricas por dinámicas de conflicto barrial.',
    historicalDiagnosis: 'Área priorizada en planes de prevención social y monitoreo de convivencia por la administración municipal.',
    citizenAdvice: 'Utilizar el transporte formal colectivo y evitar transitar solo por zonas altas no iluminadas en horarios nocturnos.',
    quadrant: 'Cuadrante 8-3',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-el-pinal',
    name: 'El Pinal',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2475, lng: -75.5385 },
    contextNote: 'Sector de ladera con topografía compleja y antecedentes de control territorial por grupos locales según diagnósticos previos.',
    historicalDiagnosis: 'Registros de atención prioritaria por presencia de pasos informales hacia la parte alta de la cuenca Santa Elena.',
    citizenAdvice: 'Priorizar movilidad diurna y coordinar con líderes comunitarios en traslados de mudanzas o entregas comerciales.',
    quadrant: 'Cuadrante 8-4',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-villa-liliam',
    name: 'Villa Liliam',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2405, lng: -75.5390 },
    contextNote: 'Sector con reportes recientes de desplazamiento intraurbano según diagnóstico de la Alcaldía y Personería.',
    historicalDiagnosis: 'Histórico de afectaciones a la movilidad de familias en zonas perimetrales y vigilancia comunitaria requerida.',
    citizenAdvice: 'Acudir a los canales institucionales (SISC / Personería) ante cualquier presión indebida o cobro extorsivo.',
    quadrant: 'Cuadrante 8-4',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-llanaditas',
    name: 'Llanaditas',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2542, lng: -75.5380 },
    contextNote: 'Zona alta de ladera oriental; historial de vigilancia por actores barriales y alertas de seguridad preventiva en pasos peatonales.',
    historicalDiagnosis: 'Topografía con callejones peatonales de difícil acceso vehicular; se mantiene atención preventiva en escalinatas.',
    citizenAdvice: 'Preferir las rutas de alimentadores del Metro y evitar atajos por trochas perimetrales sin alumbrado.',
    quadrant: 'Cuadrante 8-1',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-la-ladera',
    name: 'La Ladera',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2515, lng: -75.5480 },
    contextNote: 'Sector contiguo a las zonas históricas de ladera; requiere precaución preventiva en callejones y laderas residenciales.',
    historicalDiagnosis: 'Coexistencia de equipamiento cultural con sectores habitacionales que presentan retos de seguridad en horarios nocturnos.',
    citizenAdvice: 'Hacer uso de los senderos principales señalizados y permanecer en áreas con iluminación pública activa.',
    quadrant: 'Cuadrante 8-1',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-villa-turbay',
    name: 'Villa Turbay',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2370, lng: -75.5345 },
    contextNote: 'Sector limítrofe oriental con alertas de seguridad por disputas históricas de linderos barriales.',
    historicalDiagnosis: 'Zona perimetral oriental con menor densidad de patrullaje motorizado en áreas de difícil acceso topográfico.',
    citizenAdvice: 'Evitar circular a altas horas de la noche sin compañía y mantener contacto con el cuadrante 8-5.',
    quadrant: 'Cuadrante 8-5',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-la-sierra',
    name: 'La Sierra',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2340, lng: -75.5320 },
    contextNote: 'Histórico foco de dinámicas de conflicto urbano en la cuenca alta; se recomienda priorizar el uso del Metrocable Línea H.',
    historicalDiagnosis: 'Transformación social notable impulsada por el sistema Metrocable, aunque con persistencia de precauciones en zonas altas perimetrales.',
    citizenAdvice: 'Utilizar el sistema integrado de transporte (Estación Villa Sierra) para movilizarse de forma segura y rápida.',
    quadrant: 'Cuadrante 8-5',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-trece-noviembre',
    name: 'Trece de Noviembre',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2460, lng: -75.5340 },
    contextNote: 'Zona de ladera media-alta con reportes de incidentes a transeúntes y necesidad de monitoreo comunitario constante.',
    historicalDiagnosis: 'Monitoreo preventivo por eventos de extorsión a comercio menor y reportes de convivencia en espacios públicos.',
    citizenAdvice: 'Comerciantes y residentes deben utilizar las redes de apoyo ciudadano y reportar inmediatamente cualquier anomalía.',
    quadrant: 'Cuadrante 8-4',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-la-libertad',
    name: 'La Libertad',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2400, lng: -75.5305 },
    contextNote: 'Sector en límite perimetral; atención preventiva por reportes de extorsión barrial histórica y puntos ciegos de iluminación.',
    historicalDiagnosis: 'Zona limítrofe con el área rural; reportes periódicos de incidentes aislados y necesidad de refuerzo en luminarias.',
    citizenAdvice: 'Mantenerse sobre el corredor principal de transporte público y evitar paradas en zonas desoladas.',
    quadrant: 'Cuadrante 8-5',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-la-mansion',
    name: 'La Mansión',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2530, lng: -75.5580 },
    contextNote: 'Zona residencial mixta con antecedentes de hurtos y confrontaciones focalizadas reportadas en informes del SISC.',
    historicalDiagnosis: 'Corredores peatonales que conectan con Prado y Boston con reportes de hurto a personas en horas pico.',
    citizenAdvice: 'Estar atento al entorno al esperar el transporte público y no descuidar objetos personales de valor.',
    quadrant: 'Cuadrante 8-2',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-las-estancias',
    name: 'Las Estancias',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2385, lng: -75.5360 },
    contextNote: 'Sector con antecedentes de desplazamiento intraurbano en periodos anteriores y corredores de paso informal.',
    historicalDiagnosis: 'Área residencial con estrechas vías peatonales, priorizada en mesas interinstitucionales de seguridad y convivencia.',
    citizenAdvice: 'Acompañamiento vecinal en recorridos nocturnos y reporte de luminarias averiadas a través del módulo de alertas.',
    quadrant: 'Cuadrante 8-5',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-villa-guadalupe',
    name: 'Villa Guadalupe',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'moderate',
    levelLabel: 'Intermedia / Precaución moderada',
    coordinates: { lat: 6.2580, lng: -75.5450 },
    contextNote: 'Zona residencial de transición; monitoreo de convivencia y patrullaje preventivo de cuadrante.',
    historicalDiagnosis: 'Actividades comunitarias activas y mejoramiento de infraestructura vial barrial en años recientes.',
    citizenAdvice: 'Transitar con normalidad en horarios diurnos y reportar fallas de iluminación pública.',
    quadrant: 'Cuadrante 8-1',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-enciso',
    name: 'Enciso',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'moderate',
    levelLabel: 'Intermedia / Precaución moderada',
    coordinates: { lat: 6.2420, lng: -75.5480 },
    contextNote: 'Barrio consolidado con comercio vecinal activo y rutas constantes de buses alimentadores.',
    historicalDiagnosis: 'Nivel medio de denuncias por hurto a comercio menor; presencia comunitaria organizada.',
    citizenAdvice: 'Hacer compras en corredores iluminados y utilizar los paraderos oficiales.',
    quadrant: 'Cuadrante 8-3',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-los-angeles-oriente',
    name: 'Los Ángeles (Oriente)',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'moderate',
    levelLabel: 'Intermedia / Precaución moderada',
    coordinates: { lat: 6.2480, lng: -75.5530 },
    contextNote: 'Franja de articulación entre Villa Hermosa y el centro; flujo peatonal constante.',
    historicalDiagnosis: 'Dinámicas mixtas de vivienda y servicios con patrullaje preventivo de la Policía Metropolitana.',
    citizenAdvice: 'Cuidar pertenencias al cruzar intersecciones concurridas de la Calle 58.',
    quadrant: 'Cuadrante 8-2',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-villa-hermosa-centro',
    name: 'Villa Hermosa (Centro)',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'central',
    levelLabel: 'Zona menos crítica / Base',
    coordinates: { lat: 6.2558, lng: -75.5512 },
    contextNote: 'Núcleo cívico, comercial y de transporte de la Comuna 8. Mayor flujo de personas, presencia policial permanente y cámaras PTZ.',
    historicalDiagnosis: 'Punto neurálgico con comercio activo continuo, bancos, centros de salud y alta cobertura del sistema 123.',
    citizenAdvice: 'Corredor recomendado para trámites y traslados diurnos. Mantener precaución normal ante hurtos por descuido.',
    quadrant: 'Cuadrante 8-1 (Comando Central)',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'c8-leon-de-greiff',
    name: 'Parque Biblioteca León de Greiff (La Ladera)',
    comuna: 'Comuna 8 — Villa Hermosa',
    comunaKey: 'comuna-8',
    comunaNumber: 8,
    level: 'central',
    levelLabel: 'Zona menos crítica / Base',
    coordinates: { lat: 6.2520, lng: -75.5460 },
    contextNote: 'Espacio cultural, recreativo y de encuentro comunitario emblemático. Gran afluencia diurna, iluminación renovada y oferta comunitaria.',
    historicalDiagnosis: 'Epicentro de programas educativos, culturales y de mediación juvenil con permanente vigilancia cívica e institucional.',
    citizenAdvice: 'Excelente punto de encuentro seguro durante el día y la tarde. Seguir los senderos iluminados hacia el transporte público.',
    quadrant: 'Cuadrante 8-1 (Zona Cultural)',
    verifiedReferenceYear: '2026',
  },
];

export const ALL_MEDELLIN_SECTORS: SectorRiskData[] = COMUNA_8_SECTORS;
