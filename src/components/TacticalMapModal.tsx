import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Route, 
  PhoneCall, 
  Eye, 
  Layers, 
  Radio, 
  Navigation,
  CheckCircle2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface TacticalMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilter?: 'all' | 'routes' | 'alerts' | 'quadrants';
}

interface SectorInfo {
  id: string;
  name: string;
  status: 'safe' | 'alert' | 'monitored';
  cameras: number;
  activePatrols: number;
  quadrantNumber: string;
  safeRoute: string;
  notes: string;
}

const SECTORS: SectorInfo[] = [
  {
    id: 'sec-1',
    name: 'Villa Hermosa (Parque Principal)',
    status: 'safe',
    cameras: 12,
    activePatrols: 2,
    quadrantNumber: 'Cuadrante 8-1',
    safeRoute: 'Corredor iluminado Carrera 40 y Calle 66',
    notes: 'Comercio activo, presencia policial continua y cámaras PTZ conectadas al 123.',
  },
  {
    id: 'sec-2',
    name: 'Enciso - Corredor Escolar',
    status: 'monitored',
    cameras: 8,
    activePatrols: 1,
    quadrantNumber: 'Cuadrante 8-3',
    safeRoute: 'Ruta escolar segura Carrera 36A hasta Calle 58',
    notes: 'Acompañamiento en horarios escolares (6:30am - 12:30pm - 5:30pm).',
  },
  {
    id: 'sec-3',
    name: 'Sucre / Boston Oriental',
    status: 'safe',
    cameras: 14,
    activePatrols: 2,
    quadrantNumber: 'Cuadrante 8-2',
    safeRoute: 'Calle 56 y Calle 57 (Vía Tranvía)',
    notes: 'Excelente iluminación LED nocturna y enlace directo a estación Bicentenario.',
  },
  {
    id: 'sec-4',
    name: 'La Sierra / 13 de Noviembre',
    status: 'alert',
    cameras: 6,
    activePatrols: 1,
    quadrantNumber: 'Cuadrante 8-5',
    safeRoute: 'Eje Metrocable Línea H (Estación Oriente a Villa Sierra)',
    notes: 'Alerta preventiva por obras viales. Se recomienda usar la ruta de Metrocable.',
  },
  {
    id: 'sec-5',
    name: 'El Pinal - Mirador',
    status: 'monitored',
    cameras: 5,
    activePatrols: 1,
    quadrantNumber: 'Cuadrante 8-4',
    safeRoute: 'Corredor Carrera 28 hacia conexión Enciso',
    notes: 'Punto de vigilancia ciudadana y cámara comunitaria de telemetría.',
  },
];

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({
  isOpen,
  onClose,
  initialFilter = 'all',
}) => {
  const { colors, theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'routes' | 'alerts' | 'quadrants'>(initialFilter);
  const [selectedSector, setSelectedSector] = useState<SectorInfo>(SECTORS[0]);

  if (!isOpen) return null;

  const filteredSectors = SECTORS.filter((sector) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'routes') return sector.safeRoute.length > 0;
    if (activeFilter === 'alerts') return sector.status === 'alert';
    if (activeFilter === 'quadrants') return true;
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div
        className={`w-full max-w-4xl rounded-3xl border shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] ${colors.cardBg} ${colors.cardBorder} ${colors.canvasText}`}
      >
        {/* Accent Bar */}
        <div className="h-[5px] w-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-sm shadow-red-500/25 shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-900/40">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg sm:text-xl font-bold tracking-tight ${colors.cardTitle}`}>
                  {language === 'es' ? 'MAPA TÁCTICO COMUNA 8' : 'COMUNA 8 TACTICAL MAP'}
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-700">
                  GPS LIVE
                </span>
              </div>
              <p className={`text-xs ${colors.cardSubtitle}`}>
                {language === 'es' 
                  ? 'Red de vigilancia comunitaria, cuadrantes policiales y rutas protegidas' 
                  : 'Community surveillance network, police quadrants, and safe corridors'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center hover:bg-red-600 hover:text-white transition cursor-pointer text-slate-500 dark:text-slate-400"
            aria-label="Cerrar mapa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Todos los Sectores' : 'All Sectors'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('routes')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'routes'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>{language === 'es' ? 'Rutas Seguras' : 'Safe Routes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('alerts')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'alerts'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'es' ? 'Zonas con Alertas' : 'Active Alerts'}</span>
          </button>
        </div>

        {/* Modal Body: Tactical Interactive Graphic & Sector List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto grow">
          {/* Left Column: Visual Vector Radar Map */}
          <div className="lg:col-span-7 p-4 sm:p-6 bg-slate-100/60 dark:bg-[#080b12] flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
            {/* HUD Coordinates Bar */}
            <div className="flex items-center justify-between text-[11px] font-mono mb-3 text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                ZONA MEDELLÍN ORIENTE
              </span>
              <span>06.2476° N, -75.5658° W</span>
            </div>

            {/* Stylized Vector Map Graphic */}
            <div className="relative w-full aspect-video sm:aspect-square sm:max-h-[340px] rounded-2xl border border-red-600/30 bg-slate-900 overflow-hidden flex items-center justify-center p-4 shadow-inner">
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444415_1px,transparent_1px),linear-gradient(to_bottom,#ef444415_1px,transparent_1px)] bg-[size:28px_28px]" />

              {/* Radar Rings */}
              <div className="absolute w-64 h-64 rounded-full border border-red-500/20" />
              <div className="absolute w-44 h-44 rounded-full border border-red-500/30" />
              <div className="absolute w-24 h-24 rounded-full border border-red-500/40" />

              {/* Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-px bg-red-500/25" />
                <div className="h-full w-px bg-red-500/25 absolute" />
              </div>

              {/* Interactive Sector Nodes */}
              {SECTORS.map((sector, idx) => {
                const isSelected = selectedSector.id === sector.id;
                // Pin positions arranged in map simulation
                const coords = [
                  { top: '35%', left: '48%' }, // Villa Hermosa
                  { top: '55%', left: '32%' }, // Enciso
                  { top: '25%', left: '30%' }, // Sucre / Boston
                  { top: '70%', left: '68%' }, // La Sierra
                  { top: '48%', left: '75%' }, // El Pinal
                ][idx] || { top: '50%', left: '50%' };

                return (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => setSelectedSector(sector)}
                    style={{ top: coords.top, left: coords.left }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all cursor-pointer group z-10 ${
                      isSelected
                        ? 'bg-red-600 text-white ring-4 ring-red-500/40 scale-125 shadow-lg'
                        : sector.status === 'alert'
                        ? 'bg-amber-500 text-black ring-2 ring-amber-400/50'
                        : 'bg-slate-800 text-slate-200 border border-slate-600 hover:scale-110 hover:border-red-400'
                    }`}
                    title={sector.name}
                  >
                    <MapPin className="w-4 h-4" />
                    {/* Pulsing beacon */}
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        sector.status === 'alert' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        sector.status === 'alert' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}></span>
                    </span>
                  </button>
                );
              })}

              {/* Bottom Map Legend */}
              <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-sm border border-slate-700/60 flex items-center justify-between text-[10px] font-mono text-white/90">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Seguro
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Monitoreado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Precaución
                </span>
              </div>
            </div>

            {/* Quick Emergency Button */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className={`font-semibold ${colors.cardSubtitle}`}>
                Línea de Emergencias Medellín:
              </span>
              <a
                href="tel:123"
                className="px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Llamar al 123</span>
              </a>
            </div>
          </div>

          {/* Right Column: Selected Sector Details & Sector List */}
          <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col justify-between space-y-4">
            {/* Selected Sector Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-red-600/30 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    {selectedSector.quadrantNumber}
                  </span>
                  <h4 className={`text-base font-bold leading-snug ${colors.cardTitle}`}>
                    {selectedSector.name}
                  </h4>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    selectedSector.status === 'safe'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : selectedSector.status === 'alert'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700'
                  }`}
                >
                  {selectedSector.status === 'safe' ? 'Zona Segura' : selectedSector.status === 'alert' ? 'Precaución' : 'Monitoreada'}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{selectedSector.cameras} Cámaras</div>
                    <div className="text-[10px] text-slate-500">Conectadas al CAD</div>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{selectedSector.activePatrols} Patrullas</div>
                    <div className="text-[10px] text-slate-500">En cuadrante</div>
                  </div>
                </div>
              </div>

              {/* Safe Route Highlight */}
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300">
                  <Route className="w-3.5 h-3.5" />
                  <span>Corredor Recomendado:</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {selectedSector.safeRoute}
                </p>
              </div>

              {/* Notes */}
              <p className={`text-xs leading-relaxed ${colors.cardSubtitle}`}>
                {selectedSector.notes}
              </p>
            </div>

            {/* List of Other Sectors to Select */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'es' ? 'Seleccionar otro sector:' : 'Select sector:'}
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredSectors.map((sector) => {
                  const isSelected = selectedSector.id === sector.id;
                  return (
                    <button
                      key={sector.id}
                      type="button"
                      onClick={() => setSelectedSector(sector)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-medium flex items-center justify-between border transition cursor-pointer ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span className="font-semibold truncate">{sector.name}</span>
                      <span className="text-[10px] font-mono uppercase opacity-80 shrink-0 ml-2">
                        {sector.quadrantNumber}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Close / Action Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{language === 'es' ? 'Cerrar Vista de Mapa' : 'Close Map View'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
