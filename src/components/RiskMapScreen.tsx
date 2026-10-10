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
  LocateFixed,
  LayoutGrid,
  List
} from 'lucide-react';
import { importLibrary } from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_API_KEY, ensureGoogleMapsInitialized } from '../config/maps';
import { useSmoothMapUsability, MapUsabilityOverlay } from './MapUsabilityOverlay';
import { useLanguage } from '../context/LanguageContext';
import { subscribeToPublicAcceptedReports } from '../services/reportService';
import type { IncidentReport } from '../types/report';
import {
  COMUNA_8_SECTORS,
  COMUNA_8_CENTER,
  COMUNA_8_DEFAULT_ZOOM,
  COMUNA_8_INFO,
  ALL_MEDELLIN_SECTORS,
  COMUNAS_METADATA,
  MEDELLIN_PANORAMIC_CENTER,
  MEDELLIN_PANORAMIC_ZOOM,
} from '../data/medellinSectors';
import type { SectorRiskData, RiskLevel, ComunaInfo } from '../data/medellinSectors';

export type { SectorRiskData, RiskLevel, ComunaInfo };
export {
  COMUNA_8_SECTORS,
  ALL_MEDELLIN_SECTORS,
  COMUNA_8_CENTER,
  COMUNA_8_DEFAULT_ZOOM,
  COMUNA_8_INFO,
  COMUNAS_METADATA,
  MEDELLIN_PANORAMIC_CENTER,
  MEDELLIN_PANORAMIC_ZOOM,
};

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

  // 1. Textual match: check if address/name contains any sector name in Comuna 8
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
  const { language, t, translateRisk } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const placesInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const placesLibRef = useRef<any>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const riskCirclesRef = useRef<{ circle: google.maps.Circle; sector: SectorRiskData }[]>([]);
  const markersRef = useRef<{ marker: google.maps.marker.AdvancedMarkerElement; sector: SectorRiskData }[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const searchMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const selectedSectorMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

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
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [communityAcceptedReports, setCommunityAcceptedReports] = useState<IncidentReport[]>([]);

  // Subscribe to real approved community alerts from Firestore
  useEffect(() => {
    const unsub = subscribeToPublicAcceptedReports((reports) => {
      setCommunityAcceptedReports(reports);
    });
    return () => unsub();
  }, []);

  // Grouped sectors by category: Mayor (high), Intermedio (moderate), Bajo / base (central)
  const highRiskSectors = useMemo(
    () => COMUNA_8_SECTORS.filter((s) => s.level === 'high'),
    []
  );
  const moderateRiskSectors = useMemo(
    () => COMUNA_8_SECTORS.filter((s) => s.level === 'moderate'),
    []
  );
  const lowRiskSectors = useMemo(
    () => COMUNA_8_SECTORS.filter((s) => s.level === 'central'),
    []
  );

  // Initialize Map
  useEffect(() => {
    let isCancelled = false;

    async function initGoogleMap() {
      if (!mapContainerRef.current) return;

      try {
        ensureGoogleMapsInitialized();

        // Import required libraries using Google Maps Platform JS SDK
        const { Map, Circle } = (await importLibrary('maps')) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;
        const { ColorScheme } = (await importLibrary('core')) as google.maps.CoreLibrary;
        const placesLib = (await importLibrary('places')) as any;
        placesLibRef.current = placesLib;

        if (isCancelled || !mapContainerRef.current) return;

        const map = new Map(mapContainerRef.current, {
          center: COMUNA_8_CENTER,
          zoom: COMUNA_8_DEFAULT_ZOOM,
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

        // 1. Build Multi-ring Tactical Heat & Risk Zones covering Comuna 8 (18 Sectores)
        const createdCircles: { circle: google.maps.Circle; sector: SectorRiskData }[] = [];

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
              createdCircles.push({ circle: c, sector });
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
              createdCircles.push({ circle: c, sector });
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
              createdCircles.push({ circle: c, sector });
            });
          }
        });

        riskCirclesRef.current = createdCircles;

        // 2. Build Markers for each sector across Comuna 8
        const newMarkers: { marker: google.maps.marker.AdvancedMarkerElement; sector: SectorRiskData }[] = [];

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
            title: `${sector.name} (${sector.comuna}) - ${sector.levelLabel}`,
            content: pinContainer,
          });

          marker.addListener('click', () => {
            setSelectedSector(sector);
            setSearchedLocation(null);
            map.panTo(sector.coordinates);
          });

          newMarkers.push({ marker, sector });
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
      riskCirclesRef.current.forEach(({ circle }) => {
        circle.setMap(null);
      });
      markersRef.current.forEach(({ marker }) => {
        marker.map = null;
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null;
      }
      if (searchMarkerRef.current) {
        searchMarkerRef.current.map = null;
      }
      if (selectedSectorMarkerRef.current) {
        selectedSectorMarkerRef.current.map = null;
      }
    };
  }, [GOOGLE_MAPS_API_KEY]);

  // Highlight the currently selected sector on the map with an active focus pin
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (selectedSectorMarkerRef.current) {
      selectedSectorMarkerRef.current.map = null;
      selectedSectorMarkerRef.current = null;
    }

    if (!selectedSector) return;

    let cancelled = false;
    importLibrary('marker')
      .then((markerLib: any) => {
        if (cancelled || !mapInstanceRef.current) return;
        const { AdvancedMarkerElement } = markerLib;

        const focusEl = document.createElement('div');
        focusEl.className = 'relative flex flex-col items-center pointer-events-none select-none';

        const ringColor =
          selectedSector.level === 'high'
            ? 'border-rose-500 bg-rose-600/95 text-white shadow-[0_0_20px_rgba(244,63,94,0.85)]'
            : selectedSector.level === 'moderate'
            ? 'border-amber-400 bg-amber-500/95 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.85)]'
            : 'border-emerald-400 bg-emerald-600/95 text-white shadow-[0_0_20px_rgba(16,185,129,0.85)]';

        const pulseColor =
          selectedSector.level === 'high'
            ? 'bg-rose-500/35'
            : selectedSector.level === 'moderate'
            ? 'bg-amber-400/35'
            : 'bg-emerald-400/35';

        focusEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-14 h-14 rounded-full ${pulseColor} animate-ping"></div>
            <div class="relative px-2.5 py-1 rounded-lg border-2 font-mono text-xs font-extrabold flex items-center gap-1.5 backdrop-blur-md ${ringColor}">
              <span>📍</span>
              <span class="whitespace-nowrap">${selectedSector.name}</span>
            </div>
          </div>
        `;

        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: selectedSector.coordinates,
          title: `${selectedSector.name} (${selectedSector.quadrant})`,
          content: focusEl,
          zIndex: 400,
        });

        selectedSectorMarkerRef.current = marker;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedSector, mapLoaded]);

  // Update view mode (Heatmap vs Markers vs Both)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const circles = riskCirclesRef.current;
    const markers = markersRef.current;

    if (viewMode === 'heat') {
      circles.forEach(({ circle }) => circle.setMap(map));
      markers.forEach(({ marker }) => (marker.map = null));
    } else if (viewMode === 'markers') {
      circles.forEach(({ circle }) => circle.setMap(null));
      markers.forEach(({ marker }) => (marker.map = map));
    } else if (viewMode === 'both') {
      circles.forEach(({ circle }) => circle.setMap(map));
      markers.forEach(({ marker }) => (marker.map = map));
    }
  }, [viewMode, mapLoaded]);

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
    initialZoom: COMUNA_8_DEFAULT_ZOOM,
    onZoomChange: (z) => setZoomLevel(z),
  });

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(COMUNA_8_CENTER);
      smoothZoomTo(COMUNA_8_DEFAULT_ZOOM);
    }
    setSelectedSector(COMUNA_8_SECTORS[0]);
    setSearchedLocation(null);
    setPlacesSearchText('');
    if (placesInputRef.current) {
      placesInputRef.current.value = '';
    }
    if (searchMarkerRef.current) {
      searchMarkerRef.current.map = null;
      searchMarkerRef.current = null;
    }
  };

  // Fallback Geocoding for manual addresses entered directly
  const geocodeAddressFallback = useCallback(async (addressText: string) => {
    const query = addressText.trim();
    if (!query) return;

    console.log('[Security Urban :: RiskMap] 🔍 Fallback Geocoder ejecutando para dirección manual:', query);
    try {
      const geocodingLib = (await importLibrary('geocoding')) as google.maps.GeocodingLibrary;
      const geocoder = new geocodingLib.Geocoder();
      const fullQuery = query.toLowerCase().includes('medell') ? query : `${query}, Medellín, Colombia`;

      geocoder.geocode(
        {
          address: fullQuery,
          componentRestrictions: { country: 'co' },
        },
        (results, status) => {
          console.log('[Security Urban :: RiskMap] 🚦 Geocoder status:', status, results);
          if (status === 'OK' && results && results.length > 0 && results[0].geometry?.location) {
            const first = results[0];
            const lat = first.geometry.location.lat();
            const lng = first.geometry.location.lng();
            const placeName = first.formatted_address.split(',')[0] || query;
            const formattedAddress = first.formatted_address;

            setPlacesSearchText(formattedAddress);

            const map = mapInstanceRef.current;
            if (map) {
              if (first.geometry.viewport) {
                map.fitBounds(first.geometry.viewport);
              } else {
                map.panTo({ lat, lng });
                map.setZoom(16);
              }
            }

            if (searchMarkerRef.current) {
              searchMarkerRef.current.map = null;
            }

            importLibrary('marker').then((markerLib: any) => {
              const { AdvancedMarkerElement } = markerLib;
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

              const marker = new AdvancedMarkerElement({
                map: mapInstanceRef.current,
                position: { lat, lng },
                title: placeName,
                content: searchPinEl,
                zIndex: 280,
              });

              searchMarkerRef.current = marker;
            });

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
          }
        }
      );
    } catch (err) {
      console.warn('[Security Urban :: RiskMap] Geocoder error:', err);
    }
  }, []);

  // Google Places Autocomplete binding
  useEffect(() => {
    if (!mapLoaded || !placesInputRef.current || !placesLibRef.current) return;

    try {
      const placesLib = placesLibRef.current;
      if (!placesLib.Autocomplete) return;

      console.log('[Security Urban :: RiskMap] 🔌 Vinculando Google Places Autocomplete con country: "co" sin restricciones de tipo...');

      const autocomplete = new placesLib.Autocomplete(placesInputRef.current, {
        componentRestrictions: { country: 'co' },
        fields: ['place_id', 'geometry', 'formatted_address', 'name', 'address_components', 'types'],
        // NOTE: No restrictive types filter is applied so street addresses (calles, carreras),
        // establishments, neighborhoods, and geocodes are all fully accepted and returned.
        bounds: new google.maps.LatLngBounds(
          { lat: 6.12, lng: -75.72 },
          { lat: 6.38, lng: -75.46 }
        ),
        strictBounds: false,
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('[Security Urban :: RiskMap] 📍 Evento place_changed recibido de Google Places:', {
          name: place.name,
          formatted_address: place.formatted_address,
          geometry: place.geometry
            ? {
                location: place.geometry.location
                  ? {
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                    }
                  : null,
                viewport: !!place.geometry.viewport,
              }
            : null,
          address_components: place.address_components,
          place_id: place.place_id,
          types: place.types,
          fullPlace: place,
        });

        if (!place.geometry || !place.geometry.location) {
          console.warn('[Security Urban :: RiskMap] ⚠️ place_changed: El lugar devuelto no incluye coordenadas exactas, activando geocodificador:', place);
          if (place.name || place.formatted_address) {
            geocodeAddressFallback(place.formatted_address || place.name || '');
          }
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const placeName = place.name || place.formatted_address?.split(',')[0] || 'Lugar en Medellín';
        const formattedAddress = place.formatted_address || placeName;

        setPlacesSearchText(formattedAddress);

        const map = mapInstanceRef.current;
        if (map) {
          if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
          } else {
            map.panTo({ lat, lng });
            map.setZoom(16);
          }
        }

        if (searchMarkerRef.current) {
          searchMarkerRef.current.map = null;
        }

        importLibrary('marker').then((markerLib: any) => {
          const { AdvancedMarkerElement } = markerLib;
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

          const marker = new AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: { lat, lng },
            title: placeName,
            content: searchPinEl,
            zIndex: 280,
          });

          searchMarkerRef.current = marker;
        });

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
      });

      autocompleteRef.current = autocomplete;
    } catch (e) {
      console.error('[Security Urban :: RiskMap] Error vinculando Autocomplete:', e);
    }

    return () => {
      if (autocompleteRef.current && (window as any).google?.maps?.event) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [mapLoaded, geocodeAddressFallback]);

  // User Geolocation with navigator.geolocation
  const handleGetCurrentLocation = useCallback(() => {
    console.log('[Security Urban :: RiskMap] 🛰️ Botón "Mi ubicación en vivo" presionado. Evaluando soporte y solicitando posición...');

    if (!navigator.geolocation) {
      console.error('[Security Urban :: RiskMap] ❌ navigator.geolocation no está disponible en este entorno o navegador.');
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
        const accuracy = pos.coords.accuracy;

        console.log('[Security Urban :: RiskMap] 📍 Coordenadas de "Mi ubicación en vivo" obtenidas exitosamente:', {
          latitude: userCoords.lat,
          longitude: userCoords.lng,
          accuracyMeters: accuracy,
          accuracyText: `±${Math.round(accuracy)}m`,
          altitude: pos.coords.altitude,
          timestamp: new Date(pos.timestamp).toLocaleTimeString(),
        });

        setUserLocation(userCoords);

        // Store coords for session continuity
        try {
          localStorage.setItem(
            'security_urban_user_coords',
            JSON.stringify({
              lat: userCoords.lat,
              lng: userCoords.lng,
              accuracy,
              label: `GPS en vivo (${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)})`,
            })
          );
        } catch (e) {}

        const map = mapInstanceRef.current;
        if (!map) {
          console.warn('[Security Urban :: RiskMap] ⚠️ mapInstanceRef no está montado aún para centrar.');
          return;
        }

        console.log('[Security Urban :: RiskMap] 🗺️ Centrando mapa en ubicación del usuario:', userCoords);
        map.panTo(userCoords);
        map.setZoom(16);

        try {
          const { AdvancedMarkerElement } = (await importLibrary('marker')) as google.maps.MarkerLibrary;

          // Remove previous user marker
          if (userMarkerRef.current) {
            userMarkerRef.current.map = null;
          }

          // Create custom pulsing HUD user marker
          const userDot = document.createElement('div');
          userDot.className = 'relative flex items-center justify-center pointer-events-auto cursor-pointer';
          userDot.innerHTML = `
            <div class="absolute w-12 h-12 rounded-full bg-cyan-400/35 animate-ping pointer-events-none"></div>
            <div class="absolute w-8 h-8 rounded-full bg-cyan-500/30 animate-pulse pointer-events-none"></div>
            <div class="relative w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_20px_#22d3ee] flex items-center justify-center">
              <div class="w-2 h-2 rounded-full bg-slate-950"></div>
            </div>
            <div class="absolute -bottom-7 bg-slate-950/95 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-400/60 whitespace-nowrap shadow-xl">
              Mi Ubicación en Vivo (±${Math.round(accuracy)}m)
            </div>
          `;

          const marker = new AdvancedMarkerElement({
            map: map,
            position: userCoords,
            title: `Mi Ubicación en vivo: ${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}`,
            content: userDot,
            zIndex: 350,
          });

          userMarkerRef.current = marker;
        } catch (e) {
          console.error('[Security Urban :: RiskMap] Error creando marcador de usuario:', e);
        }
      },
      (error) => {
        setIsLocating(false);
        console.error('[Security Urban :: RiskMap] ❌ Error en navigator.geolocation.getCurrentPosition:', {
          code: error.code,
          message: error.message,
          isPermissionDenied: error.code === error.PERMISSION_DENIED,
          isPositionUnavailable: error.code === error.POSITION_UNAVAILABLE,
          isTimeout: error.code === error.TIMEOUT,
        });

        // Fallback: Check if cached coordinates are available from previous user session
        try {
          const cached = localStorage.getItem('security_urban_user_coords');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.lat && parsed.lng && mapInstanceRef.current) {
              console.log('[Security Urban :: RiskMap] ℹ️ Utilizando coordenadas en caché como respaldo:', parsed);
              mapInstanceRef.current.panTo({ lat: parsed.lat, lng: parsed.lng });
              mapInstanceRef.current.setZoom(16);
            }
          }
        } catch (e) {}
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
      }
    );
  }, []);

  const selectAndFocusSector = (sector: SectorRiskData) => {
    setSelectedSector(sector);
    setSearchedLocation(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(sector.coordinates);
      mapInstanceRef.current.setZoom(16);
    }
  };

  const handleSelectSectorById = (sectorId: string) => {
    if (!sectorId) return;
    const found = COMUNA_8_SECTORS.find((s) => s.id === sectorId);
    if (found) {
      selectAndFocusSector(found);
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6 sm:space-y-7 px-2 sm:px-4 lg:px-6 pt-1 sm:pt-2 scroll-mt-36">
      {/* 1. Header & Navigation Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-500 tracking-wider uppercase mb-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-semibold">{t('riskMapBadge')}</span>
            <span className="text-slate-400 dark:text-slate-600">|</span>
            <span className="text-theme-secondary font-medium">{t('riskMapProvider')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Rajdhani'] uppercase tracking-wider text-theme-primary flex items-center gap-2">
            <span>{t('riskMapTitle')}</span>
          </h1>
          <p className="text-base sm:text-lg text-theme-secondary mt-1.5 max-w-3xl leading-relaxed font-medium">
            {t('riskMapDescription')}
          </p>
        </div>

        {/* Action Controls & Navigation Shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateDashboard && (
            <button
              onClick={onNavigateDashboard}
              className="px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
            >
              {t('goToDashboard')}
            </button>
          )}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-4 py-2.5 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
            >
              {t('navHome')}
            </button>
          )}
        </div>
      </div>

      {/* 2. Mandatory Citizen Disclaimer Banner exclusively for Comuna 8 */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 backdrop-blur-md shadow-xs">
        <Info className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          <span className="font-bold text-amber-900 dark:text-amber-300">{t('disclaimerTitle')}</span>{' '}
          {t('disclaimerText')}{' '}
          <a
            href="https://www.medellin.gov.co/es/secretaria-seguridad-convivencia/sisc/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-800 dark:text-amber-300 font-bold underline hover:text-amber-950 dark:hover:text-amber-200 inline-flex items-center gap-1"
          >
            {t('siscLinkText')}
            <ExternalLink className="w-4 h-4 ml-0.5 inline" />
          </a>
          .
        </div>
      </div>

      {/* 3. Main Tactical Map Display (Left) & Sector Informative + Transit Recommendations Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Interactive Map View, Sector Category Dropdowns & Controls (7 of 12 cols on Desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-3.5 h-auto lg:h-[84vh] lg:min-h-[740px] lg:max-h-[960px]">
          {/* Toolbar Row 1: Google Places Autocomplete Search & View Mode / GPS Controls */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-white/10 rounded-2xl p-3 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 backdrop-blur-md shadow-sm shrink-0">
            {/* Google Places Autocomplete Search Input for Medellín */}
            <div ref={searchContainerRef} className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={placesInputRef}
                id="input-places-autocomplete"
                type="text"
                autoComplete="off"
                placeholder={t('searchPlacesPlaceholder')}
                value={placesSearchText}
                onChange={(e) => setPlacesSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    geocodeAddressFallback(placesSearchText);
                  }
                }}
                className="w-full min-h-[42px] bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-white/15 rounded-xl pl-9 pr-8 py-2.5 text-sm text-theme-primary placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
              {placesSearchText && (
                <button
                  type="button"
                  onClick={handleResetCenter}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 transition-colors cursor-pointer"
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Controls Group: View Mode Toggle & GPS */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <button
                  id="btn-mode-heat"
                  type="button"
                  onClick={() => setViewMode('heat')}
                  className={`min-h-[36px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    viewMode === 'heat'
                      ? 'bg-rose-600 dark:bg-rose-900/90 text-white dark:text-rose-100 border border-rose-500/60 shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <Flame className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                  <span>{t('modeHeat')}</span>
                </button>

                <button
                  id="btn-mode-markers"
                  type="button"
                  onClick={() => setViewMode('markers')}
                  className={`min-h-[36px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    viewMode === 'markers'
                      ? 'bg-amber-600 dark:bg-amber-900/90 text-white dark:text-amber-100 border border-amber-500/60 shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>{t('modeMarkers')}</span>
                </button>

                <button
                  id="btn-mode-both"
                  type="button"
                  onClick={() => setViewMode('both')}
                  className={`min-h-[36px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    viewMode === 'both'
                      ? 'bg-indigo-600 dark:bg-indigo-900/90 text-white dark:text-indigo-100 border border-indigo-500/60 shadow-xs'
                      : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                  title="Mostrar termografía y pines simultáneamente"
                >
                  <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="hidden sm:inline">{t('modeHybrid')}</span>
                </button>
              </div>

              {/* Tactical Live Geolocation */}
              <button
                id="btn-geolocation"
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-400/50 bg-cyan-100 dark:bg-cyan-950/60 hover:bg-cyan-200 dark:hover:bg-cyan-900/60 text-cyan-900 dark:text-cyan-300 text-xs sm:text-sm font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer active:scale-95"
                title="Centrar en mi ubicación en vivo (GPS)"
              >
                {isLocating ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-600 dark:text-cyan-400 shrink-0" />
                ) : (
                  <LocateFixed className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                )}
                <span className="hidden sm:inline font-bold">
                  {isLocating ? t('locatingGps') : t('centerGpsBtn')}
                </span>
              </button>
            </div>
          </div>

          {/* Toolbar Row 2: "Centrar en Comuna 8 (Villa Hermosa)" Button + Sector Category Dropdowns (Mayor, Intermedio, Bajo (base)) */}
          <div className="bg-white dark:bg-slate-900/95 border border-slate-300 dark:border-white/15 rounded-2xl p-3 flex flex-col xl:flex-row xl:items-center gap-2.5 backdrop-blur-md shadow-sm shrink-0">
            {/* Button: Centrar en Comuna 8 (Villa Hermosa) */}
            <button
              id="btn-recenter-comuna8"
              type="button"
              onClick={handleResetCenter}
              className="px-3.5 py-2.5 rounded-xl border border-cyan-400/50 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/80 dark:hover:bg-cyan-900/80 text-cyan-900 dark:text-cyan-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.99] shrink-0"
              title={
                language === 'es'
                  ? 'Centrar en Comuna 8 (Villa Hermosa)'
                  : 'Center on Comuna 8 (Villa Hermosa)'
              }
            >
              <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>
                {language === 'es'
                  ? 'Centrar en Comuna 8 (Villa Hermosa)'
                  : 'Center on Comuna 8 (Villa Hermosa)'}
              </span>
            </button>

            {/* 3 Category Dropdowns Side by Side: Mayor, Intermedio, Bajo (base) */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Categoría 1: Mayor */}
              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                  selectedSector?.level === 'high'
                    ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-400 dark:border-rose-500/80 ring-2 ring-rose-500/20'
                    : 'bg-rose-50/50 dark:bg-slate-950/80 border-rose-200 dark:border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <label
                    htmlFor="select-sector-high"
                    className="text-xs font-extrabold uppercase tracking-wide text-rose-800 dark:text-rose-300 cursor-pointer"
                  >
                    {language === 'es' ? 'Mayor' : 'High'}
                  </label>
                </div>
                <select
                  id="select-sector-high"
                  value={selectedSector?.level === 'high' ? selectedSector.id : ''}
                  onChange={(e) => handleSelectSectorById(e.target.value)}
                  className="w-full min-w-0 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/40 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer truncate"
                >
                  <option value="">
                    {language === 'es'
                      ? `Sectores (${highRiskSectors.length})...`
                      : `Sectors (${highRiskSectors.length})...`}
                  </option>
                  {highRiskSectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name} ({sector.quadrant})
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría 2: Intermedio */}
              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                  selectedSector?.level === 'moderate'
                    ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-400 dark:border-amber-500/80 ring-2 ring-amber-500/20'
                    : 'bg-amber-50/50 dark:bg-slate-950/80 border-amber-200 dark:border-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <label
                    htmlFor="select-sector-moderate"
                    className="text-xs font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-300 cursor-pointer"
                  >
                    {language === 'es' ? 'Intermedio' : 'Moderate'}
                  </label>
                </div>
                <select
                  id="select-sector-moderate"
                  value={selectedSector?.level === 'moderate' ? selectedSector.id : ''}
                  onChange={(e) => handleSelectSectorById(e.target.value)}
                  className="w-full min-w-0 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/40 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer truncate"
                >
                  <option value="">
                    {language === 'es'
                      ? `Sectores (${moderateRiskSectors.length})...`
                      : `Sectors (${moderateRiskSectors.length})...`}
                  </option>
                  {moderateRiskSectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name} ({sector.quadrant})
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría 3: Bajo (base) */}
              <div
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
                  selectedSector?.level === 'central'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-500/80 ring-2 ring-emerald-500/20'
                    : 'bg-emerald-50/50 dark:bg-slate-950/80 border-emerald-200 dark:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <label
                    htmlFor="select-sector-low"
                    className="text-xs font-extrabold uppercase tracking-wide text-emerald-900 dark:text-emerald-300 cursor-pointer whitespace-nowrap"
                  >
                    {language === 'es' ? 'Bajo (base)' : 'Low (base)'}
                  </label>
                </div>
                <select
                  id="select-sector-low"
                  value={selectedSector?.level === 'central' ? selectedSector.id : ''}
                  onChange={(e) => handleSelectSectorById(e.target.value)}
                  className="w-full min-w-0 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/40 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer truncate"
                >
                  <option value="">
                    {language === 'es'
                      ? `Sectores (${lowRiskSectors.length})...`
                      : `Sectors (${lowRiskSectors.length})...`}
                  </option>
                  {lowRiskSectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name} ({sector.quadrant})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Map Canvas Container - Expands to fill remaining space in Column 1 */}
          <div className="relative w-full h-[460px] sm:h-[520px] lg:h-auto lg:flex-1 lg:min-h-[380px] rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 bg-[#0c1017] shadow-lg">
            {/* Google Maps Mounted Div */}
            <div ref={mapContainerRef} className="w-full h-full" id="google-risk-map-canvas" />

            {/* Loading Placeholder Overlay (Prevents layout shift while Google Maps initializes) */}
            {!mapLoaded && !mapError && (
              <div
                role="status"
                aria-live="polite"
                className="absolute inset-0 bg-[#0c1017] flex flex-col items-center justify-center gap-2.5 text-white z-20 pointer-events-none"
              >
                <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" aria-hidden="true" />
                <span className="text-xs font-mono text-slate-300">
                  {language === 'es' ? 'Cargando cartografía preventiva de la Comuna 8...' : 'Loading Comuna 8 preventive map...'}
                </span>
              </div>
            )}

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

            {/* Unified Map Usability Overlay: "Usa Ctrl + rueda para hacer zoom" + Smooth + / - Controls */}
            <MapUsabilityOverlay
              zoomLevel={smoothZoomLevel || zoomLevel}
              isHintHighlighted={isHintHighlighted}
              isCtrlZooming={isCtrlZooming}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetCenter={handleResetCenter}
              resetTitle="Centrar en Comuna 8 (Villa Hermosa)"
              noticePosition="bottom-center"
            />

            {/* Sector Quick Badge Count on Map Top-Left with High Contrast text */}
            <div className="absolute top-4 left-4 z-10 bg-slate-900/95 px-3.5 py-2 rounded-xl border border-white/20 backdrop-blur-md text-xs font-mono text-slate-100 flex items-center gap-2.5 shadow-xl pointer-events-none">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-bold text-white">
                {t('monitoredSectorsCount')} • Comuna 8
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-300 font-extrabold">
                Zoom: {(smoothZoomLevel || zoomLevel).toFixed(1).replace(/\.0$/, '')}x
              </span>
            </div>
          </div>

          {/* Independent Thermal Legend Card properly contained inside its box */}
          <div className="w-full overflow-hidden bg-white dark:bg-slate-900/95 border border-slate-300 dark:border-white/15 rounded-2xl p-4 shadow-sm backdrop-blur-md shrink-0">
            <div className="flex flex-col gap-2.5 w-full">
              {/* Top Header Row */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 min-w-0">
                  <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="truncate">{t('thermalLegendTitle')}</span>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  Comuna 8
                </span>
              </div>

              {/* Full-Width Contained Heat Gradient Bar */}
              <div className="w-full flex flex-col gap-2">
                <div className="relative w-full h-3.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600 border border-slate-300 dark:border-white/20 shadow-inner overflow-hidden" />

                {/* 3 Contained Labels Aligned to Left, Center, Right */}
                <div className="w-full grid grid-cols-3 items-center gap-1 text-xs font-mono">
                  <div className="flex items-center justify-start gap-1.5 text-emerald-800 dark:text-emerald-400 font-bold min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                    <span className="truncate">{t('thermalLow')}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-xs" />
                    <span className="truncate">{t('thermalMed')}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-rose-800 dark:text-rose-400 font-extrabold min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-xs" />
                    <span className="truncate">{t('thermalHigh')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Panel Informativo del Sector Seleccionado y Recomendaciones de Tránsito (5 of 12 cols on Desktop) */}
        <div className="lg:col-span-5 flex flex-col h-auto lg:h-[84vh] lg:min-h-[740px] lg:max-h-[960px]">
          {selectedSector ? (
            <div className="bg-white dark:bg-slate-900/95 border border-slate-300 dark:border-white/15 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-lg relative overflow-hidden flex flex-col h-full">
              {/* Top Color Accent Bar matching Risk Level */}
              <div
                className={`absolute top-0 inset-x-0 h-1.5 ${
                  selectedSector.level === 'high'
                    ? 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-500'
                    : selectedSector.level === 'moderate'
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
                }`}
              />

              {/* Header: Panel Title, Sector Name & Risk Level Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-mono font-extrabold text-cyan-700 dark:text-cyan-400 uppercase tracking-widest mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {language === 'es'
                        ? 'PANEL INFORMATIVO Y DE TRÁNSITO'
                        : 'SECTOR & TRANSIT INFO PANEL'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black font-['Rajdhani'] uppercase tracking-wide text-theme-primary flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
                    <span className="truncate">{selectedSector.name}</span>
                  </h2>
                  <p className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedSector.comuna} • {selectedSector.quadrant}
                  </p>
                </div>

                {/* Risk Level Classification Badge */}
                <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    {language === 'es' ? 'Nivel de Riesgo' : 'Risk Level'}
                  </span>
                  <div
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border whitespace-nowrap flex items-center gap-2 shadow-xs ${
                      selectedSector.level === 'high'
                        ? 'bg-rose-100 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-500/70'
                        : selectedSector.level === 'moderate'
                        ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/70'
                        : 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/70'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        selectedSector.level === 'high'
                          ? 'bg-rose-500 animate-pulse'
                          : selectedSector.level === 'moderate'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span>
                      {selectedSector.level === 'high'
                        ? language === 'es'
                          ? 'Categoría: Mayor (Precaución Alta)'
                          : 'Category: High Risk'
                        : selectedSector.level === 'moderate'
                        ? language === 'es'
                          ? 'Categoría: Intermedio (Moderado)'
                          : 'Category: Moderate Risk'
                        : language === 'es'
                        ? 'Categoría: Bajo (Base / Seguro)'
                        : 'Category: Low (Base)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Information Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-0 tactical-scrollbar">
                {/* 1. Recomendaciones de Tránsito y Movilidad (Primary Section) */}
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold font-['Rajdhani'] uppercase tracking-wider text-emerald-950 dark:text-emerald-300">
                      <Navigation className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        {language === 'es'
                          ? 'Recomendaciones de Tránsito y Movilidad'
                          : 'Transit & Mobility Recommendations'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      {language === 'es' ? 'RUTA PREVENTIVA' : 'SAFE TRANSIT'}
                    </span>
                  </div>

                  {/* Pauta principal de tránsito */}
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed bg-white/90 dark:bg-slate-950/80 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                    {selectedSector.citizenAdvice}
                  </p>

                  {/* Corredor vial recomendado */}
                  {selectedSector.recommendedCorridor && (
                    <div className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200 pt-0.5">
                      <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-950 dark:text-emerald-300">
                          {language === 'es' ? 'Corredor vial sugerido: ' : 'Recommended corridor: '}
                        </span>
                        <span className="font-medium">{selectedSector.recommendedCorridor}</span>
                      </div>
                    </div>
                  )}

                  {/* Lista detallada de recomendaciones de tránsito */}
                  {selectedSector.transitRecommendations &&
                    selectedSector.transitRecommendations.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                          {language === 'es'
                            ? 'Pautas específicas al transitar por este sector:'
                            : 'Specific guidelines when transiting this sector:'}
                        </span>
                        <ul className="space-y-1.5">
                          {selectedSector.transitRecommendations.map((rec, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200 leading-relaxed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>

                {/* 2. Datos Relevantes del Sector (Structured Grid) */}
                <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span>
                        {language === 'es'
                          ? 'Datos Relevantes del Sector'
                          : 'Relevant Sector Data'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                      {
                        communityAcceptedReports.filter((r) => {
                          const repSec = (r.sector || '').toLowerCase();
                          const secName = selectedSector.name.toLowerCase();
                          return (
                            repSec === secName ||
                            secName.includes(repSec) ||
                            repSec.includes(secName.split('(')[0].trim())
                          );
                        }).length
                      }{' '}
                      {language === 'es' ? 'alertas aprobadas' : 'approved alerts'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                        {language === 'es' ? 'Clasificación Territorial' : 'Risk Classification'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                        {selectedSector.levelLabel}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                        {language === 'es' ? 'Cuadrante Asignado' : 'Assigned Quadrant'}
                      </span>
                      <span className="font-bold text-cyan-700 dark:text-cyan-300 mt-0.5 block">
                        {selectedSector.quadrant} • Línea 123
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                        {language === 'es' ? 'Horario de Precaución' : 'Precaution Schedule'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {selectedSector.precautionSchedule ||
                          (language === 'es'
                            ? 'Atención preventiva nocturna'
                            : 'Nighttime preventive attention')}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">
                        {language === 'es' ? 'Acceso y Transporte' : 'Transport Access'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                        {selectedSector.transportAccess || 'Sistema Integrado Comuna 8'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Contexto y Diagnóstico del Sector */}
                <div className="bg-amber-50/80 dark:bg-slate-950/80 border border-amber-300 dark:border-amber-500/40 rounded-2xl p-3.5 shadow-xs space-y-2">
                  <div className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{t('contextNoteLabel')}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                    {selectedSector.contextNote}
                  </p>
                  <div className="pt-2 border-t border-amber-200/80 dark:border-amber-500/20">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-900 dark:text-amber-400 block mb-0.5">
                      {t('sectorCardHistoricalDiag')}
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {selectedSector.historicalDiagnosis}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer: Coordinates and Focus Sector on Map Button */}
              <div className="pt-3.5 border-t border-slate-200 dark:border-white/15 flex items-center justify-between gap-2 mt-3 shrink-0">
                <span className="text-xs font-mono font-bold text-cyan-900 dark:text-cyan-300 bg-cyan-50 dark:bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-cyan-300 dark:border-cyan-500/30 truncate">
                  GPS: {selectedSector.coordinates.lat.toFixed(4)}° N,{' '}
                  {selectedSector.coordinates.lng.toFixed(4)}° W
                </span>
                <button
                  type="button"
                  onClick={() => selectAndFocusSector(selectedSector)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 cursor-pointer"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>
                    {language === 'es' ? 'Enfocar en el mapa' : 'Focus on map'}
                  </span>
                </button>
              </div>
            </div>
          ) : searchedLocation ? (
            <div className="bg-white dark:bg-slate-900/95 border border-cyan-300 dark:border-cyan-500/40 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-sm relative overflow-hidden flex flex-col h-full">
              {/* Header & Location Badge */}
              <div className="flex items-start justify-between gap-2 mb-3.5 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-0.5 truncate">
                    {t('searchedLocationTitle')}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-theme-primary flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="truncate">{searchedLocation.name}</span>
                  </h2>
                </div>

                <div className="px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-800/90 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-500/40">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <span>{t('noRiskDataBadge')}</span>
                </div>
              </div>

              {/* Scrollable Information Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 tactical-scrollbar">
                <div className="bg-cyan-50/60 dark:bg-slate-950/80 border border-cyan-200 dark:border-cyan-500/40 rounded-xl p-3.5 shadow-xs">
                  <div className="text-xs sm:text-sm font-bold text-cyan-900 dark:text-cyan-300 mb-1 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>{t('geolocatedPlaceLabel')}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                    {searchedLocation.address}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/75 p-3.5 rounded-xl border border-slate-200 dark:border-white/15">
                  <span className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-theme-primary block mb-1">
                    {t('territorialCoverageNotice')}
                  </span>
                  <p className="text-xs sm:text-sm text-theme-secondary font-medium leading-relaxed">
                    {t('territorialCoverageText')}
                  </p>
                </div>

                <div className="bg-emerald-50/60 dark:bg-slate-950/75 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                  <span className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block mb-1">
                    {t('urbanSelfCareNotice')}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    {t('urbanSelfCareText')}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/15 flex items-center justify-between gap-2 mt-2 shrink-0">
                <span className="text-xs font-mono font-bold text-cyan-900 dark:text-cyan-300 bg-cyan-50 dark:bg-slate-950/80 px-2 py-1 rounded-md border border-cyan-300 dark:border-cyan-500/30 truncate">
                  GEO: {searchedLocation.coordinates.lat.toFixed(4)}°,{' '}
                  {searchedLocation.coordinates.lng.toFixed(4)}°
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo(searchedLocation.coordinates);
                      mapInstanceRef.current.setZoom(16);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all font-bold text-xs sm:text-sm flex items-center gap-1 shadow-xs active:scale-95 shrink-0 cursor-pointer"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>{t('centerSectorBtn')}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RiskMapScreen;
