/// <reference types="@types/google.maps" />

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  MapPin, 
  Flame, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Navigation, 
  Plus, 
  Minus, 
  Info, 
  Search, 
  Crosshair, 
  ExternalLink, 
  X, 
  ChevronRight, 
  Compass,
  AlertCircle,
  Eye,
  CheckCircle2,
  RefreshCw,
  LocateFixed
} from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_API_KEY } from '../config/maps';

export type RiskLevel = 'high' | 'moderate' | 'central';

export interface SectorRiskData {
  id: string;
  name: string;
  level: RiskLevel;
  levelLabel: string;
  coordinates: { lat: number; lng: number };
  contextNote: string;
  historicalDiagnosis: string;
  citizenAdvice: string;
  quadrant: string;
  verifiedReferenceYear: string;
}

// Full sectors dataset specified by the user
export const COMUNA_8_SECTORS: SectorRiskData[] = [
  // 🔴 Mayor precaución (13 sectores)
  {
    id: 'sec-sucre',
    name: 'Sucre',
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
    id: 'sec-san-miguel',
    name: 'San Miguel',
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
    id: 'sec-villatina',
    name: 'Villatina',
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
    id: 'sec-el-pinal',
    name: 'El Pinal',
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
    id: 'sec-villa-liliam',
    name: 'Villa Liliam',
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
    id: 'sec-llanaditas',
    name: 'Llanaditas',
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
    id: 'sec-la-ladera',
    name: 'La Ladera',
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
    id: 'sec-villa-turbay',
    name: 'Villa Turbay',
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
    id: 'sec-la-sierra',
    name: 'La Sierra',
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
    id: 'sec-trece-noviembre',
    name: 'Trece de Noviembre',
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
    id: 'sec-la-libertad',
    name: 'La Libertad',
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
    id: 'sec-la-mansion',
    name: 'La Mansión',
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
    id: 'sec-las-estancias',
    name: 'Las Estancias',
    level: 'high',
    levelLabel: 'Mayor precaución',
    coordinates: { lat: 6.2385, lng: -75.5360 },
    contextNote: 'Sector con antecedentes de desplazamiento intraurbano en periodos anteriores y corredores de paso informal.',
    historicalDiagnosis: 'Área residencial con estrechas vías peatonales, priorizada en mesas interinstitucionales de seguridad y convivencia.',
    citizenAdvice: 'Acompañamiento vecinal en recorridos nocturnos y reporte de luminarias averiadas a través del módulo de alertas.',
    quadrant: 'Cuadrante 8-5',
    verifiedReferenceYear: '2026',
  },

  // 🟡 Precaución moderada (3 sectores de referencia)
  {
    id: 'sec-san-antonio-prado',
    name: 'San Antonio de Prado',
    level: 'moderate',
    levelLabel: 'Precaución moderada',
    coordinates: { lat: 6.1850, lng: -75.6560 },
    contextNote: 'Corregimiento periurbano de Medellín incluido como referencia comparativa; dinámicas mixtas rurales-urbanas con monitoreo preventivo.',
    historicalDiagnosis: 'Crecimiento habitacional acelerado; atención focalizada en corredores de movilidad y convivencia en urbanizaciones.',
    citizenAdvice: 'Utilizar el transporte intermunicipal autorizado y conservar precauciones estándar en zonas comerciales centrales.',
    quadrant: 'Sector Periurbano Ref.',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'sec-el-pesebre',
    name: 'El Pesebre',
    level: 'moderate',
    levelLabel: 'Precaución moderada',
    coordinates: { lat: 6.2730, lng: -75.5980 },
    contextNote: 'Sector de ladera occidental (Comuna 13) como referencia geográfica comparativa; niveles moderados de atención y programas comunitarios.',
    historicalDiagnosis: 'Fuerte inversión social y proyectos de consolidación comunitaria con patrullaje preventivo permanente.',
    citizenAdvice: 'Seguir rutas turísticas e institucionales autorizadas en caso de visitar el área y respetar la convivencia local.',
    quadrant: 'Sector Occidente Ref.',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'sec-la-america',
    name: 'La América',
    level: 'moderate',
    levelLabel: 'Precaución moderada',
    coordinates: { lat: 6.2530, lng: -75.6020 },
    contextNote: 'Sector comercial y residencial consolidado; atención a hurtos menores a personas y vehículos en corredores de alta afluencia.',
    historicalDiagnosis: 'Zona de alto flujo comercial con presencia policial constante, registrando principalmente delitos patrimoniales no violentos.',
    citizenAdvice: 'Estacionar vehículos en parqueaderos autorizados y proteger dispositivos móviles en paraderos.',
    quadrant: 'Sector Centro-Occidente Ref.',
    verifiedReferenceYear: '2026',
  },

  // 🟢 Zonas más transitadas/centrales (2 sectores)
  {
    id: 'sec-villa-hermosa-centro',
    name: 'Villa Hermosa (Centro)',
    level: 'central',
    levelLabel: 'Zona más transitada / Central',
    coordinates: { lat: 6.2558, lng: -75.5512 },
    contextNote: 'Núcleo cívico, comercial y de transporte de la Comuna 8. Mayor flujo de personas, presencia policial permanente y cámaras PTZ.',
    historicalDiagnosis: 'Punto neurálgico con comercio activo continuo, bancos, centros de salud y alta cobertura del sistema 123.',
    citizenAdvice: 'Corredor recomendado para trámites y traslados diurnos. Mantener precaución normal ante hurtos por descuido.',
    quadrant: 'Cuadrante 8-1 (Comando Central)',
    verifiedReferenceYear: '2026',
  },
  {
    id: 'sec-leon-de-greiff',
    name: 'Parque Biblioteca León de Greiff (La Ladera)',
    level: 'central',
    levelLabel: 'Zona más transitada / Central',
    coordinates: { lat: 6.2520, lng: -75.5460 },
    contextNote: 'Espacio cultural, recreativo y de encuentro comunitario emblemático. Gran afluencia diurna, iluminación renovada y oferta comunitaria.',
    historicalDiagnosis: 'Epicentro de programas educativos, culturales y de mediación juvenil con permanente vigilancia cívica e institucional.',
    citizenAdvice: 'Excelente punto de encuentro seguro durante el día y la tarde. Seguir los senderos iluminados hacia el transporte público.',
    quadrant: 'Cuadrante 8-1 (Zona Cultural)',
    verifiedReferenceYear: '2026',
  },
];

