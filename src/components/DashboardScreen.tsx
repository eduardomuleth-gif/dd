import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Shield, 
  Users, 
  FileCheck2,
  ArrowLeft, 
  Navigation, 
  ArrowRight,
  PlusCircle, 
  PhoneCall, 
  Clock, 
  ChevronRight,
  Sparkles,
  TrendingDown,
  Activity,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { NavTabId } from './ModulePlaceholderView';

interface DashboardScreenProps {
  onNavigate: (tab: NavTabId) => void;
  onOpenTacticalMap: () => void;
}

interface RecentAlert {
  id: string;
  title: string;
  sector: string;
  timeAgo: string;
  status: 'safe' | 'warning' | 'alert';
  isNew?: boolean;
}

const INITIAL_ALERTS: RecentAlert[] = [
  {
    id: 'alt-1',
    title: 'Cierre preventivo por obras viales',
    sector: 'La Sierra / Calle 56',
    timeAgo: 'Hace 15 min',
    status: 'alert',
  },
  {
    id: 'alt-2',
    title: 'Acompañamiento en corredor escolar',
    sector: 'Enciso - Carrera 36A',
    timeAgo: 'Hace 45 min',
    status: 'warning',
  },
  {
    id: 'alt-3',
    title: 'Mantenimiento de luminarias LED completado',
    sector: 'Villa Hermosa - Parque Central',
    timeAgo: 'Hace 2 h',
    status: 'safe',
  },
];

const SIMULATED_NEW_ALERTS: Omit<RecentAlert, 'id' | 'timeAgo' | 'isNew'>[] = [
  {
    title: 'Monitoreo preventivo nocturno activado',
    sector: 'Sucre - Eje Comercial',
    status: 'safe',
  },
  {
    title: 'Aviso ciudadano: Obstáculo en vía',
    sector: 'El Pinal - Carrera 28',
    status: 'warning',
  },
  {
    title: 'Patrullaje preventivo reforzado en parque',
    sector: 'Villa Hermosa - Plaza Principal',
    status: 'safe',
  },
  {
    title: 'Reporte preventivo de visibilidad por neblina',
    sector: 'La Sierra - Mirador',
    status: 'warning',
  },
  {
    title: 'Acompañamiento escolar matutino finalizado',
    sector: 'Enciso - Carrera 36A',
    status: 'safe',
  },
];

// 7-day incident trend data models
interface IncidentBreakdown {
  type: string;
  count: number;
  category: 'Iluminación' | 'Infraestructura' | 'Seguridad' | 'Convivencia';
}

interface DayTrend {
  day: string;
  fullDay: string;
  dateStr: string;
  incidents: number;
  topSector: string;
  breakdown: IncidentBreakdown[];
}

