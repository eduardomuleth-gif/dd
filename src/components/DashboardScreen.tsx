import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  Shield,
  Users,
  FileCheck2,
  ArrowLeft,
  Navigation,
  ArrowRight,
  PlusCircle,
  ChevronRight,
  Sparkles,
  Activity,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  PieChart,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { NavTabId } from './ModulePlaceholderView';
import { IncidentReport } from '../types/report';
import {
  subscribeToPublicAcceptedReports,
  subscribeToUserReports,
  calculateDynamicSectorRiskStats,
  createRealTestReport,
} from '../services/reportService';
import { COMUNA_8_SECTORS } from '../data/medellinSectors';
import { CreateReportModal } from './CreateReportModal';

interface DashboardScreenProps {
  onNavigate: (tab: NavTabId) => void;
  onOpenTacticalMap?: () => void;
  currentUserId?: string;
  currentUserRole?: string;
}

interface DayTrend {
  day: string;
  fullDay: string;
  dateStr: string;
  localDateKey: string;
  incidents: number;
  reports: IncidentReport[];
}

// Helper to get YYYY-MM-DD in local time so reports match the exact local calendar day
function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Memoized SVG Donut Chart component for Sector Risk & Security Dashboard
interface DonutChartProps {
  percentage: number | null;
  colorHex: string;
  trackHex: string;
  label: string;
  sublabel: string;
  nullDisplayText?: string;
}

