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
  Check, 
  Navigation,
  Edit3
} from 'lucide-react';
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
  onCustomTextChange: (text: string) => void;
  onSubmitManual: () => void;
  manualPlaceholder?: string;
  defaultSectorId?: string;
}

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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorsExpanded, setSectorsExpanded] = useState(true);
  const [placesExpanded, setPlacesExpanded] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Compute active label to display on closed trigger
  const activeLabel = useMemo(() => {
    if (value === 'otro') {
      return customText.trim() ? `✏️ "${customText.trim()}" (Manual)` : '✏️ Otro (Escribir manualmente)';
    }
    if (value === 'current') {
      return '📍 Mi ubicación actual (GPS)';
    }
    if (value.startsWith('place-')) {
      const p = safePlaces.find((item) => item.id === value);
      if (p) return `${p.categoryLabel}: ${p.name}`;
    }
    const sec = sectors.find((s) => s.id === value);
    if (sec) return `${sec.name} (${sec.levelLabel})`;
    return value || 'Seleccionar punto...';
  }, [value, customText, sectors, safePlaces]);

  // Filtered sectors based on search
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

  // Filtered safe places based on search
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

  // Category Icon helper
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

  const handleSelectOption = (optVal: string) => {
    onChange(optVal);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div
      className={`flex flex-col gap-1.5 relative ${isOpen ? 'z-[60]' : isOrigin ? 'z-20' : 'z-10'}`}
      ref={containerRef}
      id={`group-${id}`}
    >
      {/* Header with Label and Quick Mode Switchers */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </label>

        {/* Quick Shortcut Buttons right on the header */}
        <div className="flex items-center gap-1">
          {isOrigin && value !== 'current' && (
            <button
              type="button"
              onClick={() => handleSelectOption('current')}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              title="Usar ubicación GPS actual"
            >
              <Navigation className="w-2.5 h-2.5 text-emerald-500" />
              <span>GPS</span>
            </button>
          )}

          {value !== 'otro' ? (
            <button
              type="button"
              onClick={() => handleSelectOption('otro')}
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-red-500/40 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition flex items-center gap-1 cursor-pointer"
              title="Escribir dirección o punto manualmente"
            >
              <Edit3 className="w-2.5 h-2.5" />
              <span>Manual</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectOption(defaultSectorId || (isOrigin ? 'current' : sectors[0]?.id || 'sec-villa-hermosa-centro'))}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              title="Volver a lista de sectores"
            >
              <span>Ver lista</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Trigger Button */}
      <div className={`relative ${isOpen ? 'z-[60]' : 'z-auto'}`}>
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${
            isOpen
              ? 'border-red-500 ring-2 ring-red-500/20 bg-white dark:bg-slate-900'
              : value === 'otro'
              ? 'border-red-500/70 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          <span className="truncate flex items-center gap-1.5">
            {value === 'otro' ? (
              <span className="font-semibold text-red-600 dark:text-red-400">✏️ Otro (Escribir manualmente)</span>
            ) : value === 'current' ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">📍 Mi ubicación actual (GPS)</span>
            ) : (
              <span>{activeLabel}</span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-red-500' : ''}`} />
        </button>

        {/* Dropdown Menu with Top Pinned "Otro", Search Input, and Collapsible Groups */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-[70] rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-black/40 dark:shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[300px] animate-in fade-in zoom-in-95 duration-100">
            {/* 1. TOP PINNED SECTION: Always visible at the very top */}
            <div className="p-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-1.5 shrink-0">
              {/* Option 1: Otro (Escribir manualmente) - ALWAYS TOP OPTION */}
              <button
                type="button"
                onClick={() => handleSelectOption('otro')}
                className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-xs ${
                  value === 'otro'
                    ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400/40'
                    : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300/80 dark:border-red-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${value === 'otro' ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400'}`}>
                    <Edit3 className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="leading-snug font-extrabold text-xs">Otro (Escribir manualmente)</span>
                    <span className={`text-[10px] font-normal ${value === 'otro' ? 'text-red-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      Escribe cualquier calle o dirección
                    </span>
                  </div>
                </div>
                {value === 'otro' && <Check className="w-4 h-4 shrink-0 text-white stroke-[2.5]" />}
              </button>

              {/* Option 2 (If origin): Mi ubicación actual (GPS) */}
              {isOrigin && (
                <button
                  type="button"
                  onClick={() => handleSelectOption('current')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                    value === 'current'
                      ? 'bg-emerald-600 text-white shadow-md font-bold ring-2 ring-emerald-400/40'
                      : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${value === 'current' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'}`}>
                      <Navigation className="w-3.5 h-3.5 stroke-[2.2]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold leading-tight text-xs">Mi ubicación actual (GPS en vivo)</span>
                      <span className={`text-[10px] ${value === 'current' ? 'text-emerald-100' : 'text-slate-400'}`}>
                        Detectar coordenadas por sensor
                      </span>
                    </div>
                  </div>
                  {value === 'current' && <Check className="w-4 h-4 shrink-0 text-white" />}
                </button>
              )}
            </div>

            {/* 2. REAL-TIME SEARCH / FILTER BAR */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar sector, CAI, hospital, dirección..."
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none py-0.5"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick action to use typed search query as manual address if not empty */}
            {searchQuery.trim().length > 1 && (
              <div className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/60 border-b border-red-200 dark:border-red-900/60 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const q = searchQuery.trim();
                    onCustomTextChange(q);
                    onChange('otro');
                    setIsOpen(false);
                    setSearchQuery('');
                    setTimeout(() => onSubmitManual(), 50);
                  }}
                  className="w-full text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 shrink-0" />
                  <span className="truncate">Trazar con: <strong>"{searchQuery.trim()}"</strong></span>
                </button>
              </div>
            )}

            {/* 3. SCROLLABLE COLLAPSIBLE GROUPS */}
            <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-2.5 divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {/* GROUP A: Sectores de la Comuna 8 (18) */}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setSectorsExpanded(!sectorsExpanded)}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer border border-slate-200/80 dark:border-slate-700/60"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏘️</span>
                    <span className="font-['Rajdhani'] uppercase tracking-wider font-extrabold text-slate-900 dark:text-slate-100">
                      Sectores de la Comuna 8 (Medellín)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-bold">
                      {filteredSectors.length}
                    </span>
                  </div>
                  {sectorsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {sectorsExpanded && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    {filteredSectors.length === 0 ? (
                      <span className="text-xs text-slate-400 italic px-3 py-2">No hay sectores que coincidan con la búsqueda</span>
                    ) : (
                      filteredSectors.map((sec) => {
                        const isSelected = value === sec.id;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => handleSelectOption(sec.id)}
                            className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-bold border-2 border-red-500/40 shadow-xs'
                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/40 dark:border-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? 'text-red-500' : 'text-slate-400'}`} />
                              <span className="truncate font-semibold">{sec.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                                  sec.level === 'high'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/60'
                                    : sec.level === 'moderate'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800/60'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60'
                                }`}
                              >
                                {sec.levelLabel}
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-red-500 shrink-0 stroke-[2.5]" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* GROUP B: Puntos Seguros (CAI / Salud / Colegios / Parques) */}
              {safePlaces.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setPlacesExpanded(!placesExpanded)}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer border border-slate-200/80 dark:border-slate-700/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛡️</span>
                      <span className="font-['Rajdhani'] uppercase tracking-wider font-extrabold text-slate-900 dark:text-slate-100">
                        Puntos Seguros Reales (CAI / Salud / Parques / Colegios)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full font-bold">
                        {filteredPlaces.length}
                      </span>
                    </div>
                    {placesExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {placesExpanded && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {filteredPlaces.length === 0 ? (
                        <span className="text-xs text-slate-400 italic px-3 py-2">No hay puntos seguros que coincidan con la búsqueda</span>
                      ) : (
                        filteredPlaces.map((place) => {
                          const isSelected = value === place.id;
                          return (
                            <button
                              key={place.id}
                              type="button"
                              onClick={() => handleSelectOption(place.id)}
                              className={`w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-bold border-2 border-red-500/40 shadow-xs'
                                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/40 dark:border-slate-800/40'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="mt-0.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                                  {getPlaceIcon(place.category)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="truncate font-semibold text-slate-900 dark:text-slate-100">{place.name}</span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{place.address}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {place.categoryLabel}
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-red-500 shrink-0 stroke-[2.5]" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Accessible native select as fallback and DOM anchor */}
      <select
        id={`${id}-native`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        <optgroup label="Personalizado">
          <option value="otro">✏️ Otro (Escribir manualmente)</option>
        </optgroup>
        {isOrigin && (
          <optgroup label="Ubicación GPS">
            <option value="current">📍 Mi ubicación actual (GPS)</option>
          </optgroup>
        )}
        <optgroup label="Sectores Comuna 8">
          {sectors.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {sec.name} ({sec.levelLabel})
            </option>
          ))}
        </optgroup>
        {safePlaces.length > 0 && (
          <optgroup label="Puntos Seguros">
            {safePlaces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.categoryLabel}: {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {/* 4. REQUIREMENT 3: Immediate Manual Input Field under the Selector with NO SCROLL */}
      {value === 'otro' && (
        <div
          id={`${id === 'destination-select' ? 'destination' : 'origin'}-manual-field`}
          className="mt-1 p-2.5 rounded-xl border-2 border-red-500/70 bg-red-50/80 dark:bg-red-950/30 flex flex-col gap-1.5 transition-all shadow-xs animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${id === 'destination-select' ? 'destination' : 'origin'}-custom-input`}
              className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1"
            >
              <span>Especifique el sector o dirección de {isOrigin ? 'origen' : 'destino'}:</span>
            </label>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Enter para trazar</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              id={`${id === 'destination-select' ? 'destination' : 'origin'}-custom-input`}
              type="text"
              autoFocus
              value={customText}
              onChange={(e) => onCustomTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSubmitManual();
                }
              }}
              placeholder={manualPlaceholder || (isOrigin ? 'Ej. Calle 56 #38-12 / Boston' : 'Ej. Carrera 40 #54-20 / CAI')}
              className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              id={`btn-trazar-${isOrigin ? 'origen' : 'destino'}-manual`}
              onClick={onSubmitManual}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition"
              title={`Calcular ruta hacia/desde esta dirección`}
            >
              Trazar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