const CURRENT_WEEK_TREND: DayTrend[] = [
  { 
    day: 'Lun', 
    fullDay: 'Lunes', 
    dateStr: '15 Sep',
    incidents: 4, 
    topSector: 'Sucre - Eje Comercial',
    breakdown: [
      { type: 'Falla en luminaria pública', count: 2, category: 'Iluminación' },
      { type: 'Obstáculo temporal en calzada', count: 1, category: 'Infraestructura' },
      { type: 'Ruido excesivo nocturno', count: 1, category: 'Convivencia' },
    ]
  },
  { 
    day: 'Mar', 
    fullDay: 'Martes', 
    dateStr: '16 Sep',
    incidents: 6, 
    topSector: 'Villa Hermosa - Parque Central',
    breakdown: [
      { type: 'Luminarias intermitentes', count: 3, category: 'Iluminación' },
      { type: 'Bache o hundimiento en vía', count: 2, category: 'Infraestructura' },
      { type: 'Vehículo mal estacionado en corredor', count: 1, category: 'Convivencia' },
    ]
  },
  { 
    day: 'Mié', 
    fullDay: 'Miércoles', 
    dateStr: '17 Sep',
    incidents: 3, 
    topSector: 'El Pinal - Carrera 28',
    breakdown: [
      { type: 'Acompañamiento preventivo solicitado', count: 2, category: 'Seguridad' },
      { type: 'Limpieza de escombros requerida', count: 1, category: 'Infraestructura' },
    ]
  },
  { 
    day: 'Jue', 
    fullDay: 'Jueves', 
    dateStr: '18 Sep',
    incidents: 7, 
    topSector: 'Enciso - Corredor Escolar',
    breakdown: [
      { type: 'Alumbrado apagado en sendero', count: 3, category: 'Iluminación' },
      { type: 'Semáforo peatonal desincronizado', count: 2, category: 'Infraestructura' },
      { type: 'Alerta preventiva ciudadana', count: 2, category: 'Seguridad' },
    ]
  },
  { 
    day: 'Vie', 
    fullDay: 'Viernes', 
    dateStr: '19 Sep',
    incidents: 5, 
    topSector: 'La Sierra - Mirador',
    breakdown: [
      { type: 'Punto oscuro reportado', count: 2, category: 'Iluminación' },
      { type: 'Aglomeración o alteración menor', count: 2, category: 'Convivencia' },
      { type: 'Apoyo preventivo escolar', count: 1, category: 'Seguridad' },
    ]
  },
  { 
    day: 'Sáb', 
    fullDay: 'Sábado', 
    dateStr: '20 Sep',
    incidents: 2, 
    topSector: 'Villa Hermosa - Calle 58',
    breakdown: [
      { type: 'Mantenimiento preventivo de luminaria', count: 1, category: 'Iluminación' },
      { type: 'Despeje de acera peatonal', count: 1, category: 'Infraestructura' },
    ]
  },
  { 
    day: 'Dom', 
    fullDay: 'Domingo (Hoy)', 
    dateStr: 'Hoy',
    incidents: 3, 
    topSector: 'Sucre / Boston Oriental',
    breakdown: [
      { type: 'Cierre preventivo por obra', count: 1, category: 'Infraestructura' },
      { type: 'Acompañamiento en parque', count: 1, category: 'Seguridad' },
      { type: 'Poste con daño leve', count: 1, category: 'Iluminación' },
    ]
  },
];

