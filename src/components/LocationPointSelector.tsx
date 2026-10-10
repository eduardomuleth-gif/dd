/// <reference types="@types/google.maps" />

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  MapPin,
  X,
  ShieldCheck,
  Building2,
  GraduationCap,
  Trees,
  Navigation,
  Edit3,
  CornerDownLeft,
  Sparkles,
} from 'lucide-react';
import { importLibrary } from '@googlemaps/js-api-loader';
import { SectorRiskData } from './RiskMapScreen';

export interface RealSafePlaceItem {
  id: string;
  name: string;
  address: string;
  category: 'police' | 'health' | 'education' | 'park';
  categoryLabel: string;
  location: { lat: number; lng: number };
  rating?: number;
  source: 'Google Maps Platform';
}

export interface PlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  location?: { lat: number; lng: number };
  type: 'google' | 'sector' | 'safePlace';
  refId?: string;
}

export interface LocationPointSelectorProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  isOrigin?: boolean;
  sectors: SectorRiskData[];
  safePlaces: RealSafePlaceItem[];
  customText: string;
  onCustomTextChange: (text: string, resolvedCoord?: { lat: number; lng: number }) => void;
  onSubmitManual: () => void;
  manualPlaceholder?: string;
  defaultSectorId?: string;
  onOpenExclusive?: (selectorId: string) => void;
  activeSelectorId?: string | null;
}

const EXCLUSIVE_OPEN_EVENT = 'security-urban:location-selector-open';

