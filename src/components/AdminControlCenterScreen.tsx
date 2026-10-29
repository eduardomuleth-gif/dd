import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Search,
  Check,
  X,
  Loader2,
  ChevronRight,
  Filter,
  BarChart2,
  AlertTriangle,
  Activity,
  Radio,
  Megaphone,
  Send,
  BellRing,
  Trash2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { IncidentReport, ReportPriority } from '../types/report';
import {
  subscribeToAllReportsForAdmin,
  updateReportStatusByAdmin,
  calculateDynamicSectorRiskStats,
  isReportApproved,
} from '../services/reportService';
import {
  publishCommunalAlert,
  subscribeToCommunalAlerts,
  CommunalMassAlert,
  CommunalAlertSeverity,
} from '../services/communalAlertService';
import { isExplicitAdminEmail } from '../services/userService';

interface AdminControlCenterScreenProps {
  currentUserEmail?: string | null;
  currentUserId?: string;
  onNavigateRiskMap?: () => void;
  onNavigateUsers?: () => void;
  onNavigateDashboard?: () => void;
}

const COMUNA_8_SECTORS = [
  'Villa Hermosa (Cuadrante 8-1)',
  'Sucre (Cuadrante 8-2)',
  'El Pinal (Cuadrante 8-3)',
  'Boston (Cuadrante 8-4)',
  'La Libertad (Cuadrante 8-5)',
  'Enciso',
  'San Miguel',
  'Las Estancias',
  'Trece de Noviembre',
  'La Ladera',
  'San Antonio',
  'Los Mangos',
  'Llanaditas',
  'Golondrinas',
];