// Dark HUD custom style for Google Maps
const DARK_HUD_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0c1017' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c1017' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a889b' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f97316' }], // accent orange for localities
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#101d18' }], // dark muted green for parks
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#34d399' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e2638' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#131926' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2d1b28' }], // wine tint for highways
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#451224' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f59e0b' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#192338' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ef4444' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#070b12' }], // deep dark water
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#070b12' }],
  },
];

interface RiskMapScreenProps {
  onNavigateHome?: () => void;
  onNavigateDashboard?: () => void;
}

// Helper to calculate geographical distance in meters
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const normalizeSearchString = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function findMatchingSector(lat: number, lng: number, name: string, address: string): SectorRiskData | null {
  const combined = normalizeSearchString(`${name} ${address}`);

  // 1. Textual match: check if address/name contains any sector name
  for (const sector of COMUNA_8_SECTORS) {
    const normSector = normalizeSearchString(sector.name);
    if (normSector.length >= 4 && combined.includes(normSector)) {
      return sector;
    }
  }

  // 2. Spatial proximity match (< 450 meters)
  let closest: SectorRiskData | null = null;
  let minDistance = 450;

  for (const sector of COMUNA_8_SECTORS) {
    const dist = getDistanceMeters(lat, lng, sector.coordinates.lat, sector.coordinates.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = sector;
    }
  }

  return closest;
}

