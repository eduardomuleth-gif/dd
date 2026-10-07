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
  const { language, t, translateCategory, translatePriority, translateStatus } = useLanguage();
  const isDark = theme === 'dark';
  const isAdmin = currentUserRole === 'administrador';

  // Tabs: 'my' = mis reportes, 'adminReview' = panel de revisión admin
  const [activeTab, setActiveTab] = useState<'my' | 'adminReview'>('my');

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

  // Action status messages
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Subscribe to current user's reports (where uid == currentUserId)
  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToUserReports(
      currentUserId,
      (reports) => {
        setUserReports(reports);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[Security Urban :: MyReports] Error en escucha de reportes:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
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

  // Start in-line editing for title
  const handleStartEdit = (report: IncidentReport) => {
    setEditingReportId(report.id);
    setEditingTitle(report.titulo);
  };

  // Save edited title to Firestore
  const handleSaveEdit = async (reportId: string) => {
    if (!editingTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      await updateReportTitleAndDescription(reportId, editingTitle.trim());
      setFeedbackMsg({
        type: 'success',
        text: language === 'es' ? 'Título del reporte actualizado con éxito en Firestore.' : 'Report title updated successfully.',
      });
      setEditingReportId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsSavingEdit(false);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  // Admin Accept Report
  const handleAdminAccept = async (reportId: string) => {
    if (!currentUserId) return;
    setIsProcessingAdminAction(true);
    try {
      await updateReportStatusByAdmin(reportId, 'aceptado', currentUserId, currentUserEmail);
      setFeedbackMsg({
        type: 'success',
        text: language === 'es' ? '✔ Reporte aceptado. Ahora es visible públicamente en el Mapa y Alertas.' : 'Report accepted and published.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsProcessingAdminAction(false);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  // Admin Reject Report
  const handleAdminRejectSubmit = async () => {
    if (!rejectingReportId || !currentUserId) return;
    setIsProcessingAdminAction(true);
    try {
      await updateReportStatusByAdmin(rejectingReportId, 'rechazado', currentUserId, currentUserEmail, rejectReason);
      setFeedbackMsg({
        type: 'success',
        text: language === 'es' ? 'Reporte marcado como rechazado.' : 'Report marked as rejected.',
      });
      setRejectingReportId(null);
      setRejectReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setIsProcessingAdminAction(false);
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  // Delete report
  const handleDelete = async (reportId: string) => {
    const confirm = window.confirm(
      language === 'es'
        ? '¿Estás seguro de que deseas eliminar este reporte de forma permanente?'
        : 'Are you sure you want to permanently delete this report?'
    );
    if (!confirm) return;

    try {
      await deleteReport(reportId);
      setFeedbackMsg({
        type: 'success',
        text: language === 'es' ? 'Reporte eliminado de Firestore.' : 'Report deleted.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg });
    } finally {
      setTimeout(() => setFeedbackMsg(null), 3000);
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
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-red-600 dark:text-red-400 uppercase">
                COLECCIÓN FIRESTORE // REPORTES
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONSNAPSHOT REAL-TIME
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {language === 'es' ? 'Bitácora & Mis Reportes' : 'Incident Log & My Reports'}
            </h1>
          </div>
        </div>

        {/* Action Button: Nuevo Reporte */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'es' ? 'Reportar Incidente' : 'Report Incident'}</span>
        </button>
      </div>

      {/* 2. Feedback Notification */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Role-based Mode Tabs */}
      {isAdmin && (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('my');
              setStatusFilter('all');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'my'
                ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'es' ? 'Mis Reportes Registrados' : 'My Registered Reports'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {userReports.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('adminReview');
              setStatusFilter('all');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'adminReview'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{language === 'es' ? 'Panel de Verificación Admin' : 'Admin Review Panel'}</span>
            {adminReports.filter((r) => r.estado === 'pendiente').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-black animate-pulse">
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'es'
                  ? 'Buscar por título exacto, categoría, sector o descripción...'
                  : 'Search by title, category, sector...'
              }
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Status Filter Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : isDark
                  ? 'border-slate-800 text-slate-400 hover:text-slate-200'
                  : 'border-slate-200 text-slate-600 hover:text-slate-800'
              }`}
            >
              {language === 'es' ? 'Todos' : 'All'}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pendiente')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'pendiente'
                  ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                  : isDark
                  ? 'border-slate-800 text-amber-400 hover:bg-amber-500/10'
                  : 'border-amber-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span>🟡</span>
              <span>{language === 'es' ? 'Pendientes' : 'Pending'}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('aceptado')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'aceptado'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : isDark
                  ? 'border-slate-800 text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>🟢</span>
              <span>{language === 'es' ? 'Aceptados' : 'Accepted'}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('rechazado')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                statusFilter === 'rechazado'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : isDark
                  ? 'border-slate-800 text-rose-400 hover:bg-rose-500/10'
                  : 'border-rose-200 text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span>🔴</span>
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

                          {(isOwner || isAdmin) && (
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
                    <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                      {report.descripcion}
                    </p>

                    {/* Meta info: Sector, Fecha, Autor */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{report.sector} {report.direccion ? `• ${report.direccion}` : ''}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{report.fechaCreacionFormateada}</span>
                      </span>

                      {activeTab === 'adminReview' && (
                        <span className="flex items-center gap-1.5 text-slate-400">
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

                  {/* Right Column: Actions (Admin review or Owner delete) */}
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0">
                    {/* Admin Verification Controls */}
                    {isAdmin && activeTab === 'adminReview' && (
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
                    )}

                    {/* Owner or Admin Delete */}
                    {(isOwner || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(report.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title={language === 'es' ? 'Eliminar reporte' : 'Delete report'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Admin Reject Reason Modal */}
      <ModalPortal
        isOpen={Boolean(rejectingReportId)}
        onClose={() => setRejectingReportId(null)}
        disableClose={isProcessingAdminAction}
        maxWidthClass="max-w-md"
        cardClassName={
          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }
      >
        {/* Fixed Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <h3 className="text-base sm:text-lg font-bold font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2 text-rose-500">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{language === 'es' ? 'Rechazar Reporte Comunitario' : 'Reject Incident Report'}</span>
          </h3>
          <button
            type="button"
            onClick={() => setRejectingReportId(null)}
            disabled={isProcessingAdminAction}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {language === 'es'
              ? 'Indica el motivo por el cual este reporte no fue aceptado (ej. falta de veracidad, información duplicada, datos insuficientes):'
              : 'State the reason why this report is rejected:'}
          </p>

          <textarea
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
          className={`shrink-0 px-5 sm:px-6 py-3.5 border-t flex items-center justify-end gap-2.5 ${
            isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-200 bg-slate-50/95'
          }`}
        >
          <button
            type="button"
            onClick={() => setRejectingReportId(null)}
            disabled={isProcessingAdminAction}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
              isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleAdminRejectSubmit}
            disabled={isProcessingAdminAction}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isProcessingAdminAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{language === 'es' ? 'Confirmar Rechazo' : 'Confirm Reject'}</span>
          </button>
        </div>
      </ModalPortal>

      {/* 7. Create Report Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReportCreated={() => {
          setFeedbackMsg({
            type: 'success',
            text: language === 'es' ? '✔ Reporte registrado exitosamente con estado PENDIENTE.' : 'Report submitted successfully.',
          });
          setTimeout(() => setFeedbackMsg(null), 4000);
        }}
      />
    </div>
  );
};
