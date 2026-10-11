import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  Shield,
  ArrowLeft,
  Plus,
  Loader2,
  Filter,
  Eye,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { IncidentReport, INCIDENT_CATEGORIES } from '../types/report';
import { subscribeToPublicAcceptedReports } from '../services/reportService';
import { CreateReportModal } from './CreateReportModal';

interface AlertsScreenProps {
  onNavigateHome: () => void;
  onNavigateMyReports?: () => void;
  onNavigateRiskMap?: () => void;
  currentUserRole?: string;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  onNavigateHome,
  onNavigateMyReports,
  onNavigateRiskMap,
}) => {
  const { theme, colors } = useTheme();
  const { language, t, translateCategory, translatePriority } = useLanguage();
  const isDark = theme === 'dark';

  const [acceptedReports, setAcceptedReports] = useState<IncidentReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Real-time onSnapshot subscription to verified/accepted reports only with timeout safeguard
  useEffect(() => {
    setIsLoading(true);
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    const unsubscribe = subscribeToPublicAcceptedReports(
      (reports) => {
        clearTimeout(loadingTimer);
        setAcceptedReports(reports);
        setIsLoading(false);
      },
      (err) => {
        clearTimeout(loadingTimer);
        console.warn('[Security Urban :: AlertsScreen] Error consultando alertas públicas:', err);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
  }, []);

  const filteredReports = acceptedReports.filter((r) => {
    if (filterCategory === 'all') return true;
    return r.categoria === filterCategory;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label={language === 'es' ? 'Volver al inicio' : 'Back to home'}
            className={`min-h-[42px] min-w-[42px] p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-xs'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-600 dark:text-amber-500 uppercase">
                {t('alertsBadge')}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {t('alertsVerifiedBadge')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t('alertsTitle')}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateMyReports && (
            <button
              type="button"
              onClick={onNavigateMyReports}
              className={`min-h-[42px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold font-mono uppercase tracking-wider transition cursor-pointer ${
                isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-xs'
              }`}
            >
              {t('navMyReports')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[42px] px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{t('reportIncidentBtn')}</span>
          </button>
        </div>
      </div>

      {/* Feedback notification banner */}
      {feedbackNotice && (
        <div
          role={feedbackNotice.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackNotice.text}</span>
          </div>
        </div>
      )}

      {/* Info notice on verification */}
      <div
        role="note"
        className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 text-xs sm:text-sm text-blue-950 dark:text-blue-200 flex items-start gap-3 shadow-xs"
      >
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed font-medium">
          {t('verificationNotice')}
        </p>
      </div>

      {/* Category Filter Bar */}
      {acceptedReports.length > 0 && (
        <div
          role="group"
          aria-label={language === 'es' ? 'Filtrar alertas por categoría' : 'Filter alerts by category'}
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 shrink-0 pr-1">
            <Filter className="w-3.5 h-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>{language === 'es' ? 'Categoría:' : 'Category:'}</span>
          </span>
          <button
            type="button"
            aria-pressed={filterCategory === 'all'}
            onClick={() => setFilterCategory('all')}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer whitespace-nowrap ${
              filterCategory === 'all'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {language === 'es' ? 'Todas' : 'All'} ({acceptedReports.length})
          </button>
          {INCIDENT_CATEGORIES.map((cat) => {
            const count = acceptedReports.filter((r) => r.categoria === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={filterCategory === cat}
                onClick={() => setFilterCategory(cat)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase border transition cursor-pointer whitespace-nowrap ${
                  filterCategory === cat
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {translateCategory(cat)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Feed content */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="py-20 flex flex-col items-center justify-center gap-3"
        >
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" aria-hidden="true" />
          <p className="text-xs sm:text-sm font-mono text-theme-muted">
            {t('loading')}
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className={`py-16 px-6 rounded-3xl border text-center flex flex-col items-center justify-center max-w-xl mx-auto transition-all ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold font-['Rajdhani'] uppercase tracking-wider text-theme-primary mb-2">
            {language === 'es' ? 'Aún no hay alertas registradas' : t('noAlertsFound')}
          </h2>

          <p className="text-sm sm:text-base max-w-md leading-relaxed mb-6 text-theme-muted font-medium">
            {language === 'es'
              ? 'No se registran alertas comunitarias activas en este momento.'
              : t('noAlertsFoundDesc')}
          </p>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="min-h-[42px] px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{t('createNewReportBtn')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
          {filteredReports.map((report) => (
            <article
              key={report.id}
              className={`p-5 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-sm flex flex-col justify-between h-full ${
                isDark ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-300 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />

              <div>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-500/10 text-blue-900 dark:text-blue-200 border border-blue-500/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                    <span>{translateCategory(report.categoria)}</span>
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                      report.nivelPrioridad === 'critica'
                        ? 'bg-rose-600 text-white'
                        : report.nivelPrioridad === 'alta'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {translatePriority(report.nivelPrioridad)}
                  </span>
                </div>

                {/* Título verbatim del documento */}
                <h2 className="text-lg font-bold font-['Rajdhani'] uppercase tracking-wide text-theme-primary mb-2">
                  {report.titulo}
                </h2>

                <p className="text-sm sm:text-base text-theme-secondary leading-relaxed mb-4 font-medium break-words">
                  {report.descripcion}
                </p>

                {report.mediaUrl && (
                  <div className={`mb-4 rounded-xl overflow-hidden border ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-100'}`}>
                    {report.mediaType === 'video' ? (
                      <video
                        src={report.mediaUrl}
                        controls
                        preload="metadata"
                        className="w-full h-40 object-cover bg-black"
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
                          className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-mono pt-3 border-t border-slate-200 dark:border-slate-800 mt-auto">
                <span className="flex items-center gap-1.5 text-theme-secondary min-w-0">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0" aria-hidden="true" />
                  <span className="font-semibold truncate">{report.sector}</span>
                </span>

                <span className="flex items-center gap-1.5 text-theme-muted shrink-0">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                  <span>{report.fechaCreacionFormateada}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReportCreated={() => {
          setFeedbackNotice({
            type: 'success',
            text:
              language === 'es'
                ? '✔ Reporte y evidencia del suceso registrados exitosamente.'
                : 'Report and incident evidence submitted successfully.',
          });
          setTimeout(() => setFeedbackNotice(null), 4000);
        }}
        onReportError={(errMsg) => {
          setFeedbackNotice({
            type: 'error',
            text: errMsg,
          });
          setTimeout(() => setFeedbackNotice(null), 4500);
        }}
      />
    </div>
  );
};