export const AdminControlCenterScreen: React.FC<AdminControlCenterScreenProps> = ({
  currentUserEmail,
  currentUserId = 'admin-eduardo-uid',
  onNavigateRiskMap,
  onNavigateDashboard,
}) => {
  const { theme, colors } = useTheme();
  const { language, t, translatePriority, translateStatus, translateCategory } = useLanguage();
  const isDark = theme === 'dark';
  const isEs = language === 'es';

  // Strict Security Access Verification
  const isAdmin = isExplicitAdminEmail(currentUserEmail);

  // Active Admin Sub-Tab
  const [activeAdminTab, setActiveAdminTab] = useState<'approvals' | 'communalAlert' | 'sectorControl'>('approvals');

  // Reports State from Firestore with immediate local sync
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'aprobado' | 'rechazado'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Communal Mass Alerts State
  const [communalAlerts, setCommunalAlerts] = useState<CommunalMassAlert[]>([]);
  const [isPublishingAlert, setIsPublishingAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState<CommunalAlertSeverity>('alerta');
  const [alertSector, setAlertSector] = useState('Toda la Comuna 8');
  const [alertFeedback, setAlertFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Subscribe in real time to reports stored in Firebase Firestore
  useEffect(() => {
    setIsLoadingReports(true);
    const unsub = subscribeToAllReportsForAdmin((data) => {
      setReports(data);
      setIsLoadingReports(false);
    });
    return () => unsub();
  }, []);

  // 2. Subscribe in real time to official communal mass alerts in Firestore
  useEffect(() => {
    const unsubAlerts = subscribeToCommunalAlerts((alerts) => {
      setCommunalAlerts(alerts);
    });
    return () => unsubAlerts();
  }, []);

  // Handler for publishing a communal mass alert to Firestore
  const handlePublishCommunalAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) {
      setAlertFeedback({
        type: 'error',
        text: isEs
          ? 'Por favor, completa el título y el mensaje del comunicado oficial.'
          : 'Please provide both the title and the message of the official broadcast.',
      });
      return;
    }

    setIsPublishingAlert(true);
    setAlertFeedback(null);

    try {
      await publishCommunalAlert({
        titulo: alertTitle.trim(),
        mensaje: alertMessage.trim(),
        nivelSeveridad: alertSeverity,
        sectorAfectado: alertSector,
        adminUid: currentUserId,
        adminEmail: currentUserEmail || 'eduardomuleth@gmail.com',
      });

      setAlertTitle('');
      setAlertMessage('');
      setAlertFeedback({
        type: 'success',
        text: isEs
          ? '¡Comunicado oficial de seguridad emitido con éxito y guardado en Firestore!'
          : 'Official community safety alert published successfully to Firestore!',
      });
    } catch (err) {
      console.error('Error publicando alerta comunal:', err);
      setAlertFeedback({
        type: 'error',
        text: isEs
          ? 'Ocurrió un error al guardar la alerta comunal en Firestore.'
          : 'Error saving the communal alert to Firestore.',
      });
    } finally {
      setIsPublishingAlert(false);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter === 'pendiente' && r.estado !== 'pendiente') return false;
      if (statusFilter === 'aprobado' && !isReportApproved(r.estado)) return false;
      if (statusFilter === 'rechazado' && r.estado !== 'rechazado') return false;

      if (selectedSectorFilter !== 'all') {
        const sectorBase = selectedSectorFilter.split('(')[0].trim().toLowerCase();
        const rSector = (r.sector || '').toLowerCase();
        if (!rSector.includes(sectorBase)) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = r.titulo.toLowerCase().includes(query);
        const matchAuthor = (r.autorNombre || '').toLowerCase().includes(query);
        const matchEmail = (r.autorEmail || '').toLowerCase().includes(query);
        const matchSector = (r.sector || '').toLowerCase().includes(query);
        const matchDesc = (r.descripcion || '').toLowerCase().includes(query);
        return matchTitle || matchAuthor || matchEmail || matchSector || matchDesc;
      }
      return true;
    });
  }, [reports, statusFilter, selectedSectorFilter, searchTerm]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter((r) => r.estado === 'pendiente').length;
    const approved = reports.filter((r) => isReportApproved(r.estado)).length;
    const rejected = reports.filter((r) => r.estado === 'rechazado').length;
    return { total, pending, approved, rejected };
  }, [reports]);

  // 1. Instant Optimistic UI Approval + background Firestore sync (<1s response)
  const handleApprove = async (reportId: string) => {
    const target = reports.find((r) => r.id === reportId);
    if (!target) return;
    const nowISO = new Date().toISOString();

    setProcessingReportId(reportId);

    // Instant optimistic update: 0ms
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              estado: 'aprobado',
              fechaRevisionISO: nowISO,
              revisadoPor: currentUserEmail || 'eduardomuleth@gmail.com',
            }
          : r
      )
    );

    try {
      await updateReportStatusByAdmin(
        reportId,
        'aprobado',
        currentUserId,
        currentUserEmail || 'eduardomuleth@gmail.com'
      );
    } catch (err) {
      console.error('Error aprobando reporte:', err);
      // Rollback on failure
      setReports((prev) => prev.map((r) => (r.id === reportId ? target : r)));
    } finally {
      setProcessingReportId(null);
    }
  };

  // 2. Instant Optimistic UI Rejection + background Firestore sync (<1s response)
  const handleRejectConfirm = async (reportId: string) => {
    const target = reports.find((r) => r.id === reportId);
    if (!target) return;
    const nowISO = new Date().toISOString();
    const reason = rejectReason.trim() || undefined;

    // Close the drawer immediately (< 50ms)
    setRejectingReportId(null);
    setRejectReason('');
    setProcessingReportId(reportId);

    // Instant optimistic update: 0ms
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              estado: 'rechazado',
              fechaRevisionISO: nowISO,
              revisadoPor: currentUserEmail || 'eduardomuleth@gmail.com',
              motivoRechazo: reason,
            }
          : r
      )
    );

    try {
      await updateReportStatusByAdmin(
        reportId,
        'rechazado',
        currentUserId,
        currentUserEmail || 'eduardomuleth@gmail.com',
        reason
      );
    } catch (err) {
      console.error('Error rechazando reporte:', err);
      // Rollback on failure
      setReports((prev) => prev.map((r) => (r.id === reportId ? target : r)));
    } finally {
      setProcessingReportId(null);
    }
  };

  // Strict Access Guard for non-admin
  if (!isAdmin) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
          {isEs ? 'Acceso Restringido' : 'Restricted Access'}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {isEs
            ? 'Esta vista es de uso exclusivo para la administración oficial (eduardomuleth@gmail.com).'
            : 'This view is strictly reserved for official administration (eduardomuleth@gmail.com).'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Tactical Institutional Header with bilingual support and tactical accents */}
      <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs">
        {/* Tactical Corner Bracket Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500/70" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500/70" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500/70" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500/70" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20" />
              <span className="text-2xs sm:text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                {isEs ? '[ COMUNA 8 MEDELLÍN • CENTRO DE CONTROL OPERATIVO ]' : '[ COMUNA 8 MEDELLÍN • OPERATIONAL CONTROL CENTER ]'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {isEs ? 'Panel de Aprobación en Tiempo Real' : 'Real-Time Approval Panel'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {isEs
                ? 'Supervisión, validación y auditoría de reportes comunitarios con actualización dinámica de riesgo.'
                : 'Supervision, validation, and audit of community reports with dynamic risk updates.'}
            </p>
          </div>

          {/* Action Controls & Admin Badge */}
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {onNavigateDashboard && (
              <button
                type="button"
                onClick={onNavigateDashboard}
                className="px-3.5 py-2 rounded-xl bg-red-600/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Activity className="w-4 h-4" />
                <span>{isEs ? 'Ver Panel de Control' : 'Open Dashboard'}</span>
              </button>
            )}

            {/* Administrator Account Badge */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                  {currentUserEmail}
                </div>
                <div className="text-2xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {isEs ? 'Administrador Oficial' : 'Official Administrator'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards with Tactical Accent Tops and Illuminated Icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Card */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white dark:to-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-2 border-t-amber-500 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
              {isEs ? 'Pendientes' : 'Pending'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black font-['Rajdhani'] tabular-nums text-amber-500">
            {stats.pending}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-2xs text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{isEs ? 'Requieren dictamen' : 'Action required'}</span>
          </div>
        </div>

        {/* Approved Card */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-white dark:to-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-2 border-t-emerald-500 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
              {isEs ? 'Aprobados' : 'Approved'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black font-['Rajdhani'] tabular-nums text-emerald-500">
            {stats.approved}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-2xs text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{isEs ? 'Activos en mapa de riesgo' : 'Active on risk map'}</span>
          </div>
        </div>

        {/* Rejected Card */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-b from-rose-500/10 via-rose-500/5 to-white dark:to-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-2 border-t-rose-500 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
              {isEs ? 'Rechazados' : 'Rejected'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black font-['Rajdhani'] tabular-nums text-rose-500">
            {stats.rejected}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-2xs text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>{isEs ? 'Descartados con justificación' : 'Discarded with note'}</span>
          </div>
        </div>

        {/* Total Card */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-white dark:to-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-2 border-t-blue-500 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs sm:text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
              {isEs ? 'Total Gestionados' : 'Total Managed'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-3xl font-black font-['Rajdhani'] tabular-nums text-slate-800 dark:text-slate-200">
            {stats.total}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-2xs text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{isEs ? 'Registros en Firestore' : 'Firestore records'}</span>
          </div>
        </div>
      </div>

      {/* Tactical Sub-Tabs for Admin Operations */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-xs">
        <button
          type="button"
          onClick={() => setActiveAdminTab('approvals')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-['Rajdhani'] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeAdminTab === 'approvals'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isEs ? 'Panel de Aprobación' : 'Approval Panel'}</span>
          {stats.pending > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400 text-slate-950 animate-pulse">
              {stats.pending}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('communalAlert')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-['Rajdhani'] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeAdminTab === 'communalAlert'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{isEs ? 'Alerta Masiva Comunal' : 'Communal Mass Alert'}</span>
          {communalAlerts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {communalAlerts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('sectorControl')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-['Rajdhani'] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeAdminTab === 'sectorControl'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isEs ? 'Telemetría de Sectores' : 'Sector Telemetry'}</span>
        </button>
      </div>

      {/* VIEW 1: Main 2-Column Layout: Left Queue (8 cols) + Right Sector Risk Telemetry (4 cols) */}
      {activeAdminTab === 'approvals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Real-Time Report Approval Queue */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search, Filter & Sector Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    isEs
                      ? 'Buscar por ciudadano, sector o palabra clave...'
                      : 'Search by citizen, sector, or keyword...'
                  }
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Sector Dropdown */}
              <div className="sm:w-56">
                <select
                  value={selectedSectorFilter}
                  onChange={(e) => setSelectedSectorFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">{isEs ? 'Todos los sectores' : 'All sectors'}</option>
                  {COMUNA_8_SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800">
              {(
                [
                  { id: 'all', label: isEs ? 'Todos' : 'All' },
                  { id: 'pendiente', label: `${isEs ? 'Pendientes' : 'Pending'} (${stats.pending})` },
                  { id: 'aprobado', label: `${isEs ? 'Aprobados' : 'Approved'} (${stats.approved})` },
                  { id: 'rechazado', label: `${isEs ? 'Rechazados' : 'Rejected'} (${stats.rejected})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {selectedSectorFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedSectorFilter('all')}
                  className="ml-auto text-2xs text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer"
                >
                  {isEs ? 'Quitar filtro de sector' : 'Clear sector filter'}
                </button>
              )}
            </div>
          </div>

          {/* Reports List */}
          {isLoadingReports ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-xs font-mono uppercase text-slate-400">
                {isEs
                  ? 'Consultando reportes en Firebase Firestore...'
                  : 'Fetching reports from Firebase Firestore...'}
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-14 px-4 text-center rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {statusFilter === 'pendiente'
                  ? isEs
                    ? 'No hay reportes pendientes de revisión'
                    : 'No pending reports for review'
                  : isEs
                  ? 'No hay reportes registrados'
                  : 'No registered reports'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {statusFilter === 'pendiente'
                  ? isEs
                    ? 'No se registran incidentes manuales pendientes de dictamen en este momento.'
                    : 'No manual incidents pending review at this time.'
                  : isEs
                  ? 'No se encontraron reportes creados por usuarios en la base de datos de Firebase Firestore.'
                  : 'No user-created reports found in Firebase Firestore.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => {
                const isApproved = isReportApproved(report.estado);
                const isPending = report.estado === 'pendiente';
                const isRejected = report.estado === 'rechazado';
                const isProcessing = processingReportId === report.id;

                const priorityColor =
                  report.nivelPrioridad === 'critica'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : report.nivelPrioridad === 'alta'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : report.nivelPrioridad === 'media'
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                    : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';

                return (
                  <div
                    key={report.id}
                    className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/95 border ${
                      isApproved
                        ? 'border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500'
                        : isPending
                        ? 'border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500'
                    } shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3 relative overflow-hidden`}
                  >
                    {/* Top Row: Author & Metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs font-mono text-slate-700 dark:text-slate-200 shadow-2xs">
                          {report.autorNombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                              {report.autorNombre}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-2xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                              {isEs ? 'Usuario Verificado' : 'Verified User'}
                            </span>
                          </div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400 font-mono">
                            {report.autorEmail || (isEs ? 'Sin correo especificado' : 'No email provided')} •{' '}
                            {report.fechaCreacionFormateada || (isEs ? 'Reciente' : 'Recent')}
                          </div>
                        </div>
                      </div>

                      {/* Status & Priority Badges */}
                      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider font-mono border ${priorityColor}`}
                        >
                          {translatePriority(report.nivelPrioridad)}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider font-mono border ${
                            isApproved
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 ring-2 ring-amber-500/20'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isApproved
                            ? isEs
                              ? 'Aprobado'
                              : 'Approved'
                            : isPending
                            ? isEs
                              ? 'Pendiente'
                              : 'Pending'
                            : isEs
                            ? 'Rechazado'
                            : 'Rejected'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Title & Description */}
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-['Rajdhani'] uppercase tracking-wide">
                        {report.titulo}
                      </h4>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {report.descripcion}
                      </p>
                    </div>

                    {/* Sector & Address info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{report.sector}</span>
                      </span>
                      {report.direccion && <span>• {report.direccion}</span>}
                      <span>
                        • {isEs ? 'Categoría' : 'Category'}: {translateCategory(report.categoria)}
                      </span>
                    </div>

                    {/* Optional Rejection Reason */}
                    {report.motivoRechazo && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
                        <span className="font-bold">
                          {isEs ? 'Motivo de rechazo:' : 'Rejection reason:'}
                        </span>{' '}
                        {report.motivoRechazo}
                      </div>
                    )}

                    {/* Action Buttons with instantaneous optimistic response and tactical aesthetics */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              setRejectingReportId(report.id);
                              setRejectReason('');
                            }}
                            className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isEs ? 'Rechazar' : 'Reject'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(report.id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs shadow-emerald-950/20 cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>{isEs ? 'Aprobar Reporte' : 'Approve Report'}</span>
                          </button>
                        </>
                      ) : isApproved ? (
                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {isEs
                                ? 'Aprobado • Activo en mapa y cálculo de riesgo'
                                : 'Approved • Active on map & risk calculation'}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => {
                              setRejectingReportId(report.id);
                              setRejectReason('');
                            }}
                            className="px-2.5 py-1 text-2xs font-bold text-slate-500 hover:text-rose-600 transition underline cursor-pointer"
                          >
                            {isEs ? 'Revertir a rechazado' : 'Revert to rejected'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{isEs ? 'Reporte descartado' : 'Report discarded'}</span>
                          </span>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(report.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white text-2xs font-bold transition cursor-pointer active:scale-95"
                          >
                            {isEs ? 'Reconsiderar y aprobar' : 'Reconsider & approve'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Reject Reason Drawer */}
                    {rejectingReportId === report.id && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {isEs
                            ? 'Motivo del rechazo para notificación al usuario:'
                            : 'Rejection reason for user notification:'}
                        </label>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={
                            isEs
                              ? 'Ej. Información insuficiente o evento fuera de jurisdicción de la Comuna 8'
                              : 'E.g., Insufficient info or incident outside Comuna 8 jurisdiction'
                          }
                          className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setRejectingReportId(null)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            {isEs ? 'Cancelar' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectConfirm(report.id)}
                            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700 cursor-pointer"
                          >
                            {isEs ? 'Confirmar Rechazo' : 'Confirm Rejection'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Nivel de Riesgo y Seguridad por Sector (Live Dynamic Telemetry) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-2 border-t-red-500 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>{isEs ? 'Nivel de Riesgo por Sector' : 'Sector Risk Level'}</span>
              </h3>
              <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                14 SECTORES
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEs
                ? 'Cálculo matemático en tiempo real basado exclusivamente en los reportes aprobados. Los sectores sin reportes aprobados se muestran en ceros sin métricas inventadas.'
                : 'Real-time calculation based exclusively on approved reports. Sectors without approved reports display zero recorded activity.'}
            </p>
          </div>

          <div className="space-y-2.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {COMUNA_8_SECTORS.map((sectorName) => {
              const riskStats = calculateDynamicSectorRiskStats(sectorName, reports, language);
              const sectorBase = sectorName.split('(')[0].trim().toLowerCase();
              const approvedInSector = reports.filter(
                (r) => isReportApproved(r.estado) && (r.sector || '').toLowerCase().includes(sectorBase)
              );

              return (
                <div
                  key={sectorName}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-['Rajdhani'] uppercase tracking-wide">
                        {sectorName}
                      </h4>
                      <div className="text-2xs font-mono text-slate-500">
                        {approvedInSector.length === 0
                          ? isEs
                            ? 'Sin reportes aprobados'
                            : 'No approved reports'
                          : `${approvedInSector.length} ${
                              approvedInSector.length === 1
                                ? isEs
                                   ? 'reporte aprobado'
                                  : 'approved report'
                                : isEs
                                ? 'reportes aprobados'
                                : 'approved reports'
                            }`}
                      </div>
                    </div>

                    <span
                      style={{ color: riskStats.riskColorHex, borderColor: `${riskStats.riskColorHex}40` }}
                      className="px-2 py-0.5 rounded-full text-2xs font-mono font-bold uppercase tracking-wider border shadow-2xs"
                    >
                      {riskStats.riskLabel}
                    </span>
                  </div>

                  {riskStats.hasReports ? (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex justify-between text-2xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                        <span>{isEs ? 'Riesgo Calculado' : 'Calculated Risk'}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{riskStats.riskPercentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${riskStats.riskPercentage}%`,
                            backgroundColor: riskStats.riskColorHex,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-2xs font-mono text-slate-500 pt-0.5">
                        <span>
                          {isEs ? 'Puntaje' : 'Score'}: {riskStats.weightedScore} pts
                        </span>
                        <span>
                          {isEs ? 'Críticos' : 'Critical'}: {riskStats.criticalOrHighCount}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                      <span className="text-2xs font-mono text-slate-400 dark:text-slate-500">
                        {isEs ? 'Sin actividad registrada (0 pts)' : 'No recorded activity (0 pts)'}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSectorFilter(sectorName);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-2xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                  >
                    <span>
                      {isEs ? 'Filtrar reportes de este sector' : 'Filter reports for this sector'}
                    </span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* VIEW 2: Módulo de Alerta Masiva Comunal (Oficial de Administrador) */}
      {activeAdminTab === 'communalAlert' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Official Broadcast Dispatch Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 border-t-2 border-t-amber-500 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      {isEs ? 'Emisión de Alerta Masiva Comunal' : 'Communal Mass Alert Broadcast'}
                    </h3>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 font-mono">
                      {isEs ? 'COMUNA 8 MEDELLÍN • COMUNICADO OFICIAL' : 'COMUNA 8 MEDELLÍN • OFFICIAL BROADCAST'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-2xs font-mono font-bold bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/30">
                  FIRESTORE DIRECT
                </span>
              </div>

              {alertFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    alertFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {alertFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{alertFeedback.text}</span>
                </div>
              )}

              <form onSubmit={handlePublishCommunalAlert} className="space-y-4">
                {/* 1. Nivel de Severidad */}
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-700 dark:text-slate-300 mb-2">
                    {isEs ? '1. Nivel de Severidad de la Alerta' : '1. Alert Severity Level'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'critica', label: isEs ? 'Crítica' : 'Critical', color: 'border-rose-500 text-rose-600 bg-rose-500/10' },
                        { id: 'alerta', label: isEs ? 'Alerta' : 'Warning', color: 'border-amber-500 text-amber-600 bg-amber-500/10' },
                        { id: 'informativa', label: isEs ? 'Informativa' : 'Info', color: 'border-blue-500 text-blue-600 bg-blue-500/10' },
                      ] as const
                    ).map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setAlertSeverity(lvl.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer text-center ${
                          alertSeverity === lvl.id
                            ? `${lvl.color} ring-2 ring-current shadow-xs`
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Sector Afectado */}
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    {isEs ? '2. Sector o Cuadrante Afectado' : '2. Affected Sector or Quadrant'}
                  </label>
                  <select
                    value={alertSector}
                    onChange={(e) => setAlertSector(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="Toda la Comuna 8">{isEs ? 'Toda la Comuna 8 (Alerta General)' : 'All Comuna 8 (General Alert)'}</option>
                    {COMUNA_8_SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Título del Comunicado */}
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    {isEs ? '3. Título Oficial del Comunicado' : '3. Official Broadcast Title'}
                  </label>
                  <input
                    type="text"
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder={
                      isEs
                        ? 'Ej. Operativo preventivo y desvío seguro en sector Enciso'
                        : 'E.g., Preventive patrol and safe detour in Enciso'
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* 4. Mensaje e Instrucciones de Seguridad */}
                <div>
                  <label className="block text-xs font-bold font-mono uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    {isEs ? '4. Mensaje e Instrucciones Ciudadanas' : '4. Community Safety Instructions'}
                  </label>
                  <textarea
                    rows={4}
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder={
                      isEs
                        ? 'Detalla las recomendaciones de seguridad ciudadana, cuadrantes policiales en ruta y vías alternativas...'
                        : 'Provide community safety guidelines, active patrol contacts, and recommended routes...'
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <span className="text-2xs font-mono text-slate-500">
                    {isEs ? 'Difusión pública visible en feed de alertas' : 'Publicly visible in citizens feed'}
                  </span>
                  <button
                    type="submit"
                    disabled={isPublishingAlert}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isPublishingAlert ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Megaphone className="w-4 h-4" />
                    )}
                    <span>{isEs ? 'Transmitir Alerta Oficial' : 'Broadcast Official Alert'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Live List of Published Communal Alerts */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-500" />
                  <span>{isEs ? 'Comunicados Emitidos' : 'Published Alerts'}</span>
                </h3>
                <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {communalAlerts.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEs
                  ? 'Historial de alertas masivas oficiales almacenadas en Firestore y activas en la aplicación.'
                  : 'History of official mass alerts saved in Firestore and active in the application.'}
              </p>
            </div>

            {communalAlerts.length === 0 ? (
              <div className="py-12 px-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                <Radio className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {isEs ? 'Sin comunicados emitidos recientemente' : 'No recently published broadcasts'}
                </h4>
                <p className="text-2xs text-slate-500 max-w-xs mx-auto">
                  {isEs
                    ? 'Usa el formulario para emitir una alerta comunal oficial a los vecinos de la Comuna 8.'
                    : 'Use the form to emit an official community alert to Comuna 8 residents.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {communalAlerts.map((alert) => {
                  const isCritica = alert.nivelSeveridad === 'critica';
                  const isAlerta = alert.nivelSeveridad === 'alerta';
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border shadow-xs space-y-2 transition-all relative ${
                        isCritica
                          ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                          : isAlerta
                          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-mono font-bold uppercase tracking-wider ${
                            isCritica
                              ? 'bg-rose-600 text-white'
                              : isAlerta
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {alert.nivelSeveridad}
                        </span>
                        <span className="text-2xs font-mono text-slate-500">
                          {alert.sectorAfectado}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 font-['Rajdhani'] uppercase tracking-wide">
                        {alert.titulo}
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {alert.mensaje}
                      </p>
                      <div className="pt-1 text-2xs font-mono text-slate-500 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800">
                        <span>{alert.emitidoPorEmail || alert.emitidoPor}</span>
                        <span>{alert.fechaEmisionFormato}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Telemetría Expandida de Sectores Comuna 8 */}
      {activeAdminTab === 'sectorControl' && (
        <div className="space-y-4">
          <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 border-t-2 border-t-red-500 shadow-xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-500" />
                <span>{isEs ? 'Telemetría Global de los 14 Sectores • Comuna 8' : 'Global Telemetry for 14 Sectors • Comuna 8'}</span>
              </h3>
              <span className="text-2xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                100% CÁLCULO REAL EN TIEMPO REAL
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isEs
                ? 'Monitoreo de seguridad dinámico calculado matemáticamente a partir de los reportes aprobados. Los sectores sin reportes aprobados permanecen en cero para total fidelidad.'
                : 'Real-time mathematical safety index based strictly on approved reports in Firestore.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {COMUNA_8_SECTORS.map((sectorName) => {
              const riskStats = calculateDynamicSectorRiskStats(sectorName, reports, language);
              const sectorBase = sectorName.split('(')[0].trim().toLowerCase();
              const approvedInSector = reports.filter(
                (r) => isReportApproved(r.estado) && (r.sector || '').toLowerCase().includes(sectorBase)
              );

              return (
                <div
                  key={sectorName}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-slate-100">
                        {sectorName}
                      </h4>
                      <span
                        style={{ color: riskStats.riskColorHex, borderColor: `${riskStats.riskColorHex}40` }}
                        className="px-2 py-0.5 rounded-full text-2xs font-mono font-bold uppercase tracking-wider border shadow-2xs shrink-0"
                      >
                        {riskStats.riskLabel}
                      </span>
                    </div>

                    <div className="text-2xs font-mono text-slate-500">
                      {approvedInSector.length === 0
                        ? isEs
                          ? 'Sin reportes aprobados'
                          : 'No approved reports'
                        : `${approvedInSector.length} ${
                            approvedInSector.length === 1
                              ? isEs
                                ? 'reporte aprobado'
                                : 'approved report'
                              : isEs
                              ? 'reportes aprobados'
                              : 'approved reports'
                          }`}
                    </div>

                    {riskStats.hasReports ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-2xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                          <span>{isEs ? 'Riesgo' : 'Risk'}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{riskStats.riskPercentage}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${riskStats.riskPercentage}%`,
                              backgroundColor: riskStats.riskColorHex,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-2xs font-mono text-slate-500 pt-1">
                          <span>
                            {isEs ? 'Puntaje' : 'Score'}: {riskStats.weightedScore} pts
                          </span>
                          <span>
                            {isEs ? 'Críticos' : 'Critical'}: {riskStats.criticalOrHighCount}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                        <span className="text-2xs font-mono text-slate-400 dark:text-slate-500">
                          {isEs ? 'Sin actividad registrada (0 pts)' : 'No recorded activity (0 pts)'}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSectorFilter(sectorName);
                      setActiveAdminTab('approvals');
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-2xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                  >
                    <span>{isEs ? 'Ver reportes' : 'View reports'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
