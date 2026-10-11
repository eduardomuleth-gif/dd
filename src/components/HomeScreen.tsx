import React from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Bell, 
  Route, 
  Users, 
  MapPin, 
  Lock, 
  ArrowRight, 
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Navigation,
  UserCheck,
  PlusCircle,
  FileCheck2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { NavTabId } from './ModulePlaceholderView';
import { SecurityUrbanLogo } from './SecurityUrbanLogo';

interface HomeScreenProps {
  onNavigate: (tab: NavTabId) => void;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  userName = null,
  userEmail = null,
  userRole = 'ciudadano',
}) => {
  const { colors, theme } = useTheme();
  const { t, language } = useLanguage();
  const isDark = theme === 'dark';

  // Extract clean display name
  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Ciudadano');

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. Top Informative Badges Ribbon */}
      <div className="w-full mb-6 px-1 sm:px-2 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm">
        {/* Left Side: Location & Active Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs transition-colors font-medium text-xs sm:text-sm ${colors.badgeLocationBg} ${colors.badgeLocationText} ${colors.badgeLocationBorder}`}
          >
            <MapPin className="w-4 h-4 text-red-600 shrink-0" />
            <span>{t('badgeComuna8')} • Medellín</span>
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs transition-colors font-medium text-xs sm:text-sm ${colors.badgeOnlineBg} ${colors.badgeOnlineText} ${colors.badgeOnlineBorder}`}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <span>{t('badgeMonitoring')}</span>
          </span>
        </div>

        {/* Right Side: Security Protocols */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs transition-colors font-medium text-xs sm:text-sm ${colors.badgeOnlineBg} ${colors.badgeOnlineText} ${colors.badgeOnlineBorder}`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{t('statusOnline')}</span>
          </span>

          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs transition-colors font-medium text-xs sm:text-sm ${colors.badgeSecureBg} ${colors.badgeSecureText} ${colors.badgeSecureBorder}`}
          >
            <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>{t('statusSecure')}</span>
          </span>
        </div>
      </div>

      {/* 2. Main Hero Section Card - Clean, Balanced & Professional Welcome */}
      <section
        id="home-hero-card"
        className={`w-full rounded-3xl p-6 sm:p-10 md:p-12 lg:p-14 shadow-lg backdrop-blur-md relative overflow-hidden border transition-all mb-8 ${colors.cardBg} ${colors.cardBorder}`}
      >
        {/* Subtle 3px Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-red-600" />

        {/* Soft Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none bg-red-600/[0.06] dark:bg-red-600/10" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none bg-slate-400/10 dark:bg-slate-800/20" />

        {/* Clean, Centered Welcome Content */}
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center">
          {/* Central Brand Shield Emblem */}
          <div className="relative mb-5 flex items-center justify-center">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-600 p-[2px] shadow-md">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
                <SecurityUrbanLogo className="w-9 h-9 sm:w-11 sm:h-11 text-white" />
              </div>
            </div>

            {/* Active Status Indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-950" />
            </span>
          </div>

          {/* Personalized User Greeting Badge */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300 font-semibold text-sm mb-3 max-w-full">
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate max-w-[240px] sm:max-w-none">{t('welcomeBack')}, <span className="font-bold text-slate-900 dark:text-white capitalize">{displayName}</span></span>
          </div>

          {/* Subtitle / Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 font-semibold text-xs sm:text-sm tracking-wide uppercase mb-3 max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
            <span className="truncate">{t('heroTagline')}</span>
          </div>

          {/* Main Title (28-32px mobile, 32-40px desktop) */}
          <h1 className={`text-[28px] sm:text-4xl lg:text-[40px] font-extrabold tracking-tight font-['Rajdhani'] mb-3 ${colors.cardTitle}`}>
            SECURITY URBAN
          </h1>

          {/* Description (16px comfortable paragraph) */}
          <p className={`text-base max-w-[62ch] leading-relaxed mb-7 font-normal ${colors.cardSubtitle}`}>
            {t('heroDescription')}
          </p>

          {/* Primary Action Buttons (14-16px control text) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('riskMap')}
              className="w-full sm:w-auto min-h-[48px] px-6 sm:px-7 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer active:scale-[0.99] group"
            >
              <Navigation className="w-4 h-4 group-hover:rotate-45 transition-transform shrink-0" />
              <span>{t('exploreMap')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`w-full sm:w-auto min-h-[48px] px-6 sm:px-7 py-3.5 rounded-xl border text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs ${
                isDark
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-100'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{t('goToDashboard')}</span>
            </button>
          </div>

          {/* Authenticated User Session Line (14px auxiliary text) */}
          {userEmail && (
            <div className="mt-6 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-2 max-w-full px-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="break-all sm:break-normal">{t('sessionUser')}: <span className="font-semibold text-slate-700 dark:text-slate-200">{userEmail}</span></span>
            </div>
          )}
        </div>
      </section>

      {/* 3. Section Title for Quick Access Cards (24-30px section heading) */}
      <div className="w-full mb-5 px-1 sm:px-2 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className={`text-2xl sm:text-[28px] font-bold tracking-tight ${colors.cardTitle}`}>
            {t('quickAccessTitle')}
          </h2>
          <p className={`text-base mt-1 ${colors.cardSubtitle}`}>
            {t('quickAccessSubtitle')}
          </p>
        </div>
      </div>

      {/* 4. Four Quick Access Cards Grid - Clean, Balanced Proportions */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8">
        {/* Card 1: Prevención -> Mapa de Riesgo */}
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
          className={`group rounded-2xl p-5 sm:p-6 border transition-all cursor-pointer relative overflow-hidden shadow-xs hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-red-500/60'
              : 'bg-white border-slate-200/90 hover:border-red-500/60'
          }`}
        >
          <div>
            {/* Icon Container */}
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <ShieldAlert className="w-6 h-6 stroke-[2]" />
            </div>

            <h3 className={`text-lg sm:text-xl font-bold mb-2 flex items-center justify-between ${colors.cardTitle}`}>
              <span>{t('cardPreventionTitle')}</span>
              <ChevronRight className="w-4 h-4 text-red-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </h3>

            <p className={`text-base leading-relaxed ${colors.cardSubtitle}`}>
              {t('cardPreventionDesc')}
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-sm text-red-600 dark:text-red-400 font-semibold">
            <span className="truncate">Prevención</span>
            <span className="shrink-0">{t('viewSectorArrow')}</span>
          </div>
        </div>

        {/* Card 2: Alertas -> Módulo de Alertas */}
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
          className={`group rounded-2xl p-5 sm:p-6 border transition-all cursor-pointer relative overflow-hidden shadow-xs hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/60'
              : 'bg-white border-slate-200/90 hover:border-amber-500/60'
          }`}
        >
          <div>
            {/* Icon Container */}
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              <Bell className="w-6 h-6 stroke-[2]" />
            </div>

            <h3 className={`text-lg sm:text-xl font-bold mb-2 flex items-center justify-between ${colors.cardTitle}`}>
              <span>{t('cardAlertsTitle')}</span>
              <ChevronRight className="w-4 h-4 text-amber-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </h3>

            <p className={`text-base leading-relaxed ${colors.cardSubtitle}`}>
              {t('cardAlertsDesc')}
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-sm text-amber-600 dark:text-amber-400 font-semibold">
            <span className="truncate">Alertas verificadas</span>
            <span className="shrink-0">{t('viewReportsArrow')}</span>
          </div>
        </div>

        {/* Card 3: Rutas Seguras -> Módulo de Rutas Seguras */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('safeRoutes')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigate('safeRoutes');
            }
          }}
          className={`group rounded-2xl p-5 sm:p-6 border transition-all cursor-pointer relative overflow-hidden shadow-xs hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/60'
              : 'bg-white border-slate-200/90 hover:border-emerald-500/60'
          }`}
        >
          <div>
            {/* Icon Container */}
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Route className="w-6 h-6 stroke-[2]" />
            </div>

            <h3 className={`text-lg sm:text-xl font-bold mb-2 flex items-center justify-between ${colors.cardTitle}`}>
              <span>{t('cardRoutesTitle')}</span>
              <ChevronRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </h3>

            <p className={`text-base leading-relaxed ${colors.cardSubtitle}`}>
              {t('cardRoutesDesc')}
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="truncate">Corredores</span>
            <span className="shrink-0">{t('planRouteArrow')}</span>
          </div>
        </div>

        {/* Card 4: Comunidad -> Apoyo Táctico */}
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
          className={`group rounded-2xl p-5 sm:p-6 border transition-all cursor-pointer relative overflow-hidden shadow-xs hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-blue-500/60'
              : 'bg-white border-slate-200/90 hover:border-blue-500/60'
          }`}
        >
          <div>
            {/* Icon Container */}
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6 stroke-[2]" />
            </div>

            <h3 className={`text-lg sm:text-xl font-bold mb-2 flex items-center justify-between ${colors.cardTitle}`}>
              <span>{t('cardCommunityTitle')}</span>
              <ChevronRight className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </h3>

            <p className={`text-base leading-relaxed ${colors.cardSubtitle}`}>
              {t('cardCommunityDesc')}
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-sm text-blue-600 dark:text-blue-400 font-semibold">
            <span className="truncate">Red vecinal</span>
            <span className="shrink-0">{t('requestSupportArrow')}</span>
          </div>
        </div>
      </div>

      {/* Incident Reporting & My Reports Community Banner */}
      <div className={`w-full mb-8 p-6 sm:p-7 rounded-2xl border transition-all relative overflow-hidden shadow-sm ${
        isDark
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-white border-slate-200/90'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  Participación Ciudadana
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  En línea
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                {language === 'es' ? '¿Presenciaste un incidente en la Comuna 8?' : 'Witnessed an incident in Comuna 8?'}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mt-1">
                {language === 'es'
                  ? 'Registra novedades de seguridad, fallas de iluminación o emergencias viales. El reporte será verificado por administradores antes de su publicación.'
                  : 'Report security incidents, lighting failures, or road hazards. Reports are reviewed by administrators prior to public map dispatch.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('myReports')}
              className="min-h-[44px] py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>{language === 'es' ? 'Reportar Incidente' : 'Report Incident'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('myReports')}
              className={`min-h-[44px] py-2.5 px-5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap ${
                isDark 
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200' 
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{language === 'es' ? 'Mis Reportes' : 'My Reports'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Module Callout (Visible for Administrators) */}
      {userRole === 'administrador' && (
        <div className={`w-full mb-8 p-6 sm:p-7 rounded-2xl border transition-all relative overflow-hidden shadow-sm ${
          isDark
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white border-slate-200/90'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                    Administración
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-bold">
                    Admin
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  {language === 'es' ? 'Gestión de Usuarios y Control de Accesos' : 'User Management & Access Control'}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-0.5">
                  {language === 'es'
                    ? 'Monitorea usuarios registrados en tiempo real, asigna roles y gestiona suspensiones.'
                    : 'Monitor registered users in real-time, assign roles, and manage suspensions.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('userManagement')}
              className="min-h-[44px] py-2.5 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <span>{language === 'es' ? 'Abrir Gestión' : 'Open Management'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Small Footer */}
      <footer className={`text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 py-4 ${colors.mutedText}`}>
        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
        <span>{t('footerInitiative')}</span>
      </footer>
    </div>
  );
};