const PREVIOUS_WEEK_TREND: DayTrend[] = [
  { 
    day: 'Lun', 
    fullDay: 'Lunes', 
    dateStr: '8 Sep',
    incidents: 6, 
    topSector: 'Enciso - Carrera 36A',
    breakdown: [
      { type: 'Corte de alumbrado barrial', count: 4, category: 'Iluminación' },
      { type: 'Obra sin señalización adecuada', count: 2, category: 'Infraestructura' },
    ]
  },
  { 
    day: 'Mar', 
    fullDay: 'Martes', 
    dateStr: '9 Sep',
    incidents: 8, 
    topSector: 'La Sierra / 13 de Noviembre',
    breakdown: [
      { type: 'Luminarias dañadas por lluvia', count: 4, category: 'Iluminación' },
      { type: 'Deslizamiento menor de talud', count: 2, category: 'Infraestructura' },
      { type: 'Presencia sospechosa en esquina', count: 2, category: 'Seguridad' },
    ]
  },
  { 
    day: 'Mié', 
    fullDay: 'Miércoles', 
    dateStr: '10 Sep',
    incidents: 5, 
    topSector: 'Sucre - Eje Comercial',
    breakdown: [
      { type: 'Reparación de tubería en calzada', count: 3, category: 'Infraestructura' },
      { type: 'Acompañamiento preventivo', count: 2, category: 'Seguridad' },
    ]
  },
  { 
    day: 'Jue', 
    fullDay: 'Jueves', 
    dateStr: '11 Sep',
    incidents: 7, 
    topSector: 'Villa Hermosa - Parque Central',
    breakdown: [
      { type: 'Luminarias apagadas en plaza', count: 3, category: 'Iluminación' },
      { type: 'Reporte de ruido en horario nocturno', count: 2, category: 'Convivencia' },
      { type: 'Bache en cruce peatonal', count: 2, category: 'Infraestructura' },
    ]
  },
  { 
    day: 'Vie', 
    fullDay: 'Viernes', 
    dateStr: '12 Sep',
    incidents: 7, 
    topSector: 'Enciso - Corredor Escolar',
    breakdown: [
      { type: 'Falta de visibilidad nocturna', count: 3, category: 'Iluminación' },
      { type: 'Basura acumulada en esquina', count: 2, category: 'Infraestructura' },
      { type: 'Solicitud de patrullaje preventivo', count: 2, category: 'Seguridad' },
    ]
  },
  { 
    day: 'Sáb', 
    fullDay: 'Sábado', 
    dateStr: '13 Sep',
    incidents: 4, 
    topSector: 'El Pinal - Carrera 28',
    breakdown: [
      { type: 'Luminaria intermitente en curva', count: 2, category: 'Iluminación' },
      { type: 'Reunión ruidosa en vía pública', count: 2, category: 'Convivencia' },
    ]
  },
  { 
    day: 'Dom', 
    fullDay: 'Domingo', 
    dateStr: '14 Sep',
    incidents: 5, 
    topSector: 'Sucre / Boston Oriental',
    breakdown: [
      { type: 'Mantenimiento de luminarias', count: 2, category: 'Iluminación' },
      { type: 'Revisión preventiva de talud', count: 2, category: 'Infraestructura' },
      { type: 'Vehículo abandonado reportado', count: 1, category: 'Convivencia' },
    ]
  },
];

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onOpenTacticalMap,
}) => {
  const { colors, theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';

  // Dynamic Real-time Simulated Metrics
  const [activeAlerts, setActiveAlerts] = useState<number>(2);
  const [monitoredZones, setMonitoredZones] = useState<number>(5);
  // Realistic community active user count (range 15 to 60)
  const [activeUsers, setActiveUsers] = useState<number>(34);
  // Citizen's personal active reports in tracking
  const [myActiveReports] = useState<number>(2);

  // Pulse animation flags when numbers change
  const [alertsPulse, setAlertsPulse] = useState<boolean>(false);
  const [zonesPulse, setZonesPulse] = useState<boolean>(false);
  const [usersPulse, setUsersPulse] = useState<boolean>(false);

  // Dynamic Alerts Queue
  const [alerts, setAlerts] = useState<RecentAlert[]>(INITIAL_ALERTS);

  // Trend Chart State: Week selection and Day selection
  const [weekView, setWeekView] = useState<'current' | 'previous'>('current');
  const activeTrendData = weekView === 'current' ? CURRENT_WEEK_TREND : PREVIOUS_WEEK_TREND;
  const [selectedDay, setSelectedDay] = useState<DayTrend>(CURRENT_WEEK_TREND[6]);
  const [hoveredDay, setHoveredDay] = useState<DayTrend | null>(null);

  // Whenever week toggle changes, select Sunday of that week by default
  const handleWeekChange = (view: 'current' | 'previous') => {
    setWeekView(view);
    const targetData = view === 'current' ? CURRENT_WEEK_TREND : PREVIOUS_WEEK_TREND;
    setSelectedDay(targetData[6]);
    setHoveredDay(null);
  };

  // Real-time metrics simulation interval (every 18 seconds)
  useEffect(() => {
    let alertIndex = 0;

    const intervalId = setInterval(() => {
      // 1. Simulate minor fluctuation in Active Alerts (1 to 4)
      setActiveAlerts((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const nextVal = Math.min(4, Math.max(1, prev + delta));
        if (nextVal !== prev) {
          setAlertsPulse(true);
          setTimeout(() => setAlertsPulse(false), 1200);
        }
        return nextVal;
      });

      // 2. Simulate minor fluctuation in Monitored Zones (4 to 6)
      if (Math.random() > 0.45) {
        setMonitoredZones((prev) => {
          const delta = Math.random() > 0.6 ? 1 : -1;
          const nextVal = Math.min(6, Math.max(4, prev + delta));
          if (nextVal !== prev) {
            setZonesPulse(true);
            setTimeout(() => setZonesPulse(false), 1200);
          }
          return nextVal;
        });
      }

      // 3. Simulate Active Users realistic fluctuation (between 15 and 60)
      setActiveUsers((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const nextVal = Math.min(60, Math.max(15, prev + delta));
        if (nextVal !== prev) {
          setUsersPulse(true);
          setTimeout(() => setUsersPulse(false), 1200);
        }
        return nextVal;
      });

      // 4. Occasionally push a new simulated alert (every ~2 cycles)
      if (Math.random() > 0.35) {
        const candidate = SIMULATED_NEW_ALERTS[alertIndex % SIMULATED_NEW_ALERTS.length];
        alertIndex++;
        
        const newAlertItem: RecentAlert = {
          id: `sim-alt-${Date.now()}`,
          title: candidate.title,
          sector: candidate.sector,
          timeAgo: 'Justo ahora',
          status: candidate.status,
          isNew: true,
        };

        setAlerts((prevAlerts) => {
          const updated = [newAlertItem, ...prevAlerts.map(a => ({ ...a, isNew: false }))].slice(0, 3);
          return updated;
        });

        // Reset the isNew highlight after 3.5 seconds
        setTimeout(() => {
          setAlerts((current) => current.map(a => ({ ...a, isNew: false })));
        }, 3500);
      }
    }, 18000);

    return () => clearInterval(intervalId);
  }, []);

  // Calculate maximum value for chart scaling
  const maxIncidents = Math.max(...activeTrendData.map(d => d.incidents), 8);
  const totalWeekIncidents = activeTrendData.reduce((acc, curr) => acc + curr.incidents, 0);

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Header Bar: Back to Home + Breadcrumb & Title */}
      <div className="w-full mb-6 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-red-500 hover:text-white' 
                : 'bg-white border-slate-200 text-slate-700 hover:border-red-500 hover:text-red-600'
            } shadow-xs`}
            aria-label="Volver a Inicio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-['Rajdhani'] ${colors.cardTitle}`}>
                {language === 'es' ? 'PANEL DE CONTROL' : 'COMMAND DASHBOARD'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                COMUNA 8
              </span>
            </div>
            <p className={`text-xs sm:text-sm font-medium ${colors.cardSubtitle}`}>
              {language === 'es' 
                ? 'Monitoreo preventivo y telemetría comunitaria en tiempo real' 
                : 'Preventive monitoring & real-time community telemetry'}
            </p>
          </div>
        </div>

        {/* Real-time Telemetry Status Pill */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-xs ${colors.badgeOnlineBg} ${colors.badgeOnlineText} ${colors.badgeOnlineBorder}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="font-mono text-[11px] tracking-wider uppercase">
              {language === 'es' ? 'TELEMETRÍA EN VIVO' : 'LIVE TELEMETRY'}
            </span>
          </span>
        </div>
      </div>

      {/* 2. Top Row: 4 Dynamic Citizen-Oriented Metric Cards */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Metric 1: Alertas Activas (Dynamic) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('alerts')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('alerts')}
          className={`group rounded-2xl p-5 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer ${
            isDark 
              ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/70' 
              : 'bg-white border-slate-200 hover:border-amber-500/70'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-3xl sm:text-4xl font-black font-['Rajdhani'] text-amber-500 block transition-all duration-300 ${
                  alertsPulse ? 'scale-110 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : ''
                }`}>
                  {activeAlerts}
                </span>
                {alertsPulse && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <span className={`text-xs sm:text-sm font-bold block ${colors.cardTitle}`}>
                {language === 'es' ? 'Alertas activas' : 'Active alerts'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 2: Zonas Monitoreadas (Comuna 8) (Dynamic) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('riskMap')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('riskMap')}
          className={`group rounded-2xl p-5 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer ${
            isDark 
              ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/70' 
              : 'bg-white border-slate-200 hover:border-emerald-500/70'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-3xl sm:text-4xl font-black font-['Rajdhani'] text-emerald-500 block transition-all duration-300 ${
                  zonesPulse ? 'scale-110 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]' : ''
                }`}>
                  {monitoredZones}
                </span>
                {zonesPulse && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </div>
              <span className={`text-xs sm:text-sm font-bold block ${colors.cardTitle}`}>
                {language === 'es' ? 'Zonas monitoreadas' : 'Monitored zones'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 3: Usuarios Activos Ahora (Realistic range 15-60) */}
        <div
          className={`group rounded-2xl p-5 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all ${
            isDark 
              ? 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/70' 
              : 'bg-white border-slate-200 hover:border-cyan-500/70'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-3xl sm:text-4xl font-black font-['Rajdhani'] text-cyan-500 dark:text-cyan-400 block transition-all duration-300 ${
                  usersPulse ? 'scale-110 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]' : ''
                }`}>
                  {activeUsers}
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              </div>
              <span className={`text-xs sm:text-sm font-bold block ${colors.cardTitle}`}>
                {language === 'es' ? 'Usuarios activos ahora' : 'Active users now'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">
                {language === 'es' ? 'Conectados en Comuna 8' : 'Connected in Comuna 8'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 4: Mis Reportes Activos (Citizen-focused replacement with direct link) */}
        <div
          className={`group rounded-2xl p-5 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col justify-between ${
            isDark 
              ? 'bg-slate-950/80 border-slate-800 hover:border-red-500/70' 
              : 'bg-white border-slate-200 hover:border-red-500/70'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-red-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-black font-['Rajdhani'] text-red-500 block">
                  {myActiveReports}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-500/10 text-red-500 border border-red-500/20">
                  {language === 'es' ? 'En proceso' : 'In review'}
                </span>
              </div>
              <span className={`text-xs sm:text-sm font-bold block ${colors.cardTitle}`}>
                {language === 'es' ? 'Mis reportes activos' : 'My active reports'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform shrink-0">
              <FileCheck2 className="w-6 h-6 stroke-[2]" />
            </div>
          </div>

          {/* Direct "Ver mis reportes" Button */}
          <button
            type="button"
            onClick={() => onNavigate('myReports')}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-500/20 hover:border-red-500 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs group/btn"
          >
            <span>{language === 'es' ? 'Ver mis reportes' : 'View my reports'}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>

      </div>

      {/* 3. Main Content: 7-Day Interactive Trend Chart + Alerts & Quick Actions */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Column: Interactive 7-Day Incident Trend Mini-Chart (7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col">
          <div
            className={`w-full h-full rounded-3xl p-5 sm:p-7 border relative overflow-hidden backdrop-blur-md shadow-xl flex flex-col justify-between ${colors.cardBg} ${colors.cardBorder}`}
          >
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

            {/* Header: Title + Week Selector Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-500" />
                  <h2 className={`text-base sm:text-lg font-extrabold tracking-tight font-['Rajdhani'] ${colors.cardTitle}`}>
                    {language === 'es' ? 'TENDENCIA DE INCIDENTES // ÚLTIMOS 7 DÍAS' : 'INCIDENT TREND // LAST 7 DAYS'}
                  </h2>
                </div>
                <p className={`text-xs ${colors.cardSubtitle}`}>
                  {language === 'es' 
                    ? 'Reportes comunitarios verificados en sectores de la Comuna 8' 
                    : 'Verified community reports across Comuna 8 sectors'}
                </p>
              </div>

              {/* Selector: Esta semana / Semana anterior */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 dark:bg-black/40 border border-slate-800 text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleWeekChange('current')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-mono font-bold ${
                    weekView === 'current'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'es' ? 'Esta semana' : 'This week'}
                </button>
                <button
                  type="button"
                  onClick={() => handleWeekChange('previous')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer text-xs font-mono font-bold ${
                    weekView === 'previous'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'es' ? 'Semana anterior' : 'Prev week'}
                </button>
              </div>
            </div>

            {/* Weekly Summary Badge Bar */}
            <div className="flex items-center justify-between gap-3 mb-4 px-3.5 py-2 rounded-xl bg-slate-900/40 dark:bg-slate-950/40 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-red-400" />
                <span className="font-mono">
                  {weekView === 'current' 
                    ? (language === 'es' ? 'Período actual: 15 Sep - 21 Sep' : 'Current period: Sep 15 - Sep 21') 
                    : (language === 'es' ? 'Período anterior: 8 Sep - 14 Sep' : 'Previous period: Sep 8 - Sep 14')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>
                  {weekView === 'current'
                    ? `${totalWeekIncidents} incidentes (-28% vs ant.)`
                    : `${totalWeekIncidents} incidentes totales`}
                </span>
              </div>
            </div>

            {/* Interactive Chart Container with Tooltip Support */}
            <div className="relative w-full rounded-2xl bg-slate-950/70 dark:bg-[#060911] border border-slate-800/90 p-4 sm:p-5 pt-7 overflow-hidden">
              
              {/* Tactical background grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_24px] pointer-events-none" />

              {/* Hover Tooltip Overlay (when hovering a bar) */}
              {hoveredDay && (
                <div 
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-red-500/40 text-xs shadow-xl backdrop-blur-md flex items-center gap-3 animate-in fade-in zoom-in-95 pointer-events-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-bold text-white">{hoveredDay.fullDay} ({hoveredDay.dateStr}):</span>
                    <span className="font-mono text-red-400 font-bold">{hoveredDay.incidents} {language === 'es' ? 'incidentes' : 'incidents'}</span>
                  </div>
                  <span className="text-slate-400 text-[11px] border-l border-slate-700 pl-2">
                    <MapPin className="w-3 h-3 inline mr-1 text-amber-400" />
                    {hoveredDay.topSector}
                  </span>
                </div>
              )}

              {/* Interactive Bar Chart Grid */}
              <div className="relative z-10 grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 sm:h-48 pt-6 pb-2 border-b border-slate-800">
                {activeTrendData.map((item) => {
                  const isSelected = selectedDay.day === item.day;
                  const isHovered = hoveredDay?.day === item.day;
                  const heightPercent = Math.max(12, Math.round((item.incidents / maxIncidents) * 100));

                  return (
                    <div
                      key={item.day}
                      onClick={() => setSelectedDay(item)}
                      onMouseEnter={() => setHoveredDay(item)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className="group flex flex-col items-center justify-end h-full cursor-pointer select-none"
                    >
                      {/* Count label above bar */}
                      <span className={`text-[11px] font-mono font-bold mb-1.5 transition-all duration-200 ${
                        isSelected 
                          ? 'text-red-400 scale-110' 
                          : isHovered
                          ? 'text-white scale-105'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}>
                        {item.incidents}
                      </span>

                      {/* Bar Column with visual glow */}
                      <div className="w-full max-w-[40px] bg-slate-800/80 rounded-t-xl overflow-hidden relative flex items-end h-full">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl transition-all duration-300 relative ${
                            isSelected
                              ? 'bg-gradient-to-t from-red-700 via-red-600 to-rose-400 shadow-[0_0_14px_rgba(239,68,68,0.8)]'
                              : isHovered
                              ? 'bg-gradient-to-t from-red-800 via-red-600 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                              : 'bg-gradient-to-t from-slate-700 via-rose-950 to-red-600/70 group-hover:from-red-900 group-hover:to-red-500'
                          }`}
                        >
                          {/* Top indicator cap */}
                          <div className="absolute top-0 inset-x-0 h-1 bg-white/70" />
                        </div>
                      </div>

                      {/* Day Label */}
                      <span className={`text-xs font-mono font-semibold mt-2 transition-colors ${
                        isSelected 
                          ? 'text-red-400 font-bold' 
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}>
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Instructions tip */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{language === 'es' ? 'Haz clic en cualquier día para ver el desglose' : 'Click any day to view incident breakdown'}</span>
                <span className="text-slate-400">
                  {selectedDay.fullDay} {language === 'es' ? 'seleccionado' : 'selected'}
                </span>
              </div>
            </div>

            {/* Click-to-Inspect Detail Section: Specific breakdown for the clicked day */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/60 dark:bg-[#090e1a] border border-slate-800 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                  <span className={`text-xs sm:text-sm font-bold ${colors.cardTitle}`}>
                    {selectedDay.fullDay} ({selectedDay.dateStr})
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    — {selectedDay.incidents} {language === 'es' ? 'reportes totales' : 'total reports'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{language === 'es' ? 'Foco principal' : 'Main focus'}: <strong>{selectedDay.topSector}</strong></span>
                </div>
              </div>

              {/* Specific incident items breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectedDay.breakdown.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/90 flex items-start gap-2"
                  >
                    <span className="w-5 h-5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {item.count}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 leading-snug">
                        {item.type}
                      </p>
                      <span className={`text-[10px] font-mono uppercase font-bold tracking-wide ${
                        item.category === 'Iluminación' 
                          ? 'text-amber-400' 
                          : item.category === 'Infraestructura'
                          ? 'text-cyan-400'
                          : item.category === 'Seguridad'
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'es' ? 'Datos consolidados con líderes comunitarios' : 'Consolidated with community leaders'}</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('myReports')}
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                {language === 'es' ? 'Ver mis reportes' : 'View my reports'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Últimas Alertas (Dynamic) & Acciones Rápidas (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Block: Últimas Alertas (Summary Version - 3 Alerts with live push simulation) */}
          <div
            className={`w-full rounded-3xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-xl ${colors.cardBg} ${colors.cardBorder}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h2 className={`text-base sm:text-lg font-bold font-['Rajdhani'] ${colors.cardTitle}`}>
                  {language === 'es' ? 'ÚLTIMAS ALERTAS' : 'RECENT ALERTS'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{language === 'es' ? 'Ver todas' : 'View all'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* List of exactly 3 alerts, smoothly transitioning */}
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate('alerts')}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate('alerts')}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start gap-3 hover:-translate-y-0.5 relative ${
                    alert.isNew 
                      ? 'ring-2 ring-red-500/80 bg-red-950/20' 
                      : ''
                  } ${
                    isDark 
                      ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700' 
                      : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Clean Status Dot Indicator */}
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    alert.status === 'alert'
                      ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                      : alert.status === 'warning'
                      ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                      : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                  }`} />

                  <div className="grow min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <h4 className={`text-xs sm:text-sm font-bold truncate leading-tight ${colors.cardTitle}`}>
                        {alert.title}
                      </h4>
                      {alert.isNew && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-red-600 text-white animate-pulse shrink-0">
                          NUEVA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span className="truncate">{alert.sector}</span>
                      <span className="shrink-0 flex items-center gap-1 font-mono text-[10px]">
                        <Clock className="w-3 h-3" />
                        {alert.timeAgo}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block: Acciones Rápidas (Simple 3 Buttons) */}
          <div
            className={`w-full rounded-3xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-xl ${colors.cardBg} ${colors.cardBorder}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-red-500" />
              <h2 className={`text-base sm:text-lg font-bold font-['Rajdhani'] ${colors.cardTitle}`}>
                {language === 'es' ? 'ACCIONES RÁPIDAS' : 'QUICK ACTIONS'}
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Action 1: Reportar Incidente */}
              <button
                type="button"
                onClick={() => onNavigate('myReports')}
                className="w-full p-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm tracking-wide flex items-center justify-between shadow-md shadow-red-950/30 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="w-4 h-4 text-white" />
                  <span>{language === 'es' ? 'Reportar Incidente' : 'Report Incident'}</span>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Action 2: Solicitar Apoyo */}
              <button
                type="button"
                onClick={() => onNavigate('tacticalSupport')}
                className={`w-full p-3.5 rounded-xl border font-bold text-xs sm:text-sm tracking-wide flex items-center justify-between transition cursor-pointer group ${
                  isDark
                    ? 'border-slate-800 bg-slate-950/80 hover:border-slate-700 text-slate-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PhoneCall className="w-4 h-4 text-amber-500" />
                  <span>{language === 'es' ? 'Solicitar Apoyo' : 'Request Support'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Action 3: Ver Mapa de Riesgo */}
              <button
                type="button"
                onClick={() => onNavigate('riskMap')}
                className={`w-full p-3.5 rounded-xl border font-bold text-xs sm:text-sm tracking-wide flex items-center justify-between transition cursor-pointer group ${
                  isDark
                    ? 'border-slate-800 bg-slate-950/80 hover:border-slate-700 text-slate-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Navigation className="w-4 h-4 text-emerald-500" />
                  <span>{language === 'es' ? 'Ver Mapa de Riesgo' : 'View Risk Map'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
