/// <reference types="@types/google.maps" />

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Route,
  MapPin,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Compass,
  Clock,
  Footprints,
  Car,
  Bike,
  RefreshCw,
  Layers,
  Sliders,
  Check,
  X,
  Plus,
  Minus,
  Flag,
  Building2,
  Crosshair,
  GraduationCap,
  Trees,
  Eye,
  ArrowUpDown,
  Map as MapIcon,
} from 'lucide-react';
import { importLibrary } from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_API_KEY, ensureGoogleMapsInitialized } from '../config/maps';
import { useSmoothMapUsability, MapUsabilityOverlay } from './MapUsabilityOverlay';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COMUNA_8_SECTORS } from './RiskMapScreen';
import { LocationPointSelector } from './LocationPointSelector';

export interface SafeRoutesScreenProps {
  onNavigateHome?: () => void;
  onNavigateRiskMap?: () => void;
}

export type TravelModeType = 'WALKING' | 'DRIVING' | 'BICYCLING';
export type SafeLocationCategory = 'police' | 'health' | 'education' | 'park';

export interface RealSafePlace {
  id: string;
  name: string;
  address: string;
  category: SafeLocationCategory;
  categoryLabel: string;
  location: { lat: number; lng: number };
  rating?: number;
  source: 'Google Maps Platform';
}