const SectorDonutGauge: React.FC<DonutChartProps> = React.memo(
  ({ percentage, colorHex, trackHex, label, sublabel, nullDisplayText = '—' }) => {
    const isNull = percentage === null || percentage === undefined;
    const clamped = isNull ? 0 : Math.max(0, Math.min(100, Math.round(percentage)));
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = isNull ? circumference : circumference - (clamped / 100) * circumference;

    return (
      <div className="flex flex-col items-center p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
        <div className="relative w-24 h-24 flex items-center justify-center mb-2">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="transparent"
              stroke={trackHex}
              strokeWidth="8"
            />
            {!isNull && clamped > 0 && (
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="transparent"
                stroke={colorHex}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
            {isNull ? (
              <span className="text-xs sm:text-sm font-bold font-['Rajdhani'] text-slate-400 dark:text-slate-500 leading-tight">
                {nullDisplayText}
              </span>
            ) : (
              <span className="text-lg font-black font-['Rajdhani'] tabular-nums text-slate-900 dark:text-white leading-none">
                {clamped}%
              </span>
            )}
          </div>
        </div>
        <span className="text-xs font-bold text-center text-slate-800 dark:text-slate-100 leading-tight">
          {label}
        </span>
        <span className="text-[11px] font-mono text-center text-slate-500 dark:text-slate-400 mt-0.5">
          {sublabel}
        </span>
      </div>
    );
  }
);

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  currentUserId,
  currentUserRole = 'ciudadano',
}) => {
  const { colors, theme } = useTheme();
  const { language, t, translateCategory } = useLanguage();
  const isDark = theme === 'dark';

  // Real-time data from database
  const [acceptedReports, setAcceptedReports] = useState<IncidentReport[]>([]);
  const [myReports, setMyReports] = useState<IncidentReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [dashboardNotice, setDashboardNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected sector for the Statistical Sector Risk & Safety Donut Dashboard
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    'all' | 'high' | 'moderate' | 'central'
  >('all');
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    COMUNA_8_SECTORS[0]?.id || 'sec-villa-hermosa'
  );

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

  const filteredSectorsForDropdown = useMemo(() => {
    if (selectedCategoryFilter === 'all') return COMUNA_8_SECTORS;
    return COMUNA_8_SECTORS.filter((s) => s.level === selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  // 1. Subscribe to real public reports with timeout safeguard
  useEffect(() => {
    setIsLoadingReports(true);
    const loadingTimer = setTimeout(() => {
      setIsLoadingReports(false);
    }, 2500);

    const unsubscribe = subscribeToPublicAcceptedReports(
      (reports) => {
        clearTimeout(loadingTimer);
        setAcceptedReports(reports);
        setIsLoadingReports(false);
      },
      (err) => {
        clearTimeout(loadingTimer);
        console.warn('[Security Urban :: Dashboard] Error consultando reportes públicos:', err);
        setIsLoadingReports(false);
      }
    );

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
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

  // Derived metrics from real platform data
  const activeAlertsCount = acceptedReports.length;
  const myReportsCount = myReports.length;

  // Exact total number of monitored sectors matching COMUNA_8_SECTORS (18 real sectors)
  const totalMonitoredSectors = COMUNA_8_SECTORS.length;

  // Week selection: current vs previous
  const [weekView, setWeekView] = useState<'current' | 'previous'>('current');

  // Compute 7-day trend directly from the real acceptedReports array
  const trendDays: DayTrend[] = useMemo(() => {
    const days: DayTrend[] = [];
    const now = new Date();
    const dayNames =
      language === 'es'
        ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDayNames =
      language === 'es'
        ? ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const offsetDays = weekView === 'current' ? 0 : 7;

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - (i + offsetDays));
      const targetLocalKey = getLocalDateKey(targetDate);

      // Match reports created on this local calendar date
      const matching = acceptedReports.filter((r) => {
        if (!r.fechaCreacionISO) return false;
        const repDate = new Date(r.fechaCreacionISO);
        if (isNaN(repDate.getTime())) {
          return r.fechaCreacionISO.startsWith(targetLocalKey);
        }
        return getLocalDateKey(repDate) === targetLocalKey;
      });

      const dayIdx = targetDate.getDay();
      days.push({
        day: dayNames[dayIdx],
        fullDay: fullDayNames[dayIdx],
        dateStr: targetDate.toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US', {
          day: 'numeric',
          month: 'short',
        }),
        localDateKey: targetLocalKey,
        incidents: matching.length,
        reports: matching,
      });
    }

    return days;
  }, [acceptedReports, weekView, language]);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6);
  const maxIncidentsInTrend = useMemo(
    () => Math.max(...trendDays.map((d) => d.incidents), 1),
    [trendDays]
  );
  const totalIncidentsInSelectedWeek = useMemo(
    () => trendDays.reduce((acc, d) => acc + d.incidents, 0),
    [trendDays]
  );

  // Selected sector object
  const selectedSectorData = useMemo(() => {
    return (
      COMUNA_8_SECTORS.find((s) => s.id === selectedSectorId) || COMUNA_8_SECTORS[0]
    );
  }, [selectedSectorId]);

  // 100% Dynamic Mathematical Sector Risk & Safety Calculation (no hardcoded risk numbers)
  const sectorStats = useMemo(() => {
    const sectorName = selectedSectorData?.name || 'Villa Hermosa';
    return calculateDynamicSectorRiskStats(sectorName, acceptedReports, language);
  }, [selectedSectorData, acceptedReports, language]);

  const handleOpenCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Header & Navigation */}
      <div className="w-full mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
            }`}
            title={t('back')}
            aria-label={t('back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold tracking-wider text-red-600 dark:text-red-400 uppercase">
                {t('dashboardSubheader')}
              </span>
              <span className="text-slate-400 dark:text-slate-600">·</span>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                EN TIEMPO REAL
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-slate-100">
              {t('dashboardTitle')}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal">
              {t('dashboardSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Optional Feedback Banner */}
      {dashboardNotice && (
        <div
          role={dashboardNotice.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`w-full mb-5 p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs ${
            dashboardNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {dashboardNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{dashboardNotice.text}</span>
          </div>
        </div>
      )}

      {/* 2. Top Metric HUD Cards (Simplified, clean statistical indicators) */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Metric 1: Alertas Activas */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('alerts')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('alerts');
            }
          }}
          className={`group rounded-2xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/70'
              : 'bg-white border-slate-300 hover:border-amber-500/70 shadow-sm'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                {isLoadingReports ? (
                  <div className="h-9 w-14 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ) : (
                  <span className="text-3xl sm:text-4xl font-black font-['Rajdhani'] tabular-nums text-amber-500 block">
                    {activeAlertsCount}
                  </span>
                )}
                {activeAlertsCount > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <span className={`text-base font-bold block ${colors.cardTitle}`}>
                {t('metricActiveAlerts')}
              </span>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 block font-medium">
                {t('metricActiveAlertsDesc')}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform shrink-0">
              <Bell className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 2: Sectores Monitoreados (Exact total of real monitored sectors: 18) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('riskMap')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('riskMap');
            }
          }}
          className={`group rounded-2xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/70'
              : 'bg-white border-slate-300 hover:border-emerald-500/70 shadow-sm'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-black font-['Rajdhani'] tabular-nums text-emerald-500 block">
                  {totalMonitoredSectors}
                </span>
              </div>
              <span className={`text-base font-bold block ${colors.cardTitle}`}>
                {t('metricMonitoredSectors')}
              </span>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 block font-medium">
                {language === 'es'
                  ? `${totalMonitoredSectors} sectores • Comuna 8`
                  : `${totalMonitoredSectors} sectors • Comuna 8`}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shrink-0">
              <Shield className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 3: Estado del Sistema */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('tacticalSupport')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('tacticalSupport');
            }
          }}
          className={`group rounded-2xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/70'
              : 'bg-white border-slate-300 hover:border-cyan-500/70 shadow-sm'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-['Rajdhani'] text-cyan-600 dark:text-cyan-400 block">
                  {language === 'es' ? 'ACTIVO' : 'ACTIVE'}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              </div>
              <span className={`text-base font-bold block ${colors.cardTitle}`}>
                {t('metricSystemStatus')}
              </span>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 block font-medium">
                {t('metricSystemStatusDesc')}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform shrink-0">
              <Users className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Metric 4: Mis Reportes Registrados */}
        <div
          className={`group rounded-2xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col justify-between ${
            isDark
              ? 'bg-slate-950/80 border-slate-800 hover:border-red-500/70'
              : 'bg-white border-slate-300 hover:border-red-500/70 shadow-sm'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-red-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black font-['Rajdhani'] tabular-nums text-red-600 dark:text-red-500 block">
                  {myReportsCount}
                </span>
              </div>
              <span className={`text-base font-bold block ${colors.cardTitle}`}>
                {t('metricMyReports')}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-500 group-hover:scale-110 transition-transform shrink-0">
              <FileCheck2 className="w-6 h-6 stroke-[2]" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('myReports')}
            className="w-full min-h-[40px] mt-3 py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-500/20 hover:border-red-600 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs group/btn"
          >
            <span>{t('viewMyReportsBtn')}</span>
            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </div>
      </div>

      {/* 3. Main Content: Trend Chart + Dynamic Sector Donut Dashboard (Left) & Recent Alerts (Right) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: 7-Day Real Incident Trend + Dynamic Sector Risk & Safety Dashboard (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div
            className={`w-full h-full rounded-2xl sm:rounded-3xl p-5 sm:p-7 border relative overflow-hidden backdrop-blur-md shadow-sm flex flex-col justify-between ${colors.cardBg} ${colors.cardBorder}`}
          >
            <div className="absolute top-0 inset-x-0 h-[3px] bg-red-600" />

            {/* Header: Title + Counter + Week Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Activity className="w-5 h-5 text-red-600 dark:text-red-500" />
                  <h2 className={`text-lg font-bold tracking-tight font-['Rajdhani'] ${colors.cardTitle}`}>
                    {t('trendTitle')}
                  </h2>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                    ·{' '}
                    {language === 'es'
                      ? `${totalIncidentsInSelectedWeek} en 7 días (${activeAlertsCount} totales)`
                      : `${totalIncidentsInSelectedWeek} in 7 days (${activeAlertsCount} total)`}
                  </span>
                </div>
                <p className={`text-sm mt-0.5 ${colors.cardSubtitle}`}>
                  {t('trendSubtitle')}
                </p>
              </div>

              {/* Week Selector Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setWeekView('current')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer ${
                    weekView === 'current'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t('currentWeekTab')}
                </button>
                <button
                  type="button"
                  onClick={() => setWeekView('previous')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer ${
                    weekView === 'previous'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t('previousWeekTab')}
                </button>
              </div>
            </div>

            {/* Interactive Trend Bars */}
            <div className="space-y-5 my-2">
              <div className="h-44 sm:h-48 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-slate-800">
                {trendDays.map((item, idx) => {
                  const isSelected = idx === selectedDayIndex;
                  const heightPercent =
                    item.incidents > 0 && maxIncidentsInTrend > 0
                      ? Math.max(16, Math.round((item.incidents / maxIncidentsInTrend) * 100))
                      : 8;

                  return (
                    <div
                      key={idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDayIndex(idx)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedDayIndex(idx)}
                      className="flex-1 flex flex-col items-center gap-2 cursor-pointer group"
                    >
                      <span
                        className={`text-xs font-mono font-bold transition-all ${
                          isSelected
                            ? 'text-red-500 scale-110'
                            : item.incidents > 0
                            ? 'text-amber-500 font-extrabold'
                            : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        {item.incidents}
                      </span>

                      <div className="w-full flex items-end justify-center h-28">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[32px] rounded-t-lg transition-all duration-300 ${
                            isSelected
                              ? 'bg-gradient-to-t from-red-600 to-rose-500 shadow-md shadow-red-500/40'
                              : item.incidents > 0
                              ? 'bg-amber-500 dark:bg-amber-500/80 group-hover:bg-red-500'
                              : 'bg-slate-200 dark:bg-slate-800/60'
                          }`}
                        />
                      </div>

                      <div className="text-center">
                        <span
                          className={`text-xs font-bold block ${
                            isSelected
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.day}
                        </span>
                        <span className="text-2xs font-mono text-slate-500 dark:text-slate-400 block">
                          {item.dateStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Mathematical Sector Risk & Safety Dashboard */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                        <PieChart className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-bold font-['Rajdhani'] uppercase tracking-wide ${colors.cardTitle}`}>
                          {language === 'es'
                            ? 'Nivel de Riesgo y Seguridad por Sector'
                            : 'Sector Risk & Safety Level'}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {language === 'es'
                            ? 'Cálculo dinámico ponderado por severidad e incidencia activa en cada sector'
                            : 'Dynamic calculation weighted by incident severity in each sector'}
                        </p>
                      </div>
                    </div>

                    {/* Sector Selector Dropdown grouped by Category */}
                    <div className="w-full sm:w-auto sm:min-w-[240px]">
                      <label htmlFor="dashboard-sector-select" className="sr-only">
                        {language === 'es' ? 'Seleccionar sector' : 'Select sector'}
                      </label>
                      <select
                        id="dashboard-sector-select"
                        value={selectedSectorId}
                        onChange={(e) => setSelectedSectorId(e.target.value)}
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 shadow-xs cursor-pointer"
                      >
                        {selectedCategoryFilter === 'all' ? (
                          <>
                            <optgroup
                              label={
                                language === 'es'
                                  ? `Categoría Mayor (${highRiskSectors.length})`
                                  : `High Category (${highRiskSectors.length})`
                              }
                            >
                              {highRiskSectors.map((sec) => (
                                <option key={sec.id} value={sec.id}>
                                  {sec.name} ({sec.quadrant})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup
                              label={
                                language === 'es'
                                  ? `Categoría Intermedio (${moderateRiskSectors.length})`
                                  : `Moderate Category (${moderateRiskSectors.length})`
                              }
                            >
                              {moderateRiskSectors.map((sec) => (
                                <option key={sec.id} value={sec.id}>
                                  {sec.name} ({sec.quadrant})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup
                              label={
                                language === 'es'
                                  ? `Categoría Bajo (base) (${lowRiskSectors.length})`
                                  : `Low (base) Category (${lowRiskSectors.length})`
                              }
                            >
                              {lowRiskSectors.map((sec) => (
                                <option key={sec.id} value={sec.id}>
                                  {sec.name} ({sec.quadrant})
                                </option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          filteredSectorsForDropdown.map((sec) => (
                            <option key={sec.id} value={sec.id}>
                              {sec.name} ({sec.quadrant})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Interactive Category Filter Controls */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      {
                        id: 'all' as const,
                        label:
                          language === 'es'
                            ? `Todos (${totalMonitoredSectors})`
                            : `All (${totalMonitoredSectors})`,
                        firstSectorId: COMUNA_8_SECTORS[0]?.id,
                        activeClass:
                          'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white',
                        dotClass: 'bg-cyan-500',
                      },
                      {
                        id: 'high' as const,
                        label:
                          language === 'es'
                            ? `Mayor (${highRiskSectors.length})`
                            : `High (${highRiskSectors.length})`,
                        firstSectorId: highRiskSectors[0]?.id,
                        activeClass: 'bg-rose-600 text-white border-rose-500',
                        dotClass: 'bg-rose-500',
                      },
                      {
                        id: 'moderate' as const,
                        label:
                          language === 'es'
                            ? `Intermedio (${moderateRiskSectors.length})`
                            : `Moderate (${moderateRiskSectors.length})`,
                        firstSectorId: moderateRiskSectors[0]?.id,
                        activeClass: 'bg-amber-600 text-white border-amber-500',
                        dotClass: 'bg-amber-500',
                      },
                      {
                        id: 'central' as const,
                        label:
                          language === 'es'
                            ? `Bajo (base) (${lowRiskSectors.length})`
                            : `Low (base) (${lowRiskSectors.length})`,
                        firstSectorId: lowRiskSectors[0]?.id,
                        activeClass: 'bg-emerald-600 text-white border-emerald-500',
                        dotClass: 'bg-emerald-500',
                      },
                    ].map((catBtn) => {
                      const isCatActive = selectedCategoryFilter === catBtn.id;
                      return (
                        <button
                          key={catBtn.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryFilter(catBtn.id);
                            if (catBtn.id !== 'all' && catBtn.firstSectorId) {
                              const currentInCat = COMUNA_8_SECTORS.find(
                                (s) => s.id === selectedSectorId && s.level === catBtn.id
                              );
                              if (!currentInCat) {
                                setSelectedSectorId(catBtn.firstSectorId);
                              }
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                            isCatActive
                              ? `${catBtn.activeClass} shadow-xs`
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCatActive ? 'bg-white dark:bg-current' : catBtn.dotClass
                            }`}
                          />
                          <span>{catBtn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3 Dynamic Mathematical Circular / Donut Percentage Charts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <SectorDonutGauge
                    percentage={sectorStats.safetyPercentage}
                    nullDisplayText={language === 'es' ? 'Sin datos' : 'No data'}
                    colorHex="#10b981"
                    trackHex={isDark ? '#1e293b' : '#e2e8f0'}
                    label={language === 'es' ? 'Nivel de Seguridad' : 'Safety Level'}
                    sublabel={
                      !sectorStats.hasReports
                        ? language === 'es'
                          ? 'Sin actividad registrada'
                          : 'No registered activity'
                        : language === 'es'
                        ? 'Índice normalizado'
                        : 'Normalized index'
                    }
                  />
                  <SectorDonutGauge
                    percentage={sectorStats.riskPercentage}
                    colorHex={sectorStats.hasReports ? sectorStats.riskColorHex : '#94a3b8'}
                    trackHex={isDark ? '#1e293b' : '#e2e8f0'}
                    label={language === 'es' ? 'Nivel de Riesgo' : 'Risk Level'}
                    sublabel={
                      !sectorStats.hasReports
                        ? language === 'es'
                          ? 'Sin alertas (0 pts)'
                          : 'No alerts (0 pts)'
                        : `${sectorStats.riskLabel} (${sectorStats.weightedScore} pts)`
                    }
                  />
                  <SectorDonutGauge
                    percentage={sectorStats.stabilityPercentage}
                    nullDisplayText={language === 'es' ? 'Neutro' : 'Neutral'}
                    colorHex="#06b6d4"
                    trackHex={isDark ? '#1e293b' : '#e2e8f0'}
                    label={language === 'es' ? 'Estabilidad Sectorial' : 'Sector Stability'}
                    sublabel={
                      !sectorStats.hasReports
                        ? language === 'es'
                          ? 'Sin reportes activos'
                          : 'No active reports'
                        : selectedSectorData?.quadrant || 'Comuna 8'
                    }
                  />
                </div>

                {/* Selected Sector Summary Strip */}
                {selectedSectorData && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {selectedSectorData.name}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          · {selectedSectorData.quadrant}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedSectorData.contextNote}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 font-mono font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {sectorStats.sectorAlertsCount === 0
                            ? language === 'es'
                              ? 'Sin reportes activos'
                              : 'No active reports'
                            : `${sectorStats.sectorAlertsCount} ${
                                language === 'es' ? 'incidentes aprobados' : 'approved incidents'
                              }`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {language === 'es'
                    ? 'Métricas calculadas dinámicamente en tiempo real'
                    : 'Metrics dynamically calculated in real time'}
                </span>
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

        {/* Right Column: Últimas Alertas Comunitarias (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div
            className={`w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-sm ${colors.cardBg} ${colors.cardBorder}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h2 className={`text-lg font-bold font-['Rajdhani'] uppercase tracking-wide ${colors.cardTitle}`}>
                  {t('recentAlertsFeedTitle')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>{t('viewAllAlertsLink')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Alerts List with Skeleton Loading */}
            {isLoadingReports ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50 animate-pulse flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : acceptedReports.length === 0 ? (
              <div className="py-10 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('noAlertsDashboard')}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-xs leading-relaxed">
                  {t('noAlertsDashboardDesc')}
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer shadow-sm hover:bg-red-500 transition"
                >
                  {t('reportIncidentBtn')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {acceptedReports.slice(0, 6).map((report) => (
                  <div
                    key={report.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate('alerts')}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigate('alerts')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 hover:-translate-y-0.5 ${
                      isDark
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {report.mediaUrl && report.mediaType === 'image' ? (
                      <img
                        src={report.mediaUrl}
                        alt={report.titulo}
                        loading="lazy"
                        className="w-11 h-11 rounded-xl object-cover border border-slate-300 dark:border-slate-700 shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        {report.mediaType === 'video' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {report.titulo}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                          {translateCategory(report.categoria)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono font-medium">
                        <span className="truncate flex items-center gap-1">
                          <span>{report.sector}</span>
                          {report.mediaUrl && (
                            <ImageIcon className="w-3 h-3 text-cyan-500 inline shrink-0" />
                          )}
                        </span>
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
            className={`w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 border relative overflow-hidden backdrop-blur-md shadow-sm ${colors.cardBg} ${colors.cardBorder}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-red-600 dark:text-red-500" />
              <h2 className={`text-lg font-bold font-['Rajdhani'] ${colors.cardTitle}`}>
                {language === 'es' ? 'ACCIONES RÁPIDAS' : 'QUICK ACTIONS'}
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="w-full p-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm tracking-wide flex items-center justify-between shadow-sm transition cursor-pointer group"
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
                className={`w-full p-3.5 rounded-xl border font-semibold text-sm tracking-wide flex items-center justify-between transition cursor-pointer group ${
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
                className={`w-full p-3.5 rounded-xl border font-semibold text-sm tracking-wide flex items-center justify-between transition cursor-pointer group ${
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
        onClose={handleCloseCreateModal}
        onReportCreated={() => {
          setDashboardNotice({
            type: 'success',
            text:
              language === 'es'
                ? '✔ Reporte y evidencia del suceso registrados exitosamente.'
                : 'Report and incident evidence submitted successfully.',
          });
          setTimeout(() => setDashboardNotice(null), 4000);
        }}
        onReportError={(errMsg) => {
          setDashboardNotice({
            type: 'error',
            text: errMsg,
          });
          setTimeout(() => setDashboardNotice(null), 4500);
        }}
      />
    </div>
  );
};
