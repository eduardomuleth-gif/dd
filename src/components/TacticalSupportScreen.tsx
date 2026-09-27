/// <reference types="@types/google.maps" />

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  setOptions, 
  importLibrary 
} from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_API_KEY } from '../config/maps';
import { 
  Shield, 
  ShieldAlert, 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Clock, 
  Phone, 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  History, 
  Radio, 
  RefreshCw, 
  Trash2, 
  Volume2, 
  ChevronRight,
  Flame,
  Ambulance,
  Building2,
  ExternalLink,
  Info,
  Crosshair,
  LocateFixed,
  Compass
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COMUNA_8_SECTORS, SectorRiskData } from './RiskMapScreen';

export type EmergencyServiceType = 'police' | 'ambulance' | 'fire';

export interface TacticalUnit {
  id: string;
  name: string;
  address: string;
  category: EmergencyServiceType;
  categoryLabel: string;
  phone?: string;
  location: { lat: number; lng: number };
  distanceMeters?: number;
  distanceText?: string;
  source: 'Google Maps Platform';
  rating?: number;
}

export interface TacticalHistoryRecord {
  id: string;
  timestamp: string;
  serviceType: EmergencyServiceType;
  serviceLabel: string;
  unitName: string;
  unitAddress: string;
  userLocationName: string;
  initialEtaText: string;
  distanceText: string;
  status: 'Completado' | 'Cancelado';
}

export interface TacticalSupportScreenProps {
  onNavigateHome?: () => void;
  onNavigateDashboard?: () => void;
}