export const LocationPointSelector: React.FC<LocationPointSelectorProps> = ({
  id,
  label,
  icon,
  value,
  onChange,
  isOrigin = false,
  sectors,
  safePlaces,
  customText,
  onCustomTextChange,
  onSubmitManual,
  manualPlaceholder,
  defaultSectorId,
  onOpenExclusive,
  activeSelectorId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorsExpanded, setSectorsExpanded] = useState(true);
  const [placesExpanded, setPlacesExpanded] = useState(true);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const lastPresetRef = useRef<string>(
    value !== 'otro' ? value : defaultSectorId || 'c8-villa-hermosa'
  );

  useEffect(() => {
    if (value !== 'otro') {
      lastPresetRef.current = value;
    }
  }, [value]);

  const containerRef = useRef<HTMLDivElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notify other LocationPointSelector instances to close immediately when this one opens
  const notifyExclusiveOpen = () => {
    onOpenExclusive?.(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EXCLUSIVE_OPEN_EVENT, { detail: { id } }));
    }
  };

  // Close this selector if parent or another selector instance became active
  useEffect(() => {
    if (activeSelectorId !== undefined && activeSelectorId !== null && activeSelectorId !== id) {
      setIsOpen(false);
      setShowSuggestions(false);
    }
  }, [activeSelectorId, id]);

  useEffect(() => {
    const handleOtherSelectorOpen = (e: Event) => {
      const customEv = e as CustomEvent<{ id?: string }>;
      if (customEv.detail?.id && customEv.detail.id !== id) {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };

    window.addEventListener(EXCLUSIVE_OPEN_EVENT, handleOtherSelectorOpen);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(EXCLUSIVE_OPEN_EVENT, handleOtherSelectorOpen);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [id]);

  // Compute human-readable text for current preset selection
  const selectedPresetDisplay = useMemo(() => {
    if (value === 'otro') {
      return '';
    }
    if (value === 'current') {
      return 'Mi ubicación actual (GPS)';
    }
    if (value.startsWith('place-')) {
      const p = safePlaces.find((item) => item.id === value);
      if (p) return `${p.name} — ${p.address}`;
    }
    const sec = sectors.find(
      (s) => s.id === value || s.id === value.replace('sec-', 'c8-')
    );
    if (sec) return `${sec.name}, Comuna 8, Medellín`;
    return '';
  }, [value, sectors, safePlaces]);

  // Displayed input value: if value === 'otro', show customText; otherwise show preset display
  const inputDisplayValue = value === 'otro' ? customText : selectedPresetDisplay;

  // Fetch Google Maps Places / Geocoder autocomplete suggestions when user types manually
  useEffect(() => {
    if (value !== 'otro' || !customText || customText.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const q = customText.trim();
    const qLower = q.toLowerCase();
    let isCancelled = false;

    const timer = setTimeout(async () => {
      setIsSearchingPlaces(true);
      const localMatches: PlaceSuggestion[] = [];

      // 1. Check matching safe places
      safePlaces
        .filter(
          (p) =>
            p.name.toLowerCase().includes(qLower) ||
            p.address.toLowerCase().includes(qLower) ||
            p.categoryLabel.toLowerCase().includes(qLower)
        )
        .slice(0, 3)
        .forEach((p) => {
          localMatches.push({
            id: `sug-place-${p.id}`,
            title: p.name,
            subtitle: `${p.categoryLabel} • ${p.address}`,
            location: p.location,
            type: 'safePlace',
            refId: p.id,
          });
        });

      // 2. Check matching Comuna 8 sectors
      sectors
        .filter((s) => s.name.toLowerCase().includes(qLower))
        .slice(0, 2)
        .forEach((s) => {
          localMatches.push({
            id: `sug-sec-${s.id}`,
            title: `Barrio / Sector ${s.name}`,
            subtitle: `Comuna 8 (Villa Hermosa), Medellín • Riesgo ${s.levelLabel}`,
            location: s.coordinates,
            type: 'sector',
            refId: s.id,
          });
        });

      // 3. Query Google Maps Places API (New) for real street addresses and places in Medellín
      const googleMatches: PlaceSuggestion[] = [];
      try {
        const { Place } = (await importLibrary('places')) as any;
        if (Place && typeof Place.searchByText === 'function') {
          const queryWithCity =
            qLower.includes('medellin') || qLower.includes('medellín')
              ? q
              : `${q}, Medellín, Antioquia`;
          const response = await Place.searchByText({
            textQuery: queryWithCity,
            fields: ['displayName', 'formattedAddress', 'location'],
            locationBias: { lat: 6.2476, lng: -75.5558 },
            region: 'co',
            language: 'es',
            maxResultCount: 5,
          });

          if (!isCancelled && response?.places?.length) {
            response.places.forEach((p: any, idx: number) => {
              const loc = p.location;
              const lat =
                typeof loc?.lat === 'function' ? loc.lat() : Number(loc?.lat ?? loc?.latitude);
              const lng =
                typeof loc?.lng === 'function' ? loc.lng() : Number(loc?.lng ?? loc?.longitude);
              if (!isNaN(lat) && !isNaN(lng)) {
                googleMatches.push({
                  id: `sug-gmp-${idx}-${lat.toFixed(4)}`,
                  title: p.displayName || q,
                  subtitle: p.formattedAddress || 'Medellín, Antioquia',
                  location: { lat, lng },
                  type: 'google',
                });
              }
            });
          }
        }
      } catch {
        // Fallback to Geocoder if Places searchByText fails
        try {
          const { Geocoder } = (await importLibrary('geocoding')) as google.maps.GeocodingLibrary;
          const geocoder = new Geocoder();
          const queryWithCity =
            qLower.includes('medellin') || qLower.includes('medellín')
              ? q
              : `${q}, Medellín, Colombia`;
          geocoder.geocode({ address: queryWithCity, region: 'co' }, (results, status) => {
            if (!isCancelled && status === google.maps.GeocoderStatus.OK && results) {
              results.slice(0, 4).forEach((r, idx) => {
                const lat = r.geometry.location.lat();
                const lng = r.geometry.location.lng();
                googleMatches.push({
                  id: `sug-geo-${idx}`,
                  title: r.formatted_address.split(',')[0] || q,
                  subtitle: r.formatted_address,
                  location: { lat, lng },
                  type: 'google',
                });
              });
              setSuggestions([...googleMatches, ...localMatches].slice(0, 6));
            }
          });
        } catch {
          // Ignore
        }
      }

      if (!isCancelled) {
        setSuggestions([...googleMatches, ...localMatches].slice(0, 6));
        setIsSearchingPlaces(false);
      }
    }, 260);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [customText, value, safePlaces, sectors]);

  // Filtered sectors based on dropdown search
  const filteredSectors = useMemo(() => {
    if (!searchQuery.trim()) return sectors;
    const q = searchQuery.toLowerCase().trim();
    return sectors.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.levelLabel.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [sectors, searchQuery]);

  // Filtered safe places based on dropdown search
  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return safePlaces;
    const q = searchQuery.toLowerCase().trim();
    return safePlaces.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
    );
  }, [safePlaces, searchQuery]);

  const getPlaceIcon = (category: string) => {
    switch (category) {
      case 'police':
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'health':
        return <Building2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'education':
        return <GraduationCap className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      default:
        return <Trees className="w-3.5 h-3.5 text-lime-500 shrink-0" />;
    }
  };

  const handleToggleList = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      notifyExclusiveOpen();
      setIsOpen(true);
      setShowSuggestions(false);
    }
  };

  const handleSelectOption = (optVal: string) => {
    onChange(optVal);
    setIsOpen(false);
    setShowSuggestions(false);
    setSearchQuery('');
    if (optVal === 'otro') {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 40);
    }
  };

  const handleSelectSuggestion = (sug: PlaceSuggestion) => {
    setShowSuggestions(false);
    setIsOpen(false);
    if (sug.type === 'safePlace' && sug.refId) {
      onChange(sug.refId);
      return;
    }
    if (sug.type === 'sector' && sug.refId) {
      onChange(sug.refId);
      return;
    }
    const fullAddress =
      sug.subtitle && !sug.title.includes(sug.subtitle)
        ? `${sug.title}, ${sug.subtitle}`
        : sug.title;
    onChange('otro');
    onCustomTextChange(fullAddress, sug.location);
    setTimeout(() => {
      onSubmitManual();
    }, 50);
  };

  const isMenuVisible = isOpen || (showSuggestions && value === 'otro' && customText.trim().length >= 2);

  return (
    <div
      className={`flex flex-col gap-2 relative ${
        isMenuVisible ? 'z-[100]' : 'z-10'
      }`}
      ref={containerRef}
      id={`group-${id}`}
    >
      {/* Header Row: Label on left + Aligned Action Buttons ("Mi GPS", "Escribir dirección", "Lista") on right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label
          htmlFor={`${id}-address-input`}
          className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 shrink-0"
        >
          {icon}
          <span>{label}</span>
        </label>

        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {isOrigin && (
            <button
              type="button"
              onClick={() => handleSelectOption('current')}
              className={`h-7 px-2.5 rounded-lg text-[11px] font-mono border transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                value === 'current'
                  ? 'border-emerald-500 bg-emerald-600 text-white font-bold shadow-xs'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold'
              }`}
              title="Usar mi ubicación GPS actual"
            >
              <Navigation className="w-3 h-3 shrink-0" />
              <span>Mi GPS</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              notifyExclusiveOpen();
              onChange('otro');
              onCustomTextChange('');
              setIsOpen(false);
              setShowSuggestions(true);
              setTimeout(() => manualInputRef.current?.focus(), 30);
            }}
            className={`h-7 px-2.5 rounded-lg text-[11px] font-mono font-bold border transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
              value === 'otro'
                ? 'border-red-500 bg-red-600 text-white shadow-xs'
                : 'border-red-500/40 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400'
            }`}
            title="Escribir dirección manualmente"
          >
            <Edit3 className="w-3 h-3 shrink-0" />
            <span>Escribir dirección</span>
          </button>

          <button
            type="button"
            onClick={handleToggleList}
            className={`h-7 px-2.5 rounded-lg text-[11px] font-mono font-semibold border transition inline-flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
              isOpen
                ? 'border-red-500 bg-red-600 text-white shadow-xs'
                : 'border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title="Elegir de la lista de sectores o ubicaciones"
          >
            <span>Lista</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Google Maps-style Direct Address Input + Dropdown Trigger */}
      <div className="relative flex items-center gap-2 min-w-0">
        <div
          className={`relative flex-1 min-w-0 flex items-center rounded-xl border transition-all bg-white dark:bg-slate-950 ${
            showSuggestions || isOpen
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-slate-400 ml-3 shrink-0 pointer-events-none" />
          <input
            ref={manualInputRef}
            id={`${id}-address-input`}
            type="text"
            value={inputDisplayValue}
            onFocus={() => {
              notifyExclusiveOpen();
              setIsOpen(false);
              if (value !== 'otro') {
                lastPresetRef.current = value;
                onChange('otro');
                onCustomTextChange('', undefined);
              }
              setShowSuggestions(true);
            }}
            onBlur={() => {
              // Give click events on suggestions time to fire before checking empty state
              setTimeout(() => {
                if (
                  manualInputRef.current &&
                  document.activeElement !== manualInputRef.current &&
                  value === 'otro' &&
                  !customText.trim()
                ) {
                  onChange(lastPresetRef.current);
                }
              }, 220);
            }}
            onChange={(e) => {
              notifyExclusiveOpen();
              if (value !== 'otro') {
                onChange('otro');
              }
              onCustomTextChange(e.target.value, undefined);
              setShowSuggestions(true);
              setIsOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setShowSuggestions(false);
                setIsOpen(false);
                onSubmitManual();
              }
            }}
            placeholder={
              manualPlaceholder ||
              (isOrigin
                ? 'Escribe dirección de origen (ej. Calle 56 #38-12, Boston)...'
                : 'Escribe dirección de destino (ej. Carrera 40 #65-15, Villa Hermosa)...')
            }
            className="w-full px-2.5 py-2.5 text-xs font-medium bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />

          {/* Clear Input Button */}
          {inputDisplayValue && (
            <button
              type="button"
              onClick={() => {
                notifyExclusiveOpen();
                onChange('otro');
                onCustomTextChange('', undefined);
                setSuggestions([]);
                manualInputRef.current?.focus();
              }}
              className="p-1.5 text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0"
              title="Borrar dirección para escribir otra"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dropdown List Trigger */}
          <button
            type="button"
            id={id}
            onClick={handleToggleList}
            className="px-3 py-2.5 border-l border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 transition cursor-pointer shrink-0 flex items-center"
            title="Abrir lista de sectores y ubicaciones"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isOpen ? 'rotate-180 text-red-500' : ''
              }`}
            />
          </button>
        </div>

        {/* Direct "Trazar" Action Button when typing manual address */}
        {value === 'otro' && customText.trim().length > 0 && (
          <button
            type="button"
            id={`btn-trazar-${isOrigin ? 'origen' : 'destino'}-manual`}
            onClick={() => {
              setShowSuggestions(false);
              setIsOpen(false);
              onSubmitManual();
            }}
            className="px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition flex items-center gap-1"
            title="Trazar ruta con esta dirección"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>Trazar</span>
          </button>
        )}

        {/* Live Google Maps Autocomplete Suggestions Popup (High Z-Index, Solid Background, Shadow, Max Height) */}
        {showSuggestions && value === 'otro' && customText.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-[120] rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0f172a] shadow-[0_20px_50px_rgba(15,23,42,0.35)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
            {/* Option to use exact typed text */}
            <button
              type="button"
              onClick={() => {
                setShowSuggestions(false);
                onSubmitManual();
              }}
              className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-slate-900 hover:bg-red-100 dark:hover:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Buscar dirección exacta: <strong>"{customText.trim()}"</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 shrink-0">
                Enter ↵
              </span>
            </button>

            {isSearchingPlaces && suggestions.length === 0 && (
              <div className="px-3.5 py-3 text-[11px] text-slate-500 dark:text-slate-300 bg-white dark:bg-[#0f172a] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-500" />
                <span>Buscando direcciones en Google Maps Medellín...</span>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="max-h-[240px] overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#0f172a]">
                {suggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="w-full px-3.5 py-2.5 text-left bg-white dark:bg-[#0f172a] hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        sug.type === 'google'
                          ? 'text-red-500'
                          : sug.type === 'safePlace'
                          ? 'text-blue-500'
                          : 'text-emerald-500'
                      }`}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {sug.title}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {sug.subtitle}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dropdown Menu with Sectors & Safe Locations (High Z-Index, Solid Background, Deep Shadow, Max Height + Internal Scroll) */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-[120] rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#0f172a] shadow-[0_20px_50px_rgba(15,23,42,0.35)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[300px] sm:max-h-[340px]">
            {/* Sticky Search filter inside dropdown */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex items-center gap-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filtrar sector o ubicación de la lista"
                placeholder="Filtrar sector o ubicación de la lista..."
                className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-0.5"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpiar filtro"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto overscroll-contain flex-1 p-2.5 flex flex-col gap-2.5 divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#0f172a]">
              {/* GROUP A: Sectores de la Comuna 8 */}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  aria-expanded={sectorsExpanded}
                  onClick={() => setSectorsExpanded(!sectorsExpanded)}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" aria-hidden="true" />
                    <span className="font-['Rajdhani'] uppercase tracking-wider font-extrabold">
                      Sectores Comuna 8 ({filteredSectors.length})
                    </span>
                  </div>
                  {sectorsExpanded ? (
                    <ChevronUp className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  )}
                </button>

                {sectorsExpanded && (
                  <div className="flex flex-col gap-1 pt-1">
                    {filteredSectors.map((sec) => {
                      const isSelected = value === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => handleSelectOption(sec.id)}
                          className={`w-full px-3 py-2 rounded-xl text-xs text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                            isSelected
                              ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold border border-red-500/50'
                              : 'bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-red-500' : 'text-slate-400'
                              }`}
                            />
                            <span className="truncate font-semibold">{sec.name}</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {sec.levelLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* GROUP B: Ubicaciones clasificadas */}
              {safePlaces.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2.5">
                  <button
                    type="button"
                    aria-expanded={placesExpanded}
                    onClick={() => setPlacesExpanded(!placesExpanded)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                      <span className="font-['Rajdhani'] uppercase tracking-wider font-extrabold">
                        Ubicaciones Seguras ({filteredPlaces.length})
                      </span>
                    </div>
                    {placesExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {placesExpanded && (
                    <div className="flex flex-col gap-1 pt-1">
                      {filteredPlaces.map((place) => {
                        const isSelected = value === place.id;
                        return (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => handleSelectOption(place.id)}
                            className={`w-full px-3 py-2 rounded-xl text-xs text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                              isSelected
                                ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold border border-red-500/50'
                                : 'bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {getPlaceIcon(place.category)}
                              <div className="flex flex-col min-w-0">
                                <span className="truncate font-semibold">{place.name}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {place.address}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              {place.categoryLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