export const RiskMapScreen: React.FC<RiskMapScreenProps> = ({
  onNavigateHome,
  onNavigateDashboard,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const placesInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const placesLibRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const riskCirclesRef = useRef<google.maps.Circle[]>([]);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const searchMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // States
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'heat' | 'markers' | 'both'>('heat');
  const [selectedSector, setSelectedSector] = useState<SectorRiskData | null>(COMUNA_8_SECTORS[0]);
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  } | null>(null);
  const [placesSearchText, setPlacesSearchText] = useState<string>('');
  const [placesSuggestions, setPlacesSuggestions] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<'all' | RiskLevel>('all');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(14);

  // Initialize Map
  useEffect(() => {
    let isCancelled = false;

    async function initGoogleMap() {
      if (!mapContainerRef.current) return;

      try {
        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          v: 'weekly',
        });

        // Import required libraries using modern Places API (New)
        const { Map, Circle } = (await importLibrary('maps')) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;
        const { ColorScheme } = (await importLibrary('core')) as google.maps.CoreLibrary;
        const placesLib = (await importLibrary('places')) as any;
        placesLibRef.current = placesLib;

        if (isCancelled || !mapContainerRef.current) return;

        // Comuna 8 coordinates
        const COMUNA_8_CENTER = { lat: 6.2476, lng: -75.5658 };

        const map = new Map(mapContainerRef.current, {
          center: COMUNA_8_CENTER,
          zoom: 14,
          mapId: 'DEMO_MAP_ID', // required for AdvancedMarkerElement
          colorScheme: ColorScheme.DARK,
          styles: DARK_HUD_MAP_STYLES,
          disableDefaultUI: true, // we use custom HUD zoom & view buttons
          scrollwheel: false, // user requested: "Control de zoom con botones (sin scroll del mouse)"
          gestureHandling: 'cooperative',
          backgroundColor: '#0c1017',
          // Mandatory tracking attribution per SKILL.md
          // @ts-ignore
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        mapInstanceRef.current = map;

        // Track zoom
        map.addListener('zoom_changed', () => {
          const currentZoom = map.getZoom();
          if (currentZoom !== undefined) {
            setZoomLevel(currentZoom);
          }
        });

        // 1. Build Multi-ring Tactical Heat & Risk Zones
        const createdCircles: google.maps.Circle[] = [];

        COMUNA_8_SECTORS.forEach((sector) => {
          if (sector.level === 'high') {
            // High risk: Dense multi-layer radial thermal glow (Red core -> Orange radiant -> Yellow ambient)
            const innerCircle = new Circle({
              center: sector.coordinates,
              radius: 190,
              fillColor: '#dc2626',
              fillOpacity: 0.48,
              strokeColor: '#b91c1c',
              strokeOpacity: 0.85,
              strokeWeight: 1.5,
              map: map,
              clickable: true,
              zIndex: 3,
            });

            const midCircle = new Circle({
              center: sector.coordinates,
              radius: 360,
              fillColor: '#ea580c',
              fillOpacity: 0.24,
              strokeColor: '#c2410c',
              strokeOpacity: 0.45,
              strokeWeight: 1,
              map: map,
              clickable: true,
              zIndex: 2,
            });

            const outerCircle = new Circle({
              center: sector.coordinates,
              radius: 540,
              fillColor: '#eab308',
              fillOpacity: 0.10,
              strokeColor: '#ca8a04',
              strokeOpacity: 0.20,
              strokeWeight: 0.5,
              map: map,
              clickable: true,
              zIndex: 1,
            });

            [innerCircle, midCircle, outerCircle].forEach((c) => {
              c.addListener('click', () => {
                setSelectedSector(sector);
                setSearchedLocation(null);
                map.panTo(sector.coordinates);
              });
              createdCircles.push(c);
            });
          } else if (sector.level === 'moderate') {
            // Moderate risk: Yellow/Amber gradient glow
            const innerCircle = new Circle({
              center: sector.coordinates,
              radius: 170,
              fillColor: '#eab308',
              fillOpacity: 0.40,
              strokeColor: '#ca8a04',
              strokeOpacity: 0.75,
              strokeWeight: 1.5,
              map: map,
              clickable: true,
              zIndex: 3,
            });

            const outerCircle = new Circle({
              center: sector.coordinates,
              radius: 340,
              fillColor: '#f59e0b',
              fillOpacity: 0.15,
              strokeColor: '#d97706',
              strokeOpacity: 0.30,
              strokeWeight: 1,
              map: map,
              clickable: true,
              zIndex: 2,
            });

            [innerCircle, outerCircle].forEach((c) => {
              c.addListener('click', () => {
                setSelectedSector(sector);
                setSearchedLocation(null);
                map.panTo(sector.coordinates);
              });
              createdCircles.push(c);
            });
          } else {
            // Low risk / community nodes: Soft emerald/cyan radiant glow
            const innerCircle = new Circle({
              center: sector.coordinates,
              radius: 160,
              fillColor: '#10b981',
              fillOpacity: 0.35,
              strokeColor: '#059669',
              strokeOpacity: 0.70,
              strokeWeight: 1.5,
              map: map,
              clickable: true,
              zIndex: 3,
            });

            const outerCircle = new Circle({
              center: sector.coordinates,
              radius: 300,
              fillColor: '#34d399',
              fillOpacity: 0.12,
              strokeColor: '#10b981',
              strokeOpacity: 0.25,
              strokeWeight: 0.5,
              map: map,
              clickable: true,
              zIndex: 2,
            });

            [innerCircle, outerCircle].forEach((c) => {
              c.addListener('click', () => {
                setSelectedSector(sector);
                setSearchedLocation(null);
                map.panTo(sector.coordinates);
              });
              createdCircles.push(c);
            });
          }
        });

        riskCirclesRef.current = createdCircles;

        // 2. Build Markers for each sector
        const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

        COMUNA_8_SECTORS.forEach((sector) => {
          // Custom HTML element for HUD pin
          const pinContainer = document.createElement('div');
          pinContainer.className = 'group cursor-pointer select-none';

          const colorClasses =
            sector.level === 'high'
              ? 'bg-rose-950/90 text-rose-400 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
              : sector.level === 'moderate'
              ? 'bg-amber-950/90 text-amber-400 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-emerald-950/90 text-emerald-400 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]';

          const badgeDot =
            sector.level === 'high'
              ? 'bg-rose-500'
              : sector.level === 'moderate'
              ? 'bg-amber-400'
              : 'bg-emerald-400';

          pinContainer.innerHTML = `
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-semibold backdrop-blur-md transition-all duration-200 transform group-hover:scale-110 ${colorClasses}">
              <span class="w-2 h-2 rounded-full ${badgeDot} animate-pulse"></span>
              <span class="font-mono text-[11px] whitespace-nowrap">${sector.name}</span>
            </div>
          `;

          const marker = new AdvancedMarkerElement({
            map: null, // initially null in 'heat' mode
            position: sector.coordinates,
            title: `${sector.name} - ${sector.levelLabel}`,
            content: pinContainer,
          });

          marker.addListener('click', () => {
            setSelectedSector(sector);
            setSearchedLocation(null);
            map.panTo(sector.coordinates);
          });

          newMarkers.push(marker);
        });

        markersRef.current = newMarkers;

        setMapLoaded(true);
      } catch (err: any) {
        console.error('Error loading Google Maps:', err);
        setMapError(err?.message || 'Error al conectar con Google Maps Platform');
      }
    }

    initGoogleMap();

    return () => {
      isCancelled = true;
      riskCirclesRef.current.forEach((c) => {
        c.setMap(null);
      });
      markersRef.current.forEach((m) => {
        m.map = null;
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null;
      }
      if (searchMarkerRef.current) {
        searchMarkerRef.current.map = null;
      }
    };
  }, [GOOGLE_MAPS_API_KEY]);

  // Update view mode (Heatmap vs Markers vs Both)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const circles = riskCirclesRef.current;
    const markers = markersRef.current;

    if (!map) return;

    if (viewMode === 'heat') {
      circles.forEach((c) => c.setMap(map));
      markers.forEach((m) => (m.map = null));
    } else if (viewMode === 'markers') {
      circles.forEach((c) => c.setMap(null));
      markers.forEach((m) => (m.map = map));
    } else if (viewMode === 'both') {
      circles.forEach((c) => c.setMap(map));
      markers.forEach((m) => (m.map = map));
    }
  }, [viewMode, mapLoaded]);

  // Custom Zoom Controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const current = mapInstanceRef.current.getZoom() || 14;
      mapInstanceRef.current.setZoom(current + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const current = mapInstanceRef.current.getZoom() || 14;
      mapInstanceRef.current.setZoom(current - 1);
    }
  };

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: 6.2476, lng: -75.5658 });
      mapInstanceRef.current.setZoom(14);
    }
    setSelectedSector(COMUNA_8_SECTORS[0]);
    setSearchedLocation(null);
    setPlacesSearchText('');
    setPlacesSuggestions([]);
    setShowSuggestions(false);
    sessionTokenRef.current = null;
    if (searchMarkerRef.current) {
      searchMarkerRef.current.map = null;
      searchMarkerRef.current = null;
    }
  };

  // Google Places API (New): debounced Autocomplete suggestions
  useEffect(() => {
    const query = placesSearchText.trim();
    if (!query || query.length < 2 || !placesLibRef.current) {
      setPlacesSuggestions([]);
      setIsSearchingPlaces(false);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLibRef.current;
    if (!sessionTokenRef.current && AutocompleteSessionToken) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPlaces(true);
        const request: any = {
          input: query,
          includedRegionCodes: ['co'],
          locationBias: {
            west: -75.72,
            north: 6.38,
            east: -75.46,
            south: 6.12,
          },
        };
        if (sessionTokenRef.current) {
          request.sessionToken = sessionTokenRef.current;
        }

        if (AutocompleteSuggestion) {
          const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
          if (res && Array.isArray(res.suggestions)) {
            setPlacesSuggestions(res.suggestions);
            setShowSuggestions(true);
          }
        }
      } catch (err) {
        console.warn('Error fetching Places suggestions:', err);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [placesSearchText]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selection from Places API (New) predictions
  const handleSelectSuggestion = async (suggestion: any) => {
    try {
      setShowSuggestions(false);
      const placePrediction = suggestion.placePrediction;
      if (!placePrediction) return;

      const displayText =
        placePrediction.mainText?.text ||
        placePrediction.text?.toString() ||
        'Lugar en Medellín';
      setPlacesSearchText(displayText);

      const place = placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });

      // Reset session token after fetchFields as required by Places API (New)
      sessionTokenRef.current = null;

      if (!place.location || !mapInstanceRef.current) return;

      const lat = place.location.lat();
      const lng = place.location.lng();
      const placeName = place.displayName || displayText;
      const formattedAddress = place.formattedAddress || 'Medellín, Antioquia, Colombia';

      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(16);

      // Clean previous search marker
      if (searchMarkerRef.current) {
        searchMarkerRef.current.map = null;
      }

      // Tactical glowing cyan search beacon marker
      const searchPinEl = document.createElement('div');
      searchPinEl.className = 'relative flex items-center justify-center cursor-pointer select-none';
      searchPinEl.innerHTML = `
        <div class="absolute w-12 h-12 rounded-full bg-cyan-400/25 animate-ping pointer-events-none"></div>
        <div class="relative w-7 h-7 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_18px_#22d3ee] flex items-center justify-center text-slate-950 font-black text-xs">
          📍
        </div>
        <div class="absolute -bottom-6 bg-slate-900/95 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-400/60 whitespace-nowrap shadow-xl">
          ${placeName}
        </div>
      `;

      // @ts-ignore
      const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
      const marker = new AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: { lat, lng },
        title: placeName,
        content: searchPinEl,
      });

      searchMarkerRef.current = marker;

      // Check if matches one of the 18 monitored sectors
      const matched = findMatchingSector(lat, lng, placeName, formattedAddress);

      if (matched) {
        setSelectedSector(matched);
        setSearchedLocation(null);
      } else {
        setSelectedSector(null);
        setSearchedLocation({
          name: placeName,
          address: formattedAddress,
          coordinates: { lat, lng },
        });
      }
    } catch (err) {
      console.error('Error selecting place from Places API (New):', err);
    }
  };

  // User Geolocation with navigator.geolocation
  const handleGetCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const userCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(userCoords);

        const map = mapInstanceRef.current;
        if (!map) return;

        map.panTo(userCoords);
        map.setZoom(15);

        try {
          const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

          // Remove previous user marker
          if (userMarkerRef.current) {
            userMarkerRef.current.map = null;
          }

          // Create custom pulsing HUD user marker
          const userDot = document.createElement('div');
          userDot.className = 'relative flex items-center justify-center';
          userDot.innerHTML = `
            <div class="absolute w-8 h-8 rounded-full bg-cyan-500/25 animate-ping"></div>
            <div class="relative w-5 h-5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_15px_#22d3ee] flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
            </div>
            <div class="absolute -bottom-6 bg-slate-900/90 text-cyan-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/50 whitespace-nowrap shadow-md">
              Mi Ubicación
            </div>
          `;

          const marker = new AdvancedMarkerElement({
            map: map,
            position: userCoords,
            title: 'Mi Ubicación en tiempo real',
            content: userDot,
          });

          userMarkerRef.current = marker;
        } catch (e) {
          console.error('Error adding user marker:', e);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
        // Fallback friendly alert
        if (error.code === error.PERMISSION_DENIED) {
          alert('Permiso de geolocalización denegado en el navegador.');
        } else {
          alert('No fue posible obtener la ubicación GPS en este momento.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  // Normalization helper for diacritics and case-insensitive search
  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // Filtered sectors list with partial, accent-insensitive and multi-field matching
  const filteredSectors = useMemo(() => {
    const q = normalizeText(searchQuery);
    return COMUNA_8_SECTORS.filter((sector) => {
      const matchesSearch =
        !q ||
        normalizeText(sector.name).includes(q) ||
        normalizeText(sector.quadrant).includes(q) ||
        normalizeText(sector.contextNote).includes(q) ||
        normalizeText(sector.levelLabel).includes(q);
      const matchesLevel = filterLevel === 'all' || sector.level === filterLevel;
      return matchesSearch && matchesLevel;
    });
  }, [searchQuery, filterLevel]);

  const selectAndFocusSector = (sector: SectorRiskData) => {
    setSelectedSector(sector);
    setSearchedLocation(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(sector.coordinates);
      mapInstanceRef.current.setZoom(15);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 sm:space-y-7 px-2 sm:px-4 lg:px-6">
      {/* 1. Header & Navigation Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-500 tracking-wider uppercase mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-semibold">Módulo Geoespacial // Comuna 8 Medellín</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium">Google Maps Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Mapa de Riesgo y Prevención</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Monitoreo preventivo de sectores, termografía de concentración de riesgo y cuadrantes comunitarios de Villa Hermosa.
          </p>
        </div>

        {/* Action Controls & Navigation Shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateDashboard && (
            <button
              onClick={onNavigateDashboard}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors shadow-md"
            >
              Ir al Panel de Control
            </button>
          )}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors shadow-md"
            >
              Inicio
            </button>
          )}
        </div>
      </div>

      {/* 2. Mandatory Citizen Disclaimer Banner with enhanced breathing room */}
      <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 backdrop-blur-md shadow-xl shadow-black/20">
        <Info className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs sm:text-sm text-slate-200 leading-relaxed">
          <span className="font-bold text-amber-300">Aviso informativo de referencia comunitaria:</span>{' '}
          Los niveles mostrados son de referencia, basados en diagnósticos históricos y reportes públicos disponibles. Para información oficial y actualizada, consulta el{' '}
          <a
            href="https://www.medellin.gov.co/es/secretaria-seguridad-convivencia/sisc/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-300 font-bold underline hover:text-amber-200 inline-flex items-center gap-1"
          >
            SISC de la Alcaldía de Medellín
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 inline" />
          </a>
          . No constituye una calificación institucional vinculante ni un factor estigmatizante sobre los territorios.
        </div>
      </div>

      {/* 3. Main Tactical Map Display & 3-Column Independent Layout on Desktop (Map 60%, Ficha 20%, Explorador 20%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-10 gap-5 items-stretch">
        {/* Column 1: Interactive Map View & Controls (60% / 6 of 10 cols on XL) */}
        <div className="lg:col-span-2 xl:col-span-6 flex flex-col gap-3.5 h-auto xl:h-[76vh] xl:min-h-[640px] xl:max-h-[860px]">
          {/* Top Map Toolbar: Google Places Autocomplete Search & View Controls */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md shadow-lg shrink-0">
            {/* Real Places Search Input (Google Places API New Autocomplete for all of Medellín) */}
            <div ref={searchContainerRef} className="relative flex-1 min-w-[260px] max-w-full lg:max-w-[360px]">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={placesInputRef}
                id="input-places-autocomplete"
                type="text"
                autoComplete="off"
                placeholder="Buscar dirección o lugar en Medellín (ej. El Poblado, Laureles)..."
                value={placesSearchText}
                onFocus={() => {
                  if (placesSuggestions.length > 0) setShowSuggestions(true);
                }}
                onChange={(e) => setPlacesSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && placesSuggestions.length > 0) {
                    e.preventDefault();
                    handleSelectSuggestion(placesSuggestions[0]);
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                className="w-full bg-slate-950/90 border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/80 transition-colors shadow-inner"
              />
              {isSearchingPlaces && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                </div>
              )}
              {placesSearchText && (
                <button
                  type="button"
                  onClick={handleResetCenter}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 transition-colors"
                  title="Limpiar búsqueda de lugar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Tactical Dropdown Suggestions for Places API (New) */}
              {showSuggestions && placesSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/98 border border-cyan-500/50 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden divide-y divide-white/10 tactical-scrollbar max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-slate-950/90 text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between border-b border-white/10">
                    <span>Lugares sugeridos // Medellín</span>
                    <span className="text-slate-400">{placesSuggestions.length}</span>
                  </div>
                  {placesSuggestions.map((suggestion, idx) => {
                    const pred = suggestion.placePrediction;
                    const mainText = pred?.mainText?.text || pred?.text?.toString() || 'Ubicación';
                    const secondaryText = pred?.secondaryText?.text;

                    return (
                      <button
                        key={pred?.placeId || idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-cyan-950/50 flex items-start gap-2.5 transition-colors group cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-cyan-200">
                            {mainText}
                          </div>
                          {secondaryText && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {secondaryText}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Controls Group: View Mode Toggle & GPS */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-white/10">
                <button
                  id="btn-mode-heat"
                  onClick={() => setViewMode('heat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    viewMode === 'heat'
                      ? 'bg-rose-900/90 text-rose-100 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>Calor</span>
                </button>

                <button
                  id="btn-mode-markers"
                  onClick={() => setViewMode('markers')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    viewMode === 'markers'
                      ? 'bg-amber-900/90 text-amber-100 border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Marcadores</span>
                </button>

                <button
                  id="btn-mode-both"
                  onClick={() => setViewMode('both')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    viewMode === 'both'
                      ? 'bg-indigo-900/90 text-indigo-100 border border-indigo-500/60'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mostrar termografía y pines simultáneamente"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Híbrida</span>
                </button>
              </div>

              {/* Tactical Live Geolocation & Recenter */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-geolocation"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs sm:text-sm font-bold transition-all disabled:opacity-50 shadow-md"
                  title="Centrar en mi ubicación actual"
                >
                  {isLocating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span className="hidden md:inline">{isLocating ? 'Detectando...' : 'Mi ubicación'}</span>
                </button>

                <button
                  id="btn-recenter-comuna8"
                  onClick={handleResetCenter}
                  className="p-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors shadow-md"
                  title="Restablecer centro en Comuna 8"
                >
                  <Compass className="w-4 h-4 text-slate-300 hover:text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Map Canvas Container - Expands to fill Column 1 height */}
          <div className="relative w-full h-[520px] sm:h-[600px] xl:h-full xl:flex-1 rounded-2xl overflow-hidden border border-white/15 bg-[#0c1017] shadow-2xl">
            {/* Google Maps Mounted Div */}
            <div ref={mapContainerRef} className="w-full h-full" id="google-risk-map-canvas" />

            {/* Error Overlay if Map Fails */}
            {mapError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-30">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">Error al cargar Google Maps</h3>
                <p className="text-sm text-slate-300 max-w-md mb-4">{mapError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg"
                >
                  Reintentar conexión
                </button>
              </div>
            )}

            {/* Custom On-Map HUD Zoom Controls */}
            <div className="absolute bottom-5 right-5 z-10 flex flex-col gap-1.5 bg-slate-900/95 p-1.5 rounded-xl border border-white/20 backdrop-blur-md shadow-2xl">
              <button
                id="btn-zoom-in"
                onClick={handleZoomIn}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors active:scale-95 shadow"
                title="Acercar mapa (+)"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="h-[1px] bg-white/15 mx-1" />
              <button
                id="btn-zoom-out"
                onClick={handleZoomOut}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors active:scale-95 shadow"
                title="Alejar mapa (-)"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* High Contrast Thermal Palette Legend Overlay */}
            <div className="absolute bottom-5 left-5 z-10 bg-slate-900/95 px-4 py-3 rounded-2xl border border-white/20 backdrop-blur-md text-xs shadow-2xl hidden sm:block">
              <div className="font-mono text-xs uppercase text-slate-100 font-bold mb-1.5 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Termografía de Riesgo</span>
              </div>
              <div className="w-56 h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600 border border-white/30 mb-1.5" />
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-200 font-medium">Tránsito / Base</span>
                <span className="text-amber-300 font-bold">Moderado</span>
                <span className="text-rose-400 font-extrabold">Mayor atención</span>
              </div>
            </div>

            {/* Sector Quick Badge Count on Map Top-Left with High Contrast text */}
            <div className="absolute top-4 left-4 z-10 bg-slate-900/95 px-3.5 py-2 rounded-xl border border-white/20 backdrop-blur-md text-xs font-mono text-slate-100 flex items-center gap-2.5 shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-bold text-white">18 Sectores Monitoreados</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-300 font-extrabold">Zoom: {zoomLevel}x</span>
            </div>
          </div>
        </div>

        {/* Column 2: Ficha de Sector (20% / 2 of 10 cols on XL) */}
        <div className="lg:col-span-1 xl:col-span-2 flex flex-col h-auto xl:h-[76vh] xl:min-h-[640px] xl:max-h-[860px]">
          {selectedSector ? (
            <div className="bg-slate-900/95 border border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col h-full">
              {/* Tactical Wine/Burgundy Glow Accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-600/15 rounded-full blur-2xl pointer-events-none" />

              {/* Header & Sector Badge */}
              <div className="flex items-start justify-between gap-2 mb-3.5 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-0.5 truncate">
                    Ficha // {selectedSector.quadrant}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="truncate">{selectedSector.name}</span>
                  </h2>
                </div>

                {/* Level Badge */}
                <div
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    selectedSector.level === 'high'
                      ? 'bg-rose-950/90 text-rose-200 border-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.35)]'
                      : selectedSector.level === 'moderate'
                      ? 'bg-amber-950/90 text-amber-200 border-amber-500/70'
                      : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/70'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedSector.level === 'high'
                        ? 'bg-rose-500 animate-pulse'
                        : selectedSector.level === 'moderate'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span>{selectedSector.levelLabel}</span>
                </div>
              </div>

              {/* Scrollable Information Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 tactical-scrollbar">
                {/* Context Note with high legibility */}
                <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-3 sm:p-3.5 shadow-md">
                  <div className="text-xs sm:text-sm font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Nota de contexto territorial:</span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-normal text-slate-100 leading-relaxed">
                    {selectedSector.contextNote}
                  </p>
                </div>

                {/* Historical Public Diagnosis with high legibility */}
                <div>
                  <span className="text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider text-slate-200 block mb-1">
                    Diagnóstico de referencia pública:
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-100 font-normal bg-slate-950/75 p-3 rounded-xl border border-white/15 leading-relaxed">
                    {selectedSector.historicalDiagnosis}
                  </p>
                </div>

                {/* Citizen Advice with high legibility */}
                <div>
                  <span className="text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider text-emerald-300 block mb-1">
                    Pauta de cuidado para el ciudadano:
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-100 font-normal bg-slate-950/75 p-3 rounded-xl border border-emerald-500/30 leading-relaxed">
                    {selectedSector.citizenAdvice}
                  </p>
                </div>
              </div>

              {/* Coordinates and Centering Action */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2 mt-2 shrink-0">
                <span className="text-[11px] font-mono font-bold text-cyan-300 bg-slate-950/80 px-2 py-1 rounded-md border border-cyan-500/30 truncate">
                  GEO: {selectedSector.coordinates.lat.toFixed(3)}°, {selectedSector.coordinates.lng.toFixed(3)}°
                </span>
                <button
                  onClick={() => selectAndFocusSector(selectedSector)}
                  className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 rounded-lg border border-cyan-400/50 transition-all font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 shrink-0"
                >
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Centrar</span>
                </button>
              </div>
            </div>
          ) : searchedLocation ? (
            <div className="bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl relative overflow-hidden flex flex-col h-full">
              {/* Tactical Cyan Glow Accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

              {/* Header & Location Badge */}
              <div className="flex items-start justify-between gap-2 mb-3.5 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider mb-0.5 truncate">
                    Búsqueda // Medellín
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">{searchedLocation.name}</span>
                  </h2>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap flex items-center gap-1.5 shrink-0 bg-slate-800/90 text-cyan-200 border-cyan-500/40">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>Sin datos de riesgo</span>
                </div>
              </div>

              {/* Scrollable Information Body with tactical scrollbar */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 tactical-scrollbar">
                {/* Geocoded Address Card */}
                <div className="bg-slate-950/80 border border-cyan-500/40 rounded-xl p-3 sm:p-3.5 shadow-md">
                  <div className="text-xs sm:text-sm font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Lugar geolocalizado:</span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-normal text-slate-100 leading-relaxed">
                    {searchedLocation.address}
                  </p>
                </div>

                {/* Territorial boundary explanation */}
                <div className="bg-slate-950/75 p-3 sm:p-3.5 rounded-xl border border-white/15">
                  <span className="text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider text-slate-300 block mb-1">
                    Nota de cobertura comunitaria:
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-200 font-normal leading-relaxed">
                    Esta ubicación corresponde a un sector de Medellín situado fuera del polígono focalizado de la <strong className="text-cyan-300 font-bold">Comuna 8 (Villa Hermosa)</strong>. El mapa muestra el marcador de ubicación, pero no tiene diagnósticos territoriales de riesgo asociados por estar fuera del ámbito de los 18 sectores evaluados.
                  </p>
                </div>

                {/* General care advice */}
                <div className="bg-slate-950/75 p-3 sm:p-3.5 rounded-xl border border-emerald-500/30">
                  <span className="text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider text-emerald-300 block mb-1">
                    Pauta de autocuidado urbano:
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-200 font-normal leading-relaxed">
                    Utiliza corredores iluminados y vías principales, mantente alerta al entorno y acude al sistema integrado 123 ante cualquier novedad de seguridad o convivencia.
                  </p>
                </div>
              </div>

              {/* Coordinates and Centering Action */}
              <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2 mt-2 shrink-0">
                <span className="text-[11px] font-mono font-bold text-cyan-300 bg-slate-950/80 px-2 py-1 rounded-md border border-cyan-500/30 truncate">
                  GEO: {searchedLocation.coordinates.lat.toFixed(4)}°, {searchedLocation.coordinates.lng.toFixed(4)}°
                </span>
                <button
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo(searchedLocation.coordinates);
                      mapInstanceRef.current.setZoom(16);
                    }
                  }}
                  className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 rounded-lg border border-cyan-400/50 transition-all font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 shrink-0"
                >
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Centrar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 text-center text-slate-300 h-full flex flex-col items-center justify-center">
              <Crosshair className="w-10 h-10 text-cyan-400/70 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">Selecciona un sector o busca un lugar</p>
              <p className="text-xs text-slate-400 mt-1">Usa el buscador de lugares de Medellín o haz clic en el mapa para inspeccionar</p>
            </div>
          )}
        </div>

        {/* Column 3: Explorador de Sectores (20% / 2 of 10 cols on XL) - Complete 18 sectors with independent internal scroll */}
        <div className="lg:col-span-1 xl:col-span-2 flex flex-col h-auto xl:h-[76vh] xl:min-h-[640px] xl:max-h-[860px]">
          <div className="bg-slate-900/95 border border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl flex flex-col h-full overflow-hidden">
            {/* Header & Sector Count */}
            <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Explorador de Sectores</span>
              </h3>
              <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/10 shrink-0">
                {filteredSectors.length} / 18
              </span>
            </div>

            {/* Search Input with Clear Action */}
            <div className="relative mb-2.5 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar sector (ej. villa, sucre)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/90 border border-white/15 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Buttons (Horizontal Scroll if needed, compact) */}
            <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1 text-[11px] shrink-0 tactical-scrollbar">
              <button
                onClick={() => setFilterLevel('all')}
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors font-semibold ${
                  filterLevel === 'all'
                    ? 'bg-slate-700 text-white shadow'
                    : 'bg-slate-800/70 text-slate-300 hover:text-white'
                }`}
              >
                Todos (18)
              </button>
              <button
                onClick={() => setFilterLevel('high')}
                className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 font-semibold ${
                  filterLevel === 'high'
                    ? 'bg-rose-950 text-rose-200 border border-rose-500/60 shadow'
                    : 'bg-slate-800/70 text-rose-300 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Mayor (13)</span>
              </button>
              <button
                onClick={() => setFilterLevel('moderate')}
                className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 font-semibold ${
                  filterLevel === 'moderate'
                    ? 'bg-amber-950 text-amber-200 border border-amber-500/60 shadow'
                    : 'bg-slate-800/70 text-amber-300 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Mod. (3)</span>
              </button>
              <button
                onClick={() => setFilterLevel('central')}
                className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 font-semibold ${
                  filterLevel === 'central'
                    ? 'bg-emerald-950 text-emerald-200 border border-emerald-500/60 shadow'
                    : 'bg-slate-800/70 text-emerald-300 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Cent. (2)</span>
              </button>
            </div>

            {/* Scrollable Sector Cards List inside its own column */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 tactical-scrollbar">
              {filteredSectors.map((sector) => {
                const isSelected = selectedSector?.id === sector.id;
                const dotColor =
                  sector.level === 'high'
                    ? 'bg-rose-500'
                    : sector.level === 'moderate'
                    ? 'bg-amber-400'
                    : 'bg-emerald-400';

                return (
                  <button
                    key={sector.id}
                    onClick={() => selectAndFocusSector(sector)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400/90 text-white shadow-lg ring-1 ring-amber-400/40'
                        : 'bg-slate-950/60 border-white/10 text-slate-200 hover:bg-slate-800/70 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-bold truncate text-white">
                          {sector.name}
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono truncate">
                          {sector.quadrant}
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        isSelected ? 'text-amber-400 translate-x-0.5' : 'text-slate-500'
                      }`}
                    />
                  </button>
                );
              })}

              {filteredSectors.length === 0 && (
                <div className="py-6 text-center text-slate-300">
                  <p className="text-xs font-semibold">No se encontraron sectores.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterLevel('all');
                    }}
                    className="mt-1 text-[11px] font-bold text-cyan-400 hover:underline"
                  >
                    Restablecer búsqueda
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMapScreen;
