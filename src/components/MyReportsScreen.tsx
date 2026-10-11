import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  MapPin,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { IncidentReport, ReportStatus } from '../types/report';
import {
  subscribeToUserReports,
  subscribeToAllReportsForAdmin,
  updateReportTitleAndDescription,
  updateReportStatusByAdmin,
  deleteReport,
  createRealTestReport,
} from '../services/reportService';
import { CreateReportModal } from './CreateReportModal';
import { ModalPortal } from './ModalPortal';

interface MyReportsScreenProps {
  currentUserId?: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  onNavigateHome: () => void;
  onNavigateAlerts?: () => void;
  onNavigateRiskMap?: () => void;
}

export const MyReportsScreen: React.FC<MyReportsScreenProps> = ({
  currentUserId,
  currentUserEmail,
  currentUserRole = 'ciudadano',
  onNavigateHome,
  onNavigateAlerts,
  onNavigateRiskMap,
}) => {
  const { theme, colors } = useTheme();
  const { language, t, translateCategory, translatePriority, translateStatus, translateRole } = useLanguage();
  const isDark = theme === 'dark';
  const normalizedRole = String(currentUserRole || 'ciudadano').toLowerCase().trim();
  const isAdmin = normalizedRole === 'administrador' || normalizedRole === 'operador';

  // Tabs: 'my' = mis reportes, 'adminReview' = panel de gestión (solo administradores/operadores)
  const [activeTab, setActiveTab] = useState<'my' | 'adminReview'>('my');

  useEffect(() => {
    if (!isAdmin && activeTab === 'adminReview') {
      setActiveTab('my');
    }
  }, [isAdmin, activeTab]);

  // Reports data from real-time onSnapshot
  const [userReports, setUserReports] = useState<IncidentReport[]>([]);
  const [adminReports, setAdminReports] = useState<IncidentReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');

  // Modals & Inline editing
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Admin reject modal
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isProcessingAdminAction, setIsProcessingAdminAction] = useState<boolean>(false);

  // Accessible Delete confirmation modal (replaces window.confirm)
  const [reportToDelete, setReportToDelete] = useState<IncidentReport | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState<boolean>(false);

  // Action status messages
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Subscribe to current user's reports (where uid == currentUserId) with timeout safeguard
  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    const unsubscribe = subscribeToUserReports(
      currentUserId,
      (reports) => {
        clearTimeout(loadingTimer);
        setUserReports(reports);
        setIsLoading(false);
      },
      (err) => {
        clearTimeout(loadingTimer);
        console.warn('[Security Urban :: MyReports] Error en escucha de reportes:', err);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
  }, [currentUserId]);

  // 2. If user is admin, also subscribe to admin review feed
  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = subscribeToAllReportsForAdmin(
      (allReports) => {
        setAdminReports(allReports);
      },
      (err) => {
        console.warn('[Security Urban :: MyReports] Error en feed de admin:', err);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const activeReportsList = activeTab === 'my' ? userReports : adminReports;

  // Filtered reports
  const filteredReports = activeReportsList.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.estado === statusFilter;
    const term = searchQuery.toLowerCase().trim();
    const matchesSearch =
      term === '' ||
      r.titulo.toLowerCase().includes(term) ||
      r.categoria.toLowerCase().includes(term) ||
      r.sector.toLowerCase().includes(term) ||
      (r.descripcion && r.descripcion.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  // Start in-line editing for title (strictly restricted to authorized roles)
  const handleStartEdit = (report: IncidentReport) => {
    if (!isAdmin) {
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'es'
            ? 'No tienes permisos de edición sobre reportes registrados.'
            : 'You do not have permission to edit registered reports.',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }
    setEditingReportId(report.id);
    setEditingTitle(report.titulo);
  };

  // Save edited title to Firestore with timeout and immediate state closure
  const handleSaveEdit = async (reportId: string) => {
    if (!isAdmin) {
      setEditingReportId(null);
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'es'
            ? 'No tienes permisos de edición para realizar esta acción.'
            : 'You do not have edit permissions to perform this action.',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }
    if (!editingTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      await Promise.race([
        updateReportTitleAndDescription(reportId, editingTitle.trim()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado al actualizar el reporte.')), 3000)
        ),
      ]);
      setFeedbackMsg({
        type: 'success',
        text: language === 'es' ? 'Título del reporte actualizado con éxito.' : 'Report title updated successfully.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setEditingReportId(null);
      setIsSavingEdit(false);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  // Admin Accept Report
  const handleAdminAccept = async (reportId: string) => {
    if (!isAdmin || !currentUserId) {
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'es'
            ? 'Acción restringida: tu rol de Ciudadano solo permite crear y visualizar reportes.'
            : 'Restricted action: Citizen role can only create and view reports.',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }
    setIsProcessingAdminAction(true);
    try {
      await Promise.race([
        updateReportStatusByAdmin(reportId, 'aceptado', currentUserId, currentUserEmail),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado al procesar la acción.')), 3000)
        ),
      ]);
      setFeedbackMsg({
        type: 'success',
        text: language === 'es' ? '✔ Reporte aceptado y publicado en el Mapa y Alertas.' : 'Report accepted and published.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsProcessingAdminAction(false);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  // Admin Reject Report
  const handleAdminRejectSubmit = async () => {
    const targetReportId = rejectingReportId;
    if (!isAdmin || !targetReportId || !currentUserId) {
      setRejectingReportId(null);
      setRejectReason('');
      setIsProcessingAdminAction(false);
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'es'
            ? 'No tienes permisos de moderación para rechazar reportes.'
            : 'You do not have moderation permissions to reject reports.',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    setIsProcessingAdminAction(true);
    try {
      await Promise.race([
        updateReportStatusByAdmin(targetReportId, 'rechazado', currentUserId, currentUserEmail, rejectReason),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado al procesar el rechazo.')), 3000)
        ),
      ]);
      setFeedbackMsg({
        type: 'success',
        text: language === 'es' ? 'Reporte marcado como rechazado.' : 'Report marked as rejected.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      // Always close modal immediately whether action succeeded or failed
      setRejectingReportId(null);
      setRejectReason('');
      setIsProcessingAdminAction(false);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  // Confirm Delete report via accessible modal
  const handleConfirmDelete = async () => {
    const targetReport = reportToDelete;
    if (!isAdmin || !targetReport) {
      setReportToDelete(null);
      setIsDeletingReport(false);
      setFeedbackMsg({
        type: 'error',
        text:
          language === 'es'
            ? 'No tienes permisos para eliminar reportes del sistema.'
            : 'You do not have permission to delete reports.',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    setIsDeletingReport(true);
    try {
      await Promise.race([
        deleteReport(targetReport.id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado al eliminar el reporte.')), 3000)
        ),
      ]);
      setFeedbackMsg({
        type: 'success',
        text: language === 'es' ? 'Reporte eliminado correctamente.' : 'Report deleted.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      // Always close modal immediately whether action succeeded or failed
      setReportToDelete(null);
      setIsDeletingReport(false);
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-6 space-y-6">
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label={language === 'es' ? 'Volver al inicio' : 'Back to home'}
            className={`min-h-[42px] min-w-[42px] p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-red-600 dark:text-red-400 uppercase">
                COLECCIÓN FIRESTORE // REPORTES
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                {translateRole(currentUserRole)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {language === 'es' ? 'Bitácora & Mis Reportes' : 'Incident Log & My Reports'}
            </h1>
          </div>
        </div>

        {/* Action Button: Reportar Incidente */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{language === 'es' ? 'Reportar Incidente' : 'Report Incident'}</span>
          </button>
        </div>
      </div>

      {/* 2. Feedback Notification */}
      {feedbackMsg && (
        <div
          role={feedbackMsg.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            aria-label={language === 'es' ? 'Cerrar aviso' : 'Dismiss notice'}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Role-based Mode Tabs */}
      {isAdmin && (
        <div
          role="tablist"
          aria-label={language === 'es' ? 'Modo de visualización de reportes' : 'Report view mode'}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'my'}
            onClick={() => {
              setActiveTab('my');
              setStatusFilter('all');
            }}
            className={`flex-1 min-h-[42px] py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'my'
                ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{language === 'es' ? 'Mis Reportes Registrados' : 'My Registered Reports'}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {userReports.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'adminReview'}
            onClick={() => {
              setActiveTab('adminReview');
              setStatusFilter('all');
            }}
            className={`flex-1 min-h-[42px] py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'adminReview'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {language === 'es'
                ? 'Panel de Gestión y Verificación'
                : 'Management & Verification Panel'}
            </span>
            {adminReports.filter((r) => r.estado === 'pendiente').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-400 text-slate-950">
                {adminReports.filter((r) => r.estado === 'pendiente').length} PENDIENTES
              </span>
            )}
          </button>
        </div>
      )}

      {/* 4. Filter & Search HUD */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <label htmlFor="my-reports-search-input" className="sr-only">
              {language === 'es' ? 'Buscar reportes' : 'Search reports'}
            </label>
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              id="my-reports-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Buscar por título exacto, categoría, sector o descripción...'
                  : 'Search by title, category, sector...'
              }
              className={`w-full min-h-[42px] pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400'
                  : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-500'
              }`}
            />
          </div>

          {/* Status Filter Badges */}
          <div
            role="group"
            aria-label={language === 'es' ? 'Filtrar reportes por estado' : 'Filter reports by status'}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0"
          >
            <button
              type="button"
              aria-pressed={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              className={`min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-700 dark:border-slate-600'
                  : isDark
                  ? 'border-slate-800 text-slate-400 hover:text-slate-200'
                  : 'border-slate-200 text-slate-600 hover:text-slate-800'
              }`}
            >
              {language === 'es' ? 'Todos' : 'All'}
            </button>

            <button
              type="button"
              aria-pressed={statusFilter === 'pendiente'}
              onClick={() => setStatusFilter('pendiente')}
              className={`min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'pendiente'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                  : isDark
                  ? 'border-slate-800 text-amber-400 hover:bg-amber-500/10'
                  : 'border-amber-200 text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span aria-hidden="true">🟡</span>
              <span>{language === 'es' ? 'Pendientes' : 'Pending'}</span>
            </button>

            <button
              type="button"
              aria-pressed={statusFilter === 'aceptado'}
              onClick={() => setStatusFilter('aceptado')}
              className={`min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'aceptado'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : isDark
                  ? 'border-slate-800 text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span aria-hidden="true">🟢</span>
              <span>{language === 'es' ? 'Aceptados' : 'Accepted'}</span>
            </button>

            <button
              type="button"
              aria-pressed={statusFilter === 'rechazado'}
              onClick={() => setStatusFilter('rechazado')}
              className={`min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'rechazado'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : isDark
                  ? 'border-slate-800 text-rose-400 hover:bg-rose-500/10'
                  : 'border-rose-200 text-rose-800 hover:bg-rose-50'
              }`}
            >
              <span aria-hidden="true">🔴</span>
              <span>{language === 'es' ? 'Rechazados' : 'Rejected'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Reports Feed / Empty State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {language === 'es'
              ? 'Consultando reportes en tiempo real desde Firestore...'
              : 'Streaming reports from Firestore...'}
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div
          className={`py-16 px-6 rounded-3xl border text-center flex flex-col items-center justify-center max-w-xl mx-auto transition-all ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-xs'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
            <FileText className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-bold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-2">
            {activeTab === 'my'
              ? 'Aún no tienes reportes registrados.'
              : language === 'es'
              ? 'No hay reportes que coincidan con los filtros.'
              : 'No reports match the current filters.'}
          </h3>

          <p className="text-xs sm:text-sm max-w-md leading-relaxed mb-6">
            {activeTab === 'my'
              ? language === 'es'
                ? 'Todos los incidentes que generes en la Comuna 8 se sincronizarán aquí con su estado de revisión en tiempo real.'
                : 'All incidents you report in Comuna 8 will sync here with real-time review status.'
              : language === 'es'
              ? 'No se encontraron reportes con el criterio seleccionado.'
              : 'No records matching the filter.'}
          </p>

          {activeTab === 'my' && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'es' ? 'Crear mi Primer Reporte' : 'Create My First Report'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map((report) => {
            const isEditingThis = editingReportId === report.id;
            const isOwner = report.uid === currentUserId;

            return (
              <div
                key={report.id}
                className={`p-5 rounded-2xl sm:rounded-3xl border transition-all relative overflow-hidden backdrop-blur-sm ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {/* State Accent Top Bar */}
                <div
                  className={`absolute top-0 inset-x-0 h-1.5 ${
                    report.estado === 'pendiente'
                      ? 'bg-amber-500'
                      : report.estado === 'aceptado'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                />

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="flex-1 space-y-3">
                    {/* Status & Category Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Estado */}
                      {report.estado === 'pendiente' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>{translateStatus(report.estado)}</span>
                        </span>
                      ) : report.estado === 'aceptado' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{translateStatus(report.estado)}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{translateStatus(report.estado)}</span>
                        </span>
                      )}

                      {/* Categoría de Incidente (Traducida centralizadamente) */}
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{translateCategory(report.categoria)}</span>
                      </span>

                      {/* Prioridad (Traducida centralizadamente) */}
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                          report.nivelPrioridad === 'critica'
                            ? 'bg-rose-500 text-white'
                            : report.nivelPrioridad === 'alta'
                            ? 'bg-amber-500 text-black'
                            : report.nivelPrioridad === 'media'
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {translatePriority(report.nivelPrioridad)}
                      </span>
                    </div>

                    {/* Título (Verbatim from Firestore or In-line Edit) */}
                    <div>
                      {isEditingThis ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            maxLength={120}
                            className={`flex-1 px-3 py-1.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/40 ${
                              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(report.id)}
                            disabled={isSavingEdit}
                            className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer"
                            title="Guardar título"
                          >
                            {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingReportId(null)}
                            className="p-2 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 transition cursor-pointer"
                            title="Cancelar edición"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h3 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wide text-slate-900 dark:text-slate-100">
                            {report.titulo}
                          </h3>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(report)}
                              className="opacity-60 hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                              title="Editar título del reporte"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Descripción */}
                    <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium break-words">
                      {report.descripcion}
                    </p>

                    {/* Evidencia Audiovisual Adjunta */}
                    {report.mediaUrl && (
                      <div className={`rounded-xl overflow-hidden border max-w-md ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-100'}`}>
                        {report.mediaType === 'video' ? (
                          <video
                            src={report.mediaUrl}
                            controls
                            preload="metadata"
                            className="w-full max-h-52 object-cover bg-black"
                          />
                        ) : (
                          <a
                            href={report.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden"
                          >
                            <img
                              src={report.mediaUrl}
                              alt={report.titulo}
                              loading="lazy"
                              className="w-full max-h-52 object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Meta info: Sector, Fecha, Autor */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="break-words">{report.sector} {report.direccion ? `• ${report.direccion}` : ''}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{report.fechaCreacionFormateada}</span>
                      </span>

                      {activeTab === 'adminReview' && (
                        <span className="flex flex-wrap items-center gap-1 text-slate-400 break-all sm:break-normal">
                          <span>Autor: <strong className="text-slate-700 dark:text-slate-200">{report.autorNombre}</strong> ({report.autorEmail})</span>
                        </span>
                      )}
                    </div>

                    {/* Rejection Note if rejected */}
                    {report.estado === 'rechazado' && report.motivoRechazo && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                        <strong>{language === 'es' ? 'Motivo del rechazo:' : 'Reason for rejection:'}</strong>{' '}
                        {report.motivoRechazo}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions (Strictly visible ONLY for Admin / Operador roles; hidden for Ciudadano) */}
                  {isAdmin && (
                    <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0">
                      <div className="flex items-center gap-2">
                        {report.estado !== 'aceptado' && (
                          <button
                            type="button"
                            onClick={() => handleAdminAccept(report.id)}
                            disabled={isProcessingAdminAction}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{language === 'es' ? 'Aceptar' : 'Accept'}</span>
                          </button>
                        )}

                        {report.estado !== 'rechazado' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingReportId(report.id);
                              setRejectReason('');
                            }}
                            disabled={isProcessingAdminAction}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{language === 'es' ? 'Rechazar' : 'Reject'}</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setReportToDelete(report)}
                        className="min-h-[38px] min-w-[38px] p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-950/30 transition cursor-pointer flex items-center justify-center"
                        title={language === 'es' ? 'Eliminar reporte' : 'Delete report'}
                        aria-label={language === 'es' ? 'Eliminar reporte' : 'Delete report'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Admin Reject Reason Modal (Strictly gated to Admin/Operador roles) */}
      <ModalPortal
        isOpen={isAdmin && Boolean(rejectingReportId)}
        onClose={() => setRejectingReportId(null)}
        disableClose={isProcessingAdminAction}
        maxWidthClass="max-w-md"
        ariaLabel={language === 'es' ? 'Rechazar Reporte Comunitario' : 'Reject Incident Report'}
        cardClassName={
          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }
      >
        {/* Fixed Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-bold font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2 text-rose-500">
            <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{language === 'es' ? 'Rechazar Reporte Comunitario' : 'Reject Incident Report'}</span>
          </h3>
          <button
            type="button"
            onClick={() => setRejectingReportId(null)}
            disabled={isProcessingAdminAction}
            aria-label={language === 'es' ? 'Cerrar ventana' : 'Close dialog'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
          <label
            htmlFor="admin-reject-reason-textarea"
            className="block text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
          >
            {language === 'es'
              ? 'Indica el motivo por el cual este reporte no fue aceptado (ej. falta de veracidad, información duplicada, datos insuficientes):'
              : 'State the reason why this report is rejected:'}
          </label>

          <textarea
            id="admin-reject-reason-textarea"
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={language === 'es' ? 'Escribe el motivo del rechazo...' : 'Rejection reason...'}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 ${
              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        {/* Fixed Footer */}
        <div
          className={`shrink-0 px-5 sm:px-6 py-3.5 border-t flex flex-wrap items-center justify-end gap-2.5 ${
            isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-slate-50/95'
          }`}
        >
          <button
            type="button"
            onClick={() => setRejectingReportId(null)}
            disabled={isProcessingAdminAction}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
              isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleAdminRejectSubmit}
            disabled={isProcessingAdminAction}
            className="min-h-[40px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isProcessingAdminAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{language === 'es' ? 'Confirmar Rechazo' : 'Confirm Reject'}</span>
          </button>
        </div>
      </ModalPortal>

      {/* 6B. Accessible Delete Confirmation Modal (Strictly gated to Admin/Operador roles) */}
      <ModalPortal
        isOpen={isAdmin && Boolean(reportToDelete)}
        onClose={() => setReportToDelete(null)}
        disableClose={isDeletingReport}
        maxWidthClass="max-w-md"
        ariaLabel={language === 'es' ? 'Confirmar eliminación de reporte' : 'Confirm report deletion'}
        cardClassName={
          isDark ? 'bg-slate-950 border-rose-900/80 text-slate-100' : 'bg-white border-rose-300 text-slate-900'
        }
      >
        {reportToDelete && (
          <>
            <div className="h-1.5 bg-rose-600 shrink-0" />
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg truncate">
                    {language === 'es' ? '¿Eliminar este reporte?' : 'Delete this report?'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {reportToDelete.titulo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                disabled={isDeletingReport}
                aria-label={language === 'es' ? 'Cerrar ventana' : 'Close dialog'}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'es'
                  ? 'Esta acción eliminará el reporte de forma permanente de la colección en Firestore. ¿Deseas continuar?'
                  : 'This action will permanently delete the report from Firestore. Do you want to continue?'}
              </p>
            </div>

            <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                disabled={isDeletingReport}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingReport}
                onClick={handleConfirmDelete}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeletingReport && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{language === 'es' ? 'Eliminar Reporte' : 'Delete Report'}</span>
              </button>
            </div>
          </>
        )}
      </ModalPortal>

      {/* 7. Create Report Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReportCreated={() => {
          setFeedbackMsg({
            type: 'success',
            text:
              language === 'es'
                ? '✔ Reporte y evidencia del suceso registrados exitosamente.'
                : 'Report and incident evidence submitted successfully.',
          });
          setTimeout(() => setFeedbackMsg(null), 4000);
        }}
        onReportError={(errMsg) => {
          setFeedbackMsg({
            type: 'error',
            text: errMsg,
          });
          setTimeout(() => setFeedbackMsg(null), 4500);
        }}
      />
    </div>
  );
};
