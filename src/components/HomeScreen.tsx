import React, { useState } from 'react';
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
  UserCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { TacticalMapModal } from './TacticalMapModal';
import { NavTabId } from './ModulePlaceholderView';

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

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapInitialFilter, setMapInitialFilter] = useState<'all' | 'routes' | 'alerts' | 'quadrants'>('all');

  const handleOpenMap = (filter: 'all' | 'routes' | 'alerts' | 'quadrants' = 'all') => {
    setMapInitialFilter(filter);
    setIsMapModalOpen(true);
  };

  // Extract clean display name
  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Agente Comunal');

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

      {/* 2. Main Hero Section Card - Clean, Minimalist & Elegant Welcome */}
      <section
        id="home-hero-card"
        className={`w-full rounded-3xl p-6 sm:p-10 md:p-14 lg:p-16 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_25px_rgba(220,38,38,0.1)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(220,38,38,0.2)] backdrop-blur-md relative overflow-hidden border transition-all mb-8 ${colors.cardBg} ${colors.cardBorder}`}
      >
        {/* Distinct 5px Accent Top Bar with red-orange gradient */}
        <div className="absolute top-0 inset-x-0 h-[5px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-sm shadow-red-500/25" />

        {/* HUD Corner Decorators */}
        <div className="absolute top-3 left-3 w-14 h-14 pointer-events-none opacity-[0.14] dark:opacity-[0.18] text-slate-800 dark:text-red-400">
          <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" stroke="currentColor">
            <path d="M3 20 V3 H20" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="8" y1="3" x2="3" y2="8" strokeWidth="1" strokeLinecap="round" />
            <line x1="15" y1="3" x2="3" y2="15" strokeWidth="1" strokeLinecap="round" />
            <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <div className="absolute top-3 right-3 w-14 h-14 pointer-events-none opacity-[0.14] dark:opacity-[0.18] text-slate-800 dark:text-red-400">
          <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" stroke="currentColor">
            <path d="M61 20 V3 H44" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="56" y1="3" x2="61" y2="8" strokeWidth="1" strokeLinecap="round" />
            <line x1="49" y1="3" x2="61" y2="15" strokeWidth="1" strokeLinecap="round" />
            <circle cx="54" cy="10" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <div className="absolute bottom-3 left-3 w-14 h-14 pointer-events-none opacity-[0.12] dark:opacity-[0.16] text-slate-800 dark:text-red-400">
          <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" stroke="currentColor">
            <path d="M3 44 V61 H20" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="8" y1="61" x2="3" y2="56" strokeWidth="1" strokeLinecap="round" />
            <circle cx="10" cy="54" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <div className="absolute bottom-3 right-3 w-14 h-14 pointer-events-none opacity-[0.12] dark:opacity-[0.16] text-slate-800 dark:text-red-400">
          <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" stroke="currentColor">
            <path d="M61 44 V61 H44" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="56" y1="61" x2="61" y2="56" strokeWidth="1" strokeLinecap="round" />
            <circle cx="54" cy="54" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </div>

        {/* Ambient Glows */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-red-600/12 dark:bg-red-600/15" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-amber-500/10 dark:bg-amber-500/12" />

        {/* Purely Visual/Decorative HUD Lateral Elements (No operational text or numbers) */}
        {/* Left Flank Subtle Vector Radar Silhouette */}
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none opacity-[0.10] dark:opacity-[0.15] hidden md:block">
          <svg viewBox="0 0 200 200" className="w-full h-full text-current stroke-current" fill="none">
            <circle cx="100" cy="100" r="90" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="100" cy="100" r="65" strokeWidth="0.75" />
            <circle cx="100" cy="100" r="40" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="10" y1="100" x2="190" y2="100" strokeWidth="0.5" strokeDasharray="3 6" />
            <line x1="100" y1="10" x2="100" y2="190" strokeWidth="0.5" strokeDasharray="3 6" />
          </svg>
        </div>

        {/* Right Flank Subtle Vector Reticle Silhouette */}
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none opacity-[0.10] dark:opacity-[0.15] hidden md:block">
          <svg viewBox="0 0 200 200" className="w-full h-full text-current stroke-current" fill="none">
            <circle cx="100" cy="100" r="85" strokeWidth="1" strokeDasharray="3 5" />
            <circle cx="100" cy="100" r="55" strokeWidth="0.75" />
            <circle cx="100" cy="100" r="25" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M 30 100 L 170 100" strokeWidth="0.5" />
            <path d="M 100 30 L 100 170" strokeWidth="0.5" />
          </svg>
        </div>

        {/* Clean, Centered Welcome Content */}
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center">
          {/* Central Security Illustration with Glow & Radar Rings */}
          <div className="relative mb-6 flex items-center justify-center">
            {/* Outer pulsating radial aura */}
            <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-red-600/25 to-amber-500/20 blur-xl animate-pulse pointer-events-none" />

            {/* Radar Conic Wave Ring */}
            <div className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-red-500/30 animate-[spin_20s_linear_infinite]" />
            <div className="absolute w-22 h-22 sm:w-28 sm:h-28 rounded-full border border-dashed border-red-500/40" />

            {/* Central Tactical Shield Emblem */}
            <div className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 p-[2px] shadow-xl shadow-red-950/50">
              <div className="w-full h-full rounded-[22px] bg-slate-950/90 flex flex-col items-center justify-center text-white relative overflow-hidden">
                {/* Crosshairs inside badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className="w-full h-px bg-red-500" />
                  <div className="h-full w-px bg-red-500 absolute" />
                </div>
                <Shield className="w-9 h-9 sm:w-11 sm:h-11 text-white stroke-[2.2] drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
              </div>
            </div>

            {/* Active Status Ping on Badge */}
            <span className="absolute bottom-1 right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          {/* Personalized User Greeting Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm tracking-wide mb-3 shadow-xs">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>{t('welcomeBack')}, <span className="font-extrabold text-red-600 dark:text-red-400 capitalize">{displayName}</span></span>
          </div>

          {/* Subtitle / Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs tracking-wider uppercase mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('heroTagline')}</span>
          </div>

          {/* Main Title */}
          <h1 className={`text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-['Rajdhani'] mb-4 ${colors.cardTitle}`}>
            SECURITY URBAN
          </h1>

          {/* Description */}
          <p className={`text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-8 font-medium ${colors.cardSubtitle}`}>
            {t('heroDescription')}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('riskMap')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-3 shadow-lg shadow-red-950/40 dark:shadow-red-950/60 hover:shadow-red-600/30 transition-all cursor-pointer active:scale-[0.99] group"
            >
              <Navigation className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              <span>{t('exploreMap')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`w-full sm:w-auto px-7 py-4 rounded-xl border text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
                isDark
                  ? 'border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{t('goToDashboard')}</span>
            </button>
          </div>

          {/* Authenticated User Session Line */}
          {userEmail && (
            <div className="mt-6 text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t('sessionUser')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{userEmail}</span></span>
            </div>
          )}
        </div>
      </section>

      {/* 3. Section Title for Quick Access Cards */}
      <div className="w-full mb-4 px-1 sm:px-2 flex items-center justify-between">
        <div>
          <h2 className={`text-lg sm:text-xl font-bold tracking-tight ${colors.cardTitle}`}>
            {t('quickAccessTitle')}
          </h2>
          <p className={`text-xs sm:text-sm ${colors.cardSubtitle}`}>
            {t('quickAccessSubtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenMap('all')}
          className="text-xs sm:text-sm font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
        >
          <span>{language === 'es' ? 'Ver todo el mapa' : 'View full map'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4. Four Quick Access Cards Grid - Fully Expanded across full container width */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8">
        {/* Card 1: Prevención -> Mapa de Riesgo */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('riskMap')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('riskMap')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm shadow-md hover:-translate-y-1 hover:shadow-xl ${
            isDark
              ? 'bg-slate-950/80 border-red-600/30 hover:border-red-500/80 hover:shadow-red-950/50'
              : 'bg-white/95 border-red-600/30 hover:border-red-500/80 hover:shadow-slate-300/60'
          }`}
        >
          {/* Top subtle bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* Circular Icon Container */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-red-600/20 to-amber-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all shadow-sm">
            <ShieldAlert className="w-6 h-6 stroke-[2]" />
          </div>

          <h3 className={`text-base sm:text-lg font-bold mb-1.5 flex items-center justify-between ${colors.cardTitle}`}>
            <span>{t('cardPreventionTitle')}</span>
            <ChevronRight className="w-4 h-4 text-red-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </h3>

          <p className={`text-xs sm:text-sm leading-relaxed ${colors.cardSubtitle}`}>
            {t('cardPreventionDesc')}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-red-600 dark:text-red-400 font-bold">
            <span>MOD-01 // PREVENCIÓN</span>
            <span>VER SECTOR →</span>
          </div>
        </div>

        {/* Card 2: Alertas -> Módulo de Alertas */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('alerts')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('alerts')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm shadow-md hover:-translate-y-1 hover:shadow-xl ${
            isDark
              ? 'bg-slate-950/80 border-red-600/30 hover:border-red-500/80 hover:shadow-red-950/50'
              : 'bg-white/95 border-red-600/30 hover:border-red-500/80 hover:shadow-slate-300/60'
          }`}
        >
          {/* Top subtle bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* Circular Icon Container */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-red-600/20 to-amber-500/10 border border-red-500/30 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition-all shadow-sm">
            <Bell className="w-6 h-6 stroke-[2]" />
          </div>

          <h3 className={`text-base sm:text-lg font-bold mb-1.5 flex items-center justify-between ${colors.cardTitle}`}>
            <span>{t('cardAlertsTitle')}</span>
            <ChevronRight className="w-4 h-4 text-red-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </h3>

          <p className={`text-xs sm:text-sm leading-relaxed ${colors.cardSubtitle}`}>
            {t('cardAlertsDesc')}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-amber-500 font-bold">
            <span>MOD-02 // ALERTAS</span>
            <span>VER REPORTES →</span>
          </div>
        </div>

        {/* Card 3: Rutas Seguras -> Módulo de Rutas Seguras */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('safeRoutes')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('safeRoutes')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm shadow-md hover:-translate-y-1 hover:shadow-xl ${
            isDark
              ? 'bg-slate-950/80 border-red-600/30 hover:border-red-500/80 hover:shadow-red-950/50'
              : 'bg-white/95 border-red-600/30 hover:border-red-500/80 hover:shadow-slate-300/60'
          }`}
        >
          {/* Top subtle bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* Circular Icon Container */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-red-600/20 to-amber-500/10 border border-red-500/30 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
            <Route className="w-6 h-6 stroke-[2]" />
          </div>

          <h3 className={`text-base sm:text-lg font-bold mb-1.5 flex items-center justify-between ${colors.cardTitle}`}>
            <span>{t('cardRoutesTitle')}</span>
            <ChevronRight className="w-4 h-4 text-red-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </h3>

          <p className={`text-xs sm:text-sm leading-relaxed ${colors.cardSubtitle}`}>
            {t('cardRoutesDesc')}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-emerald-500 font-bold">
            <span>MOD-03 // CORREDORES</span>
            <span>TRAZAR RUTA →</span>
          </div>
        </div>

        {/* Card 4: Comunidad -> Apoyo Táctico */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onNavigate('tacticalSupport')}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('tacticalSupport')}
          className={`group rounded-2xl p-5 border transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm shadow-md hover:-translate-y-1 hover:shadow-xl ${
            isDark
              ? 'bg-slate-950/80 border-red-600/30 hover:border-red-500/80 hover:shadow-red-950/50'
              : 'bg-white/95 border-red-600/30 hover:border-red-500/80 hover:shadow-slate-300/60'
          }`}
        >
          {/* Top subtle bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* Circular Icon Container */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-red-600/20 to-amber-500/10 border border-red-500/30 text-rose-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm">
            <Users className="w-6 h-6 stroke-[2]" />
          </div>

          <h3 className={`text-base sm:text-lg font-bold mb-1.5 flex items-center justify-between ${colors.cardTitle}`}>
            <span>{t('cardCommunityTitle')}</span>
            <ChevronRight className="w-4 h-4 text-red-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </h3>

          <p className={`text-xs sm:text-sm leading-relaxed ${colors.cardSubtitle}`}>
            {t('cardCommunityDesc')}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-rose-500 font-bold">
            <span>MOD-04 // RED VECINAL</span>
            <span>CONTACTOS →</span>
          </div>
        </div>
      </div>

      {/* Admin Module Callout (Visible for Administrators) */}
      {userRole === 'administrador' && (
        <div className={`w-full mb-8 p-5 sm:p-6 rounded-2xl border transition-all relative overflow-hidden backdrop-blur-md shadow-lg ${
          isDark
            ? 'bg-gradient-to-r from-red-950/40 via-slate-950/80 to-amber-950/30 border-red-900/60'
            : 'bg-gradient-to-r from-red-50/80 via-white to-amber-50/80 border-red-200 shadow-slate-200/50'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
                    MÓDULO DE MANDO // FIRESTORE
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-red-600 text-white font-mono text-[9px] font-bold">
                    ADMIN
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {language === 'es' ? 'Gestión de Usuarios & Control de Accesos' : 'User Management & Access Control'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'es'
                    ? 'Monitorea usuarios registrados en tiempo real, asigna roles y gestiona suspensiones.'
                    : 'Monitor registered users in real-time, assign roles, and manage suspensions.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('userManagement')}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
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

      {/* Tactical Map Modal */}
      <TacticalMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialFilter={mapInitialFilter}
      />
    </div>
  );
};

