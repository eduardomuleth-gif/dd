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
import { IncidentReport } from '../types/report';
import { subscribeToPublicAcceptedReports } from '../services/reportService';
import { CreateReportModal } from './CreateReportModal';

interface AlertsScreenProps {
  onNavigateHome: () => void;
  onNavigateMyReports?: () => void;
  onNavigateRiskMap?: () => void;
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

  // Real-time onSnapshot subscription to verified/accepted reports only
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToPublicAcceptedReports(
      (reports) => {
        setAcceptedReports(reports);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[Security Urban :: AlertsScreen] Error consultando alertas públicas:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
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
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-xs'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-600 dark:text-amber-500 uppercase">
                {t('alertsBadge')}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {t('alertsVerifiedBadge')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t('alertsTitle')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateMyReports && (
            <button
              type="button"
              onClick={onNavigateMyReports}
              className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold font-mono uppercase tracking-wider transition cursor-pointer ${
                isDark ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-xs'
              }`}
            >
              {t('navMyReports')}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('reportIncidentBtn')}</span>
          </button>
        </div>
      </div>

      {/* Info notice on verification */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30 text-xs sm:text-sm text-blue-950 dark:text-blue-200 flex items-start gap-3 shadow-xs">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          {t('verificationNotice')}
        </p>
      </div>

      {/* Feed content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs sm:text-sm font-mono text-theme-muted">
            {t('loading')}
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div
          className={`py-16 px-6 rounded-3xl border text-center flex flex-col items-center justify-center max-w-xl mx-auto transition-all ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold font-['Rajdhani'] uppercase tracking-wider text-theme-primary mb-2">
            {language === 'es' ? 'Aún no hay alertas registradas' : t('noAlertsFound')}
          </h3>

          <p className="text-sm sm:text-base max-w-md leading-relaxed mb-6 text-theme-muted font-medium">
            {language === 'es'
              ? 'Solo se muestran los reportes realizados por usuarios y aprobados previamente por el administrador.'
              : t('noAlertsFoundDesc')}
          </p>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createNewReportBtn')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className={`p-5 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-sm ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500" />

              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-500/10 text-blue-900 dark:text-blue-200 border border-blue-500/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{translateCategory(report.categoria)}</span>
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                    report.nivelPrioridad === 'critica'
                      ? 'bg-rose-500 text-white'
                      : report.nivelPrioridad === 'alta'
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {translatePriority(report.nivelPrioridad)}
                </span>
              </div>

              {/* Título verbatim del documento */}
              <h3 className="text-lg sm:text-xl font-bold font-['Rajdhani'] uppercase tracking-wide text-theme-primary mb-2">
                {report.titulo}
              </h3>

              <p className="text-base text-theme-secondary leading-relaxed mb-4 font-medium">
                {report.descripcion}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-mono pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-theme-secondary">
                  <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="font-semibold">{report.sector}</span>
                </span>

                <span className="flex items-center gap-1.5 text-theme-muted">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>{report.fechaCreacionFormateada}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
