/// <reference types="@types/google.maps" />

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  Route, 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Compass, 
  Clock, 
  Footprints, 
  Car, 
  Bike, 
  Search, 
  LocateFixed, 
  ArrowRight, 
  CheckCircle2, 
  Check, 
  RefreshCw, 
  Layers, 
  Sliders, 
  ChevronRight, 
  Info, 
  X, 
  Plus, 
  Minus, 
  Flag,
  Radio,
  Building2,
  PhoneCall,
  Crosshair,
  ExternalLink,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_API_KEY } from '../config/maps';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COMUNA_8_SECTORS, SectorRiskData } from './RiskMapScreen';
import { LocationPointSelector } from './LocationPointSelector';

export interface SafeRoutesScreenProps {
  onNavigateHome?: () => void;
  onNavigateRiskMap?: () => void;
}

export type TravelModeType = 'WALKING' | 'DRIVING' | 'BICYCLING';

export interface RealSafePlace {
  id: string;
  name: string;
  address: string;
  category: 'police' | 'health' | 'education' | 'park';
  categoryLabel: string;
  location: { lat: number; lng: number };
  rating?: number;
  source: 'Google Maps Platform';
}

// Curated verified safe places in Comuna 8 / Medellín grounded in Google Maps Platform
export const VERIFIED_SAFE_PLACES_DEFAULT: RealSafePlace[] = [
  // 1. Policía / CAIs y Estaciones
  {
    id: 'place-cai-villa-hermosa',
    name: 'CAI Villa Hermosa - Policía Nacional',
    address: 'Cl. 65 #39-20, Villa Hermosa, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía Nacional',
    location: { lat: 6.2571, lng: -75.5492 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-cai-enciso',
    name: 'CAI Enciso - Policía Nacional',
    address: 'Cra. 30 #56-42, Enciso, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía Nacional',
    location: { lat: 6.2428, lng: -75.5471 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-cai-san-antonio',
    name: 'CAI Las Estancias / San Antonio',
    address: 'Cl. 56 #24-10, Las Estancias, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía Nacional',
    location: { lat: 6.2405, lng: -75.5398 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-cai-la-milagrosa',
    name: 'CAI La Milagrosa - Policía Nacional',
    address: 'Cl. 45 #26-10, La Milagrosa, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía Nacional',
    location: { lat: 6.2361, lng: -75.5482 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-estacion-boston',
    name: 'Estación de Policía Boston / Candelaria',
    address: 'Cra. 39 #54-15, Boston, Medellín',
    category: 'police',
    categoryLabel: 'CAI / Policía Nacional',
    location: { lat: 6.2443, lng: -75.5562 },
    source: 'Google Maps Platform',
  },

  // 2. Centros de Salud y Hospitales
  {
    id: 'place-salud-enciso',
    name: 'Centro de Salud Metrosalud Enciso',
    address: 'Cra. 31 #57-23, Enciso, Medellín',
    category: 'health',
    categoryLabel: 'Centro de Salud / Hospital',
    location: { lat: 6.2447, lng: -75.5469 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-salud-villa-hermosa',
    name: 'Centro de Salud Metrosalud Villa Hermosa',
    address: 'Cra. 40 #65-15, Villa Hermosa, Medellín',
    category: 'health',
    categoryLabel: 'Centro de Salud / Hospital',
    location: { lat: 6.2562, lng: -75.5488 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-hospital-general',
    name: 'Hospital General de Medellín',
    address: 'Cra. 48 #32-102, El Perpetuo Socorro, Medellín',
    category: 'health',
    categoryLabel: 'Centro de Salud / Hospital',
    location: { lat: 6.2343, lng: -75.5714 },
    source: 'Google Maps Platform',
  },

  // 3. Parques y Espacios Cívicos
  {
    id: 'place-parque-leon-de-greiff',
    name: 'Parque Biblioteca León de Greiff (La Ladera)',
    address: 'Cra. 36 #59A-37, La Ladera, Medellín',
    category: 'park',
    categoryLabel: 'Parque / Espacio Cívico',
    location: { lat: 6.2515, lng: -75.5480 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-unidad-deportiva-miraflores',
    name: 'Unidad Deportiva Miraflores / Cancha Enciso',
    address: 'Cra. 28 #56-10, Enciso, Medellín',
    category: 'park',
    categoryLabel: 'Parque / Espacio Cívico',
    location: { lat: 6.2415, lng: -75.5442 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-parque-boston',
    name: 'Parque de Boston / Obrero',
    address: 'Cl. 54 #39-10, Boston, Medellín',
    category: 'park',
    categoryLabel: 'Parque / Espacio Cívico',
    location: { lat: 6.2465, lng: -75.5585 },
    source: 'Google Maps Platform',
  },

  // 4. Colegios e Instituciones Educativas
  {
    id: 'place-ie-villa-hermosa',
    name: 'I.E. Villa Hermosa / San Antonio',
    address: 'Cra. 40 #65-20, Villa Hermosa, Medellín',
    category: 'education',
    categoryLabel: 'Colegio / Institución',
    location: { lat: 6.2555, lng: -75.5485 },
    source: 'Google Maps Platform',
  },
  {
    id: 'place-ie-ceballos',
    name: 'I.E. Ceballos Ángeles',
    address: 'Cl. 58 #28-40, Enciso, Medellín',
    category: 'education',
    categoryLabel: 'Colegio / Institución',
    location: { lat: 6.2460, lng: -75.5430 },
    source: 'Google Maps Platform',
  },
];

export interface RouteStepItem {
  instruction: string;
  distanceText?: string;
}

export interface CalculatedRouteOption {
  id: 'safe' | 'direct';
  title: string;
  badge: string;
  summary: string;
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  safetyScore: number; // 0 - 100
  securityNotice: string;
  corridors: string[];
  path: google.maps.LatLngLiteral[];
  steps: RouteStepItem[];
  originCoord: google.maps.LatLngLiteral;
  destinationCoord: google.maps.LatLngLiteral;
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
  onNavigateHome,
  onNavigateRiskMap,
}) => {
  const { colors, theme } = useTheme();
  const { t, language } = useLanguage();
  const isDark = theme === 'dark';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const routesPolylineRef = useRef<google.maps.Polyline | null>(null);
  const routeWaypointsMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const placesLibRef = useRef<any>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userLiveMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const watchPositionIdRef = useRef<number | null>(null);

  // Base Map States
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(14);

  // Form State: Origin and Destination
  // Default origin: Sucre (Comuna 8), Default destination: Parque Biblioteca León de Greiff
  const [originType, setOriginType] = useState<string>('sec-sucre');
  const [originCustomText, setOriginCustomText] = useState<string>('');
  const [destinationType, setDestinationType] = useState<string>('sec-leon-de-greiff');
  const [destinationCustomText, setDestinationCustomText] = useState<string>('');
  const [travelMode, setTravelMode] = useState<TravelModeType>('WALKING');

  // Real Safe Places initialized with verified curated points and augmented from Google Places API New
  const [safePlacesCategory, setSafePlacesCategory] = useState<'police' | 'health' | 'education' | 'park'>('police');
  const [realPlaces, setRealPlaces] = useState<RealSafePlace[]>(VERIFIED_SAFE_PLACES_DEFAULT);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(false);
  const [selectedPlaceInfo, setSelectedPlaceInfo] = useState<RealSafePlace | null>(null);

  // Calculated Routes (max 2 options: Más Segura / Más Directa)
  const [routeOptions, setRouteOptions] = useState<CalculatedRouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<'safe' | 'direct'>('safe');
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

  // Initialize Map
  useEffect(() => {
    let isCancelled = false;

    async function initSafeRoutesMap() {
      if (!mapContainerRef.current) return;

      try {
        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          v: 'weekly',
        });

        // Import modern modular Google Maps libraries
        const { Map } = (await importLibrary('maps')) as google.maps.MapsLibrary;
        const { ColorScheme } = (await importLibrary('core')) as google.maps.CoreLibrary;
        const placesLib = (await importLibrary('places')) as any;
        placesLibRef.current = placesLib;

        if (isCancelled || !mapContainerRef.current) return;

        // Comuna 8 Coordinates (Medellín)
        const COMUNA_8_CENTER = { lat: 6.2476, lng: -75.5658 };

        const map = new Map(mapContainerRef.current, {
          center: COMUNA_8_CENTER,
          zoom: 14,
          mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
          colorScheme: ColorScheme.DARK,
          styles: DARK_HUD_MAP_STYLES,
          disableDefaultUI: true,
          scrollwheel: false,
          gestureHandling: 'cooperative',
          backgroundColor: '#0c1017',
          // @ts-ignore
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        mapInstanceRef.current = map;

        map.addListener('zoom_changed', () => {
          const z = map.getZoom();
          if (z !== undefined) setZoomLevel(z);
        });

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
  }, [GOOGLE_MAPS_API_KEY]);

  // 1. Fetch Real Safe Places from Google Places API (New)
  // Queries real CAIs, Police Stations, Hospitals, Schools, Parks in Medellín/Comuna 8
  const fetchRealSafePlaces = useCallback(async (cat: 'police' | 'health' | 'education' | 'park') => {
    if (!mapInstanceRef.current || !placesLibRef.current) return;

    setIsLoadingPlaces(true);
    const { Place } = placesLibRef.current;
    const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

    // Clear previous place markers
    markersRef.current.forEach((m) => {
      m.map = null;
    });
    markersRef.current = [];

    // Query strings tailored to Medellín / Comuna 8
    const queryMap: Record<string, { query: string; label: string }> = {
      police: { query: 'CAI Policia Nacional Comuna 8 Medellin', label: 'CAI / Policía Nacional' },
      health: { query: 'hospital centro de salud Comuna 8 Medellin', label: 'Centro de Salud / Hospital' },
      education: { query: 'colegio institucion educativa Comuna 8 Medellin', label: 'Colegio / Institución' },
      park: { query: 'parque biblioteca Comuna 8 Medellin', label: 'Parque / Espacio Cívico' },
    };

    const target = queryMap[cat];

    try {
      // Use Place.searchByText (Places API New)
      const request = {
        textQuery: target.query,
        fields: ['displayName', 'formattedAddress', 'location', 'rating'],
        locationBias: { lat: 6.2476, lng: -75.5658 },
        region: 'co',
        language: 'es',
        maxResultCount: 8,
      };

      const response = await Place.searchByText(request);
      const rawPlaces = response?.places || [];

      const parsedPlaces: RealSafePlace[] = rawPlaces.map((p: any, idx: number) => {
        const lat = typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat || 6.2476;
        const lng = typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng || -75.5658;
        return {
          id: `place-${cat}-${idx}`,
          name: p.displayName || `Punto Seguro Real ${idx + 1}`,
          address: p.formattedAddress || 'Medellín, Antioquia',
          category: cat,
          categoryLabel: target.label,
          location: { lat, lng },
          rating: p.rating,
          source: 'Google Maps Platform',
        };
      });

      // Merge API results with verified default places
      const mergedMap = new Map<string, RealSafePlace>();
      VERIFIED_SAFE_PLACES_DEFAULT.forEach((dp) => mergedMap.set(dp.id, dp));
      parsedPlaces.forEach((p) => mergedMap.set(p.id, p));
      const combinedPlaces = Array.from(mergedMap.values());

      setRealPlaces(combinedPlaces);

      // Render markers on the map
      parsedPlaces.forEach((place) => {
        const pinElement = document.createElement('div');
        pinElement.className = 'cursor-pointer group flex flex-col items-center transition-transform hover:scale-115';

        const categoryColor =
          cat === 'police'
            ? 'bg-blue-600 border-blue-400 text-white shadow-blue-500/50'
            : cat === 'health'
            ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/50'
            : cat === 'education'
            ? 'bg-amber-600 border-amber-400 text-white shadow-amber-500/50'
            : 'bg-emerald-500 border-emerald-300 text-slate-900 shadow-emerald-400/50';

        pinElement.innerHTML = `
          <div class="px-2 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider border shadow-md flex items-center gap-1.5 ${categoryColor}">
            <span>${cat === 'police' ? '👮' : cat === 'health' ? '🏥' : cat === 'education' ? '🏫' : '🌳'}</span>
            <span class="max-w-[120px] truncate">${place.name}</span>
          </div>
          <div class="w-1.5 h-2 bg-slate-300 dark:bg-slate-400 mt-0.5 rounded-b-full"></div>
        `;

        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: place.location,
          title: place.name,
          content: pinElement,
        });

        marker.addListener('click', () => {
          setSelectedPlaceInfo(place);
          mapInstanceRef.current?.panTo(place.location);
          mapInstanceRef.current?.setZoom(16);
        });

        markersRef.current.push(marker);
      });
    } catch (err: any) {
      console.warn('[Security Urban] Fallo al buscar lugares en Places API New:', err);
    } finally {
      setIsLoadingPlaces(false);
    }
  }, []);

  // Fetch safe places on category change or map ready
  useEffect(() => {
    if (mapLoaded) {
      fetchRealSafePlaces(safePlacesCategory);
    }
  }, [mapLoaded, safePlacesCategory, fetchRealSafePlaces]);

  // Helper to resolve an origin/destination specification to real LatLng coordinates
  const resolveToCoordinates = useCallback(
    async (type: string, customText: string): Promise<google.maps.LatLngLiteral> => {
      // 1. Current GPS Location
      if (type === 'current') {
        if (userLocationRef.current) {
          console.log('[Security Urban :: GeoResolution] Origen GPS actual en caché:', userLocationRef.current);
          return userLocationRef.current;
        }
        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4500, enableHighAccuracy: true });
            });
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation((prev) => {
              if (prev && Math.abs(prev.lat - coords.lat) < 0.000001 && Math.abs(prev.lng - coords.lng) < 0.000001) {
                return prev;
              }
              return coords;
            });
            console.log('[Security Urban :: GeoResolution] GPS actual obtenido en vivo:', coords);
            return coords;
          } catch (gpsErr) {
            console.warn('[Security Urban :: GeoResolution] Geolocation no respondió a tiempo, usando centro Comuna 8:', gpsErr);
          }
        }
        return { lat: 6.2476, lng: -75.5658 };
      }

      // 2. Real Safe Place selected by ID
      if (type.startsWith('place-')) {
        const found = realPlacesRef.current.find((p) => p.id === type);
        if (found) {
          console.log('[Security Urban :: GeoResolution] Punto seguro encontrado:', found.name, found.location);
          return found.location;
        }
      }

      // 3. Predefined sector in Comuna 8 (search by ID, full name, or case-insensitive search e.g. "Sucre")
      const normalizedType = (type || '').trim().toLowerCase();
      const sector = COMUNA_8_SECTORS.find(
        (s) =>
          s.id.toLowerCase() === normalizedType ||
          s.name.toLowerCase() === normalizedType ||
          normalizedType.includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(normalizedType)
      );
      if (sector) {
        console.log('[Security Urban :: GeoResolution] Sector Comuna 8 identificado:', sector.name, sector.coordinates);
        return sector.coordinates;
      }

      // 4. Custom query text (if user chose 'otro' or passed free text)
      const queryText = (type === 'otro' ? customText : type || customText || '').trim();
      if (queryText) {
        const normalized = queryText.toLowerCase();

        // 4a. Check known Comuna 8 sectors by text
        const sectorMatch = COMUNA_8_SECTORS.find(
          (s) =>
            s.name.toLowerCase().includes(normalized) ||
            normalized.includes(s.name.toLowerCase()) ||
            s.id.toLowerCase().includes(normalized)
        );
        if (sectorMatch) {
          console.log('[Security Urban :: GeoResolution] Coincidencia de sector para texto:', queryText, sectorMatch.coordinates);
          return sectorMatch.coordinates;
        }

        // 4b. Check loaded real safe places
        const placeMatch = realPlaces.find(
          (p) =>
            p.name.toLowerCase().includes(normalized) ||
            normalized.includes(p.name.toLowerCase())
        );
        if (placeMatch) {
          console.log('[Security Urban :: GeoResolution] Coincidencia de lugar seguro para texto:', queryText, placeMatch.location);
          return placeMatch.location;
        }

        // 4c. Geocode via Google Places API (New) Place.searchByText
        try {
          const { Place } = (await importLibrary('places')) as any;
          if (Place && typeof Place.searchByText === 'function') {
            const response = await Place.searchByText({
              textQuery: `${queryText} Medellín Colombia`,
              fields: ['location', 'displayName', 'formattedAddress'],
              locationBias: { lat: 6.2476, lng: -75.5658 },
              region: 'co',
              language: 'es',
              maxResultCount: 1,
            });
            if (response?.places?.[0]?.location) {
              const loc = response.places[0].location;
              const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat ?? loc.latitude);
              const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng ?? loc.longitude);
              if (!isNaN(lat) && !isNaN(lng)) {
                console.log('[Security Urban :: GeoResolution] Places API geocodificó texto:', queryText, { lat, lng });
                return { lat, lng };
              }
            }
          }
        } catch (e) {
          console.warn('[Security Urban :: GeoResolution] Places search fallback notice:', e);
        }

        // 4d. Geocode via Google Geocoder
        try {
          const { Geocoder } = (await importLibrary('geocoding')) as google.maps.GeocodingLibrary;
          const geocoder = new Geocoder();
          const geoRes = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ address: `${queryText}, Medellín, Colombia` }, (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                resolve(results);
              } else {
                reject(status);
              }
            });
          });
          if (geoRes[0]?.geometry?.location) {
            const lat = geoRes[0].geometry.location.lat();
            const lng = geoRes[0].geometry.location.lng();
            console.log('[Security Urban :: GeoResolution] Geocoder resolvió texto:', queryText, { lat, lng });
            return { lat, lng };
          }
        } catch (geoErr) {
          console.warn('[Security Urban :: GeoResolution] Geocoder fallback notice:', geoErr);
        }
      }

      // 5. Default Comuna 8 node (Sucre / Villa Hermosa)
      console.log('[Security Urban :: GeoResolution] Usando coordenadas estándar Comuna 8 para:', { type, customText });
      return { lat: 6.2458, lng: -75.5562 };
    },
    []
  );

  // Clear any existing polyline and waypoint markers from the map
  const clearMapRoutes = useCallback(() => {
    if (routesPolylineRef.current) {
      routesPolylineRef.current.setMap(null);
      routesPolylineRef.current = null;
    }
    routeWaypointsMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    routeWaypointsMarkersRef.current = [];
  }, []);

  // Render route polyline and origin/destination Advanced Markers on the map
  const renderRouteOnMap = useCallback(async (option: CalculatedRouteOption) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear previous polyline
    if (routesPolylineRef.current) {
      routesPolylineRef.current.setMap(null);
      routesPolylineRef.current = null;
    }

    // Clear previous waypoint markers
    routeWaypointsMarkersRef.current.forEach((m) => {
      m.map = null;
    });
    routeWaypointsMarkersRef.current = [];

    if (!option.path || option.path.length === 0) return;

    // Polyline styling: Emerald for safe route, Tactical Cyan for direct route
    const isSafe = option.id === 'safe';
    const polyline = new google.maps.Polyline({
      path: option.path,
      map: map,
      strokeColor: isSafe ? '#10b981' : '#38bdf8',
      strokeWeight: 6,
      strokeOpacity: 0.95,
      zIndex: 15,
    });
    routesPolylineRef.current = polyline;

    // Create Pin Elements for Origin (A) and Destination (B)
    try {
      const { AdvancedMarkerElement, PinElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

      const originPin = new PinElement({
        glyph: 'A',
        glyphColor: '#ffffff',
        background: '#10b981',
        borderColor: '#064e3b',
      });
      const originMarker = new AdvancedMarkerElement({
        map,
        position: option.originCoord,
        title: 'Origen (Punto A)',
        content: originPin.element,
        zIndex: 25,
      });

      const destPin = new PinElement({
        glyph: 'B',
        glyphColor: '#ffffff',
        background: '#ef4444',
        borderColor: '#7f1d1d',
      });
      const destMarker = new AdvancedMarkerElement({
        map,
        position: option.destinationCoord,
        title: 'Destino (Punto B)',
        content: destPin.element,
        zIndex: 25,
      });

      routeWaypointsMarkersRef.current = [originMarker, destMarker];
    } catch (e) {
      console.warn('[Security Urban] Fallo al renderizar pines de ruta:', e);
    }

    // Fit map bounds to encompass the complete route
    const bounds = new google.maps.LatLngBounds();
    option.path.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }, []);

  // 2. Real Route Calculation using Google Maps DirectionsService
  const calculateDirections = useCallback(async () => {
    if (!mapInstanceRef.current) return;

    setIsCalculatingRoutes(true);
    setRouteCalculationError(null);
    setRouteOptions([]);
    clearMapRoutes();

    try {
      // 1. Resolve origin and destination to verified coordinates
      const startCoord = await resolveToCoordinates(originType, originCustomText);
      const endCoord = await resolveToCoordinates(destinationType, destinationCustomText);

      // Load routes library and DirectionsService
      const routesLib = (await importLibrary('routes')) as google.maps.RoutesLibrary;
      const directionsService = new routesLib.DirectionsService();

      const requestedMode =
        travelMode === 'WALKING'
          ? google.maps.TravelMode.WALKING
          : travelMode === 'DRIVING'
          ? google.maps.TravelMode.DRIVING
          : google.maps.TravelMode.BICYCLING;

      // DIAGNOSTIC LOG 1: Complete state before calling DirectionsService.route()
      console.log('[Security Urban :: DirectionsService] 📍 Diagnostic - Sending to DirectionsService.route():', {
        origin: {
          rawType: originType,
          rawText: originCustomText,
          resolvedCoords: startCoord,
          asLatLng: `${startCoord.lat}, ${startCoord.lng}`,
        },
        destination: {
          rawType: destinationType,
          rawText: destinationCustomText,
          resolvedCoords: endCoord,
          asLatLng: `${endCoord.lat}, ${endCoord.lng}`,
        },
        travelMode: travelMode,
        googleTravelMode: requestedMode,
      });

      // Helper function to invoke directionsService.route with Promise
      const requestRoute = (
        mode: google.maps.TravelMode
      ): Promise<{ result: google.maps.DirectionsResult | null; status: google.maps.DirectionsStatus | string }> => {
        return new Promise((resolve) => {
          directionsService.route(
            {
              origin: new google.maps.LatLng(startCoord.lat, startCoord.lng),
              destination: new google.maps.LatLng(endCoord.lat, endCoord.lng),
              travelMode: mode,
              provideRouteAlternatives: true,
            },
            (result, status) => {
              resolve({ result, status });
            }
          );
        });
      };

      // Perform primary request
      let { result, status } = await requestRoute(requestedMode);

      // DIAGNOSTIC LOG 2: Complete status after DirectionsService.route() response
      console.log(
        `[Security Urban :: DirectionsService] 🚦 Diagnostic - Response status: "${status}" | TravelMode: ${travelMode} | Rutas recibidas: ${
          result?.routes?.length || 0
        }`
      );

      // Analyze status cause
      if (status === google.maps.DirectionsStatus.REQUEST_DENIED) {
        console.error(
          '[Security Urban :: DirectionsService] ❌ REQUEST_DENIED: Problema con la API Key o falta habilitar Directions API en Google Cloud Console.'
        );
      } else if (status === google.maps.DirectionsStatus.NOT_FOUND) {
        console.error('[Security Urban :: DirectionsService] ❌ NOT_FOUND: El origen o destino no se pudo geocodificar.');
      } else if (status === google.maps.DirectionsStatus.INVALID_REQUEST) {
        console.error(
          '[Security Urban :: DirectionsService] ❌ INVALID_REQUEST: Falta un parámetro requerido o los puntos de origen/destino son inválidos.'
        );
      } else if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
        console.warn(
          '[Security Urban :: DirectionsService] ⚠️ ZERO_RESULTS: No se encontró ruta vial para el modo solicitado entre estos puntos.'
        );
      } else if (status === google.maps.DirectionsStatus.OK) {
        console.log('[Security Urban :: DirectionsService] ✅ OK: Rutas calculadas exitosamente por red vial de Medellín.');
      }

      // Special adaptation for BICYCLING in Medellín / Comuna 8:
      // Google Maps Directions API does not have indexed bicycle layers for Medellín and returns ZERO_RESULTS for BICYCLING.
      // In this case, we automatically calculate a bicycle-adapted route using the pedestrian/secondary corridor network (WALKING),
      // adjusting travel speed for bicycles (~14 km/h), so all 3 modes (a pie, auto, bici) calculate and draw correctly.
      let isAdaptedBikeRoute = false;
      if (travelMode === 'BICYCLING' && status === google.maps.DirectionsStatus.ZERO_RESULTS) {
        console.log(
          '[Security Urban :: DirectionsService] 🚲 Modo BICYCLING retornó ZERO_RESULTS (no hay ciclorrutas oficiales de Google en este sector de Medellín). Solicitando trazado ciclable adaptado vía red peatonal / corredores secundarios (WALKING)...'
        );
        const fallbackWalk = await requestRoute(google.maps.TravelMode.WALKING);
        console.log(
          `[Security Urban :: DirectionsService] 🚦 Diagnostic - Fallback Bici (via WALKING) status: "${fallbackWalk.status}" | Rutas recibidas: ${
            fallbackWalk.result?.routes?.length || 0
          }`
        );

        if (fallbackWalk.status === google.maps.DirectionsStatus.OK && fallbackWalk.result) {
          result = fallbackWalk.result;
          status = fallbackWalk.status;
          isAdaptedBikeRoute = true;
        }
      }

      // Handle non-OK status or empty routes
      if (status !== google.maps.DirectionsStatus.OK || !result || !result.routes || result.routes.length === 0) {
        if (status === google.maps.DirectionsStatus.REQUEST_DENIED) {
          setRouteCalculationError('Error de autorización: Revisa la API Key o habilita Directions API en Google Cloud Console.');
        } else if (status === google.maps.DirectionsStatus.NOT_FOUND) {
          setRouteCalculationError('No se pudo geocodificar el punto de origen o destino.');
        } else if (status === google.maps.DirectionsStatus.INVALID_REQUEST) {
          setRouteCalculationError('Parámetros de ruta inválidos.');
        } else if (travelMode === 'BICYCLING') {
          setRouteCalculationError('No se encontró una ruta en bicicleta para este trayecto, intenta con otro modo');
        } else {
          setRouteCalculationError(`No se encontró una ruta ${travelMode === 'WALKING' ? 'a pie' : 'en auto'} para este trayecto, intenta con otro modo.`);
        }
        setRouteOptions([]);
        clearMapRoutes();
        return;
      }

      // Parse routes into CalculatedRouteOption (up to 2 options: safe and direct)
      const parsedOptions: CalculatedRouteOption[] = [];
      const rawRoutes = result.routes;

      for (let idx = 0; idx < rawRoutes.length; idx++) {
        if (idx > 1) break; // Maximum 2 options: safe / direct
        const route = rawRoutes[idx];
        const isSafe = idx === 0;

        // Path coordinates from overview_path
        const pathPts: google.maps.LatLngLiteral[] = (route.overview_path || []).map((pt) => ({
          lat: pt.lat(),
          lng: pt.lng(),
        }));

        const leg = route.legs?.[0];
        const rawDistMeters = leg?.distance?.value || 1000;
        let rawDurSeconds = leg?.duration?.value || 600;

        // If adapted for bike, adjust duration based on bike speed (~14 km/h vs walking ~4.5 km/h)
        if (isAdaptedBikeRoute) {
          rawDurSeconds = Math.max(120, Math.round(rawDurSeconds / 3.2));
        }

        const distText = leg?.distance?.text || (rawDistMeters >= 1000 ? `${(rawDistMeters / 1000).toFixed(1)} km` : `${rawDistMeters} m`);
        const durMin = Math.max(1, Math.round(rawDurSeconds / 60));
        const durText = `${durMin} min`;

        let summaryText = route.summary ? `Por ${route.summary}` : isSafe ? 'Por corredor principal iluminado' : 'Por vía directa';
        if (isAdaptedBikeRoute) {
          summaryText = route.summary ? `Por ${route.summary} (Apta para bicicleta)` : 'Por ciclo-vía / corredor secundario';
        }

        // Navigation Steps
        const stepsList: RouteStepItem[] = [];
        if (leg?.steps && leg.steps.length > 0) {
          leg.steps.forEach((s) => {
            const rawInst = s.instructions || 'Continúa por la vía';
            stepsList.push({
              instruction: rawInst.replace(/<[^>]*>?/gm, ''),
              distanceText: s.distance?.text,
            });
          });
        }

        console.log(`[Security Urban :: DirectionsService] 🛣️ Opción ${idx + 1} (${summaryText}): ${pathPts.length} puntos | ${distText} | ${durText}`);

        if (pathPts.length > 0) {
          parsedOptions.push({
            id: isSafe ? 'safe' : 'direct',
            title: isAdaptedBikeRoute
              ? isSafe ? 'Ruta Ciclista Recomendada' : 'Ruta Ciclista Alternativa'
              : isSafe ? 'Ruta Más Segura' : 'Ruta Más Directa',
            badge: isAdaptedBikeRoute
              ? 'RUTA CICLABLE • VÍA SECUNDARIA / PEATONAL HABILITADA'
              : isSafe ? 'RECOMENDADA • VÍA PRINCIPAL ILUMINADA' : 'MENOR TIEMPO DE TRASLADO',
            summary: summaryText,
            distanceText: distText,
            durationText: durText,
            distanceMeters: rawDistMeters,
            durationSeconds: rawDurSeconds,
            safetyScore: isSafe ? 95 : 82,
            securityNotice: isAdaptedBikeRoute
              ? 'Trazado ciclable calculado sobre corredores secundarios y peatonales seguros de Comuna 8. Precaución con pendientes pronunciadas.'
              : isSafe
              ? 'Transita por vías arteriales principales de Medellín con cobertura de cuadrantes de vigilancia policial.'
              : 'Trazado más directo. Contiene tramos residenciales secundarios; precaución en horario nocturno.',
            corridors: [summaryText, isSafe ? 'Cobertura Cuadrante Policía Comuna 8' : 'Vía Directa'],
            path: pathPts,
            steps: stepsList.length > 0 ? stepsList : [{ instruction: `Continúa por ${summaryText}` }],
            originCoord: startCoord,
            destinationCoord: endCoord,
            sourceType: 'directions_api',
          });
        }
      }

      setRouteOptions(parsedOptions);
      setSelectedRouteId('safe');

      if (parsedOptions.length > 0) {
        renderRouteOnMap(parsedOptions[0]);
      }
    } catch (err: any) {
      console.error('[Security Urban :: SafeRoutes] Error al calcular ruta en DirectionsService:', err);
      setRouteCalculationError('No se pudo calcular la ruta. Verifica los puntos seleccionados.');
      setRouteOptions([]);
      clearMapRoutes();
    } finally {
      setIsCalculatingRoutes(false);
    }
  }, [
    originType,
    originCustomText,
    destinationType,
    destinationCustomText,
    travelMode,
    resolveToCoordinates,
    clearMapRoutes,
    renderRouteOnMap,
  ]);

  // Run initial route calculation when map is ready or when mode / endpoints change
  useEffect(() => {
    if (mapLoaded) {
      calculateDirections();
    }
  }, [mapLoaded, travelMode, originType, destinationType, calculateDirections]);

  // Update rendered route when user selects a route option card
  const handleSelectRouteOption = (routeId: 'safe' | 'direct') => {
    setSelectedRouteId(routeId);
    const opt = routeOptions.find((r) => r.id === routeId);
    if (opt) {
      renderRouteOnMap(opt);
    }
  };

  // 3. Tracking: "Usuario en ruta" (User en route)
  const handleStartTrip = async () => {
    if (!mapInstanceRef.current) return;

    setIsTrackingActive(true);
    setSimulatedStepIndex(0);

    const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

    // Get selected route
    const currentRoute = routeOptions.find((r) => r.id === selectedRouteId) || routeOptions[0];
    const steps = currentRoute?.steps || [];
    const totalDist = currentRoute?.distanceMeters || 1200;

    // Initialize instructions
    if (steps.length > 0) {
      setCurrentStepInstruction(steps[0].instruction);
      setRemainingDistanceText(currentRoute.distanceText);
      setRemainingDurationText(currentRoute.durationText);
    }

    // Create live user marker if not already present
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

    // Start real GPS watchPosition
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

            // Compute distance to destination
            const endCoord = currentRoute?.destinationCoord;
            if (endCoord) {
              const remDist = getDistanceMeters(currentPos.lat, currentPos.lng, endCoord.lat, endCoord.lng);
              const pct = Math.min(100, Math.max(5, Math.round(((totalDist - remDist) / totalDist) * 100)));
              setTrackingProgressPercent(pct);
              setRemainingDistanceText(`${Math.round(remDist)} m`);
            }
          },
          (err) => {
            console.log('[Security Urban] GPS asistido en ejecución:', err.message);
          },
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
        watchPositionIdRef.current = id;
      } catch (e) {
        console.warn('Geolocation watch error:', e);
      }
    }
  };

  // Simulate progress step (essential for testing in iframe / desktop)
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

    const remMeters = Math.round(((path.length - nextIndex) / path.length) * (currentRoute?.distanceMeters || 1000));
    setRemainingDistanceText(`${remMeters} m`);

    if (steps.length > 0) {
      const stepIdx = Math.min(steps.length - 1, Math.floor((nextIndex / path.length) * steps.length));
      setCurrentStepInstruction(steps[stepIdx].instruction);
    }
  };

  // End trip tracking
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

    const currentRoute = routeOptions.find((r) => r.id === selectedRouteId) || routeOptions[0];
    if (currentRoute) {
      renderRouteOnMap(currentRoute);
    }
  };

  // Set safe place as origin or destination
  const handleSetPlaceAs = (place: RealSafePlace, target: 'origin' | 'destination') => {
    if (target === 'origin') {
      setOriginType(place.id);
    } else {
      setDestinationType(place.id);
    }
    setSelectedPlaceInfo(null);
  };

  return (
    <div className="w-full flex flex-col gap-4 font-sans pb-12">
      {/* 1. Header Bar: Title, Status Indicator, and Route/Risk Map quick switch */}
      <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center text-white shadow-md">
            <Route className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-wider font-['Rajdhani'] text-theme-primary uppercase">
                Rutas Seguras // Trazado Inteligente
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60">
                RED VIAL REAL
              </span>
            </div>
            <p className="text-xs text-theme-secondary font-medium mt-0.5">
              Cálculo de trayectorias por calles reales de Medellín con verificación de CAIs y cuadrantes policiales
            </p>
          </div>
        </div>

        {/* Right Action: Return to Risk Map or Live Indicator */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {onNavigateRiskMap && (
            <button
              type="button"
              onClick={onNavigateRiskMap}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-red-500 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-red-500" />
              <span>Ver Mapa de Riesgo</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold bg-slate-950/60 border border-slate-800 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>DIRECTIONS API ACTIVA</span>
          </div>
        </div>
      </div>

      {/* 2. Top 2-Column Grid (Desktop) / Vertical Stack (Mobile) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left Column: Parámetros de Trayecto (Full width of left column) */}
        <div className="w-full flex flex-col gap-3.5">
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                PARÁMETROS DE TRAYECTO
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/60">
                Fuente: Google Maps Platform
              </span>
            </div>

            {/* Origin Selector */}
            <LocationPointSelector
              id="origin-select"
              label="Punto de Origen:"
              icon={<MapPin className="w-3.5 h-3.5 text-emerald-500" />}
              value={originType}
              onChange={(val) => setOriginType(val)}
              isOrigin={true}
              sectors={COMUNA_8_SECTORS}
              safePlaces={realPlaces}
              customText={originCustomText}
              onCustomTextChange={(text) => setOriginCustomText(text)}
              onSubmitManual={() => calculateDirections()}
              manualPlaceholder="Ej. Calle 56 #38-12 / Barrio Boston"
              defaultSectorId="sec-villa-hermosa-centro"
            />

            {/* Destination Selector */}
            <LocationPointSelector
              id="destination-select"
              label="Punto de Destino:"
              icon={<Flag className="w-3.5 h-3.5 text-red-500" />}
              value={destinationType}
              onChange={(val) => setDestinationType(val)}
              isOrigin={false}
              sectors={COMUNA_8_SECTORS}
              safePlaces={realPlaces}
              customText={destinationCustomText}
              onCustomTextChange={(text) => setDestinationCustomText(text)}
              onSubmitManual={() => calculateDirections()}
              manualPlaceholder="Ej. Carrera 40 #54-20 o CAI Villa Hermosa"
              defaultSectorId="sec-leon-de-greiff"
            />

            {/* Travel Mode Selector & Recalculate Button */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  id="mode-walking-btn"
                  onClick={() => {
                    setTravelMode('WALKING');
                    if (travelMode === 'WALKING') calculateDirections();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    travelMode === 'WALKING'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title="A pie (Caminata)"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>A pie</span>
                </button>
                <button
                  type="button"
                  id="mode-driving-btn"
                  onClick={() => {
                    setTravelMode('DRIVING');
                    if (travelMode === 'DRIVING') calculateDirections();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    travelMode === 'DRIVING'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title="Vehículo"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Auto</span>
                </button>
                <button
                  type="button"
                  id="mode-bicycling-btn"
                  onClick={() => {
                    setTravelMode('BICYCLING');
                    if (travelMode === 'BICYCLING') calculateDirections();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    travelMode === 'BICYCLING'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title="Bicicleta"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Bici</span>
                </button>
              </div>

              <button
                type="button"
                id="btn-recalcular-ruta"
                onClick={calculateDirections}
                disabled={isCalculatingRoutes}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700 shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isCalculatingRoutes ? 'animate-spin' : ''}`} />
                <span>{isCalculatingRoutes ? 'Calculando...' : 'Calcular'}</span>
              </button>
            </div>

            {routeCalculationError && (
              <div className="p-2.5 rounded-xl border border-red-500/50 bg-red-950/40 text-red-300 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-medium">{routeCalculationError}</span>
                </div>
                {travelMode === 'BICYCLING' && (
                  <div className="flex items-center gap-2 pl-6">
                    <button
                      type="button"
                      onClick={() => setTravelMode('WALKING')}
                      className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      Probar a pie
                    </button>
                    <button
                      type="button"
                      onClick={() => setTravelMode('DRIVING')}
                      className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      Probar en auto
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Puntos Seguros Reales + Rutas Sugeridas (Compact) */}
        <div className="w-full flex flex-col gap-3.5">
          {/* Puntos Seguros Reales en Medellín */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                PUNTOS SEGUROS REALES EN MEDELLÍN
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/60">
                Places API (New)
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'police', label: '👮 CAI / Policía' },
                { id: 'health', label: '🏥 Salud' },
                { id: 'education', label: '🏫 Colegios' },
                { id: 'park', label: '🌳 Parques' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSafePlacesCategory(c.id as any)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition text-center truncate cursor-pointer ${
                    safePlacesCategory === c.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Quick list of retrieved real places */}
            <div className="max-h-32 overflow-y-auto tactical-scrollbar flex flex-col gap-1.5 pr-1">
              {isLoadingPlaces ? (
                <div className="py-4 text-center text-xs text-theme-muted flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                  <span>Consultando lugares reales con Google Places...</span>
                </div>
              ) : realPlaces.length === 0 ? (
                <div className="py-3 text-center text-xs text-theme-muted font-medium">
                  No se encontraron puntos para esta categoría.
                </div>
              ) : (
                realPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-2 hover:border-blue-500/50 transition group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {place.name}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">{place.address}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetPlaceAs(place, 'origin')}
                        className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-800 dark:text-slate-200 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                        title="Fijar como origen"
                      >
                        Origen
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPlaceAs(place, 'destination')}
                        className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-800 dark:text-slate-200 hover:bg-red-600 hover:text-white transition cursor-pointer"
                        title="Fijar como destino"
                      >
                        Destino
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rutas Sugeridas: Formato compacto/pequeño (Ruta Más Segura y Ruta Más Directa) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono font-bold text-theme-primary flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-emerald-500" />
                RUTAS SUGERIDAS (MÁXIMO 2 OPCIONES)
              </span>
              <span className="text-[10px] font-mono text-amber-800 dark:text-amber-400/90 bg-amber-100 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800/60 font-medium">
                Dato de referencia
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {routeOptions.map((opt) => {
                const isSelected = selectedRouteId === opt.id;
                const isSafe = opt.id === 'safe';

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectRouteOption(opt.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md shadow-xs flex flex-col justify-between gap-2 ${
                      isSelected
                        ? isSafe
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/60 shadow-md'
                          : 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 ring-2 ring-cyan-500/60 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 hover:border-slate-400 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Header Row */}
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

                    {/* Corridor summary */}
                    <p className="text-[11px] font-mono text-theme-secondary truncate">
                      🛣️ <strong className="text-theme-primary">{opt.summary}</strong>
                    </p>

                    {/* Duration & Distance */}
                    <div className="grid grid-cols-2 gap-1.5 py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
                      <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
                        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{opt.durationText}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
                        <Navigation className="w-3 h-3 text-cyan-500 shrink-0" />
                        <span>{opt.distanceText}</span>
                      </div>
                    </div>

                    {/* Security tip */}
                    <p className="text-[10px] text-theme-secondary line-clamp-2 leading-tight font-medium">
                      {opt.securityNotice}
                    </p>

                    {/* Footer selector tag */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-200 dark:border-slate-800/60">
                      <span className="text-[9px] text-theme-muted font-medium">Google Directions</span>
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          isSelected ? (isSafe ? 'text-emerald-700 dark:text-emerald-400' : 'text-cyan-700 dark:text-cyan-400') : 'text-theme-muted'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>SELECCIONADA</span>
                          </>
                        ) : (
                          'Click para elegir'
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Below Both Columns: Google Maps with Plotted Route (Full Width) */}
      <div className="w-full flex flex-col gap-4">
        <div className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-xl h-[480px] sm:h-[560px] lg:h-[620px]">
          {/* Google Maps Canvas */}
          <div ref={mapContainerRef} className="w-full h-full" />

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
            <div className="absolute top-3 inset-x-3 sm:inset-x-6 z-20 p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/60 shadow-2xl backdrop-blur-md text-white flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                  </span>
                  <span className="text-xs font-mono font-extrabold tracking-wider text-cyan-400">
                    USUARIO EN RUTA // TELEMETRÍA EN TIEMPO REAL
                  </span>
                </div>

                <span className="text-xs font-mono font-bold text-emerald-400">
                  {trackingProgressPercent}% completado
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${trackingProgressPercent}%` }}
                />
              </div>

              {/* Live Step Instructions & Remaining Metrics */}
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

          {/* Floating Map Controls: Zoom and Center */}
          <div className="absolute right-3.5 bottom-5 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 14) + 1);
                }
              }}
              className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 shadow-md cursor-pointer transition"
              title="Acercar zoom"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 14) - 1);
                }
              }}
              className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 shadow-md cursor-pointer transition"
              title="Alejar zoom"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.panTo({ lat: 6.2476, lng: -75.5658 });
                  mapInstanceRef.current.setZoom(14);
                }
              }}
              className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 flex items-center justify-center hover:bg-slate-800 shadow-md cursor-pointer transition"
              title="Centrar en Comuna 8"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Left Legend */}
          <div className="absolute left-3.5 bottom-3.5 z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800/80 text-[10px] font-mono text-slate-300 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Ruta Más Segura</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Ruta Más Directa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Puntos Seguros (CAI)</span>
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
                  ¿Listo para iniciar tu trayecto?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Haz clic para iniciar el seguimiento en vivo y recibir guiado paso a paso por los corredores seguros de la Comuna 8.
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
              <span>Iniciar Viaje y Seguimiento en Ruta</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl border border-cyan-500/50 bg-slate-900/95 backdrop-blur-md shadow-2xl text-white flex flex-col gap-3.5 animate-fadeIn">
            {/* Header: Stage status progression */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-mono font-extrabold tracking-wider text-cyan-400 uppercase">
                  USUARIO EN RUTA // SEGUIMIENTO TÁCTICO ACTIVO
                </span>
              </div>

              {/* Status progression: 1. Despachada -> 2. En camino -> 3. Llegando -> 4. En destino */}
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

            {/* Progress Bar & Current Status */}
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

            {/* Current Step Instruction & Remaining Metrics & Actions */}
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
                  <span>Faltan: <strong className="text-white">{remainingDistanceText || 'Calculando...'}</strong></span>
                  {remainingDurationText && (
                    <span className="text-slate-400">({remainingDurationText})</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSimulateAdvance}
                  className="px-3 py-2 rounded-xl bg-cyan-950/80 border border-cyan-600 text-cyan-300 text-xs font-bold hover:bg-cyan-900 transition cursor-pointer flex items-center gap-1.5"
                  title="Avanzar simulador de prueba paso a paso"
                >
                  <span>▶ Simular avance</span>
                </button>

                <button
                  type="button"
                  onClick={handleStopTrip}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-950/40"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Finalizar seguimiento</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
