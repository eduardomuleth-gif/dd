import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { NavTabId } from './ModulePlaceholderView';
import { IncidentReport } from '../types/report';
import { subscribeToPublicAcceptedReports, subscribeToUserReports } from '../services/reportService';
import { CreateReportModal } from './CreateReportModal';

interface DashboardScreenProps {
  onNavigate: (tab: NavTabId) => void;
  onOpenTacticalMap: () => void;
  currentUserId?: string;
}

interface DayTrend {
  day: string;
  fullDay: string;
  dateStr: string;
  incidents: number;
  topSector: string;
  reports: IncidentReport[];
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  onOpenTacticalMap,
  currentUserId,
}) => {
  const { colors, theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';

  // Real-time data from Firestore
  const [acceptedReports, setAcceptedReports] = useState<IncidentReport[]>([]);
  const [myReports, setMyReports] = useState<IncidentReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // 1. Subscribe to real public accepted reports (onSnapshot)
  useEffect(() => {
    setIsLoadingReports(true);
    const unsubscribe = subscribeToPublicAcceptedReports(
      (reports) => {
        setAcceptedReports(reports);
        setIsLoadingReports(false);
      },
      (err) => {
        console.warn('[Security Urban :: Dashboard] Error consultando reportes públicos:', err);
        setIsLoadingReports(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to current user's reports (where uid == currentUserId)
  useEffect(() => {
    if (!currentUserId) {
      setMyReports([]);
      return;
    }

    const unsubscribe = subscribeToUserReports(
      currentUserId,
      (reports) => {
        setMyReports(reports);
      },
      (err) => {
        console.warn('[Security Urban :: Dashboard] Error consultando reportes de usuario:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  // Derived metrics without mock numbers
  const activeAlertsCount = acceptedReports.length;
  const myReportsCount = myReports.length;

  // Calculate unique monitored sectors from verified reports or baseline
  const uniqueMonitoredSectors = useMemo(() => {
    const sectors = new Set<string>();
    acceptedReports.forEach((r) => {
      if (r.sector) sectors.add(r.sector);
    });
    return sectors.size > 0 ? sectors.size : 14; // 14 standard sectors of Comuna 8
  }, [acceptedReports]);

  // Week selection: current vs previous
  const [weekView, setWeekView] = useState<'current' | 'previous'>('current');

  // Compute 7-day trend from actual accepted reports
  const trendDays: DayTrend[] = useMemo(() => {
    const days: DayTrend[] = [];
    const now = new Date();
    const dayNames = language === 'es' 
      ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] 
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDayNames = language === 'es'
      ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const offsetDays = weekView === 'current' ? 0 : 7;

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - (i + offsetDays));
      const targetDateString = targetDate.toISOString().slice(0, 10);

      // Find matching reports created on this date
      const matching = acceptedReports.filter((r) => {
        return (r.fechaCreacionISO || '').startsWith(targetDateString);
      });

      // Find top sector
      const sectorCounts: Record<string, number> = {};
      matching.forEach((r) => {
        sectorCounts[r.sector] = (sectorCounts[r.sector] || 0) + 1;
      });
      let topSector = language === 'es' ? 'Sin incidentes' : 'No incidents';
      let maxCount = 0;
      Object.entries(sectorCounts).forEach(([sec, cnt]) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          topSector = sec;
        }
      });

      const dayIdx = targetDate.getDay();
      days.push({
        day: dayNames[dayIdx],
        fullDay: fullDayNames[dayIdx],
        dateStr: targetDate.toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US', {
          day: 'numeric',
          month: 'short',
        }),
        incidents: matching.length,
        topSector,
        reports: matching,
      });
    }

    return days;
  }, [acceptedReports, weekView, language]);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6);
  const selectedDay = trendDays[selectedDayIndex] || trendDays[trendDays.length - 1];
  const maxIncidentsInTrend = Math.max(...trendDays.map((d) => d.incidents), 1);

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Header & Navigation */}
      <div className="w-full mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300' 
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title={language === 'es' ? 'Volver al Inicio' : 'Back to Home'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-red-500 uppercase">
                PANEL DE MANDO // COMUNA 8
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                FIRESTORE LIVE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {language === 'es' ? 'Centro de Control & Métricas' : 'Control Center & Metrics'}
            </h1>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'es' ? 'Reportar Incidente' : 'Report Incident'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenTacticalMap}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              isDark 
                ? 'bg-slate-900/80 border-slate-700 hover:bg-slate-800 text-slate-300' 
                : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Navigation className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">{language === 'es' ? 'Mapa Táctico' : 'Tactical Map'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric HUD Cards (Real data only, no mock numbers) */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Metric 1: Alertas Activas Verificadas */}
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
                <span className="text-3xl sm:text-4xl font-black font-['Rajdhani'] text-amber-500 block">
                  {activeAlertsCount}
                </span>
                {activeAlertsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <span className={`text-xs sm:text-sm font-bold block ${colors.cardTitle}`}>
                {language === 'es' ? 'Alertas activas verificadas' : 'Active verified alerts'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">
                {language === 'es' ? 'Aprobadas por administración' : 'Approved by admin'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 2: Sectores Monitoreados */}
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
                <span className="text-3xl sm:text-4xl font-black font-['Rajdhani'] text-emerald-500 block">
                  {uniqueMonitoredSectors}
                </span>
              </div>
              <span className={`text-xs sm:text-sm font-bold block ${colors.cardTitle}`}>
                {language === 'es' ? 'Sectores en monitoreo' : 'Monitored sectors'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">
                {language === 'es' ? 'Comuna 8 Medellín' : 'Comuna 8 Medellín'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 3: Estado del Sistema */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('tacticalSupport')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('tacticalSupport')}
          className={`group rounded-2xl p-5 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer ${
            isDark 
              ? 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/70' 
              : 'bg-white border-slate-200 hover:border-cyan-500/70'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-['Rajdhani'] text-cyan-500 dark:text-cyan-400 block">
                  ACTIVO
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              </div>
              <span className={`text-xs sm:text-sm font-bold block ${colors.cardTitle}`}>
                {language === 'es' ? 'Red de Apoyo Comunal' : 'Community Support Net'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block">
                {language === 'es' ? 'Google Maps Platform 24/7' : 'Google Maps 24/7'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 4: Mis Reportes Registrados (Real user count) */}
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
                  {myReportsCount}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-500/10 text-red-500 border border-red-500/20">
                  {language === 'es' ? 'Tus Registros' : 'Your Reports'}
                </span>
              </div>
              <span className={`text-xs sm:text-sm font-bold block ${colors.cardTitle}`}>
                {language === 'es' ? 'Mis reportes registrados' : 'My registered reports'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform shrink-0">
              <FileCheck2 className="w-6 h-6 stroke-[2]" />
            </div>
          </div>

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

      {/* 3. Main Content: Trend Chart + Real Verified Alerts */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Column: 7-Day Real Incident Trend (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div
            className={`w-full h-full rounded-3xl p-5 sm:p-7 border relative overflow-hidden backdrop-blur-md shadow-xl flex flex-col justify-between ${colors.cardBg} ${colors.cardBorder}`}
          >
            <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

            {/* Header: Title + Week Selector */}
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
                    ? 'Reportes verificados y aceptados en Firestore'
                    : 'Verified and accepted reports in Firestore'}
                </p>
              </div>

              {/* Week Selector Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setWeekView('current')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    weekView === 'current'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {language === 'es' ? 'Semana actual' : 'Current week'}
                </button>
                <button
                  type="button"
                  onClick={() => setWeekView('previous')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    weekView === 'previous'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {language === 'es' ? 'Semana anterior' : 'Previous week'}
                </button>
              </div>
            </div>

            {/* Interactive Trend Bars */}
            <div className="space-y-4 my-2">
              <div className="h-44 sm:h-48 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-slate-800">
                {trendDays.map((item, idx) => {
                  const isSelected = idx === selectedDayIndex;
                  const heightPercent = maxIncidentsInTrend > 0 
                    ? Math.max(12, Math.round((item.incidents / maxIncidentsInTrend) * 100))
                    : 12;

                  return (
                    <div
                      key={idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDayIndex(idx)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedDayIndex(idx)}
                      className="flex-1 flex flex-col items-center gap-2 cursor-pointer group"
                    >
                      <span className={`text-[10px] font-mono font-bold transition-all ${
                        isSelected ? 'text-red-500 scale-110' : 'text-slate-400 group-hover:text-slate-600'
                      }`}>
                        {item.incidents}
                      </span>

                      <div className="w-full flex items-end justify-center h-28">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-t from-red-600 to-rose-500 shadow-md shadow-red-500/40'
                              : item.incidents > 0
                              ? 'bg-slate-300 dark:bg-slate-700 group-hover:bg-red-400/80'
                              : 'bg-slate-200 dark:bg-slate-800/60'
                          }`}
                        />
                      </div>

                      <div className="text-center">
                        <span className={`text-xs font-bold block ${
                          isSelected ? 'text-red-600 dark:text-red-400' : 'text-slate-500'
                        }`}>
                          {item.day}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {item.dateStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                    <span className={`text-xs sm:text-sm font-bold ${colors.cardTitle}`}>
                      {selectedDay.fullDay} ({selectedDay.dateStr})
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      — {selectedDay.incidents} {language === 'es' ? 'incidentes aceptados' : 'accepted incidents'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'es' ? 'Foco:' : 'Focus:'} <strong>{selectedDay.topSector}</strong></span>
                  </div>
                </div>

                {selectedDay.reports.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-3">
                    {language === 'es' ? 'No se registraron reportes aceptados en esta fecha.' : 'No accepted reports on this date.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDay.reports.map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {r.titulo}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {r.categoria} • {r.sector}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-600">
                          {r.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'es' ? 'Sincronizado con base de datos comunitaria' : 'Synchronized with community database'}</span>
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

        {/* Right Column: Últimas Alertas Reales Verificadas (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div
            className={`w-full rounded-3xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-xl ${colors.cardBg} ${colors.cardBorder}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h2 className={`text-base sm:text-lg font-bold font-['Rajdhani'] ${colors.cardTitle}`}>
                  {language === 'es' ? 'ÚLTIMAS ALERTAS COMUNITARIAS' : 'RECENT COMMUNITY ALERTS'}
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

            {/* Alerts List from real accepted reports */}
            {isLoadingReports ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                <span className="text-xs font-mono">{language === 'es' ? 'Cargando alertas...' : 'Loading alerts...'}</span>
              </div>
            ) : acceptedReports.length === 0 ? (
              <div className="py-10 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {language === 'es' ? 'Aún no hay alertas verificadas en la Comuna 8.' : 'No verified alerts at this time.'}
                </h4>
                <p className="text-xs text-slate-500 mb-4 max-w-xs leading-relaxed">
                  {language === 'es'
                    ? 'Los reportes de la comunidad aparecerán aquí una vez verificados por los administradores.'
                    : 'Community reports will appear once verified by administrators.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm hover:bg-red-500 transition"
                >
                  {language === 'es' ? 'Crear Reporte' : 'Create Report'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {acceptedReports.slice(0, 4).map((report) => (
                  <div
                    key={report.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate('alerts')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigate('alerts')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 hover:-translate-y-0.5 ${
                      isDark 
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700' 
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {report.titulo}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-blue-500/10 text-blue-500 shrink-0">
                          {report.categoria}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="truncate">{report.sector}</span>
                        <span>{report.fechaCreacionFormateada}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Card */}
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
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full p-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm tracking-wide flex items-center justify-between shadow-md shadow-red-950/30 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="w-4 h-4 text-white" />
                  <span>{language === 'es' ? 'Reportar Incidente' : 'Report Incident'}</span>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('myReports')}
                className={`w-full p-3.5 rounded-xl border font-bold text-xs sm:text-sm tracking-wide flex items-center justify-between transition cursor-pointer group ${
                  isDark
                    ? 'border-slate-800 bg-slate-950/80 hover:border-slate-700 text-slate-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-amber-500" />
                  <span>{language === 'es' ? 'Mis Reportes & Bitácora' : 'My Reports & Log'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

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

      {/* Incident Reporting Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReportCreated={() => {
          // Toast or feedback if needed
        }}
      />
    </div>
  );
};