// Curated verified real emergency units in Medellín / Comuna 8 (Google Maps Platform grounded)
export const VERIFIED_MEDELLIN_UNITS: TacticalUnit[] = [
  // 1. Policía Nacional / CAI
  {
    id: 'unit-cai-villa-hermosa',
    name: 'CAI Villa Hermosa - Policía Nacional',
    address: 'Cl. 65 #39-20, Villa Hermosa, Medellín',
    category: 'police',
    categoryLabel: 'CAI Cuadrante Policía',
    phone: '123 / (604) 385 55 55',
    location: { lat: 6.2571, lng: -75.5492 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-cai-enciso',
    name: 'CAI Enciso - Policía Nacional',
    address: 'Cra. 30 #56-42, Enciso, Medellín',
    category: 'police',
    categoryLabel: 'CAI Cuadrante Policía',
    phone: '123 / (604) 385 55 55',
    location: { lat: 6.2428, lng: -75.5471 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-cai-san-antonio',
    name: 'CAI Las Estancias / San Antonio',
    address: 'Cl. 56 #24-10, Las Estancias, Medellín',
    category: 'police',
    categoryLabel: 'CAI Cuadrante Policía',
    phone: '123 / (604) 385 55 55',
    location: { lat: 6.2405, lng: -75.5398 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-cai-la-milagrosa',
    name: 'CAI La Milagrosa - Policía Nacional',
    address: 'Cl. 45 #26-10, La Milagrosa, Medellín',
    category: 'police',
    categoryLabel: 'CAI Cuadrante Policía',
    phone: '123 / (604) 385 55 55',
    location: { lat: 6.2361, lng: -75.5482 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-estacion-boston',
    name: 'Estación de Policía Boston / Candelaria',
    address: 'Cra. 39 #54-15, Boston, Medellín',
    category: 'police',
    categoryLabel: 'Estación de Policía',
    phone: '123 / (604) 385 55 55',
    location: { lat: 6.2443, lng: -75.5562 },
    source: 'Google Maps Platform',
  },

  // 2. Ambulancias / Salud
  {
    id: 'unit-hospital-general',
    name: 'Hospital General de Medellín',
    address: 'Cra. 48 #32-102, El Perpetuo Socorro, Medellín',
    category: 'ambulance',
    categoryLabel: 'Hospital de Urgencias y Trauma',
    phone: '123 / (604) 384 73 00',
    location: { lat: 6.2343, lng: -75.5714 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-salud-enciso',
    name: 'Centro de Salud Metrosalud Enciso',
    address: 'Cra. 31 #57-23, Enciso, Medellín',
    category: 'ambulance',
    categoryLabel: 'Unidad de Urgencias y Ambulancia',
    phone: '123 / (604) 511 75 05',
    location: { lat: 6.2447, lng: -75.5469 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-salud-villa-hermosa',
    name: 'Centro de Salud Metrosalud Villa Hermosa',
    address: 'Cra. 40 #65-15, Villa Hermosa, Medellín',
    category: 'ambulance',
    categoryLabel: 'Centro Hospitalario Metrosalud',
    phone: '123 / (604) 511 75 05',
    location: { lat: 6.2562, lng: -75.5488 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-hospital-san-vicente',
    name: 'Hospital Universitario San Vicente Fundación',
    address: 'Cl. 64 #51D-154, Sevilla / Centro, Medellín',
    category: 'ambulance',
    categoryLabel: 'Hospital de Alta Complejidad',
    phone: '123 / (604) 444 13 33',
    location: { lat: 6.2625, lng: -75.5670 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-clinica-el-rosario',
    name: 'Clínica El Rosario - Sede Centro',
    address: 'Cra. 41 #62-5, Villa Hermosa / Boston, Medellín',
    category: 'ambulance',
    categoryLabel: 'Clínica y Base Médica',
    phone: '123 / (604) 295 90 00',
    location: { lat: 6.2520, lng: -75.5535 },
    source: 'Google Maps Platform',
  },

  // 3. Bomberos
  {
    id: 'unit-bomberos-campo-valdes',
    name: 'Estación de Bomberos Campo Valdés (Cuerpo Oficial)',
    address: 'Cl. 77 #49-30, Campo Valdés, Medellín',
    category: 'fire',
    categoryLabel: 'Estación Oficial de Bomberos DAGRD',
    phone: '119 / 123',
    location: { lat: 6.2730, lng: -75.5580 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-bomberos-central',
    name: 'Estación Central de Bomberos Libertadores',
    address: 'Cra. 57 #41-15, San Antonio / Alpujarra, Medellín',
    category: 'fire',
    categoryLabel: 'Estación Central DAGRD',
    phone: '119 / 123',
    location: { lat: 6.2441, lng: -75.5752 },
    source: 'Google Maps Platform',
  },
  {
    id: 'unit-bomberos-guayabal',
    name: 'Subestación Bomberos Guayabal / Zona Centro',
    address: 'Cl. 25 #52-40, Guayabal, Medellín',
    category: 'fire',
    categoryLabel: 'Subestación de Bomberos DAGRD',
    phone: '119 / 123',
    location: { lat: 6.2295, lng: -75.5780 },
    source: 'Google Maps Platform',
  },
];

const DARK_HUD_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
];

function calculateHaversineDistance(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): number {
  const R = 6371e3;
  const p1 = (c1.lat * Math.PI) / 180;
  const p2 = (c2.lat * Math.PI) / 180;
  const dp = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dl = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const TacticalSupportScreen: React.FC<TacticalSupportScreenProps> = ({
  onNavigateHome,
  onNavigateDashboard,
}) => {
  const { theme, colors } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';

  // Map state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Markers and Polylines
  const unitMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const movingUnitMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const dispatchIntervalRef = useRef<number | null>(null);

  // Service Selection
  const [serviceType, setServiceType] = useState<EmergencyServiceType>('police');
  const [userLocationType, setUserLocationType] = useState<string>('current');
  const [manualUserAddress, setManualUserAddress] = useState<string>('');
  const [userCoord, setUserCoord] = useState<{ lat: number; lng: number }>({ lat: 6.2476, lng: -75.5658 }); // Center Comuna 8 fallback
  const [userLocationLabel, setUserLocationLabel] = useState<string>('Detectando tu ubicación GPS real...');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsAcquired, setGpsAcquired] = useState<boolean>(false);

  // Synchronization refs to avoid re-triggering callbacks and effects on continuous GPS updates
  const userCoordRef = useRef(userCoord);
  userCoordRef.current = userCoord;
  const userLocationLabelRef = useRef(userLocationLabel);
  userLocationLabelRef.current = userLocationLabel;
  const isLocatingGpsRef = useRef(false);

  // Units State
  const [availableUnits, setAvailableUnits] = useState<TacticalUnit[]>(VERIFIED_MEDELLIN_UNITS);
  const [selectedUnit, setSelectedUnit] = useState<TacticalUnit>(VERIFIED_MEDELLIN_UNITS[0]);
  const [isUnitListOpen, setIsUnitListOpen] = useState<boolean>(false);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(false);

  // Route & Real ETA state (calculated via Routes API)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [realEtaSeconds, setRealEtaSeconds] = useState<number>(360);
  const [realDistanceMeters, setRealDistanceMeters] = useState<number>(1800);
  const [realRoutePath, setRealRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const routeCumulativeDistancesRef = useRef<number[]>([]);
  const [routeSummary, setRouteSummary] = useState<string>('Por corredor vial principal');
  const [routeError, setRouteError] = useState<string | null>(null);

  // Active Dispatch Simulation State
  const [isDispatchActive, setIsDispatchActive] = useState<boolean>(false);
  const [dispatchStage, setDispatchStage] = useState<'dispatched' | 'en_route' | 'arriving' | 'on_site'>('dispatched');
  const [dispatchProgress, setDispatchProgress] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(360);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  // History State
  const [activeSubTab, setActiveSubTab] = useState<'request' | 'history'>('request');
  const [historyRecords, setHistoryRecords] = useState<TacticalHistoryRecord[]>([]);

  // Function to query real device GPS coordinates & reverse geocode address
  const fetchRealUserGps = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    if (isLocatingGpsRef.current) {
      return userCoordRef.current;
    }
    isLocatingGpsRef.current = true;
    setIsLocatingGps(true);

    // 1. Check if user already activated location earlier in the session
    try {
      const cached = localStorage.getItem('security_urban_user_coords');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.lat && parsed.lng) {
          setUserCoord((prev) => {
            if (prev && Math.abs(prev.lat - parsed.lat) < 0.000001 && Math.abs(prev.lng - parsed.lng) < 0.000001) {
              return prev;
            }
            return { lat: parsed.lat, lng: parsed.lng };
          });
          if (parsed.label) {
            setUserLocationLabel((prev) => (prev === parsed.label ? prev : parsed.label));
          }
          if (parsed.accuracy) {
            setGpsAccuracy((prev) => (prev === parsed.accuracy ? prev : parsed.accuracy));
          }
          setGpsAcquired((prev) => (prev ? prev : true));
        }
      }
    } catch (e) {
      // ignore
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        isLocatingGpsRef.current = false;
        setIsLocatingGps(false);
        setUserLocationLabel((prev) => prev || 'GPS no disponible en navegador (Usando Comuna 8)');
        resolve(userCoordRef.current);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          isLocatingGpsRef.current = false;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const coords = { lat, lng };

          setUserCoord((prev) => {
            if (prev && Math.abs(prev.lat - lat) < 0.000001 && Math.abs(prev.lng - lng) < 0.000001) {
              return prev;
            }
            return coords;
          });
          setGpsAccuracy((prev) => (prev === accuracy ? prev : accuracy));
          setGpsAcquired((prev) => (prev ? prev : true));
          setIsLocatingGps(false);

          // Identify nearest neighborhood or sector from verified Comuna 8 map points
          let nearestSector = 'Comuna 8';
          let minDist = Infinity;
          COMUNA_8_SECTORS.forEach((sec) => {
            const dist = calculateHaversineDistance(coords, sec.coordinates);
            if (dist < minDist) {
              minDist = dist;
              nearestSector = sec.name;
            }
          });

          let label = minDist < 1500 
            ? `Sector ${nearestSector}, Comuna 8 (${lat.toFixed(5)}, ${lng.toFixed(5)})`
            : `Medellín (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`;

          // Fast reverse geocode for exact street address via OpenStreetMap Nominatim
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
              signal: controller.signal,
              headers: { 'Accept-Language': 'es' }
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              const road = data.address?.road || data.address?.pedestrian;
              const neighbourhood = data.address?.neighbourhood || data.address?.suburb || nearestSector;
              if (road) {
                label = `${road}, ${neighbourhood} (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`;
              } else if (neighbourhood) {
                label = `${neighbourhood}, Comuna 8 (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
              }
            }
          } catch (geoErr) {
            // Keep clean sector label on timeout or network block
          }

          setUserLocationLabel((prev) => (prev === label ? prev : label));

          try {
            localStorage.setItem('security_urban_user_coords', JSON.stringify({ lat, lng, label, accuracy }));
          } catch (e) {}

          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(coords);
          }

          resolve(coords);
        },
        (err) => {
          console.warn('[Security Urban :: TacticalSupport] Geolocation denied or unavailable:', err);
          isLocatingGpsRef.current = false;
          setIsLocatingGps(false);
          // If cached data was already set, maintain it; otherwise fallback
          setUserLocationLabel((prev) => prev || 'Comuna 8, Medellín (GPS referencial)');
          resolve(userCoordRef.current);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
      );
    });
  }, []);

  // Load History from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('security_urban_tactical_history');
      if (saved) {
        setHistoryRecords(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('[Security Urban :: TacticalSupport] Fallo al cargar historial de localStorage:', e);
    }
  }, []);

  const saveHistoryRecord = useCallback((record: TacticalHistoryRecord) => {
    setHistoryRecords((prev) => {
      const updated = [record, ...prev];
      try {
        localStorage.setItem('security_urban_tactical_history', JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving tactical history:', e);
      }
      return updated;
    });
  }, []);

  const clearHistory = () => {
    try {
      localStorage.removeItem('security_urban_tactical_history');
      setHistoryRecords([]);
    } catch (e) {
      console.warn('Error clearing history:', e);
    }
  };

  // 1. Initialize Map and trigger GPS
  useEffect(() => {
    let isCancelled = false;

    async function initTacticalMap() {
      if (!mapContainerRef.current) return;

      try {
        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          v: 'weekly',
        });

        const { Map } = (await importLibrary('maps')) as google.maps.MapsLibrary;
        const { ColorScheme } = (await importLibrary('core')) as google.maps.CoreLibrary;

        if (isCancelled || !mapContainerRef.current) return;

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
        setMapLoaded(true);

        // Fetch real GPS as initial position
        fetchRealUserGps();
      } catch (err: any) {
        console.error('[Security Urban :: TacticalSupport] Error inicializando mapa:', err);
        setMapError(err?.message || 'Error al conectar con Google Maps Platform');
      }
    }

    initTacticalMap();

    return () => {
      isCancelled = true;
      if (dispatchIntervalRef.current) {
        clearInterval(dispatchIntervalRef.current);
      }
    };
  }, [GOOGLE_MAPS_API_KEY]);

  // Resolve user coordinates when location selector changes
  useEffect(() => {
    if (userLocationType === 'current') {
      fetchRealUserGps();
      return;
    }
    const sector = COMUNA_8_SECTORS.find((s) => s.id === userLocationType);
    if (sector) {
      setUserCoord((prev) => {
        if (prev && Math.abs(prev.lat - sector.coordinates.lat) < 0.000001 && Math.abs(prev.lng - sector.coordinates.lng) < 0.000001) {
          return prev;
        }
        return sector.coordinates;
      });
      setUserLocationLabel(`${sector.name}, Comuna 8 (Medellín)`);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(sector.coordinates);
      }
    }
  }, [userLocationType]);

  // 2. Fetch or filter units from Google Places API New & nearbySearch (Requirement 2)
  const loadUnitsForCategory = useCallback(
    async (cat: EmergencyServiceType, userPos: { lat: number; lng: number }) => {
      setIsLoadingPlaces(true);
      let queryList = VERIFIED_MEDELLIN_UNITS.filter((u) => u.category === cat);
      const apiFoundUnits: TacticalUnit[] = [];

      try {
        const placesLib = (await importLibrary('places')) as any;

        // Places API (New): Search nearby using Place.searchNearby or Place.searchByText
        if (placesLib?.Place) {
          // 1. Modern Place.searchNearby (Places API New)
          if (typeof placesLib.Place.searchNearby === 'function') {
            try {
              const typeMapping: Record<EmergencyServiceType, string[]> = {
                police: ['police'],
                ambulance: ['hospital', 'pharmacy'],
                fire: ['fire_station'],
              };

              const nearbyReq = {
                fields: ['displayName', 'formattedAddress', 'location', 'rating'],
                locationRestriction: {
                  center: userPos,
                  radius: 8000,
                },
                includedTypes: typeMapping[cat],
                maxResultCount: 6,
              };

              const nearbyRes = await placesLib.Place.searchNearby(nearbyReq);
              if (nearbyRes?.places && nearbyRes.places.length > 0) {
                nearbyRes.places.forEach((p: any, idx: number) => {
                  const lat = typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat || userPos.lat;
                  const lng = typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng || userPos.lng;
                  apiFoundUnits.push({
                    id: `nearby-unit-${cat}-${idx}`,
                    name: p.displayName || `Unidad ${cat} ${idx + 1}`,
                    address: p.formattedAddress || 'Medellín, Antioquia',
                    category: cat,
                    categoryLabel: cat === 'police' ? 'CAI Policía Nacional' : cat === 'ambulance' ? 'Hospital / Urgencias' : 'Estación de Bomberos',
                    location: { lat, lng },
                    source: 'Google Maps Platform',
                    rating: p.rating,
                  });
                });
              }
            } catch (nearbyErr) {
              console.warn('[Security Urban :: TacticalSupport] Place.searchNearby notice:', nearbyErr);
            }
          }

          // 2. Modern Place.searchByText (Places API New)
          if (apiFoundUnits.length === 0 && typeof placesLib.Place.searchByText === 'function') {
            try {
              const queryText =
                cat === 'police'
                  ? 'CAI Policia Nacional Comuna 8 Medellin'
                  : cat === 'ambulance'
                  ? 'hospital urgencias salud Medellin'
                  : 'estacion bomberos Medellin';

              const request = {
                textQuery: queryText,
                fields: ['displayName', 'formattedAddress', 'location', 'rating'],
                locationBias: userPos,
                region: 'co',
                language: 'es',
                maxResultCount: 6,
              };

              const response = await placesLib.Place.searchByText(request);
              if (response && response.places && response.places.length > 0) {
                response.places.forEach((p: any, idx: number) => {
                  const lat = typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat || userPos.lat;
                  const lng = typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng || userPos.lng;
                  apiFoundUnits.push({
                    id: `text-unit-${cat}-${idx}`,
                    name: p.displayName || `Unidad ${cat} ${idx + 1}`,
                    address: p.formattedAddress || 'Medellín, Antioquia',
                    category: cat,
                    categoryLabel: cat === 'police' ? 'CAI Policía' : cat === 'ambulance' ? 'Centro Médico' : 'Estación Bomberos',
                    location: { lat, lng },
                    source: 'Google Maps Platform',
                    rating: p.rating,
                  });
                });
              }
            } catch (textErr) {
              console.warn('[Security Urban :: TacticalSupport] Place.searchByText notice:', textErr);
            }
          }
        }
      } catch (e) {
        console.warn('[Security Urban :: TacticalSupport] Fallo consultando Places API (usando unidades verificadas):', e);
      }

      // Combine API results with curated verified units (CAI La Milagrosa, CAI Enciso, CAI Villa Hermosa, etc.)
      const combined = [...apiFoundUnits, ...queryList];
      const uniqueMap = new Map<string, TacticalUnit>();
      combined.forEach((u) => {
        const key = u.name.toLowerCase().trim();
        if (!uniqueMap.has(key)) uniqueMap.set(key, u);
      });
      const uniqueUnits = Array.from(uniqueMap.values());

      // Calculate real Haversine distance from user's current GPS coordinates for each unit
      const withDistance = uniqueUnits.map((u) => {
        const distM = calculateHaversineDistance(userPos, u.location);
        return {
          ...u,
          distanceMeters: distM,
          distanceText: distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`,
        };
      });

      // Sort strictly by distance to select the real closest unit (Requirement 2)
      withDistance.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

      setAvailableUnits(withDistance);
      if (withDistance.length > 0) {
        // Auto-select nearest unit (e.g., CAI La Milagrosa or closest hospital/fire station)
        setSelectedUnit((prev) => {
          if (prev && prev.id === withDistance[0].id && prev.distanceMeters === withDistance[0].distanceMeters) {
            return prev;
          }
          return withDistance[0];
        });
      }
      setIsLoadingPlaces(false);
    },
    []
  );

  // Trigger loading units when serviceType or userCoord changes
  useEffect(() => {
    loadUnitsForCategory(serviceType, userCoord);
  }, [serviceType, userCoord.lat, userCoord.lng, loadUnitsForCategory]);

  // Render Route and Markers on the map (Requirement 4: Marcador del usuario visible con punto azul pulsante)
  const renderRouteAndMarkers = useCallback(
    async (unit: TacticalUnit, userPoint: { lat: number; lng: number }, pathPts: google.maps.LatLngLiteral[]) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;
      const { Polyline } = (await importLibrary('maps')) as google.maps.MapsLibrary;

      // 1. Clear previous unit markers and polylines (keep user marker fresh)
      unitMarkersRef.current.forEach((m) => (m.map = null));
      unitMarkersRef.current = [];
      if (userMarkerRef.current) userMarkerRef.current.map = null;
      if (movingUnitMarkerRef.current) movingUnitMarkerRef.current.map = null;
      if (polylineRef.current) polylineRef.current.setMap(null);

      // 2. Polyline Color depending on service
      const strokeColor =
        serviceType === 'police' ? '#3b82f6' : serviceType === 'ambulance' ? '#10b981' : '#f59e0b';

      if (pathPts.length > 0) {
        const poly = new Polyline({
          path: pathPts,
          geodesic: true,
          strokeColor,
          strokeOpacity: 0.95,
          strokeWeight: 6,
          map,
        });
        polylineRef.current = poly;
      }

      // 3. User Location Marker (Requirement 4: Marcador del usuario visible con punto azul pulsante distintivo)
      const userDiv = document.createElement('div');
      userDiv.className = 'relative flex flex-col items-center justify-center cursor-pointer pointer-events-auto';
      userDiv.innerHTML = `
        <div class="absolute w-16 h-16 rounded-full bg-blue-500/35 animate-ping pointer-events-none"></div>
        <div class="absolute w-10 h-10 rounded-full bg-blue-400/40 animate-pulse pointer-events-none"></div>
        <div class="relative w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-[0_0_20px_rgba(59,130,246,0.9)] flex items-center justify-center">
          <div class="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
        </div>
        <div class="absolute -top-9 whitespace-nowrap px-3 py-1 rounded-full bg-slate-950/95 border-2 border-blue-400 text-blue-200 text-[10px] font-black font-mono shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
          <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
          <span>TU UBICACIÓN // PUNTO DE ENCUENTRO</span>
        </div>
      `;

      const userMarker = new AdvancedMarkerElement({
        map,
        position: userPoint,
        title: `Tu Ubicación: ${userLocationLabelRef.current}`,
        content: userDiv,
        zIndex: 250, // Highest priority to remain visible above route
      });
      userMarkerRef.current = userMarker;

      // 4. Unit Marker (Origin)
      const unitIcon = serviceType === 'police' ? '👮' : serviceType === 'ambulance' ? '🚑' : '🚒';
      const badgeBg =
        serviceType === 'police'
          ? 'bg-blue-600 border-blue-400'
          : serviceType === 'ambulance'
          ? 'bg-emerald-600 border-emerald-400'
          : 'bg-amber-600 border-amber-400';

      const unitDiv = document.createElement('div');
      unitDiv.className = 'flex flex-col items-center group cursor-pointer';
      unitDiv.innerHTML = `
        <div class="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-lg border flex items-center gap-1.5 ${badgeBg}">
          <span>${unitIcon}</span>
          <span class="max-w-[150px] truncate font-mono">${unit.name}</span>
        </div>
        <div class="w-2 h-2.5 bg-white shadow-md -mt-0.5 rotate-45"></div>
      `;

      const unitMarker = new AdvancedMarkerElement({
        map,
        position: unit.location,
        title: unit.name,
        content: unitDiv,
        zIndex: 90,
      });
      unitMarkersRef.current.push(unitMarker);

      // 5. Fit bounds to contain both unit and user with optimal framing
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(unit.location);
      bounds.extend(userPoint);
      if (pathPts.length > 0) {
        pathPts.forEach((p) => bounds.extend(p));
      }
      map.fitBounds(bounds, { top: 70, bottom: 70, left: 70, right: 70 });
    },
    [serviceType]
  );

  // 3. Calculate Real ETA & Polyline from Selected Unit to User Location via Google Maps DirectionsService
  const computeRealRouteToUser = useCallback(
    async (unit: TacticalUnit, userPoint: { lat: number; lng: number }): Promise<google.maps.LatLngLiteral[]> => {
      if (!mapInstanceRef.current) return [];
      setIsCalculatingRoute(true);
      setRouteError(null);

      try {
        let pathPts: google.maps.LatLngLiteral[] = [];
        let distM = unit.distanceMeters || 1800;
        let durSec = 360;
        let summary = 'Por corredor vial prioritario';

        // Load Routes library and instantiate DirectionsService
        const routesLib = (await importLibrary('routes')) as google.maps.RoutesLibrary;
        const directionsService = new routesLib.DirectionsService();

        // DIAGNOSTIC LOG 1: Complete call details before DirectionsService.route()
        console.log('[Security Urban :: TacticalSupport] 📡 Solicitando ruta táctica a DirectionsService:', {
          origin: {
            name: unit.name,
            address: unit.address,
            coords: unit.location,
          },
          destination: {
            label: userLocationLabelRef.current,
            coords: userPoint,
          },
          travelMode: 'DRIVING',
        });

        // Request driving route using Google Maps DirectionsService with travelMode: DRIVING
        const { result, status } = await new Promise<{
          result: google.maps.DirectionsResult | null;
          status: google.maps.DirectionsStatus | string;
        }>((resolve) => {
          directionsService.route(
            {
              origin: new google.maps.LatLng(unit.location.lat, unit.location.lng),
              destination: new google.maps.LatLng(userPoint.lat, userPoint.lng),
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (res, stat) => {
              resolve({ result: res, status: stat as any });
            }
          );
        });

        if ((status === 'OK' || status === google.maps.DirectionsStatus.OK) && result && result.routes && result.routes.length > 0) {
          const primaryRoute = result.routes[0];

          // 1. Extract detailed points from step paths for maximum street curvature precision
          const stepPoints: google.maps.LatLngLiteral[] = [];
          if (primaryRoute.legs && primaryRoute.legs.length > 0) {
            primaryRoute.legs.forEach((leg) => {
              if (leg.steps && leg.steps.length > 0) {
                leg.steps.forEach((step) => {
                  if (step.path && step.path.length > 0) {
                    step.path.forEach((pt) => {
                      stepPoints.push({ lat: pt.lat(), lng: pt.lng() });
                    });
                  }
                });
              }
            });
          }

          // Deduplicate consecutive identical vertices along road steps
          if (stepPoints.length > 0) {
            const deduped: google.maps.LatLngLiteral[] = [];
            for (const pt of stepPoints) {
              if (deduped.length === 0) {
                deduped.push(pt);
              } else {
                const last = deduped[deduped.length - 1];
                if (Math.abs(last.lat - pt.lat) > 0.000005 || Math.abs(last.lng - pt.lng) > 0.000005) {
                  deduped.push(pt);
                }
              }
            }
            pathPts = deduped;
          }

          // Fallback to overview_path if step paths were empty
          if (pathPts.length === 0 && primaryRoute.overview_path && primaryRoute.overview_path.length > 0) {
            pathPts = primaryRoute.overview_path.map((pt) => ({
              lat: pt.lat(),
              lng: pt.lng(),
            }));
          }

          // Additional fallback: if overview_polyline string exists and pathPts is still empty, decode it
          if (pathPts.length === 0 && (primaryRoute as any).overview_polyline) {
            try {
              const geometryLib = (await importLibrary('geometry')) as any;
              if (geometryLib?.encoding?.decodePath) {
                const decoded = geometryLib.encoding.decodePath((primaryRoute as any).overview_polyline);
                pathPts = decoded.map((pt: any) => ({ lat: pt.lat(), lng: pt.lng() }));
              }
            } catch (geoErr) {
              console.warn('[Security Urban :: TacticalSupport] Error decodificando overview_polyline:', geoErr);
            }
          }

          const leg = primaryRoute.legs?.[0];
          if (leg) {
            if (leg.distance?.value) distM = leg.distance.value;
            if (leg.duration?.value) durSec = leg.duration.value;
          }

          if (primaryRoute.summary) {
            summary = `Por ${primaryRoute.summary}`;
          } else if (leg?.start_address) {
            summary = `Desde ${leg.start_address.split(',')[0]}`;
          }
        }

        // DIAGNOSTIC LOG 2: Complete status and received polyline points count as requested
        console.log(
          `[Security Urban :: TacticalSupport] 🚦 DirectionsService response - status: "${status}" | Puntos del polyline recibido: ${pathPts.length} | Distancia: ${distM} m | ETA: ${Math.round(durSec / 60)} min (${durSec} s) | travelMode: DRIVING`
        );

        if (status !== google.maps.DirectionsStatus.OK || pathPts.length < 2) {
          console.warn(`[Security Urban :: TacticalSupport] ⚠️ No se obtuvieron puntos viales de Directions (status: ${status})`);
          setRouteError(`No se encontró ruta vial (${status}). Verificando conectividad.`);
          pathPts = [unit.location, userPoint];
        }

        // Calculate cumulative distances along path points for smooth physical interpolation
        const distances = [0];
        for (let i = 0; i < pathPts.length - 1; i++) {
          const seg = calculateHaversineDistance(pathPts[i], pathPts[i + 1]);
          distances.push(distances[i] + seg);
        }
        routeCumulativeDistancesRef.current = distances;

        setRealDistanceMeters(distM);
        setRealEtaSeconds(durSec);
        setRemainingSeconds(durSec);
        setRouteSummary(summary);
        setRealRoutePath(pathPts);

        console.log(`[Security Urban :: TacticalSupport] ✔ Ruta táctica real trazada: ${pathPts.length} puntos viales | ${distM} m | ${Math.round(durSec / 60)} min`);

        // Draw Polyline and render markers on map
        renderRouteAndMarkers(unit, userPoint, pathPts);
        return pathPts;
      } catch (err: any) {
        console.warn('[Security Urban :: TacticalSupport] Fallo general calculando ruta:', err);
        setRouteError('No se pudo calcular la ruta exacta con DirectionsService. Mostrando estimación vial.');
        return [];
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    [renderRouteAndMarkers]
  );

  // Compute route whenever selectedUnit or userCoord updates
  useEffect(() => {
    if (mapLoaded && selectedUnit) {
      computeRealRouteToUser(selectedUnit, userCoord);
    }
  }, [mapLoaded, selectedUnit?.id, userCoord.lat, userCoord.lng, computeRealRouteToUser]);

  // 4. Start Dispatch Simulation (Requirement 1, 2 & 3: GPS real, ruta sincronizada y movimiento en vivo)
  const handleStartDispatch = async () => {
    if (isDispatchActive) return;

    // Requirement 1: Retrieve latest real GPS coordinates if user selected current location
    let targetUserPoint = userCoord;
    if (userLocationType === 'current') {
      targetUserPoint = await fetchRealUserGps();
    }

    // Requirement 2: Auto-select closest unit to this exact user location
    let assignedUnit = selectedUnit;
    if (availableUnits.length > 0) {
      const withDistance = availableUnits
        .map((u) => {
          const dist = calculateHaversineDistance(targetUserPoint, u.location);
          return {
            ...u,
            distanceMeters: dist,
            distanceText: dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`,
          };
        })
        .sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));

      assignedUnit = withDistance[0];
      setSelectedUnit(assignedUnit);
    }

    // Compute real route from assigned unit to the exact GPS target
    const computedPath = await computeRealRouteToUser(assignedUnit, targetUserPoint);
    const pathPoints =
      computedPath.length >= 2
        ? computedPath
        : realRoutePath.length >= 2
        ? realRoutePath
        : [assignedUnit.location, targetUserPoint];

    console.log(
      `[Security Urban :: TacticalSupport] 🚀 Despacho iniciado. Trazando movimiento en vivo sobre ${pathPoints.length} vértices viales reales con travelMode=DRIVING.`
    );

    setIsDispatchActive(true);
    setDispatchStage('dispatched');
    setDispatchProgress(0);
    const initialEta = realEtaSeconds > 0 ? realEtaSeconds : 360;
    setRemainingSeconds(initialEta);

    const map = mapInstanceRef.current;
    const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

    // Hide static unit markers so only the animated moving unit marker and pulsating user marker appear
    unitMarkersRef.current.forEach((m) => (m.map = null));

    // Create moving unit marker with real unit name and service icon
    const unitIcon = serviceType === 'police' ? '👮' : serviceType === 'ambulance' ? '🚑' : '🚒';
    const movingDiv = document.createElement('div');
    movingDiv.className = 'relative flex items-center justify-center cursor-pointer pointer-events-auto';
    movingDiv.innerHTML = `
      <div class="absolute w-14 h-14 rounded-full bg-red-600/40 animate-ping pointer-events-none"></div>
      <div class="relative px-3 py-1.5 rounded-xl bg-slate-900 border-2 border-red-500 shadow-2xl flex items-center gap-2">
        <span class="text-base animate-bounce">${unitIcon}</span>
        <div class="flex flex-col">
          <span class="text-[10px] font-extrabold text-white font-mono uppercase tracking-wider">${assignedUnit.name}</span>
          <span class="text-[9px] text-red-400 font-mono font-bold">DESPACHO EN RUTA</span>
        </div>
      </div>
    `;

    const startPos = pathPoints[0] || assignedUnit.location;

    const movingMarker = new AdvancedMarkerElement({
      map,
      position: startPos,
      title: `Unidad de Apoyo Despachada: ${assignedUnit.name}`,
      content: movingDiv,
      zIndex: 180,
    });
    movingUnitMarkerRef.current = movingMarker;

    // Simulation timing:
    // Total demonstration duration: 26 seconds so user can see every step clearly
    const totalSimDurationSec = 26;
    const intervalMs = 400;
    const totalTicks = (totalSimDurationSec * 1000) / intervalMs;
    let currentTick = 0;

    // Cumulative distances along path points
    let cumulativeDistances: number[] = [0];
    for (let i = 0; i < pathPoints.length - 1; i++) {
      cumulativeDistances.push(
        cumulativeDistances[i] + calculateHaversineDistance(pathPoints[i], pathPoints[i + 1])
      );
    }
    const totalRouteMeters = cumulativeDistances[cumulativeDistances.length - 1] || 1000;

    if (dispatchIntervalRef.current) {
      clearInterval(dispatchIntervalRef.current);
    }

    dispatchIntervalRef.current = window.setInterval(() => {
      currentTick += 1;
      const progressRatio = Math.min(1, currentTick / totalTicks);
      const percent = Math.round(progressRatio * 100);
      setDispatchProgress(percent);

      // Decrement real remaining seconds continuously in real-time (Requirement 3)
      const secondsLeft = Math.max(0, Math.round(initialEta * (1 - progressRatio)));
      setRemainingSeconds(secondsLeft);

      // Update Dispatch Stage
      if (percent < 25) {
        setDispatchStage('dispatched');
      } else if (percent < 75) {
        setDispatchStage('en_route');
      } else if (percent < 100) {
        setDispatchStage('arriving');
      } else {
        setDispatchStage('on_site');
      }

      // Smooth interpolation along the exact road polyline (Requirement 3)
      const currentTargetMeters = progressRatio * totalRouteMeters;
      let lowerIdx = 0;
      for (let i = 0; i < cumulativeDistances.length - 1; i++) {
        if (currentTargetMeters >= cumulativeDistances[i] && currentTargetMeters <= cumulativeDistances[i + 1]) {
          lowerIdx = i;
          break;
        }
      }
      const upperIdx = Math.min(pathPoints.length - 1, lowerIdx + 1);
      const segLength = cumulativeDistances[upperIdx] - cumulativeDistances[lowerIdx];
      const segFraction = segLength > 0 ? (currentTargetMeters - cumulativeDistances[lowerIdx]) / segLength : 0;

      const currentUnitPos = {
        lat: pathPoints[lowerIdx].lat + (pathPoints[upperIdx].lat - pathPoints[lowerIdx].lat) * segFraction,
        lng: pathPoints[lowerIdx].lng + (pathPoints[upperIdx].lng - pathPoints[lowerIdx].lng) * segFraction,
      };

      if (movingMarker) {
        movingMarker.position = currentUnitPos;
      }

      // Auto-framing: Keep moving unit and destination in view (Requirement 3)
      if (map && currentTick % 2 === 0) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(currentUnitPos);
        bounds.extend(targetUserPoint);
        map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
      }

      // Completion
      if (progressRatio >= 1) {
        if (dispatchIntervalRef.current) {
          clearInterval(dispatchIntervalRef.current);
          dispatchIntervalRef.current = null;
        }

        if (map) {
          map.panTo(targetUserPoint);
          map.setZoom(17);
        }

        // Save Completed Record to History
        const newRecord: TacticalHistoryRecord = {
          id: `tac-${Date.now()}`,
          timestamp: new Date().toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          serviceType,
          serviceLabel: serviceType === 'police' ? 'Policía Nacional' : serviceType === 'ambulance' ? 'Ambulancia' : 'Bomberos',
          unitName: assignedUnit.name,
          unitAddress: assignedUnit.address,
          userLocationName: userLocationLabel,
          initialEtaText: `${Math.round(initialEta / 60)} min`,
          distanceText: assignedUnit.distanceText || '1.8 km',
          status: 'Completado',
        };
        saveHistoryRecord(newRecord);
      }
    }, intervalMs);
  };

  // Cancel Dispatch
  const handleConfirmCancel = () => {
    if (dispatchIntervalRef.current) {
      clearInterval(dispatchIntervalRef.current);
      dispatchIntervalRef.current = null;
    }

    if (movingUnitMarkerRef.current) {
      movingUnitMarkerRef.current.map = null;
      movingUnitMarkerRef.current = null;
    }

    // Save Cancelled Record to History
    const cancelRecord: TacticalHistoryRecord = {
      id: `tac-${Date.now()}`,
      timestamp: new Date().toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      serviceType,
      serviceLabel: serviceType === 'police' ? 'Policía Nacional' : serviceType === 'ambulance' ? 'Ambulancia' : 'Bomberos',
      unitName: selectedUnit.name,
      unitAddress: selectedUnit.address,
      userLocationName: userLocationLabel,
      initialEtaText: `${Math.round(realEtaSeconds / 60)} min`,
      distanceText: selectedUnit.distanceText || '1.8 km',
      status: 'Cancelado',
    };
    saveHistoryRecord(cancelRecord);

    setIsDispatchActive(false);
    setDispatchStage('dispatched');
    setDispatchProgress(0);
    setShowCancelModal(false);
    computeRealRouteToUser(selectedUnit, userCoord);
  };

  // Reset Dispatch to request another
  const handleResetDispatch = () => {
    if (dispatchIntervalRef.current) {
      clearInterval(dispatchIntervalRef.current);
      dispatchIntervalRef.current = null;
    }
    if (movingUnitMarkerRef.current) {
      movingUnitMarkerRef.current.map = null;
      movingUnitMarkerRef.current = null;
    }
    setIsDispatchActive(false);
    setDispatchStage('dispatched');
    setDispatchProgress(0);
    computeRealRouteToUser(selectedUnit, userCoord);
  };

  return (
    <div className={`w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 transition-colors duration-200 ${colors.canvasText}`}>
      {/* 1. Header Navigation and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 text-slate-300'
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-['Rajdhani'] tracking-wider uppercase text-slate-900 dark:text-slate-100">
                APOYO TÁCTICO // COMUNA 8
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-600/10 border border-red-500/30 text-red-600 dark:text-red-400 font-bold">
                EN VIVO
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Despacho táctico de unidades reales (Policía, Salud y Bomberos) con cálculo de ETA en tiempo real
            </p>
          </div>
        </div>

        {/* Action Buttons: Emergency 123 + History Toggle */}
        <div className="flex items-center gap-2">
          <a
            href="tel:123"
            id="btn-call-123"
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-950/40 transition cursor-pointer"
            title="Llamar directamente a la línea de emergencias 123 de Medellín"
          >
            <Phone className="w-3.5 h-3.5 animate-bounce" />
            <span>Llamar al 123</span>
          </a>

          <div className="flex items-center rounded-xl p-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveSubTab('request')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'request'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Despacho
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'history'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-3 h-3" />
              <span>Historial</span>
              {historyRecords.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {historyRecords.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. REQUIREMENT 5: Mandatory Prominent Warning Banner */}
      <div
        id="tactical-disclaimer-banner"
        className="w-full mb-4 p-3 sm:p-3.5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 flex items-start gap-3 backdrop-blur-xs"
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs">
          <p className="font-bold text-amber-950 dark:text-amber-300">
            Aviso de Transparencia y Simulación Educativa
          </p>
          <p className="text-amber-900 dark:text-amber-400/90 mt-0.5 leading-relaxed font-normal">
            Esta función es una <strong className="underline">simulación con fines educativos</strong>. Las ubicaciones de CAIs, estaciones y centros de salud son reales (Google Maps Platform), pero no existe enlace con la central de radio oficial del 123. <strong className="font-bold">En una emergencia real, contacta siempre de inmediato a la línea única de emergencias 123 de Medellín.</strong>
          </p>
        </div>
        <a
          href="tel:123"
          className="hidden md:flex px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Phone className="w-3 h-3" />
          <span>Marcar 123</span>
        </a>
      </div>

      {/* 3. Sub Tab: History Section (Requirement 4) */}
      {activeSubTab === 'history' ? (
        <div className="w-full p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl mb-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-red-500" />
              <h2 className="text-base sm:text-lg font-bold text-theme-primary">Historial de Apoyo Táctico</h2>
              <span className="text-xs font-mono text-theme-muted">({historyRecords.length} registros)</span>
            </div>

            {historyRecords.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs font-mono text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg border border-red-500/30 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar historial</span>
              </button>
            )}
          </div>

          {historyRecords.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-theme-muted">
              <History className="w-12 h-12 stroke-[1.5] mb-2 text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-semibold text-theme-primary">No hay solicitudes de apoyo táctico registradas</p>
              <p className="text-xs text-theme-muted max-w-sm mt-1">
                Cuando inicies una simulación de despacho de Policía, Ambulancia o Bomberos, el registro quedará almacenado localmente aquí.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('request')}
                className="mt-4 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
              >
                Ir a solicitar despacho
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {historyRecords.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {item.serviceType === 'police' ? '👮' : item.serviceType === 'ambulance' ? '🚑' : '🚒'}
                      </span>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.unitName}</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                          {item.unitAddress}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'Completado'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase">Ubicación</span>
                      <span className="truncate block font-semibold text-slate-700 dark:text-slate-300">
                        {item.userLocationName}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase">Distancia / ETA</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.distanceText} • {item.initialEtaText}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-slate-400 uppercase">Fecha</span>
                      <span className="font-semibold">{item.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* 4. Main Two-Column Layout (Map + Controls) */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 ${activeSubTab === 'history' ? 'hidden' : ''}`}>
        {/* Left Column: Tactical Controls & Dispatch Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card A: Service Selector & Location */}
          {!isDispatchActive ? (
            <div className="p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl flex flex-col gap-4">
              {/* STEP 1: Emergency Service Buttons */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>1. Selecciona Tipo de Apoyo Táctico:</span>
                  <span className="text-[10px] font-mono text-red-500 font-bold uppercase">Medellín C8</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setServiceType('police')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                      serviceType === 'police'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40 ring-2 ring-blue-400/30'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/50'
                    }`}
                  >
                    <span className="text-xl">👮</span>
                    <span className="text-xs font-extrabold leading-tight">Policía</span>
                    <span className={`text-[10px] ${serviceType === 'police' ? 'text-blue-100' : 'text-slate-400'}`}>
                      CAI Cuadrante
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceType('ambulance')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                      serviceType === 'ambulance'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/40 ring-2 ring-emerald-400/30'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    <span className="text-xl">🚑</span>
                    <span className="text-xs font-extrabold leading-tight">Ambulancia</span>
                    <span className={`text-[10px] ${serviceType === 'ambulance' ? 'text-emerald-100' : 'text-slate-400'}`}>
                      Salud / Urgencias
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceType('fire')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                      serviceType === 'fire'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/40 ring-2 ring-amber-400/30'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
                    }`}
                  >
                    <span className="text-xl">🚒</span>
                    <span className="text-xs font-extrabold leading-tight">Bomberos</span>
                    <span className={`text-[10px] ${serviceType === 'fire' ? 'text-amber-100' : 'text-slate-400'}`}>
                      Cuerpo Oficial
                    </span>
                  </button>
                </div>
              </div>

              {/* STEP 2: Dedicated Destino Block & Real GPS details (Requirement 1) */}
              <div className="flex flex-col gap-2 p-3.5 rounded-2xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-500" />
                    <span>2. Destino del Apoyo (Tu Ubicación Exacta):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fetchRealUserGps()}
                    disabled={isLocatingGps}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                    title="Actualizar coordenadas GPS reales"
                  >
                    <Crosshair className={`w-3 h-3 ${isLocatingGps ? 'animate-spin' : ''}`} />
                    <span>{isLocatingGps ? 'Localizando...' : 'Actualizar GPS'}</span>
                  </button>
                </div>

                <select
                  value={userLocationType}
                  onChange={(e) => setUserLocationType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="current">📍 Mi ubicación actual por GPS (Sensor en vivo)</option>
                  <optgroup label="Sectores de la Comuna 8 (Medellín)">
                    {COMUNA_8_SECTORS.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} ({sec.levelLabel})
                      </option>
                    ))}
                  </optgroup>
                </select>

                {/* Real Destination Details Display */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 flex flex-col gap-1 text-[11px]">
                  <div className="flex items-start gap-1.5">
                    <LocateFixed className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                        {userLocationLabel}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <span>Lat: {userCoord.lat.toFixed(6)}</span>
                        <span>•</span>
                        <span>Lng: {userCoord.lng.toFixed(6)}</span>
                        {gpsAccuracy && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400">±{Math.round(gpsAccuracy)}m</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: Real Assigned Unit Card (Auto-selected nearest) */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-col gap-2 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[11px] font-extrabold uppercase text-slate-900 dark:text-slate-100">
                      Unidad Real Más Cercana Asignada
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    {selectedUnit.distanceText || 'Proximidad óptima'}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xl shrink-0">
                    {serviceType === 'police' ? '👮' : serviceType === 'ambulance' ? '🚑' : '🚒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedUnit.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {selectedUnit.address}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedUnit.categoryLabel}
                      </span>
                      {selectedUnit.phone && (
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" /> {selectedUnit.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle to view other units of the same category */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-mono text-slate-400">Fuente: Google Maps Platform</span>
                  <button
                    type="button"
                    onClick={() => setIsUnitListOpen(!isUnitListOpen)}
                    className="font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    {isUnitListOpen ? 'Ocultar otras unidades' : 'Cambiar unidad (' + availableUnits.length + ' detectadas)'}
                  </button>
                </div>

                {/* Dropdown list of other real units */}
                {isUnitListOpen && (
                  <div className="flex flex-col gap-1 mt-1 max-h-48 overflow-y-auto pr-1">
                    {availableUnits.map((unit) => {
                      const isCur = unit.id === selectedUnit.id;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => {
                            setSelectedUnit(unit);
                            setIsUnitListOpen(false);
                          }}
                          className={`w-full p-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                            isCur
                              ? 'bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 font-bold'
                              : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-semibold block truncate">{unit.name}</span>
                            <span className="text-[10px] text-slate-400 truncate block">{unit.address}</span>
                          </div>
                          <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {unit.distanceText || 'Cerca'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STEP 4: Real ETA & Driving Distance Banner (Routes API) */}
              <div className="p-3 rounded-2xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                      ETA de Despacho en Ruta Real
                    </span>
                    <span className="text-base font-black font-['Rajdhani'] text-slate-900 dark:text-slate-100">
                      {isCalculatingRoute ? (
                        <span className="text-xs font-mono text-slate-400">Calculando con Routes API...</span>
                      ) : (
                        `${Math.round(realEtaSeconds / 60)} min (${(realDistanceMeters / 1000).toFixed(1)} km)`
                      )}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 text-right">
                  {routeSummary}
                </span>
              </div>

              {/* Big Dispatch Button */}
              <button
                type="button"
                id="btn-iniciar-despacho-tactico"
                onClick={handleStartDispatch}
                disabled={isCalculatingRoute}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition cursor-pointer disabled:opacity-50"
              >
                <Radio className="w-4 h-4 animate-spin" />
                <span>Solicitar Despacho Táctico Inmediato</span>
              </button>
            </div>
          ) : (
            /* Card B: Active Dispatch Live Progress Panel (Requirement 3) */
            <div className="p-5 rounded-3xl border-2 border-red-500/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Header of Dispatch */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                  <span className="text-xs font-mono font-extrabold uppercase text-red-600 dark:text-red-400">
                    DESPACHO TÁCTICO ACTIVO
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {dispatchProgress}% completado
                </span>
              </div>

              {/* ETA Large Counter */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                    Tiempo Estimado de Llegada
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-['Rajdhani'] text-slate-900 dark:text-slate-100 tracking-wider">
                    {dispatchStage === 'on_site' ? (
                      <span className="text-emerald-500">¡UNIDAD EN SITIO!</span>
                    ) : remainingSeconds > 60 ? (
                      `${Math.ceil(remainingSeconds / 60)} min (${remainingSeconds}s)`
                    ) : (
                      `${remainingSeconds} segundos`
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Unidad</span>
                  <span className="text-xs font-bold font-mono text-red-600 dark:text-red-400 truncate max-w-[140px] block">
                    {selectedUnit.name}
                  </span>
                </div>
              </div>

              {/* 4 Stage Progress Bar (Despachada -> En camino -> Llegando -> En sitio) */}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono font-bold">
                  <span className={dispatchProgress >= 0 ? 'text-blue-500' : 'text-slate-400'}>1. Despachada</span>
                  <span className={dispatchProgress >= 25 ? 'text-amber-500' : 'text-slate-400'}>2. En camino</span>
                  <span className={dispatchProgress >= 75 ? 'text-rose-500' : 'text-slate-400'}>3. Llegando</span>
                  <span className={dispatchProgress >= 100 ? 'text-emerald-500' : 'text-slate-400'}>4. En sitio</span>
                </div>

                {/* Progress track */}
                <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${dispatchProgress}%` }}
                  />
                </div>
              </div>

              {/* Live Status Description */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-200">
                    {dispatchStage === 'dispatched'
                      ? 'Unidad notificada. Salida prioritaria de la estación...'
                      : dispatchStage === 'en_route'
                      ? 'En trayecto prioritario con sirena activa por vía arterial.'
                      : dispatchStage === 'arriving'
                      ? 'Aproximación inmediata al punto de contacto (a menos de 200m).'
                      : '¡Unidad en el sitio! Contacto visual establecido y perímetro asegurado.'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Destino: {userLocationLabel}
                  </span>
                </div>
              </div>

              {/* Dispatch Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {dispatchStage === 'on_site' ? (
                  <button
                    type="button"
                    onClick={handleResetDispatch}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir y volver a solicitud</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-2.5 rounded-xl border border-red-500/50 hover:bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar solicitud de apoyo</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Dial Card */}
          <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600/15 text-red-500 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Línea de Emergencias Medellín
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Policía • Bomberos • Cruz Roja • Tránsito</span>
              </div>
            </div>
            <a
              href="tel:123"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold cursor-pointer transition"
            >
              123
            </a>
          </div>
        </div>

        {/* Right Column: Interactive Tactical Map (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2 min-h-[480px] lg:min-h-[580px]">
          <div className="relative w-full h-full min-h-[480px] lg:min-h-[580px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-950">
            {/* Map Container */}
            <div ref={mapContainerRef} className="w-full h-full min-h-[480px] lg:min-h-[580px]" />

            {/* Map Overlays: Service Badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white shadow-xl flex items-center gap-2 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>MAPA TÁCTICO // {serviceType.toUpperCase()}</span>
              </div>
            </div>

            {/* Map Overlays: Recalculate / Center buttons */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current && selectedUnit) {
                    renderRouteAndMarkers(selectedUnit, userCoord, realRoutePath);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-700/80 text-white text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg transition"
                title="Ajustar vista del mapa para ver toda la trayectoria"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Ajustar Vista</span>
              </button>
            </div>

            {/* Map Data Transparency Footer */}
            <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-xs border border-slate-800 text-[10px] font-mono text-slate-400">
              <Info className="w-3 h-3 text-red-500" />
              <span>Fuente: Google Maps Platform (Places API & Routes API)</span>
            </div>

            {/* Fallback loader / error */}
            {!mapLoaded && !mapError && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 text-white">
                <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                <span className="text-xs font-mono text-slate-400">Cargando mapa táctico de Google Maps...</span>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-white">
                <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                <h4 className="text-sm font-bold">No se pudo cargar el mapa táctico</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">{mapError}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  ¿Cancelar Solicitud de Apoyo?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  La unidad interrumpirá su desplazamiento simulado hacia tu punto.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400">
              Unidad: <strong className="text-slate-900 dark:text-slate-200">{selectedUnit.name}</strong>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Continuar Despacho
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md"
              >
                Sí, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
