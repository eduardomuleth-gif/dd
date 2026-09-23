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

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
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
    <div className="flex flex-col gap-1.5 relative" ref={containerRef} id={`group-${id}`}>
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
      <div className="relative">
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
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden flex flex-col max-h-[360px] animate-in fade-in zoom-in-95 duration-100">
            {/* 1. TOP PINNED SECTION: Always visible at the very top */}
            <div className="p-1.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-1">
              {/* Option 1: Otro (Escribir manualmente) - ALWAYS TOP OPTION */}
              <button
                type="button"
                onClick={() => handleSelectOption('otro')}
                className={`w-full px-3 py-2 rounded-lg text-xs font-bold text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                  value === 'otro'
                    ? 'bg-red-500 text-white shadow-xs'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">✏️</span>
                  <div className="flex flex-col">
                    <span className="leading-tight">Otro (Escribir dirección manualmente)</span>
                    <span className={`text-[10px] font-normal ${value === 'otro' ? 'text-red-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      Escribe cualquier calle, carrera o lugar
                    </span>
                  </div>
                </div>
                {value === 'otro' && <Check className="w-4 h-4 shrink-0" />}
              </button>

              {/* Option 2 (If origin): Mi ubicación actual (GPS) */}
              {isOrigin && (
                <button
                  type="button"
                  onClick={() => handleSelectOption('current')}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                    value === 'current'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                    <span>Mi ubicación actual (GPS)</span>
                  </div>
                  {value === 'current' && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              )}
            </div>

            {/* 2. REAL-TIME SEARCH / FILTER BAR */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por sector, CAI, hospital, parque..."
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 3. SCROLLABLE COLLAPSIBLE GROUPS */}
            <div className="overflow-y-auto flex-1 p-1 flex flex-col gap-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* GROUP A: Sectores de la Comuna 8 (18) */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setSectorsExpanded(!sectorsExpanded)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span>🏘️</span>
                    <span>Sectores de la Comuna 8</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-normal">
                      {filteredSectors.length}
                    </span>
                  </span>
                  {sectorsExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {sectorsExpanded && (
                  <div className="flex flex-col gap-0.5 mt-0.5 pl-1 pr-1">
                    {filteredSectors.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic px-3 py-1">No hay sectores que coincidan</span>
                    ) : (
                      filteredSectors.map((sec) => {
                        const isSelected = value === sec.id;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => handleSelectOption(sec.id)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/30'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                            }`}
                          >
                            <span className="truncate">{sec.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                  sec.level === 'high'
                                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                    : sec.level === 'moderate'
                                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {sec.levelLabel}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-red-500" />}
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
                <div className="flex flex-col pt-1">
                  <button
                    type="button"
                    onClick={() => setPlacesExpanded(!placesExpanded)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🛡️</span>
                      <span>Puntos Seguros (CAI / Salud / Parques)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-normal">
                        {filteredPlaces.length}
                      </span>
                    </span>
                    {placesExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {placesExpanded && (
                    <div className="flex flex-col gap-0.5 mt-0.5 pl-1 pr-1">
                      {filteredPlaces.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic px-3 py-1">No hay puntos seguros que coincidan</span>
                      ) : (
                        filteredPlaces.map((place) => {
                          const isSelected = value === place.id;
                          return (
                            <button
                              key={place.id}
                              type="button"
                              onClick={() => handleSelectOption(place.id)}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center justify-between transition cursor-pointer ${
                                isSelected
                                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/30'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {getPlaceIcon(place.category)}
                                <span className="truncate">{place.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] font-mono text-slate-400">{place.categoryLabel}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-red-500" />}
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
