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
          libraries: ['places', 'geometry', 'marker', 'geocoding'],
        });

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
    };
  }, [GOOGLE_MAPS_API_KEY]);

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

  // Custom Zoom Controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      const current = mapInstanceRef.current.getZoom() || 14;
      mapInstanceRef.current.setZoom(current + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      const current = mapInstanceRef.current.getZoom() || 13;
      mapInstanceRef.current.setZoom(current - 1);
    }
  };

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(COMUNA_8_CENTER);
      mapInstanceRef.current.setZoom(COMUNA_8_DEFAULT_ZOOM);
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

  // Normalization helper for diacritics and case-insensitive search
  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // Filtered sectors list with partial, accent-insensitive and multi-field matching
  // Filtered sectors list for Comuna 8 (18 Sectores)
  const filteredSectors = useMemo(() => {
    const q = normalizeText(searchQuery);
    return COMUNA_8_SECTORS.filter((sector) => {
      const matchesSearch =
        !q ||
        normalizeText(sector.name).includes(q) ||
        normalizeText(sector.comuna).includes(q) ||
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-500 tracking-wider uppercase mb-1.5 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-semibold">Módulo Geoespacial // Comuna 8 — Villa Hermosa</span>
            <span className="text-slate-400 dark:text-slate-600">|</span>
            <span className="text-theme-secondary font-medium">Google Maps Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-theme-primary flex items-center gap-2">
            <span>Mapa de Riesgo y Prevención</span>
          </h1>
          <p className="text-sm sm:text-base text-theme-secondary mt-1 max-w-3xl leading-relaxed">
            Monitoreo preventivo de sectores, termografía de concentración de riesgo y cuadrantes comunitarios de la Comuna 8 (Villa Hermosa, Medellín).
          </p>
        </div>

        {/* Action Controls & Navigation Shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateDashboard && (
            <button
              onClick={onNavigateDashboard}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
            >
              Ir al Panel de Control
            </button>
          )}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
            >
              Inicio
            </button>
          )}
        </div>
      </div>

      {/* 2. Mandatory Citizen Disclaimer Banner exclusively for Comuna 8 */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 backdrop-blur-md shadow-xs">
        <Info className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
          <span className="font-bold text-amber-900 dark:text-amber-300">Aviso informativo de referencia y transparencia comunitaria:</span>{' '}
          La clasificación y niveles de referencia de los 18 sectores de la Comuna 8 (Villa Hermosa) es orientativa y se basa en dinámicas históricas comunitarias y reportes públicos disponibles. No constituye un diagnóstico exacto por barrio ni una calificación institucional vinculante o estigmatizante sobre los territorios. Para información oficial y actualizada, consulta el{' '}
          <a
            href="https://www.medellin.gov.co/es/secretaria-seguridad-convivencia/sisc/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-800 dark:text-amber-300 font-bold underline hover:text-amber-950 dark:hover:text-amber-200 inline-flex items-center gap-1"
          >
            SISC de la Alcaldía de Medellín
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 inline" />
          </a>
          .
        </div>
      </div>

      {/* 3. Main Tactical Map Display & 3-Column Independent Layout on Desktop (Map 60%, Ficha 20%, Explorador 20%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-10 gap-5 items-stretch">
        {/* Column 1: Interactive Map View & Controls (60% / 6 of 10 cols on XL) */}
        <div className="lg:col-span-2 xl:col-span-6 flex flex-col gap-3.5 h-auto xl:h-[76vh] xl:min-h-[640px] xl:max-h-[860px]">
          {/* Top Map Toolbar: Google Places Autocomplete Search & View Controls */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md shadow-sm shrink-0">
            {/* Google Places Autocomplete Search Input for Medellín */}
            <div ref={searchContainerRef} className="relative flex-1 min-w-[260px] max-w-full lg:max-w-[360px]">
              <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={placesInputRef}
                id="input-places-autocomplete"
                type="text"
                autoComplete="off"
                placeholder="Buscar calle, carrera, barrio o lugar en Medellín..."
                value={placesSearchText}
                onChange={(e) => setPlacesSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    geocodeAddressFallback(placesSearchText);
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-theme-primary placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
              {placesSearchText && (
                <button
                  type="button"
                  onClick={handleResetCenter}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white p-0.5 transition-colors cursor-pointer"
                  title="Limpiar búsqueda de lugar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Comuna Indicator Badge */}
            <div className="flex items-center gap-1.5">
              <div className="px-3 py-1.5 rounded-xl border border-cyan-400/40 bg-cyan-50 dark:bg-cyan-950/70 text-cyan-900 dark:text-cyan-200 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>Comuna 8 — Villa Hermosa</span>
              </div>
            </div>

            {/* Controls Group: View Mode Toggle & GPS */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <button
                  id="btn-mode-heat"
                  type="button"
                  onClick={() => setViewMode('heat')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'heat'
                      ? 'bg-rose-600 dark:bg-rose-900/90 text-white dark:text-rose-100 border border-rose-500/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Calor</span>
                </button>

                <button
                  id="btn-mode-markers"
                  type="button"
                  onClick={() => setViewMode('markers')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'markers'
                      ? 'bg-amber-600 dark:bg-amber-900/90 text-white dark:text-amber-100 border border-amber-500/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Marcadores</span>
                </button>

                <button
                  id="btn-mode-both"
                  type="button"
                  onClick={() => setViewMode('both')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'both'
                      ? 'bg-indigo-600 dark:bg-indigo-900/90 text-white dark:text-indigo-100 border border-indigo-500/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                  title="Mostrar termografía y pines simultáneamente"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span className="hidden sm:inline">Híbrida</span>
                </button>
              </div>

              {/* Tactical Live Geolocation & Recenter */}
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-geolocation"
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-cyan-400/50 bg-cyan-100 dark:bg-cyan-950/60 hover:bg-cyan-200 dark:hover:bg-cyan-900/60 text-cyan-900 dark:text-cyan-300 text-xs font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer active:scale-95"
                  title="Centrar en mi ubicación en vivo (GPS)"
                >
                  {isLocating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                  ) : (
                    <LocateFixed className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  )}
                  <span className="hidden sm:inline font-bold">
                    {isLocating ? 'GPS...' : 'GPS'}
                  </span>
                </button>

                <button
                  id="btn-recenter-comuna8"
                  onClick={handleResetCenter}
                  className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-xs cursor-pointer"
                  title="Centrar en Comuna 8 (Villa Hermosa)"
                >
                  <Compass className="w-4 h-4 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Map Canvas Container - Expands to fill Column 1 height */}
          <div className="relative w-full h-[520px] sm:h-[600px] xl:h-full xl:flex-1 rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 bg-[#0c1017] shadow-lg">
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
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors active:scale-95 shadow cursor-pointer"
                title="Acercar mapa (+)"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="h-[1px] bg-white/15 mx-1" />
              <button
                id="btn-zoom-out"
                onClick={handleZoomOut}
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-100 transition-colors active:scale-95 shadow cursor-pointer"
                title="Alejar mapa (-)"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Sector Quick Badge Count on Map Top-Left with High Contrast text */}
            <div className="absolute top-4 left-4 z-10 bg-slate-900/95 px-3.5 py-2 rounded-xl border border-white/20 backdrop-blur-md text-xs font-mono text-slate-100 flex items-center gap-2.5 shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-bold text-white">
                {COMUNA_8_SECTORS.length} Sectores Monitoreados • Comuna 8
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-300 font-extrabold">Zoom: {zoomLevel}x</span>
            </div>
          </div>

          {/* Independent Thermal Legend Card outside & directly below the map canvas */}
          <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-2xl p-3 sm:p-3.5 shadow-sm backdrop-blur-md shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 shrink-0">
                <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                  <Flame className="w-4 h-4" />
                </div>
                <span>Termografía de Riesgo</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal hidden md:inline">• Comuna 8</span>
              </div>

              <div className="flex-1 max-w-xl flex flex-col gap-1.5">
                <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-600 border border-slate-300 dark:border-white/20 shadow-inner" />
                <div className="w-full flex items-center justify-between text-[11px] sm:text-xs font-mono gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-xs" />
                    <span>Tránsito / Base</span>
                  </div>
                  <span className="text-slate-400 dark:text-slate-600 select-none px-1">|</span>
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-xs" />
                    <span>Moderado</span>
                  </div>
                  <span className="text-slate-400 dark:text-slate-600 select-none px-1">|</span>
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-extrabold shrink-0">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-xs" />
                    <span>Mayor atención</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Ficha de Sector (20% / 2 of 10 cols on XL) */}
        <div className="lg:col-span-1 xl:col-span-2 flex flex-col h-auto xl:h-[76vh] xl:min-h-[640px] xl:max-h-[860px]">
          {selectedSector ? (
            <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-sm relative overflow-hidden flex flex-col h-full">
              {/* Tactical Wine/Burgundy Glow Accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />

              {/* Header & Sector Badge */}
              <div className="flex items-start justify-between gap-2 mb-3.5 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5 truncate">
                    {selectedSector.comuna} • {selectedSector.quadrant}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-theme-primary flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                    <span className="truncate">{selectedSector.name}</span>
                  </h2>
                </div>

                {/* Level Badge */}
                <div
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    selectedSector.level === 'high'
                      ? 'bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-500/70 shadow-xs'
                      : selectedSector.level === 'moderate'
                      ? 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-500/70'
                      : 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/70'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedSector.level === 'high'
                        ? 'bg-rose-500 animate-pulse'
                        : selectedSector.level === 'moderate'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span>{selectedSector.levelLabel}</span>
                </div>
              </div>

              {/* Scrollable Information Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 tactical-scrollbar">
                {/* Context Note with high legibility */}
                <div className="bg-amber-50 dark:bg-slate-950/80 border border-amber-300 dark:border-amber-500/40 rounded-xl p-3 sm:p-3.5 shadow-xs">
                  <div className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Nota de contexto territorial:</span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                    {selectedSector.contextNote}
                  </p>
                </div>

                {/* Historical Public Diagnosis with high legibility */}
                <div>
                  <span className="text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider text-theme-primary block mb-1">
                    Diagnóstico de referencia pública:
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 font-medium bg-slate-50 dark:bg-slate-950/75 p-3 rounded-xl border border-slate-200 dark:border-white/15 leading-relaxed">
                    {selectedSector.historicalDiagnosis}
                  </p>
                </div>

                {/* Citizen Advice with high legibility */}
                <div>
                  <span className="text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-1">
                    Pauta de cuidado para el ciudadano:
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 font-medium bg-emerald-50/50 dark:bg-slate-950/75 p-3 rounded-xl border border-emerald-300 dark:border-emerald-500/30 leading-relaxed">
                    {selectedSector.citizenAdvice}
                  </p>
                </div>
              </div>

              {/* Coordinates and Centering Action */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/15 flex items-center justify-between gap-2 mt-2 shrink-0">
                <span className="text-[11px] font-mono font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-slate-950/80 px-2 py-1 rounded-md border border-cyan-300 dark:border-cyan-500/30 truncate">
                  GEO: {selectedSector.coordinates.lat.toFixed(3)}°, {selectedSector.coordinates.lng.toFixed(3)}°
                </span>
                <button
                  onClick={() => selectAndFocusSector(selectedSector)}
                  className="px-3 py-1 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950 dark:hover:bg-cyan-900 text-cyan-900 dark:text-cyan-200 rounded-lg border border-cyan-400/50 transition-all font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 shrink-0 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Centrar</span>
                </button>
              </div>
            </div>
          ) : searchedLocation ? (
            <div className="bg-white dark:bg-slate-900/95 border border-cyan-300 dark:border-cyan-500/40 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-sm relative overflow-hidden flex flex-col h-full">
              {/* Tactical Cyan Glow Accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Header & Location Badge */}
              <div className="flex items-start justify-between gap-2 mb-3.5 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-0.5 truncate">
                    Búsqueda // Medellín
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-theme-primary flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span className="truncate">{searchedLocation.name}</span>
                  </h2>
                </div>

                <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-800/90 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-500/40">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <span>Sin datos de riesgo</span>
                </div>
              </div>

              {/* Scrollable Information Body with tactical scrollbar */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 tactical-scrollbar">
                {/* Geocoded Address Card */}
                <div className="bg-cyan-50/60 dark:bg-slate-950/80 border border-cyan-200 dark:border-cyan-500/40 rounded-xl p-3 sm:p-3.5 shadow-xs">
                  <div className="text-xs sm:text-sm font-bold text-cyan-900 dark:text-cyan-300 mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Lugar geolocalizado:</span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                    {searchedLocation.address}
                  </p>
                </div>

                {/* Territorial boundary explanation */}
                <div className="bg-slate-50 dark:bg-slate-950/75 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-white/15">
                  <span className="text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider text-theme-primary block mb-1">
                    Nota de cobertura comunitaria:
                  </span>
                  <p className="text-xs sm:text-[13px] text-theme-secondary font-medium leading-relaxed">
                    Esta ubicación corresponde a un sector de Medellín situado fuera del perímetro focalizado de la Comuna 8 (Villa Hermosa). El mapa muestra el marcador exacto de ubicación.
                  </p>
                </div>

                {/* General care advice */}
                <div className="bg-emerald-50/50 dark:bg-slate-950/75 p-3 sm:p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                  <span className="text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-1">
                    Pauta de autocuidado urbano:
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    Utiliza corredores iluminados y vías principales, mantente alerta al entorno y acude al sistema integrado 123 ante cualquier novedad de seguridad o convivencia.
                  </p>
                </div>
              </div>

              {/* Coordinates and Centering Action */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/15 flex items-center justify-between gap-2 mt-2 shrink-0">
                <span className="text-[11px] font-mono font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-slate-950/80 px-2 py-1 rounded-md border border-cyan-300 dark:border-cyan-500/30 truncate">
                  GEO: {searchedLocation.coordinates.lat.toFixed(4)}°, {searchedLocation.coordinates.lng.toFixed(4)}°
                </span>
                <button
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.panTo(searchedLocation.coordinates);
                      mapInstanceRef.current.setZoom(16);
                    }
                  }}
                  className="px-3 py-1 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950 dark:hover:bg-cyan-900 text-cyan-900 dark:text-cyan-200 rounded-lg border border-cyan-400/50 transition-all font-bold text-xs flex items-center gap-1 shadow-xs active:scale-95 shrink-0 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Centrar</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center text-theme-muted h-full flex flex-col items-center justify-center shadow-xs">
              <Crosshair className="w-10 h-10 text-cyan-500 dark:text-cyan-400/70 mx-auto mb-3" />
              <p className="text-sm font-bold text-theme-primary">Selecciona un sector o busca un lugar</p>
              <p className="text-xs text-theme-muted mt-1 font-medium">Usa el buscador de lugares de Medellín o haz clic en el mapa para inspeccionar</p>
            </div>
          )}
        </div>

        {/* Column 3: Explorador de Sectores (20% / 2 of 10 cols on XL) - Comuna 8 (18 Sectores) */}
        <div className="lg:col-span-1 xl:col-span-2 flex flex-col h-auto xl:h-[76vh] xl:min-h-[640px] xl:max-h-[860px]">
          <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header & Sector Count */}
            <div className="flex items-center justify-between gap-2 mb-2.5 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-theme-primary flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Explorador de Sectores</span>
              </h3>
              <span className="text-[10px] font-mono font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-slate-800/90 px-2 py-0.5 rounded-md border border-cyan-300 dark:border-cyan-500/30 shrink-0">
                {filteredSectors.length} / {COMUNA_8_SECTORS.length}
              </span>
            </div>

            {/* Search Input with Clear Action */}
            <div className="relative mb-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar barrio de Comuna 8..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-white/15 rounded-xl pl-8 pr-7 py-1.5 text-xs text-theme-primary placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Buttons (Level filter) */}
            <div className="flex items-center gap-1 mb-2.5 pb-1 text-[11px] shrink-0 border-b border-slate-200 dark:border-white/10 overflow-x-auto tactical-scrollbar">
              <button
                onClick={() => setFilterLevel('all')}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors font-semibold ${
                  filterLevel === 'all'
                    ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterLevel('high')}
                className={`px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 font-semibold ${
                  filterLevel === 'high'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-500/60 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white'
                }`}
                title="Mayor precaución"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Mayor</span>
              </button>
              <button
                onClick={() => setFilterLevel('moderate')}
                className={`px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 font-semibold ${
                  filterLevel === 'moderate'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-500/60 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-white'
                }`}
                title="Intermedia"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Inter.</span>
              </button>
              <button
                onClick={() => setFilterLevel('central')}
                className={`px-1.5 py-0.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 font-semibold ${
                  filterLevel === 'central'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/60 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white'
                }`}
                title="Menos crítica / Base"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Base</span>
              </button>
            </div>

            {/* Scrollable Sector Cards List for Comuna 8 */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5 tactical-scrollbar">
              {filteredSectors.map((sector) => {
                const isSelected = selectedSector?.id === sector.id;
                const dotColor =
                  sector.level === 'high'
                    ? 'bg-rose-500'
                    : sector.level === 'moderate'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                return (
                  <button
                    key={sector.id}
                    onClick={() => selectAndFocusSector(sector)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-slate-800 border-amber-400 text-slate-950 dark:text-white shadow-xs ring-1 ring-amber-400/40'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-bold truncate text-slate-900 dark:text-white">
                          {sector.name}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate font-medium">
                          {sector.quadrant} • {sector.levelLabel}
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        isSelected ? 'text-amber-600 dark:text-amber-400 translate-x-0.5' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}

              {filteredSectors.length === 0 && (
                <div className="py-8 text-center text-theme-muted">
                  <p className="text-xs font-semibold">No se encontraron sectores en la Comuna 8.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterLevel('all');
                    }}
                    className="mt-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Restablecer filtros
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