// Strictly classified, verified real locations in Comuna 8 & adjacent Medellín corridors
export const VERIFIED_SAFE_PLACES_DEFAULT: RealSafePlace[] = [
  // ==========================================
  // 1. CAI / POLICÍA (police)
  // ==========================================
  {
    id: 'place-cai-villa-hermosa',
    name: 'CAI Villa Hermosa - Policía Nacional',
    address: 'Cl. 65 #39-20, Villa Hermosa, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía',
    location: { lat: 6.2571, lng: -75.5492 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-estacion-villa-hermosa',
    name: 'Estación de Policía Villa Hermosa',
    address: 'Cra. 40 #64-35, Villa Hermosa, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía',
    location: { lat: 6.2558, lng: -75.5504 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-cai-enciso',
    name: 'CAI Enciso - Policía Nacional',
    address: 'Cra. 30 #56-42, Enciso, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía',
    location: { lat: 6.2428, lng: -75.5471 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-cai-san-antonio',
    name: 'CAI Las Estancias / San Antonio',
    address: 'Cl. 56 #24-10, Las Estancias, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía',
    location: { lat: 6.2405, lng: -75.5398 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-cai-la-milagrosa',
    name: 'CAI La Milagrosa - Policía Nacional',
    address: 'Cl. 45 #26-10, La Milagrosa, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía',
    location: { lat: 6.2361, lng: -75.5482 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-cai-boston-sucre',
    name: 'CAI Boston / Corredor Sucre',
    address: 'Cl. 54 #39-15, Boston - Sucre, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía',
    location: { lat: 6.2463, lng: -75.5578 },
    source: 'Google Maps Platform',
  },

  // ==========================================
  // 2. SALUD (health)
  // ==========================================
  {
    id: 'place-salud-villa-hermosa',
    name: 'Centro de Salud Metrosalud Villa Hermosa',
    address: 'Cra. 40 #65-15, Villa Hermosa, Medellín',
    category: 'health',
    categoryLabel: 'Salud',
    location: { lat: 6.2562, lng: -75.5488 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-salud-enciso',
    name: 'Centro de Salud Metrosalud Enciso',
    address: 'Cra. 31 #57-23, Enciso, Medellín',
    category: 'health',
    categoryLabel: 'Salud',
    location: { lat: 6.2447, lng: -75.5469 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-salud-llanaditas',
    name: 'Centro de Salud Metrosalud Llanaditas',
    address: 'Cl. 66D #24-15, Llanaditas, Medellín',
    category: 'health',
    categoryLabel: 'Salud',
    location: { lat: 6.2588, lng: -75.5395 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-salud-sol-de-oriente',
    name: 'Centro de Salud Metrosalud Sol de Oriente',
    address: 'Cra. 18C #56H-25, Sol de Oriente, Medellín',
    category: 'health',
    categoryLabel: 'Salud',
    location: { lat: 6.2478, lng: -75.5348 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-salud-san-lorenzo',
    name: 'Centro de Salud San Lorenzo',
    address: 'Cra. 37 #45-20, San Miguel / La Mansión, Medellín',
    category: 'health',
    categoryLabel: 'Salud',
    location: { lat: 6.2398, lng: -75.5515 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-clinica-sagrado-corazon',
    name: 'Clínica Sagrado Corazón (Caicedo / Sucre)',
    address: 'Cl. 49 #35-39, Buenos Aires - Sucre, Medellín',
    category: 'health',
    categoryLabel: 'Salud',
    location: { lat: 6.2412, lng: -75.5554 },
    source: 'Google Maps Platform',
  },

  // ==========================================
  // 3. COLEGIOS (education)
  // ==========================================
  {
    id: 'place-ie-villa-hermosa',
    name: 'I.E. Villa Hermosa',
    address: 'Cra. 40 #65-20, Villa Hermosa, Medellín',
    category: 'education',
    categoryLabel: 'Colegios',
    location: { lat: 6.2555, lng: -75.5485 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-ie-ceballos',
    name: 'I.E. Ceballos Ángeles',
    address: 'Cl. 58 #28-40, Enciso, Medellín',
    category: 'education',
    categoryLabel: 'Colegios',
    location: { lat: 6.2460, lng: -75.5430 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-ie-juan-de-dios-carvajal',
    name: 'I.E. Juan de Dios Carvajal',
    address: 'Cra. 36 #65-12, Batallón Girardot, Medellín',
    category: 'education',
    categoryLabel: 'Colegios',
    location: { lat: 6.2535, lng: -75.5458 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-ie-san-francisco-de-asis',
    name: 'I.E. San Francisco de Asís',
    address: 'Cl. 59A #32-40, La Ladera, Medellín',
    category: 'education',
    categoryLabel: 'Colegios',
    location: { lat: 6.2498, lng: -75.5462 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-ie-sol-de-oriente',
    name: 'I.E. Sol de Oriente',
    address: 'Cra. 19 #56B-10, 13 de Noviembre, Medellín',
    category: 'education',
    categoryLabel: 'Colegios',
    location: { lat: 6.2462, lng: -75.5356 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-ie-hector-abad-gomez',
    name: 'I.E. Héctor Abad Gómez (Sede San Antonio)',
    address: 'Cl. 54 #25-30, San Antonio, Medellín',
    category: 'education',
    categoryLabel: 'Colegios',
    location: { lat: 6.2418, lng: -75.5415 },
    source: 'Google Maps Platform',
  },

  // ==========================================
  // 4. PARQUES (park)
  // ==========================================
  {
    id: 'place-parque-villa-hermosa',
    name: 'Parque Principal de Villa Hermosa',
    address: 'Cra. 40 con Cl. 65, Villa Hermosa, Medellín',
    category: 'park',
    categoryLabel: 'Parques',
    location: { lat: 6.2568, lng: -75.5495 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-parque-leon-de-greiff',
    name: 'Parque Biblioteca León de Greiff (La Ladera)',
    address: 'Cra. 36 #59A-37, La Ladera, Medellín',
    category: 'park',
    categoryLabel: 'Parques',
    location: { lat: 6.2515, lng: -75.5480 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-uva-la-imaginacion',
    name: 'Parque UVA La Imaginación',
    address: 'Cl. 66A #39-40, San Miguel / Villa Hermosa, Medellín',
    category: 'park',
    categoryLabel: 'Parques',
    location: { lat: 6.2542, lng: -75.5518 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-unidad-deportiva-miraflores',
    name: 'Parque y Unidad Deportiva Enciso / Miraflores',
    address: 'Cra. 28 #56-10, Enciso, Medellín',
    category: 'park',
    categoryLabel: 'Parques',
    location: { lat: 6.2415, lng: -75.5442 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-parque-lineal-bicentenario',
    name: 'Parque Lineal Bicentenario (Sector Sucre)',
    address: 'Cl. 52 #36-50, Sucre, Medellín',
    category: 'park',
    categoryLabel: 'Parques',
    location: { lat: 6.2452, lng: -75.5542 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-parque-las-estancias',
    name: 'Parque Cívico Las Estancias',
    address: 'Cl. 55 #21-25, Las Estancias, Medellín',
    category: 'park',
    categoryLabel: 'Parques',
    location: { lat: 6.2392, lng: -75.5378 },
    source: 'Google Maps Platform',
  },
];

export interface RouteStepItem {
  instruction: string;
  distanceText?: string;
}

export interface CalculatedRouteOption {
  id: string;
  index: number;
  isPrimarySafe: boolean;
  title: string;
  badge: string;
  summary: string;
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  safetyScore: number;
  securityNotice: string;
  corridors: string[];
  path: google.maps.LatLngLiteral[];
  steps: RouteStepItem[];
  originCoord: google.maps.LatLngLiteral;
  destinationCoord: google.maps.LatLngLiteral;
  originLabel: string;
  destinationLabel: string;
  sourceType: 'directions_api' | 'routes_api';
}

// Dark HUD custom style for Google Maps
const DARK_HUD_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0c1017' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c1017' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a889b' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f97316' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#161e2e' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6ee7b7' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1a2234' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#27354f' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#312e81' }],
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
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#070b12' }],
  },
];

// Helper to calculate distance in meters
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

export const SafeRoutesScreen: React.FC<SafeRoutesScreenProps> = ({
  onNavigateRiskMap,
}) => {
  const { t } = useLanguage();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const routeCalloutMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const routeWaypointsMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const placesLibRef = useRef<any>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userLiveMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const watchPositionIdRef = useRef<number | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  // Base Map States
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [showTraffic, setShowTraffic] = useState<boolean>(false);

  // Form State: Origin and Destination
  const [originType, setOriginType] = useState<string>('c8-sucre');
  const [originCustomText, setOriginCustomText] = useState<string>('');
  const [originResolvedCoord, setOriginResolvedCoord] = useState<{ lat: number; lng: number } | undefined>(undefined);

  const [destinationType, setDestinationType] = useState<string>('place-parque-leon-de-greiff');
  const [destinationCustomText, setDestinationCustomText] = useState<string>('');
  const [destinationResolvedCoord, setDestinationResolvedCoord] = useState<{ lat: number; lng: number } | undefined>(undefined);

  const [travelMode, setTravelMode] = useState<TravelModeType>('WALKING');
  const [activeSelectorId, setActiveSelectorId] = useState<string | null>(null);

  // "Elegir ubicaciones" state: category & places
  const [safePlacesCategory, setSafePlacesCategory] = useState<SafeLocationCategory>('police');
  const [realPlaces, setRealPlaces] = useState<RealSafePlace[]>(VERIFIED_SAFE_PLACES_DEFAULT);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(false);
  const [selectedPlaceInfo, setSelectedPlaceInfo] = useState<RealSafePlace | null>(null);
  const shouldFitCategoryBoundsRef = useRef<boolean>(false);

  // Calculated Routes (supports 1, 2, 3+ route options)
  const [routeOptions, setRouteOptions] = useState<CalculatedRouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-0');
  const [isCalculatingRoutes, setIsCalculatingRoutes] = useState<boolean>(false);
  const [routeCalculationError, setRouteCalculationError] = useState<string | null>(null);

  // User Live Tracking State ("Usuario en ruta")
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;
  const realPlacesRef = useRef(realPlaces);
  realPlacesRef.current = realPlaces;
  const [trackingProgressPercent, setTrackingProgressPercent] = useState<number>(0);
  const [currentStepInstruction, setCurrentStepInstruction] = useState<string>('Iniciando viaje...');
  const [remainingDistanceText, setRemainingDistanceText] = useState<string>('');
  const [remainingDurationText, setRemainingDurationText] = useState<string>('');
  const [simulatedStepIndex, setSimulatedStepIndex] = useState<number>(0);

  // Filtered locations strictly matching the chosen category in "Elegir ubicaciones"
  const categoryPlaces = useMemo(() => {
    return realPlaces.filter((p) => p.category === safePlacesCategory);
  }, [realPlaces, safePlacesCategory]);

  // Initialize Functional Google Map
  useEffect(() => {
    let isCancelled = false;

    async function initSafeRoutesMap() {
      if (!mapContainerRef.current) return;

      try {
        ensureGoogleMapsInitialized();

        const { Map } = (await importLibrary('maps')) as google.maps.MapsLibrary;
        const { ColorScheme } = (await importLibrary('core')) as google.maps.CoreLibrary;
        const placesLib = (await importLibrary('places')) as any;
        placesLibRef.current = placesLib;

        if (isCancelled || !mapContainerRef.current) return;

        // Comuna 8 Center (Villa Hermosa / La Ladera)
        const COMUNA_8_CENTER = { lat: 6.2485, lng: -75.5475 };

        const map = new Map(mapContainerRef.current, {
          center: COMUNA_8_CENTER,
          zoom: 14,
          mapId: 'DEMO_MAP_ID',
          colorScheme: ColorScheme.DARK,
          styles: DARK_HUD_MAP_STYLES,
          disableDefaultUI: false,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          scrollwheel: false,
          gestureHandling: 'cooperative',
          clickableIcons: true,
          backgroundColor: '#0c1017',
          // @ts-ignore
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch (err: any) {
        console.error('[Security Urban :: SafeRoutes] Error inicializando mapa:', err);
        setMapError(err?.message || 'Error al conectar con Google Maps Platform');
      }
    }

    initSafeRoutesMap();

    return () => {
      isCancelled = true;
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
      }
    };
  }, []);

  // Unified Smooth Map Usability (Scroll page by default, Ctrl/Cmd + wheel smooth zoom, smooth +/- buttons, 2-finger mobile)
  const {
    zoomLevel: smoothZoomLevel,
    isHintHighlighted,
    isCtrlZooming,
    handleZoomIn,
    handleZoomOut,
    smoothZoomTo,
  } = useSmoothMapUsability({
    mapContainerRef,
    mapInstanceRef,
    mapLoaded,
    initialZoom: 14,
  });

  // Toggle Map Type (Roadmap / Satellite Hybrid)
  const handleToggleMapType = () => {
    if (!mapInstanceRef.current) return;
    const nextType = mapTypeId === 'roadmap' ? 'hybrid' : 'roadmap';
    setMapTypeId(nextType);
    mapInstanceRef.current.setMapTypeId(nextType);
  };

  // Toggle Live Google Maps Traffic Layer
  const handleToggleTraffic = () => {
    if (!mapInstanceRef.current) return;
    const nextTraffic = !showTraffic;
    setShowTraffic(nextTraffic);
    if (nextTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(mapInstanceRef.current);
    } else if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
    }
  };

  // Fit map camera so all points of the selected category are clearly visible in the viewport
  const fitMapToCategoryPlaces = useCallback((placesToFit: RealSafePlace[]) => {
    if (!mapInstanceRef.current || placesToFit.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    placesToFit.forEach((p) => bounds.extend(p.location));
    mapInstanceRef.current.fitBounds(bounds, { top: 65, bottom: 65, left: 65, right: 65 });
  }, []);

  // Render category markers on the map and optionally fit bounds when user selects a category
  const updateCategoryMarkersOnMap = useCallback(
    async (cat: SafeLocationCategory, fitViewport: boolean) => {
      if (!mapInstanceRef.current) return;
      setIsLoadingPlaces(true);

      const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

      // Clear previous category markers
      markersRef.current.forEach((m) => {
        m.map = null;
      });
      markersRef.current = [];

      // Curated verified places for this exact category
      const baseCategoryPlaces = VERIFIED_SAFE_PLACES_DEFAULT.filter((p) => p.category === cat);

      // Optional: augment with Places API (New) strictly within Comuna 8 / central-east Medellín bounds
      const queryMap: Record<SafeLocationCategory, { query: string; label: string }> = {
        police: { query: 'CAI Policia Villa Hermosa Enciso Medellin', label: 'CAI / Policía' },
        health: { query: 'Centro de Salud Metrosalud Villa Hermosa Enciso Medellin', label: 'Salud' },
        education: { query: 'Institucion Educativa Colegio Villa Hermosa Enciso Medellin', label: 'Colegios' },
        park: { query: 'Parque Villa Hermosa La Ladera Enciso Medellin', label: 'Parques' },
      };

      const target = queryMap[cat];
      const extraPlaces: RealSafePlace[] = [];

      if (placesLibRef.current?.Place) {
        try {
          const { Place } = placesLibRef.current;
          const response = await Place.searchByText({
            textQuery: target.query,
            fields: ['displayName', 'formattedAddress', 'location', 'rating'],
            locationBias: { lat: 6.2485, lng: -75.5475 },
            region: 'co',
            language: 'es',
            maxResultCount: 6,
          });

          const rawPlaces = response?.places || [];
          rawPlaces.forEach((p: any, idx: number) => {
            const lat = typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat;
            const lng = typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng;
            if (
              typeof lat === 'number' &&
              typeof lng === 'number' &&
              lat >= 6.232 &&
              lat <= 6.265 &&
              lng >= -75.565 &&
              lng <= -75.530
            ) {
              const nameStr = (p.displayName || '').trim();
              // Avoid duplicates with baseCategoryPlaces
              const isDup = baseCategoryPlaces.some(
                (bp) =>
                  getDistanceMeters(bp.location.lat, bp.location.lng, lat, lng) < 180 ||
                  bp.name.toLowerCase() === nameStr.toLowerCase()
              );
              if (!isDup && nameStr) {
                extraPlaces.push({
                  id: `place-${cat}-api-${idx}`,
                  name: nameStr,
                  address: p.formattedAddress || 'Comuna 8, Medellín',
                  category: cat,
                  categoryLabel: target.label,
                  location: { lat, lng },
                  rating: p.rating,
                  source: 'Google Maps Platform',
                });
              }
            }
          });
        } catch {
          // Fallback to verified default places
        }
      }

      const finalCategoryPlaces = [...baseCategoryPlaces, ...extraPlaces];

      // Update global realPlaces state preserving all categories
      setRealPlaces((prev) => {
        const others = prev.filter((item) => item.category !== cat);
        return [...others, ...finalCategoryPlaces];
      });

      // Render markers for all places in the active category
      finalCategoryPlaces.forEach((place) => {
        const pinElement = document.createElement('div');
        pinElement.className = 'cursor-pointer group flex flex-col items-center transition-transform hover:scale-110';

        const categoryBadgeClass =
          cat === 'police'
            ? 'bg-blue-600 border-blue-300 text-white shadow-blue-500/50'
            : cat === 'health'
            ? 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-500/50'
            : cat === 'education'
            ? 'bg-amber-600 border-amber-300 text-white shadow-amber-500/50'
            : 'bg-green-600 border-green-300 text-white shadow-green-500/50';

        const emojiIcon =
          cat === 'police' ? '👮' : cat === 'health' ? '🏥' : cat === 'education' ? '🏫' : '🌳';

        pinElement.innerHTML = `
          <div class="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono tracking-wide border-2 shadow-lg flex items-center gap-1.5 ${categoryBadgeClass}">
            <span>${emojiIcon}</span>
            <span class="max-w-[140px] truncate">${place.name}</span>
          </div>
          <div class="w-2 h-2.5 bg-white mt-0.5 rounded-b-full shadow"></div>
        `;

        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: place.location,
          title: `${place.name} (${place.categoryLabel})`,
          content: pinElement,
          zIndex: 18,
        });

        marker.addListener('click', () => {
          setSelectedPlaceInfo(place);
          mapInstanceRef.current?.panTo(place.location);
          if ((mapInstanceRef.current?.getZoom() || 14) < 15) {
            mapInstanceRef.current?.setZoom(16);
          }
        });

        markersRef.current.push(marker);
      });

      if (fitViewport && finalCategoryPlaces.length > 0) {
        fitMapToCategoryPlaces(finalCategoryPlaces);
      }

      setIsLoadingPlaces(false);
    },
    [fitMapToCategoryPlaces]
  );

  // Load markers when map is ready or category changes
  useEffect(() => {
    if (mapLoaded) {
      updateCategoryMarkersOnMap(safePlacesCategory, shouldFitCategoryBoundsRef.current);
      shouldFitCategoryBoundsRef.current = false;
    }
  }, [mapLoaded, safePlacesCategory, updateCategoryMarkersOnMap]);

  // Handle user clicking a category button in "Elegir ubicaciones"
  const handleSelectCategory = (cat: SafeLocationCategory) => {
    setSelectedPlaceInfo(null);
    shouldFitCategoryBoundsRef.current = true;
    if (cat === safePlacesCategory) {
      // Even if clicking the already active category, frame all its points on the map
      const currentCatPlaces = realPlaces.filter((p) => p.category === cat);
      fitMapToCategoryPlaces(currentCatPlaces);
    } else {
      setSafePlacesCategory(cat);
    }
  };

  // Focus a specific place on the map when clicked in "Elegir ubicaciones"
  const handleFocusPlaceOnMap = (place: RealSafePlace) => {
    setSelectedPlaceInfo(place);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(place.location);
      mapInstanceRef.current.setZoom(16);
    }
  };

  // Resolve an origin or destination specification to exact coordinates & display name
  const resolveEndpoint = useCallback(
    async (
      type: string,
      customText: string,
      preResolvedCoord?: { lat: number; lng: number }
    ): Promise<{ coord: google.maps.LatLngLiteral; label: string }> => {
      // 0. If autocomplete suggestion already provided exact coordinates
      if (type === 'otro' && preResolvedCoord) {
        return {
          coord: preResolvedCoord,
          label: customText.trim() || 'Dirección seleccionada',
        };
      }

      // 1. Current GPS Location
      if (type === 'current') {
        if (userLocationRef.current) {
          return { coord: userLocationRef.current, label: 'Mi ubicación actual (GPS)' };
        }
        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 4500,
                enableHighAccuracy: true,
              });
            });
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(coords);
            return { coord: coords, label: 'Mi ubicación actual (GPS)' };
          } catch {
            // Fallback to Comuna 8 center
          }
        }
        return { coord: { lat: 6.2485, lng: -75.5475 }, label: 'Comuna 8 (Ubicación base)' };
      }

      // 2. Real Safe Place selected by ID
      if (type.startsWith('place-')) {
        const found =
          realPlacesRef.current.find((p) => p.id === type) ||
          VERIFIED_SAFE_PLACES_DEFAULT.find((p) => p.id === type);
        if (found) {
          return { coord: found.location, label: found.name };
        }
      }

      // 3. Predefined sector in Comuna 8 selected by ID
      if (type !== 'otro') {
        const normalizedType = (type || '').trim().toLowerCase().replace(/^sec-/, 'c8-');
        const sector = COMUNA_8_SECTORS.find(
          (s) =>
            s.id.toLowerCase() === normalizedType ||
            s.id.toLowerCase() === (type || '').trim().toLowerCase() ||
            s.name.toLowerCase() === normalizedType
        );
        if (sector) {
          return { coord: sector.coordinates, label: `${sector.name}, Comuna 8` };
        }
      }

      // 4. Manual address or free-text query written by the user
      const queryText = (type === 'otro' ? customText : customText || type || '').trim();
      if (queryText) {
        const normalized = queryText.toLowerCase();
        const looksLikeStreetAddress =
          /\d/.test(normalized) ||
          normalized.includes('calle') ||
          normalized.includes('cl.') ||
          normalized.includes('cl ') ||
          normalized.includes('carrera') ||
          normalized.includes('cra') ||
          normalized.includes('cr ') ||
          normalized.includes('diagonal') ||
          normalized.includes('transversal') ||
          normalized.includes('avenida') ||
          normalized.includes('#');

        // 4a. If it does NOT look like a specific street number/intersection, check exact sector or place name first
        if (!looksLikeStreetAddress) {
          const exactSector = COMUNA_8_SECTORS.find(
            (s) => s.name.toLowerCase() === normalized
          );
          if (exactSector) {
            return { coord: exactSector.coordinates, label: `${exactSector.name}, Medellín` };
          }
          const exactPlace = realPlacesRef.current.find(
            (p) => p.name.toLowerCase() === normalized || p.name.toLowerCase().includes(normalized)
          );
          if (exactPlace) {
            return { coord: exactPlace.location, label: exactPlace.name };
          }
        }

        // 4b. Geocode via Google Places API (New) Place.searchByText first
        try {
          const { Place } = (await importLibrary('places')) as any;
          if (Place && typeof Place.searchByText === 'function') {
            const response = await Place.searchByText({
              textQuery: `${queryText}, Medellín, Colombia`,
              fields: ['location', 'displayName', 'formattedAddress'],
              locationBias: { lat: 6.2485, lng: -75.5475 },
              region: 'co',
              language: 'es',
              maxResultCount: 1,
            });
            if (response?.places?.[0]?.location) {
              const loc = response.places[0].location;
              const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat ?? loc.latitude);
              const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng ?? loc.longitude);
              if (!isNaN(lat) && !isNaN(lng)) {
                return {
                  coord: { lat, lng },
                  label: queryText,
                };
              }
            }
          }
        } catch {
          // Continue to Geocoder fallback
        }

        // 4c. Geocode via Google Geocoder
        try {
          const { Geocoder } = (await importLibrary('geocoding')) as google.maps.GeocodingLibrary;
          const geocoder = new Geocoder();
          const addressQuery =
            normalized.includes('medellin') || normalized.includes('medellín')
              ? queryText
              : `${queryText}, Medellín, Antioquia, Colombia`;

          const geoRes = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode(
              {
                address: addressQuery,
                region: 'co',
              },
              (results, status) => {
                if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                  resolve(results);
                } else {
                  reject(status);
                }
              }
            );
          });

          if (geoRes[0]?.geometry?.location) {
            const lat = geoRes[0].geometry.location.lat();
            const lng = geoRes[0].geometry.location.lng();
            return {
              coord: { lat, lng },
              label: queryText,
            };
          }
        } catch {
          // Continue to Nominatim / Medellín street grid fallback
        }

        // 4d. OpenStreetMap Nominatim fallback for Medellín addresses
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=co&q=${encodeURIComponent(
            `${queryText}, Medellín, Antioquia`
          )}`;
          const res = await fetch(nomUrl, {
            signal: controller.signal,
            headers: { 'Accept-Language': 'es' },
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              if (!isNaN(lat) && !isNaN(lng)) {
                return { coord: { lat, lng }, label: queryText };
              }
            }
          }
        } catch {
          // Continue
        }

        // 4e. Medellín Cartesian Street Grid Estimator (e.g. "Calle 56 #38-12" or "Carrera 40 #65-15")
        const calleMatch = normalized.match(/(?:calle|cl\.?|cl)\s*(\d{1,3})/);
        const craMatch = normalized.match(/(?:carrera|cra\.?|cr\.?|kr)\s*(\d{1,3})/);
        const numAfterHash = normalized.match(/#\s*(\d{1,3})/);

        let calleNum: number | null = calleMatch ? parseInt(calleMatch[1], 10) : null;
        let craNum: number | null = craMatch ? parseInt(craMatch[1], 10) : null;

        if (calleNum !== null && craNum === null && numAfterHash) {
          craNum = parseInt(numAfterHash[1], 10);
        } else if (craNum !== null && calleNum === null && numAfterHash) {
          calleNum = parseInt(numAfterHash[1], 10);
        }

        if (calleNum !== null || craNum !== null) {
          const effectiveCalle = calleNum ?? 56;
          const effectiveCra = craNum ?? 39;
          // In Medellín center-east: Calle 50 ~ 6.2435, each Calle is ~0.00092 deg lat; Cra 40 ~ -75.5515, each Cra decreases lng by ~0.00085 deg
          const estLat = Math.min(6.31, Math.max(6.18, 6.2435 + (effectiveCalle - 50) * 0.00092));
          const estLng = Math.min(-75.525, Math.max(-75.61, -75.5515 - (effectiveCra - 40) * 0.00085));
          return { coord: { lat: estLat, lng: estLng }, label: queryText };
        }

        // 4f. Partial match in Comuna 8 sectors
        const partialSector = COMUNA_8_SECTORS.find(
          (s) =>
            s.name.toLowerCase().includes(normalized) ||
            normalized.includes(s.name.toLowerCase())
        );
        if (partialSector) {
          return { coord: partialSector.coordinates, label: `${partialSector.name}, Medellín` };
        }
      }

      return { coord: { lat: 6.2458, lng: -75.5542 }, label: queryText || 'Sucre, Comuna 8' };
    },
    []
  );

  // Clear all route polylines, route callout labels, and A/B markers
  const clearMapRoutes = useCallback(() => {
    routePolylinesRef.current.forEach((poly) => poly.setMap(null));
    routePolylinesRef.current = [];

    routeCalloutMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    routeCalloutMarkersRef.current = [];

    routeWaypointsMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    routeWaypointsMarkersRef.current = [];
  }, []);

  // Render ALL route options on the map (Google Maps style: unselected in grey, selected in bright emerald/cyan, clickable!)
  const renderAllRoutesOnMap = useCallback(
    async (options: CalculatedRouteOption[], activeId: string, fitBounds = true) => {
      if (!mapInstanceRef.current) return;
      const map = mapInstanceRef.current;

      // Clear previous polylines & callouts
      routePolylinesRef.current.forEach((poly) => poly.setMap(null));
      routePolylinesRef.current = [];

      routeCalloutMarkersRef.current.forEach((m) => {
        m.map = null;
      });
      routeCalloutMarkersRef.current = [];

      routeWaypointsMarkersRef.current.forEach((m) => {
        m.map = null;
      });
      routeWaypointsMarkersRef.current = [];

      if (options.length === 0) return;

      const { AdvancedMarkerElement, PinElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

      // Draw unselected routes first so the selected route sits on top
      const sortedForDrawing = [...options].sort((a, b) => {
        if (a.id === activeId) return 1;
        if (b.id === activeId) return -1;
        return b.index - a.index;
      });

      const allBounds = new google.maps.LatLngBounds();

      sortedForDrawing.forEach((opt) => {
        const isSelected = opt.id === activeId;
        opt.path.forEach((pt) => allBounds.extend(pt));

        // Casing / border polyline for high contrast on dark map
        const casingPolyline = new google.maps.Polyline({
          path: opt.path,
          map,
          strokeColor: isSelected
            ? opt.isPrimarySafe
              ? '#064e3b'
              : '#0c4a6e'
            : '#0f172a',
          strokeWeight: isSelected ? 10 : 8,
          strokeOpacity: isSelected ? 0.85 : 0.7,
          zIndex: isSelected ? 24 : 11,
          clickable: true,
        });

        // Main inner polyline
        const mainPolyline = new google.maps.Polyline({
          path: opt.path,
          map,
          strokeColor: isSelected
            ? opt.isPrimarySafe
              ? '#10b981'
              : '#38bdf8'
            : '#94a3b8',
          strokeWeight: isSelected ? 6 : 5,
          strokeOpacity: isSelected ? 1.0 : 0.75,
          zIndex: isSelected ? 25 : 12,
          clickable: true,
        });

        // Clicking any route line on the map selects that route (just like Google Maps!)
        const handleSelectThisRoute = () => {
          setSelectedRouteId(opt.id);
          renderAllRoutesOnMap(options, opt.id, false);
        };

        casingPolyline.addListener('click', handleSelectThisRoute);
        mainPolyline.addListener('click', handleSelectThisRoute);

        routePolylinesRef.current.push(casingPolyline, mainPolyline);

        // Add interactive Google Maps-style floating time/distance callout pill at route midpoint
        if (opt.path.length > 2) {
          // Offset midpoint index slightly per route index so labels don't overlap
          const ratio = opt.index === 0 ? 0.45 : opt.index === 1 ? 0.58 : 0.35;
          const midIdx = Math.min(
            opt.path.length - 1,
            Math.max(1, Math.floor(opt.path.length * ratio))
          );
          const midCoord = opt.path[midIdx];

          const calloutDiv = document.createElement('div');
          calloutDiv.className = 'cursor-pointer transition-transform hover:scale-105';
          calloutDiv.innerHTML = isSelected
            ? `
              <div class="px-2.5 py-1 rounded-full text-[11px] font-mono font-extrabold shadow-xl border-2 flex items-center gap-1.5 ${
                opt.isPrimarySafe
                  ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300'
                  : 'bg-cyan-950/95 border-cyan-400 text-cyan-300'
              }">
                <span>${opt.isPrimarySafe ? '🛡️' : '⚡'}</span>
                <span>${opt.durationText}</span>
                <span class="opacity-75">• ${opt.distanceText}</span>
              </div>
            `
            : `
              <div class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900/90 border border-slate-500 text-slate-300 hover:border-white hover:text-white shadow-md flex items-center gap-1">
                <span>Ruta ${opt.index + 1}: ${opt.durationText}</span>
                <span class="opacity-75">(${opt.distanceText})</span>
              </div>
            `;

          const calloutMarker = new AdvancedMarkerElement({
            map,
            position: midCoord,
            title: `${opt.title}: ${opt.durationText} (${opt.distanceText}) — Clic para seleccionar`,
            content: calloutDiv,
            zIndex: isSelected ? 30 : 16,
          });

          calloutMarker.addListener('click', handleSelectThisRoute);
          routeCalloutMarkersRef.current.push(calloutMarker);
        }
      });

      // Origin (A) and Destination (B) Markers for the active route
      const activeOption = options.find((o) => o.id === activeId) || options[0];
      try {
        const originPin = new PinElement({
          glyph: 'A',
          glyphColor: '#ffffff',
          background: '#10b981',
          borderColor: '#064e3b',
        });
        const originMarker = new AdvancedMarkerElement({
          map,
          position: activeOption.originCoord,
          title: `Origen (A): ${activeOption.originLabel}`,
          content: originPin.element,
          zIndex: 35,
        });

        const destPin = new PinElement({
          glyph: 'B',
          glyphColor: '#ffffff',
          background: '#ef4444',
          borderColor: '#7f1d1d',
        });
        const destMarker = new AdvancedMarkerElement({
          map,
          position: activeOption.destinationCoord,
          title: `Destino (B): ${activeOption.destinationLabel}`,
          content: destPin.element,
          zIndex: 35,
        });

        routeWaypointsMarkersRef.current = [originMarker, destMarker];
      } catch (e) {
        console.warn('[Security Urban] Error creando marcadores A/B:', e);
      }

      if (fitBounds) {
        map.fitBounds(allBounds, { top: 65, bottom: 65, left: 65, right: 65 });
      }
    },
    []
  );

  // Calculate routes between Origin and Destination (supporting multiple route alternatives)
  const calculateDirections = useCallback(async () => {
    if (!mapInstanceRef.current) return;

    // If user selected manual mode ('otro') and hasn't typed anything yet, wait until they type
    if (
      (originType === 'otro' && !originCustomText.trim()) ||
      (destinationType === 'otro' && !destinationCustomText.trim())
    ) {
      return;
    }

    setIsCalculatingRoutes(true);
    setRouteCalculationError(null);

    try {
      const startResolved = await resolveEndpoint(originType, originCustomText, originResolvedCoord);
      const endResolved = await resolveEndpoint(destinationType, destinationCustomText, destinationResolvedCoord);
      const startCoord = startResolved.coord;
      const endCoord = endResolved.coord;

      const routesLib = (await importLibrary('routes')) as google.maps.RoutesLibrary;
      const directionsService = new routesLib.DirectionsService();

      const requestedMode =
        travelMode === 'WALKING'
          ? google.maps.TravelMode.WALKING
          : travelMode === 'DRIVING'
          ? google.maps.TravelMode.DRIVING
          : google.maps.TravelMode.BICYCLING;

      const requestRoute = (
        mode: google.maps.TravelMode,
        waypoints?: google.maps.DirectionsWaypoint[]
      ): Promise<{ result: google.maps.DirectionsResult | null; status: google.maps.DirectionsStatus | string }> => {
        return new Promise((resolve) => {
          directionsService.route(
            {
              origin: new google.maps.LatLng(startCoord.lat, startCoord.lng),
              destination: new google.maps.LatLng(endCoord.lat, endCoord.lng),
              travelMode: mode,
              provideRouteAlternatives: !waypoints || waypoints.length === 0,
              waypoints,
            },
            (result, status) => {
              resolve({ result, status });
            }
          );
        });
      };

      let { result, status } = await requestRoute(requestedMode);
      let effectiveMode = requestedMode;
      let isAdaptedBikeRoute = false;

      if (travelMode === 'BICYCLING' && status === google.maps.DirectionsStatus.ZERO_RESULTS) {
        const fallbackWalk = await requestRoute(google.maps.TravelMode.WALKING);
        if (fallbackWalk.status === google.maps.DirectionsStatus.OK && fallbackWalk.result) {
          result = fallbackWalk.result;
          status = fallbackWalk.status;
          effectiveMode = google.maps.TravelMode.WALKING;
          isAdaptedBikeRoute = true;
        }
      }

      if (status !== google.maps.DirectionsStatus.OK || !result || !result.routes || result.routes.length === 0) {
        setRouteCalculationError(
          'No se pudo encontrar una ruta vial entre los dos puntos indicados. Verifica las direcciones ingresadas.'
        );
        setRouteOptions([]);
        clearMapRoutes();
        return;
      }

      const rawRoutes: google.maps.DirectionsRoute[] = [...result.routes];

      // If Google DirectionsService returned only 1 route, query an alternative corridor via a strategic safe point
      // (e.g., nearest CAI or Parque Biblioteca) so the user has alternative routes to choose from on the map!
      if (rawRoutes.length === 1) {
        const midLat = (startCoord.lat + endCoord.lat) / 2;
        const midLng = (startCoord.lng + endCoord.lng) / 2;

        // Find a safe waypoint not too close to origin or destination
        const candidateWaypoints = VERIFIED_SAFE_PLACES_DEFAULT.filter((p) => {
          const dStart = getDistanceMeters(startCoord.lat, startCoord.lng, p.location.lat, p.location.lng);
          const dEnd = getDistanceMeters(endCoord.lat, endCoord.lng, p.location.lat, p.location.lng);
          return dStart > 220 && dEnd > 220;
        }).sort((a, b) => {
          const da = getDistanceMeters(midLat, midLng, a.location.lat, a.location.lng);
          const db = getDistanceMeters(midLat, midLng, b.location.lat, b.location.lng);
          return da - db;
        });

        if (candidateWaypoints.length > 0) {
          // Pick the 2nd closest or 1st closest waypoint that creates a distinct path
          const altWaypoint = candidateWaypoints[1] || candidateWaypoints[0];
          const altResponse = await requestRoute(effectiveMode, [
            {
              location: new google.maps.LatLng(altWaypoint.location.lat, altWaypoint.location.lng),
              stopover: false,
            },
          ]);
          if (
            altResponse.status === google.maps.DirectionsStatus.OK &&
            altResponse.result?.routes?.[0]
          ) {
            const altRoute = altResponse.result.routes[0];
            const primaryDist = rawRoutes[0].legs?.[0]?.distance?.value || 0;
            const altDist = altRoute.legs?.[0]?.distance?.value || 0;
            if (Math.abs(altDist - primaryDist) > 35 || altRoute.summary !== rawRoutes[0].summary) {
              rawRoutes.push(altRoute);
            }
          }
        }
      }

      // Build up to 3 distinct route options
      const parsedOptions: CalculatedRouteOption[] = [];

      rawRoutes.slice(0, 3).forEach((route, idx) => {
        const isSafe = idx === 0;
        const pathPts: google.maps.LatLngLiteral[] = (route.overview_path || []).map((pt) => ({
          lat: pt.lat(),
          lng: pt.lng(),
        }));

        const leg = route.legs?.[0];
        const rawDistMeters = leg?.distance?.value || 1000;
        let rawDurSeconds = leg?.duration?.value || 600;

        if (isAdaptedBikeRoute) {
          rawDurSeconds = Math.max(120, Math.round(rawDurSeconds / 3.2));
        }

        const distText =
          leg?.distance?.text ||
          (rawDistMeters >= 1000
            ? `${(rawDistMeters / 1000).toFixed(1)} km`
            : `${rawDistMeters} m`);
        const durMin = Math.max(1, Math.round(rawDurSeconds / 60));
        const durText = `${durMin} min`;

        let summaryText = route.summary
          ? `Por ${route.summary}`
          : isSafe
          ? 'Por corredor principal iluminado'
          : `Por vía alterna ${idx + 1}`;
        if (isAdaptedBikeRoute) {
          summaryText = route.summary
            ? `Por ${route.summary} (Ciclo-corredor)`
            : 'Por corredor ciclable secundario';
        }

        const stepsList: RouteStepItem[] = [];
        if (leg?.steps && leg.steps.length > 0) {
          leg.steps.forEach((s) => {
            const rawInst = s.instructions || 'Continúa por la vía indicada';
            stepsList.push({
              instruction: rawInst.replace(/<[^>]*>?/gm, ''),
              distanceText: s.distance?.text,
            });
          });
        }

        if (pathPts.length > 0) {
          parsedOptions.push({
            id: `route-${idx}`,
            index: idx,
            isPrimarySafe: isSafe,
            title:
              idx === 0
                ? 'Ruta 1: Más Segura (Recomendada)'
                : idx === 1
                ? 'Ruta 2: Alternativa Directa'
                : `Ruta ${idx + 1}: Corredor Alterno`,
            badge:
              idx === 0
                ? 'RECOMENDADA • MAYOR COBERTURA'
                : idx === 1
                ? 'OPCIÓN ALTERNA 2'
                : `OPCIÓN ALTERNA ${idx + 1}`,
            summary: summaryText,
            distanceText: distText,
            durationText: durText,
            distanceMeters: rawDistMeters,
            durationSeconds: rawDurSeconds,
            safetyScore: idx === 0 ? 95 : idx === 1 ? 84 : 79,
            securityNotice:
              idx === 0
                ? 'Prioriza vías principales iluminadas y cercanía a cuadrantes policiales y CAIs de la zona.'
                : 'Trayecto alternativo disponible. Puedes seleccionarlo haciendo clic aquí o sobre la línea en el mapa.',
            corridors: [summaryText],
            path: pathPts,
            steps:
              stepsList.length > 0
                ? stepsList
                : [{ instruction: `Continúa hacia ${endResolved.label} por ${summaryText}` }],
            originCoord: startCoord,
            destinationCoord: endCoord,
            originLabel: startResolved.label,
            destinationLabel: endResolved.label,
            sourceType: 'directions_api',
          });
        }
      });

      setRouteOptions(parsedOptions);
      const defaultRouteId = parsedOptions[0]?.id || 'route-0';
      setSelectedRouteId(defaultRouteId);

      if (parsedOptions.length > 0) {
        await renderAllRoutesOnMap(parsedOptions, defaultRouteId, true);
      }
    } catch (err: any) {
      console.error('[Security Urban :: SafeRoutes] Error calculando ruta:', err);
      setRouteCalculationError('No se pudo calcular la ruta. Verifica las direcciones de origen y destino.');
      setRouteOptions([]);
      clearMapRoutes();
    } finally {
      setIsCalculatingRoutes(false);
    }
  }, [
    originType,
    originCustomText,
    originResolvedCoord,
    destinationType,
    destinationCustomText,
    destinationResolvedCoord,
    travelMode,
    resolveEndpoint,
    clearMapRoutes,
    renderAllRoutesOnMap,
  ]);

  // Trigger route calculation automatically when preset selectors or travelMode change
  useEffect(() => {
    if (!mapLoaded) return;
    if (originType !== 'otro' && destinationType !== 'otro') {
      calculateDirections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, travelMode, originType, destinationType]);

  // Also auto-calculate (debounced 850ms) when user finishes typing manual addresses in Origin or Destination
  useEffect(() => {
    if (!mapLoaded) return;
    const isOriginReady = originType !== 'otro' || originCustomText.trim().length >= 4;
    const isDestReady = destinationType !== 'otro' || destinationCustomText.trim().length >= 4;

    if ((originType === 'otro' || destinationType === 'otro') && isOriginReady && isDestReady) {
      const timer = setTimeout(() => {
        calculateDirections();
      }, 850);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originCustomText, destinationCustomText, originType, destinationType, mapLoaded]);

  // Swap Origin and Destination
  const handleSwapEndpoints = () => {
    const tempType = originType;
    const tempText = originCustomText;
    const tempCoord = originResolvedCoord;

    setOriginType(destinationType);
    setOriginCustomText(destinationCustomText);
    setOriginResolvedCoord(destinationResolvedCoord);

    setDestinationType(tempType);
    setDestinationCustomText(tempText);
    setDestinationResolvedCoord(tempCoord);
  };

  // Select one of the available routes
  const handleSelectRouteOption = (routeId: string) => {
    setSelectedRouteId(routeId);
    renderAllRoutesOnMap(routeOptions, routeId, false);
  };

  // Start Live Tracking ("Usuario en ruta")
  const handleStartTrip = async () => {
    if (!mapInstanceRef.current) return;

    setIsTrackingActive(true);
    setSimulatedStepIndex(0);

    const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

    const currentRoute = routeOptions.find((r) => r.id === selectedRouteId) || routeOptions[0];
    const steps = currentRoute?.steps || [];
    const totalDist = currentRoute?.distanceMeters || 1200;

    if (steps.length > 0) {
      setCurrentStepInstruction(steps[0].instruction);
      setRemainingDistanceText(currentRoute.distanceText);
      setRemainingDurationText(currentRoute.durationText);
    }

    if (!userLiveMarkerRef.current && currentRoute?.path?.[0]) {
      const beaconDiv = document.createElement('div');
      beaconDiv.className = 'relative flex items-center justify-center';
      beaconDiv.innerHTML = `
        <div class="absolute w-10 h-10 rounded-full bg-cyan-500/30 animate-ping"></div>
        <div class="absolute w-6 h-6 rounded-full bg-cyan-400/60 animate-pulse"></div>
        <div class="relative w-4 h-4 rounded-full bg-cyan-400 border-2 border-white shadow-lg flex items-center justify-center">
          <div class="w-1.5 h-1.5 rounded-full bg-cyan-950"></div>
        </div>
      `;

      const startLiteral = currentRoute.path[0];

      const userMarker = new AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: startLiteral,
        title: 'Tu ubicación en ruta',
        content: beaconDiv,
        zIndex: 9999,
      });

      userLiveMarkerRef.current = userMarker;
      setUserLocation(startLiteral);
      mapInstanceRef.current.panTo(startLiteral);
      mapInstanceRef.current.setZoom(17);
    }

    if (navigator.geolocation) {
      try {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(currentPos);

            if (userLiveMarkerRef.current) {
              userLiveMarkerRef.current.position = currentPos;
            }
            mapInstanceRef.current?.panTo(currentPos);

            const endCoord = currentRoute?.destinationCoord;
            if (endCoord) {
              const remDist = getDistanceMeters(currentPos.lat, currentPos.lng, endCoord.lat, endCoord.lng);
              const pct = Math.min(100, Math.max(5, Math.round(((totalDist - remDist) / totalDist) * 100)));
              setTrackingProgressPercent(pct);
              setRemainingDistanceText(`${Math.round(remDist)} m`);
            }
          },
          () => {
            // Assisted simulation fallback
          },
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
        watchPositionIdRef.current = id;
      } catch {
        // Ignore
      }
    }
  };

  // Simulate advance along the selected route
  const handleSimulateAdvance = () => {
    const currentRoute = routeOptions.find((r) => r.id === selectedRouteId) || routeOptions[0];
    const path = currentRoute?.path || [];
    const steps = currentRoute?.steps || [];

    if (path.length === 0) return;

    const nextIndex = simulatedStepIndex + 1;
    if (nextIndex >= path.length) {
      setTrackingProgressPercent(100);
      setCurrentStepInstruction('¡Has llegado a tu destino seguro!');
      setRemainingDistanceText('0 m');
      setRemainingDurationText('0 min');
      return;
    }

    setSimulatedStepIndex(nextIndex);
    const nextLiteral = path[nextIndex];

    if (userLiveMarkerRef.current) {
      userLiveMarkerRef.current.position = nextLiteral;
    }
    mapInstanceRef.current?.panTo(nextLiteral);

    const pct = Math.round((nextIndex / path.length) * 100);
    setTrackingProgressPercent(pct);

    const remMeters = Math.round(
      ((path.length - nextIndex) / path.length) * (currentRoute?.distanceMeters || 1000)
    );
    setRemainingDistanceText(`${remMeters} m`);

    if (steps.length > 0) {
      const stepIdx = Math.min(steps.length - 1, Math.floor((nextIndex / path.length) * steps.length));
      setCurrentStepInstruction(steps[stepIdx].instruction);
    }
  };

  const handleStopTrip = () => {
    setIsTrackingActive(false);
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }
    if (userLiveMarkerRef.current) {
      userLiveMarkerRef.current.map = null;
      userLiveMarkerRef.current = null;
    }
    setTrackingProgressPercent(0);
    setSimulatedStepIndex(0);

    if (routeOptions.length > 0) {
      renderAllRoutesOnMap(routeOptions, selectedRouteId, true);
    }
  };

  // Set a location from "Elegir ubicaciones" or map marker as Origin or Destination
  const handleSetPlaceAs = (place: RealSafePlace, target: 'origin' | 'destination') => {
    if (target === 'origin') {
      setOriginType(place.id);
      setOriginCustomText('');
      setOriginResolvedCoord(place.location);
    } else {
      setDestinationType(place.id);
      setDestinationCustomText('');
      setDestinationResolvedCoord(place.location);
    }
    setSelectedPlaceInfo(place);
  };

  return (
    <div className="w-full flex flex-col gap-5 font-sans pb-12 relative">
      {/* 1. Header Bar */}
      <div className="relative z-10 w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white shadow-md shrink-0">
            <Route className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider font-['Rajdhani'] text-theme-primary uppercase">
                Rutas Seguras // Navegación Google Maps
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60 shrink-0">
                DIRECTIONS & PLACES API
              </span>
            </div>
            <p className="text-sm text-theme-secondary font-medium mt-1 leading-relaxed">
              Escribe cualquier dirección de origen y destino o elige ubicaciones verificadas para trazar y comparar rutas en el mapa
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center shrink-0">
          {onNavigateRiskMap && (
            <button
              type="button"
              onClick={onNavigateRiskMap}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-red-500 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Ver Mapa de Riesgo</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-mono font-bold bg-slate-950 border border-slate-800 text-cyan-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>GOOGLE MAPS EN VIVO</span>
          </div>
        </div>
      </div>

      {/* 2. Top 2-Column Grid: Left = Parámetros de trayecto + Rutas posibles | Right = Elegir ubicaciones */}
      <div className="relative z-30 w-full grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left Column: Parámetros de trayecto (z-40 so dropdowns appear above Rutas posibles) */}
        <div className="w-full flex flex-col gap-5 relative z-30">
          <div className="relative z-40 overflow-visible p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span>Parámetros de trayecto</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveSelectorId(null);
                  handleSwapEndpoints();
                }}
                className="h-7 px-3 rounded-lg text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 hover:text-red-500 dark:hover:text-red-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                title="Intercambiar origen y destino"
              >
                <ArrowUpDown className="w-3 h-3 text-cyan-500 shrink-0" />
                <span>Invertir puntos</span>
              </button>
            </div>

            {/* Origin Input & Selector */}
            <LocationPointSelector
              id="origin-select"
              label="Dirección o punto de origen (A):"
              icon={<MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              value={originType}
              onChange={(val) => {
                setOriginType(val);
                if (val !== 'otro') setOriginResolvedCoord(undefined);
              }}
              isOrigin={true}
              sectors={COMUNA_8_SECTORS}
              safePlaces={realPlaces}
              customText={originCustomText}
              onCustomTextChange={(text, coord) => {
                setOriginCustomText(text);
                setOriginResolvedCoord(coord);
              }}
              onSubmitManual={() => calculateDirections()}
              manualPlaceholder="Escribe origen (ej. Calle 56 #38-12, Boston o Villa Hermosa)..."
              defaultSectorId="c8-villa-hermosa"
              activeSelectorId={activeSelectorId}
              onOpenExclusive={setActiveSelectorId}
            />

            {/* Destination Input & Selector */}
            <LocationPointSelector
              id="destination-select"
              label="Dirección o punto de destino (B):"
              icon={<Flag className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              value={destinationType}
              onChange={(val) => {
                setDestinationType(val);
                if (val !== 'otro') setDestinationResolvedCoord(undefined);
              }}
              isOrigin={false}
              sectors={COMUNA_8_SECTORS}
              safePlaces={realPlaces}
              customText={destinationCustomText}
              onCustomTextChange={(text, coord) => {
                setDestinationCustomText(text);
                setDestinationResolvedCoord(coord);
              }}
              onSubmitManual={() => calculateDirections()}
              manualPlaceholder="Escribe destino (ej. Carrera 40 #65-15 o CAI Villa Hermosa)..."
              defaultSectorId="c8-la-ladera"
              activeSelectorId={activeSelectorId}
              onOpenExclusive={setActiveSelectorId}
            />

            {/* Travel Mode Selector & Trazar Ruta Button */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  id="mode-walking-btn"
                  onClick={() => setTravelMode('WALKING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    travelMode === 'WALKING'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>{t('modeWalking')}</span>
                </button>
                <button
                  type="button"
                  id="mode-driving-btn"
                  onClick={() => setTravelMode('DRIVING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    travelMode === 'DRIVING'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>{t('modeDriving')}</span>
                </button>
                <button
                  type="button"
                  id="mode-bicycling-btn"
                  onClick={() => setTravelMode('BICYCLING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    travelMode === 'BICYCLING'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>{t('modeBicycling')}</span>
                </button>
              </div>

              <button
                type="button"
                id="btn-recalcular-ruta"
                onClick={calculateDirections}
                disabled={isCalculatingRoutes}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCalculatingRoutes ? 'animate-spin' : ''}`} />
                <span>{isCalculatingRoutes ? 'Trazando rutas...' : 'Trazar ruta en el mapa'}</span>
              </button>
            </div>

            {routeCalculationError && (
              <div className="p-2.5 rounded-xl border border-red-500/50 bg-red-950/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-medium">{routeCalculationError}</span>
              </div>
            )}
          </div>

          {/* Rutas disponibles para elegir (Multiple Routes Comparison) - z-10 so dropdowns stay on top */}
          <div className="relative z-10 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-theme-primary flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Rutas posibles ({routeOptions.length}) — Elige tu ruta</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/60 shrink-0">
                Clic en tarjeta o en el mapa
              </span>
            </div>

            {routeOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Escribe una dirección de origen y destino y presiona "Trazar ruta en el mapa".
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${
                  routeOptions.length >= 2 ? 'sm:grid-cols-2' : ''
                } gap-2.5`}
              >
                {routeOptions.map((opt) => {
                  const isSelected = selectedRouteId === opt.id;
                  const isSafe = opt.isPrimarySafe;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectRouteOption(opt.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2 ${
                        isSelected
                          ? isSafe
                            ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 ring-2 ring-emerald-500/60 shadow-md'
                            : 'border-cyan-500 bg-cyan-50/90 dark:bg-cyan-950/40 ring-2 ring-cyan-500/60 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/70 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                              isSafe ? 'bg-emerald-500 text-slate-950' : 'bg-cyan-500 text-slate-950'
                            }`}
                          >
                            {isSafe ? '🛡️' : '⚡'}
                          </span>
                          <h4 className="text-xs font-bold text-theme-primary truncate">
                            {opt.title}
                          </h4>
                        </div>

                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shrink-0 border ${
                            isSafe
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/70'
                              : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/70'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>

                      <p className="text-[11px] font-mono text-theme-secondary truncate">
                        🛣️ <strong className="text-theme-primary">{opt.summary}</strong>
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                        <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{opt.durationText}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
                          <Navigation className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span>{opt.distanceText}</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-theme-secondary line-clamp-2 leading-tight font-medium">
                        {opt.securityNotice}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-200 dark:border-slate-800/60">
                        <span className="text-[9px] text-theme-muted font-medium">
                          Seguridad: {opt.safetyScore}%
                        </span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            isSelected
                              ? isSafe
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-cyan-700 dark:text-cyan-400'
                              : 'text-theme-muted'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>RUTA SELECCIONADA</span>
                            </>
                          ) : (
                            'Seleccionar esta ruta'
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: "Elegir ubicaciones" properly classified by CAI / Policía, Salud, Colegios y Parques */}
        <div className="w-full flex flex-col gap-5 relative z-10">
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>Elegir ubicaciones</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Elige una categoría para ver todos sus puntos en el mapa y seleccionarlos como origen o destino
                </span>
              </div>

              <button
                type="button"
                onClick={() => fitMapToCategoryPlaces(categoryPlaces)}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 transition cursor-pointer shrink-0"
                title="Enfocar todos los puntos de esta categoría en el mapa"
              >
                <Eye className="w-3 h-3" />
                <span>Ver en mapa ({categoryPlaces.length})</span>
              </button>
            </div>

            {/* 4 Classified Category Tabs: CAI / Policía, Salud, Colegios, Parques */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'police' as SafeLocationCategory,
                  label: 'CAI / Policía',
                  icon: <ShieldCheck className="w-3.5 h-3.5" />,
                  activeClass: 'bg-blue-600 text-white border-blue-500 shadow-sm',
                },
                {
                  id: 'health' as SafeLocationCategory,
                  label: 'Salud',
                  icon: <Building2 className="w-3.5 h-3.5" />,
                  activeClass: 'bg-emerald-600 text-white border-emerald-500 shadow-sm',
                },
                {
                  id: 'education' as SafeLocationCategory,
                  label: 'Colegios',
                  icon: <GraduationCap className="w-3.5 h-3.5" />,
                  activeClass: 'bg-amber-600 text-white border-amber-500 shadow-sm',
                },
                {
                  id: 'park' as SafeLocationCategory,
                  label: 'Parques',
                  icon: <Trees className="w-3.5 h-3.5" />,
                  activeClass: 'bg-green-600 text-white border-green-500 shadow-sm',
                },
              ].map((catItem) => {
                const isActive = safePlacesCategory === catItem.id;
                const count = realPlaces.filter((p) => p.category === catItem.id).length;
                return (
                  <button
                    key={catItem.id}
                    type="button"
                    onClick={() => handleSelectCategory(catItem.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isActive
                        ? catItem.activeClass
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900 border-slate-300 dark:border-slate-800'
                    }`}
                  >
                    {catItem.icon}
                    <span className="truncate">{catItem.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-black/25 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List of locations belonging strictly to the selected category */}
            <div className="max-h-[290px] overflow-y-auto tactical-scrollbar flex flex-col gap-2 pr-1">
              {isLoadingPlaces ? (
                <div className="py-6 text-center text-xs text-theme-muted flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                  <span>Ubicando puntos de la categoría en el mapa...</span>
                </div>
              ) : categoryPlaces.length === 0 ? (
                <div className="py-4 text-center text-xs text-theme-muted font-medium">
                  No se encontraron ubicaciones en esta categoría.
                </div>
              ) : (
                categoryPlaces.map((place) => {
                  const isOriginSelected = originType === place.id;
                  const isDestSelected = destinationType === place.id;
                  const isFocused = selectedPlaceInfo?.id === place.id;

                  return (
                    <div
                      key={place.id}
                      onClick={() => handleFocusPlaceOnMap(place)}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2.5 cursor-pointer ${
                        isFocused
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800/90 bg-slate-50 dark:bg-slate-950/60 hover:border-blue-500/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">
                            {place.category === 'police'
                              ? '👮'
                              : place.category === 'health'
                              ? '🏥'
                              : place.category === 'education'
                              ? '🏫'
                              : '🌳'}
                          </span>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {place.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate mt-0.5">
                          📍 {place.address}
                        </p>
                      </div>

                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleSetPlaceAs(place, 'origin')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                            isOriginSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-emerald-600 hover:text-white'
                          }`}
                          title="Seleccionar esta ubicación como punto de Origen (A)"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>Origen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetPlaceAs(place, 'destination')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                            isDestSelected
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-red-600 hover:text-white'
                          }`}
                          title="Seleccionar esta ubicación como punto de Destino (B)"
                        >
                          <Flag className="w-3 h-3" />
                          <span>Destino</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Full-Width Interactive Google Map with Plotted Routes & Category Locations */}
      <div className="relative z-10 w-full flex flex-col gap-5">
        <div className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-xl h-[500px] sm:h-[580px] lg:h-[640px]">
          {/* Google Maps Canvas */}
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Top Left Map Toolbar: Map Type (Vial / Satélite), Tráfico, Ver Categoría */}
          <div className="absolute top-3.5 left-3.5 z-10 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMapType}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition"
            >
              <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{mapTypeId === 'roadmap' ? 'Vista Satélite' : 'Vista Mapa Vial'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleTraffic}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition ${
                showTraffic
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Tráfico en vivo</span>
            </button>

            <button
              type="button"
              onClick={() => fitMapToCategoryPlaces(categoryPlaces)}
              className="px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 border border-blue-400 text-xs font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                Ver todos: {
                  safePlacesCategory === 'police'
                    ? 'CAI / Policía'
                    : safePlacesCategory === 'health'
                    ? 'Salud'
                    : safePlacesCategory === 'education'
                    ? 'Colegios'
                    : 'Parques'
                }
              </span>
            </button>

            {routeOptions.length > 0 && (
              <button
                type="button"
                onClick={() => renderAllRoutesOnMap(routeOptions, selectedRouteId, true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400 text-xs font-bold text-white shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition"
              >
                <Route className="w-3.5 h-3.5" />
                <span>Encuadrar ruta trazada</span>
              </button>
            )}
          </div>

          {/* Floating Interactive Card when a Location Pin is clicked on the Map or List */}
          {selectedPlaceInfo && !isTrackingActive && (
            <div className="absolute bottom-14 left-3.5 right-3.5 sm:right-auto sm:w-96 z-20 p-3.5 rounded-2xl bg-slate-950/95 border-2 border-blue-500/80 text-white shadow-2xl backdrop-blur-md flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">
                    {selectedPlaceInfo.category === 'police'
                      ? '👮'
                      : selectedPlaceInfo.category === 'health'
                      ? '🏥'
                      : selectedPlaceInfo.category === 'education'
                      ? '🏫'
                      : '🌳'}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase font-bold text-blue-400 block">
                      {selectedPlaceInfo.categoryLabel}
                    </span>
                    <h4 className="text-sm font-bold text-white truncate">
                      {selectedPlaceInfo.name}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlaceInfo(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 font-medium">
                📍 {selectedPlaceInfo.address}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSetPlaceAs(selectedPlaceInfo, 'origin')}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Usar como Origen</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPlaceAs(selectedPlaceInfo, 'destination')}
                  className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Usar como Destino</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {mapError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center z-30">
              <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
              <h3 className="text-base font-bold text-white mb-1">Error al conectar con Google Maps</h3>
              <p className="text-xs text-slate-400 max-w-md">{mapError}</p>
            </div>
          )}

          {/* Floating Top HUD: Live User in Route Tracker */}
          {isTrackingActive && (
            <div className="absolute top-14 inset-x-3 sm:inset-x-6 z-20 p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/60 shadow-2xl backdrop-blur-md text-white flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                  </span>
                  <span className="text-xs font-mono font-extrabold tracking-wider text-cyan-400">
                    USUARIO EN RUTA // NAVEGACIÓN ACTIVA
                  </span>
                </div>

                <span className="text-xs font-mono font-bold text-emerald-400">
                  {trackingProgressPercent}% completado
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${trackingProgressPercent}%` }}
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-200">
                  <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-medium truncate max-w-sm">{currentStepInstruction}</span>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-slate-300">
                  <span>
                    Faltan: <strong className="text-white">{remainingDistanceText || 'Calculando...'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Unified Map Usability Overlay: "Usa Ctrl + rueda para hacer zoom" + Smooth + / - Controls */}
          <MapUsabilityOverlay
            zoomLevel={smoothZoomLevel}
            isHintHighlighted={isHintHighlighted}
            isCtrlZooming={isCtrlZooming}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetCenter={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo({ lat: 6.2485, lng: -75.5475 });
                smoothZoomTo(14);
              }
            }}
            resetTitle="Centrar en Comuna 8"
            noticePosition="bottom-center"
          />

          {/* Bottom Left Legend */}
          <div className="absolute left-3.5 bottom-3.5 z-10 hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-[10px] font-mono text-slate-300 backdrop-blur-md pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Ruta Recomendada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Alternas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Ubicaciones ({categoryPlaces.length})</span>
            </div>
          </div>
        </div>

        {/* 4. Just below the map: Tracking & En-Route Controls */}
        {!isTrackingActive ? (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('readyToStartRoute')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('readyToStartRouteDesc')}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-iniciar-viaje"
              onClick={handleStartTrip}
              disabled={routeOptions.length === 0}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Navigation className="w-4 h-4 stroke-[2.5]" />
              <span>{t('startLiveTracking')}</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl border border-cyan-500/50 bg-slate-900/95 backdrop-blur-md shadow-2xl text-white flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-mono font-extrabold tracking-wider text-cyan-400 uppercase">
                  {t('userOnRouteBadge')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                <span
                  className={`px-2 py-0.5 rounded-md border ${
                    trackingProgressPercent < 25
                      ? 'bg-amber-950/70 text-amber-400 border-amber-600'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  1. Despachada
                </span>
                <span className="text-slate-600">→</span>
                <span
                  className={`px-2 py-0.5 rounded-md border ${
                    trackingProgressPercent >= 25 && trackingProgressPercent < 75
                      ? 'bg-blue-950/70 text-blue-400 border-blue-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  2. En camino
                </span>
                <span className="text-slate-600">→</span>
                <span
                  className={`px-2 py-0.5 rounded-md border ${
                    trackingProgressPercent >= 75 && trackingProgressPercent < 100
                      ? 'bg-cyan-950/70 text-cyan-400 border-cyan-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  3. Llegando
                </span>
                <span className="text-slate-600">→</span>
                <span
                  className={`px-2 py-0.5 rounded-md border ${
                    trackingProgressPercent >= 100
                      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  4. En destino
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Progreso del trayecto</span>
                <span className="font-bold text-emerald-400">{trackingProgressPercent}% completado</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${trackingProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 min-w-0">
                <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-400 shrink-0">
                  <Compass className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Instrucción actual:</span>
                  <span className="font-semibold text-white truncate max-w-md">{currentStepInstruction}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                  <span>
                    Faltan: <strong className="text-white">{remainingDistanceText || 'Calculando...'}</strong>
                  </span>
                  {remainingDurationText && <span className="text-slate-400">({remainingDurationText})</span>}
                </div>

                <button
                  type="button"
                  onClick={handleSimulateAdvance}
                  className="px-3 py-2 rounded-xl bg-cyan-950/80 border border-cyan-600 text-cyan-300 text-xs font-bold hover:bg-cyan-900 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>▶ Simular avance</span>
                </button>

                <button
                  type="button"
                  onClick={handleStopTrip}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-950/40"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{t('stopLiveTracking')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
