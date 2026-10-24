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
import { isExplicitAdminEmail } from '../services/userService';

interface AdminControlCenterScreenProps {
  currentUserEmail?: string | null;
  currentUserId?: string;
  onNavigateRiskMap?: () => void;
  onNavigateUsers?: () => void;
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
}) => {
  const { theme, colors } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';

  // Strict Security Access Verification
  const isAdmin = isExplicitAdminEmail(currentUserEmail);

  // Reports State from Firestore
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendiente' | 'aprobado' | 'rechazado'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 1. Subscribe in real time to reports stored in Firebase Firestore
  useEffect(() => {
    setIsLoadingReports(true);
    const unsub = subscribeToAllReportsForAdmin((data) => {
      setReports(data);
      setIsLoadingReports(false);
    });
    return () => unsub();
  }, []);

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

  // Physical updateDoc in Firestore to 'aprobado'
  const handleApprove = async (reportId: string) => {
    setProcessingReportId(reportId);
    try {
      await updateReportStatusByAdmin(
        reportId,
        'aprobado',
        currentUserId,
        currentUserEmail || 'eduardomuleth@gmail.com'
      );
    } catch (err) {
      console.error('Error aprobando reporte:', err);
    } finally {
      setProcessingReportId(null);
    }
  };

  // Physical updateDoc in Firestore to 'rechazado'
  const handleRejectConfirm = async (reportId: string) => {
    setProcessingReportId(reportId);
    try {
      await updateReportStatusByAdmin(
        reportId,
        'rechazado',
        currentUserId,
        currentUserEmail || 'eduardomuleth@gmail.com',
        rejectReason.trim() || undefined
      );
      setRejectingReportId(null);
      setRejectReason('');
    } catch (err) {
      console.error('Error rechazando reporte:', err);
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
          Acceso Restringido
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Esta vista es de uso exclusivo para la administración oficial (eduardomuleth@gmail.com).
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Clean Institutional Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Administración Comunal • Comuna 8 Medellín
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-slate-100">
            Panel de Aprobación en Tiempo Real
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Supervisión, validación y auditoría de reportes comunitarios con actualización dinámica de riesgo.
          </p>
        </div>

        {/* Administrator Account Badge */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <div className="text-left">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {currentUserEmail}
            </div>
            <div className="text-2xs font-medium text-emerald-600 dark:text-emerald-400">
              Administrador General
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Pendientes de Validación
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-['Rajdhani'] text-amber-500">
            {stats.pending}
          </div>
          <p className="mt-0.5 text-2xs text-slate-500">Requieren dictamen</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Reportes Aprobados
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-['Rajdhani'] text-emerald-500">
            {stats.approved}
          </div>
          <p className="mt-0.5 text-2xs text-slate-500">Activos en mapa de riesgo</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Reportes Rechazados
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-['Rajdhani'] text-rose-500">
            {stats.rejected}
          </div>
          <p className="mt-0.5 text-2xs text-slate-500">Descartados con justificación</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Total Gestionados
            </span>
            <BarChart2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-['Rajdhani'] text-slate-800 dark:text-slate-200">
            {stats.total}
          </div>
          <p className="mt-0.5 text-2xs text-slate-500">Registros en Firestore</p>
        </div>
      </div>

      {/* Main 2-Column Layout: Left Queue (8 cols) + Right Sector Risk Telemetry (4 cols) */}
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
                  placeholder="Buscar por ciudadano, sector o palabra clave..."
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
                  <option value="all">Todos los sectores</option>
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
                  { id: 'all', label: 'Todos' },
                  { id: 'pendiente', label: `Pendientes (${stats.pending})` },
                  { id: 'aprobado', label: `Aprobados (${stats.approved})` },
                  { id: 'rechazado', label: `Rechazados (${stats.rejected})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-red-600 text-white'
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
                  Quitar filtro de sector
                </button>
              )}
            </div>
          </div>

          {/* Reports List */}
          {isLoadingReports ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <p className="text-xs font-mono uppercase text-slate-400">
                Consultando reportes en Firebase Firestore...
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-14 px-4 text-center rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {statusFilter === 'pendiente'
                  ? 'No hay reportes pendientes de revisión'
                  : 'No hay reportes registrados'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {statusFilter === 'pendiente'
                  ? 'No se registran incidentes manuales pendientes de dictamen en este momento.'
                  : 'No se encontraron reportes creados por usuarios en la base de datos de Firebase Firestore.'}
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
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3"
                  >
                    {/* Top Row: Author & Metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                          {report.autorNombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                              {report.autorNombre}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-2xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Usuario Registrado
                            </span>
                          </div>
                          <div className="text-2xs text-slate-500 dark:text-slate-400">
                            {report.autorEmail || 'Sin correo especificado'} • {report.fechaCreacionFormateada || 'Reciente'}
                          </div>
                        </div>
                      </div>

                      {/* Status & Priority Badges */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-bold uppercase border ${priorityColor}`}
                        >
                          {report.nivelPrioridad}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-2xs font-bold uppercase border ${
                            isApproved
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isApproved ? 'Aprobado' : isPending ? 'Pendiente' : 'Rechazado'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Title & Description */}
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                        {report.titulo}
                      </h4>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {report.descripcion}
                      </p>
                    </div>

                    {/* Sector & Address info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span>{report.sector}</span>
                      </span>
                      {report.direccion && (
                        <span>• {report.direccion}</span>
                      )}
                      <span>• Categoría: {report.categoria}</span>
                    </div>

                    {/* Optional Rejection Reason */}
                    {report.motivoRechazo && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
                        <span className="font-bold">Motivo de rechazo:</span> {report.motivoRechazo}
                      </div>
                    )}

                    {/* Action Buttons */}
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
                            className="px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(report.id)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Aprobar Reporte</span>
                          </button>
                        </>
                      ) : isApproved ? (
                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprobado • Activo en mapa y cálculo de riesgo</span>
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
                            Revertir a rechazado
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-2xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reporte descartado</span>
                          </span>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(report.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white text-2xs font-bold transition cursor-pointer"
                          >
                            Reconsiderar y aprobar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Reject Reason Drawer */}
                    {rejectingReportId === report.id && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Motivo del rechazo para notificación al usuario:
                        </label>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Ej. Información insuficiente o evento fuera de jurisdicción de la Comuna 8"
                          className="w-full px-3 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setRejectingReportId(null)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectConfirm(report.id)}
                            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700 cursor-pointer"
                          >
                            Confirmar Rechazo
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

        {/* Right Column: Nivel de Riesgo y Seguridad por Sector (Live Mathematical Dynamic Calculation) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <h3 className="text-base font-bold font-['Rajdhani'] uppercase text-slate-900 dark:text-slate-100">
              Nivel de Riesgo por Sector
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cálculo matemático en tiempo real basado exclusivamente en los reportes aprobados. Los sectores sin reportes aprobados se muestran en ceros sin métricas inventadas.
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
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {sectorName}
                      </h4>
                      <div className="text-2xs text-slate-500">
                        {approvedInSector.length === 0
                          ? 'Sin reportes aprobados'
                          : `${approvedInSector.length} ${approvedInSector.length === 1 ? 'reporte aprobado' : 'reportes aprobados'}`}
                      </div>
                    </div>

                    <span
                      style={{ color: riskStats.riskColorHex }}
                      className="px-2 py-0.5 rounded-full text-2xs font-bold border"
                    >
                      {riskStats.riskLabel}
                    </span>
                  </div>

                  {riskStats.hasReports ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-2xs font-semibold text-slate-600 dark:text-slate-400">
                        <span>Riesgo Calculado</span>
                        <span>{riskStats.riskPercentage}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${riskStats.riskPercentage}%`,
                            backgroundColor: riskStats.riskColorHex,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-2xs text-slate-500 pt-0.5">
                        <span>Puntaje: {riskStats.weightedScore} pts</span>
                        <span>Críticos: {riskStats.criticalOrHighCount}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                      <span className="text-2xs font-medium text-slate-500">
                        Sin actividad registrada (0 pts)
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSectorFilter(sectorName);
                    }}
                    className="w-full py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-2xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>Filtrar reportes de este sector</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
