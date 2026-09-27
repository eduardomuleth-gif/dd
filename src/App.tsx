import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  Shield, 
  Sun, 
  Moon, 
  Map, 
  Route, 
  Users, 
  FileText, 
  Bell, 
  Activity, 
  Home as HomeIcon,
  Menu, 
  X, 
  Loader2, 
  Settings,
  Sparkles
} from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { BackgroundArtwork } from './components/BackgroundArtwork';
import { SecurityBadges } from './components/SecurityBadges';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { EmailVerificationView } from './components/EmailVerificationView';
import { HomeScreen } from './components/HomeScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { RiskMapScreen } from './components/RiskMapScreen';
import { SafeRoutesScreen } from './components/SafeRoutesScreen';
import { TacticalSupportScreen } from './components/TacticalSupportScreen';
import { UserManagementScreen } from './components/UserManagementScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { MyReportsScreen } from './components/MyReportsScreen';
import { AlertsScreen } from './components/AlertsScreen';
import { ModulePlaceholderView, NavTabId } from './components/ModulePlaceholderView';
import { TacticalMapModal } from './components/TacticalMapModal';
import { UserProfileMenu } from './components/UserProfileMenu';
import { subscribeToAuth, executeSignOut } from './services/firebaseAuth';
import { syncCurrentUserFirestoreProfile } from './services/userService';
import { UserRole } from './types/user';
import { startActivitySimulation } from './services/activitySimulationService';
import { DEMO_MODE } from './config/simulation';

const MainScreen: React.FC = () => {
  const { theme, toggleTheme, colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Authentication State with Route Guard
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('ciudadano');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Authenticated view routing
  const [currentView, setCurrentView] = useState<NavTabId>('home');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Modals and drawers
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTacticalMapOpen, setIsTacticalMapOpen] = useState(false);

  // Live simulation report toast & bell animation
  const [hasLiveAlertPulse, setHasLiveAlertPulse] = useState(false);
  const [liveSimulatedToast, setLiveSimulatedToast] = useState<{
    id: string;
    titulo: string;
    categoria: string;
    sector: string;
    fechaCreacionFormateada?: string;
  } | null>(null);

  // Listener for live simulated report events from activitySimulationService
  useEffect(() => {
    const handleNewReport = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      console.log('[Security Urban :: LiveToast] 🔔 Notificación de nuevo reporte simulado recibido:', detail);

      // Trigger bell pulse animation for 8 seconds
      setHasLiveAlertPulse(true);
      const pulseTimer = setTimeout(() => {
        setHasLiveAlertPulse(false);
      }, 8000);

      // Trigger floating live toast
      setLiveSimulatedToast({
        id: detail.id || `sim-${Date.now()}`,
        titulo: detail.titulo,
        categoria: detail.categoria,
        sector: detail.sector,
        fechaCreacionFormateada: detail.fechaCreacionFormateada,
      });

      return () => clearTimeout(pulseTimer);
    };

    window.addEventListener('security_urban_new_simulated_report', handleNewReport);
    return () => {
      window.removeEventListener('security_urban_new_simulated_report', handleNewReport);
    };
  }, []);

  // Auto-dismiss live toast after 6 seconds
  useEffect(() => {
    if (!liveSimulatedToast) return;
    const timer = setTimeout(() => {
      setLiveSimulatedToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [liveSimulatedToast]);

  // Subscribe to real Firebase auth changes via route guard
  useEffect(() => {
    console.log('[Security Urban :: RouteGuard] Inicializando listener onAuthStateChanged...');
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (user) {
        console.log('[Security Urban :: RouteGuard] ✔ Usuario autenticado:', user.email, '-> Sincronizando perfil con Firestore');
        try {
          const profile = await syncCurrentUserFirestoreProfile(user);
          if (profile.estado === 'suspendido') {
            console.warn('[Security Urban :: RouteGuard] Cuenta suspendida en Firestore, forzando cierre de sesión...');
            await executeSignOut();
            setCurrentUser(null);
            return;
          }
          // Default demo elevation to admin if email contains admin/root, otherwise use profile.rol
          setCurrentUserRole(profile.rol);
        } catch (syncErr) {
          console.error('[Security Urban :: RouteGuard] Error al sincronizar perfil de Firestore:', syncErr);
        }
      } else {
        console.log('[Security Urban :: RouteGuard] ✖ Sin sesión activa -> Redirigiendo a Login');
        setCurrentUserRole('ciudadano');
        setCurrentView('home'); // Reset authenticated view pointer
      }
    });

    return () => unsubscribe();
  }, []);

  // Motor de simulación periódica de actividad comunitaria para fines de demostración académica
  useEffect(() => {
    if (!DEMO_MODE) return;
    const cleanup = startActivitySimulation();
    return () => cleanup();
  }, []);

  const handleOpenForgotPassword = (email: string) => {
    setForgotPasswordEmail(email);
    setIsForgotPasswordOpen(true);
  };

  const handleViewProfile = () => {
    setCurrentView('profile');
    setIsMobileMenuOpen(false);
  };

  const handleOpenSettings = () => {
    setCurrentView('settings');
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    console.log('[Security Urban] Cerrando sesión y regresando a pantalla de Login...');
    await executeSignOut();
    setActiveTab('login');
    setIsMobileMenuOpen(false);
  };

  // Nav menu items: módulos principales del sistema (Gestión de Usuarios y Ajustes se acceden desde el menú de perfil)
  const navMenuItems: { id: NavTabId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: t('navHome'), icon: <HomeIcon className="w-4 h-4" /> },
    { id: 'dashboard', label: t('navDashboard'), icon: <Activity className="w-4 h-4" /> },
    { id: 'riskMap', label: t('navRiskMap'), icon: <Map className="w-4 h-4" /> },
    { id: 'safeRoutes', label: t('navSafeRoutes'), icon: <Route className="w-4 h-4" /> },
    { id: 'tacticalSupport', label: t('navTacticalSupport'), icon: <Users className="w-4 h-4" /> },
    { id: 'alerts', label: t('navAlerts'), icon: <Bell className="w-4 h-4" /> },
    { id: 'myReports', label: t('navMyReports'), icon: <FileText className="w-4 h-4" /> },
  ];

  // 1. Initial Loading State (while Firebase onAuthStateChanged resolves)
  if (isAuthLoading) {
    return (
      <div className={`min-h-screen relative flex flex-col items-center justify-center overflow-hidden transition-colors ${colors.canvasBg} ${colors.canvasText}`}>
        <BackgroundArtwork />
        <div className="relative z-10 flex flex-col items-center gap-4 p-8 rounded-3xl backdrop-blur-md bg-white/40 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-red-600 border border-red-400 flex items-center justify-center text-white shadow-xl shadow-red-900/40 animate-pulse">
              <Shield className="w-9 h-9 stroke-[2.5]" />
            </div>
            <Loader2 className="w-6 h-6 text-red-500 animate-spin absolute -bottom-2 -right-2" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-extrabold font-['Rajdhani'] tracking-widest uppercase text-slate-900 dark:text-slate-100">
              SECURITY URBAN // COMUNA 8
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              Verificando credenciales de acceso seguro...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNAUTHENTICATED FLOW: ONLY LOGIN / REGISTER SCREEN (No navigation bar, no user profile, no module menus)
  if (!currentUser) {
    return (
      <div className={`min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-red-600 selection:text-white pb-8 transition-colors ${colors.canvasBg} ${colors.canvasText}`}>
        {/* Visual Background: canvas + diagonal split panel + subtle circuit texture */}
        <BackgroundArtwork />

        {/* Minimal Unauthenticated Header: Brand + Language + Theme toggle only */}
        <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          {/* Brand identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-600 border border-red-400 flex items-center justify-center text-white shadow-lg shadow-red-900/40 shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-extrabold tracking-wider text-base sm:text-lg font-['Rajdhani'] ${colors.headerBrandText}`}>
                  SECURITY URBAN
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border ${colors.badgeLocationBg} ${colors.badgeLocationText} ${colors.badgeLocationBorder}`}>
                  COMUNA 8
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs font-medium hidden sm:block ${colors.headerSubText}`}>
                {t('appTagline')}
              </p>
            </div>
          </div>

          {/* Minimal Controls: Language switcher & Theme toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <div className={`relative inline-flex items-center rounded-full p-1 text-xs border shadow-xs ${colors.headerBg} ${colors.headerBorder}`}>
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`px-2.5 py-1 rounded-full font-bold transition cursor-pointer ${
                  language === 'es'
                    ? 'bg-red-600 text-white shadow-xs'
                    : colors.tabInactiveText
                }`}
                aria-label="Cambiar a Español"
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-full font-bold transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-red-600 text-white shadow-xs'
                    : colors.tabInactiveText
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
            </div>

            {/* Theme Selector (Dark / Light) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition cursor-pointer shadow-xs ${colors.headerBg} ${colors.headerBorder} hover:border-red-600`}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              )}
            </button>
          </div>
        </header>

        {/* Center: Full-Screen Dedicated Login / Register Card */}
        <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col items-center justify-center grow">
          <div
            id="auth-main-card-container"
            className="w-full max-w-xl sm:max-w-2xl transition-all duration-300"
          >
            {/* Clean Security Badge Ribbon */}
            <div className="mb-4 px-1">
              <SecurityBadges />
            </div>

            {/* Container with rounded corners, pronounced depth shadow, and thin red border */}
            <div
              id="auth-card"
              className={`rounded-3xl p-8 sm:p-12 md:p-14 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_25px_rgba(220,38,38,0.1)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(220,38,38,0.2)] backdrop-blur-md relative overflow-hidden border transition-all ${colors.cardBg} ${colors.cardBorder}`}
            >
              {/* Distinct top accent bar (5px high) with red -> orange gradient */}
              <div className="absolute top-0 inset-x-0 h-[5px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-sm shadow-red-500/25" />

              {/* Geometric HUD security pattern in top-left corner */}
              <div className="absolute top-3 left-3 w-16 h-16 pointer-events-none opacity-[0.14] dark:opacity-[0.18] text-slate-800 dark:text-red-400">
                <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" stroke="currentColor">
                  <path d="M3 24 V3 H24" strokeWidth="1.75" strokeLinecap="round" />
                  <line x1="8" y1="3" x2="3" y2="8" strokeWidth="1" strokeLinecap="round" />
                  <line x1="15" y1="3" x2="3" y2="15" strokeWidth="1" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </div>

              {/* Geometric HUD security pattern in top-right corner */}
              <div className="absolute top-3 right-3 w-16 h-16 pointer-events-none opacity-[0.14] dark:opacity-[0.18] text-slate-800 dark:text-red-400">
                <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" stroke="currentColor">
                  <path d="M61 24 V3 H40" strokeWidth="1.75" strokeLinecap="round" />
                  <line x1="56" y1="3" x2="61" y2="8" strokeWidth="1" strokeLinecap="round" />
                  <line x1="49" y1="3" x2="61" y2="15" strokeWidth="1" strokeLinecap="round" />
                  <circle cx="52" cy="12" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </div>

              {/* Title Header */}
              <div className="text-center space-y-2 mb-7">
                <h1 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-widest font-['Rajdhani'] uppercase ${colors.cardTitle}`}>
                  {activeTab === 'login' ? t('loginTitle') : t('registerTitle')}
                </h1>
                <p className={`text-sm sm:text-base font-medium ${colors.cardSubtitle}`}>
                  {activeTab === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
                </p>
              </div>

              {/* Pill Segmented Tab Switcher */}
              <div className={`grid grid-cols-2 p-1.5 rounded-full border shadow-inner ${colors.tabTrackBg} ${colors.tabTrackBorder}`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`py-3 text-sm sm:text-base font-bold rounded-full transition-all cursor-pointer ${
                    activeTab === 'login'
                      ? 'bg-red-600 text-white shadow-md shadow-red-950/30'
                      : `${colors.tabInactiveText} ${colors.tabInactiveHover}`
                  }`}
                >
                  {t('loginTab')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`py-3 text-sm sm:text-base font-bold rounded-full transition-all cursor-pointer ${
                    activeTab === 'register'
                      ? 'bg-red-600 text-white shadow-md shadow-red-950/30'
                      : `${colors.tabInactiveText} ${colors.tabInactiveHover}`
                  }`}
                >
                  {t('registerTab')}
                </button>
              </div>

              {/* Decorative separator with small security shield badge */}
              <div className="relative my-6 sm:my-8 flex items-center justify-center">
                <div className="grow h-px bg-gradient-to-r from-transparent via-slate-300 to-slate-400 dark:via-slate-700 dark:to-slate-600" />
                <div className="mx-3.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 shadow-xs flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-600 dark:text-red-400 fill-red-600/15" />
                  <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-slate-700 dark:text-slate-300">
                    CANAL SEGURO
                  </span>
                </div>
                <div className="grow h-px bg-gradient-to-l from-transparent via-slate-300 to-slate-400 dark:via-slate-700 dark:to-slate-600" />
              </div>

              {/* Active Tab Form */}
              {activeTab === 'login' ? (
                <LoginForm
                  onSuccess={() => {
                    // Firebase onAuthStateChanged handles the transition automatically
                    setCurrentView('home');
                  }}
                  onOpenForgotPassword={handleOpenForgotPassword}
                  onSwitchToRegister={() => setActiveTab('register')}
                />
              ) : (
                <RegisterForm
                  onSuccess={() => {
                    // Firebase onAuthStateChanged handles the transition automatically
                    setCurrentView('home');
                  }}
                  onSwitchToLogin={() => setActiveTab('login')}
                />
              )}
            </div>

            {/* Footer Project Tag */}
            <div className={`mt-4 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 ${colors.mutedText}`}>
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span>Iniciativa de Seguridad Comunitaria • Medellín 2026</span>
            </div>
          </div>
        </main>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
          defaultEmail={forgotPasswordEmail}
        />
      </div>
    );
  }

  // 3. AUTHENTICATED FLOW: FULL APPLICATION LAYOUT (Header with navigation + user profile + modules)
  return (
    <div className={`min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-red-600 selection:text-white pb-8 transition-colors ${colors.canvasBg} ${colors.canvasText}`}>
      {/* Visual Background: canvas + diagonal split panel + subtle circuit texture */}
      <BackgroundArtwork />

      {/* Top Header Bar for Authenticated Users */}
      <header className="relative z-20 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand identity (clickable to go home) */}
          <button
            type="button"
            onClick={() => {
              setCurrentView('home');
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 text-left cursor-pointer group shrink-0"
            aria-label="Ir al inicio de Security Urban"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-600 border border-red-400 flex items-center justify-center text-white shadow-lg shadow-red-900/40 shrink-0 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-extrabold tracking-wider text-base sm:text-lg font-['Rajdhani'] ${colors.headerBrandText}`}>
                  SECURITY URBAN
                </span>
                <span className={`hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border ${colors.badgeLocationBg} ${colors.badgeLocationText} ${colors.badgeLocationBorder}`}>
                  COMUNA 8
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs font-medium hidden md:block ${colors.headerSubText}`}>
                {t('appTagline')}
              </p>
            </div>
          </button>

          {/* Right Header Controls: Status Badge, User Profile Menu, Language switcher, Theme toggle, Mobile Menu button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Informative Status Badge (distinct from user profile menu; visible on extra wide screens) */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 shadow-xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>COMUNA 8 • NODO SEGURO</span>
            </div>

            {/* Clearly Visible User Profile Menu (Avatar/initials + name + dropdown) */}
            <UserProfileMenu
              user={currentUser}
              userRole={currentUserRole}
              onViewProfile={handleViewProfile}
              onOpenSettings={handleOpenSettings}
              onNavigateToUsers={() => {
                setCurrentView('userManagement');
                setIsMobileMenuOpen(false);
              }}
              onSignOut={handleSignOut}
            />

            {/* Quick Tactical Map modal trigger button */}
            <button
              type="button"
              onClick={() => setIsTacticalMapOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold text-xs tracking-wider uppercase shadow-xs cursor-pointer transition-all shrink-0 active:scale-95"
              title={t('exploreMap')}
            >
              <Map className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{t('exploreMap')}</span>
            </button>

            {/* Language Selector */}
            <div className={`relative inline-flex items-center rounded-full p-1 text-xs border shadow-xs ${colors.headerBg} ${colors.headerBorder} shrink-0`}>
              <button
                type="button"
                onClick={() => setLanguage('es')}
                className={`px-2.5 py-1 rounded-full font-bold transition cursor-pointer ${
                  language === 'es'
                    ? 'bg-red-600 text-white shadow-xs'
                    : colors.tabInactiveText
                }`}
                aria-label="Cambiar a Español"
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-full font-bold transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-red-600 text-white shadow-xs'
                    : colors.tabInactiveText
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
            </div>

            {/* Theme Selector (Dark / Light) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition cursor-pointer shadow-xs ${colors.headerBg} ${colors.headerBorder} hover:border-red-600 shrink-0`}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`lg:hidden w-9 h-9 rounded-full border flex items-center justify-center transition cursor-pointer shadow-xs ${colors.headerBg} ${colors.headerBorder} hover:border-red-600 shrink-0`}
              aria-label="Abrir menú de navegación"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-red-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              )}
            </button>
          </div>
        </div>

        {/* Full Authenticated Navigation Menu (Desktop: pill strip; Mobile: collapsible drawer) */}
        <nav
          aria-label="Navegación principal de Security Urban"
          className="w-full"
        >
          {/* Desktop full navigation bar: centered, symmetrical, fixed with no horizontal scroll */}
          <div className={`hidden lg:flex items-center justify-center p-1.5 sm:p-2 rounded-2xl border shadow-md shadow-red-950/5 dark:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.6),0_0_15px_rgba(220,38,38,0.15)] border-b-2 border-b-red-600/30 backdrop-blur-md transition-all ${colors.headerBg} ${colors.headerBorder}`}>
            <div className="flex items-center justify-center gap-1 lg:gap-1.5 xl:gap-2.5 2xl:gap-3.5 w-full">
              {navMenuItems.map((item) => {
                const isActive = currentView === item.id;
                const isAlertsItem = item.id === 'alerts';
                const showLivePulse = isAlertsItem && hasLiveAlertPulse;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentView(item.id)}
                    className={`px-2.5 py-1.5 lg:px-2.5 lg:py-1.5 xl:px-3.5 xl:py-2 2xl:px-4 2xl:py-2 rounded-xl font-bold text-[13px] 2xl:text-sm tracking-normal flex items-center gap-1.5 xl:gap-2 transition-all cursor-pointer whitespace-nowrap relative group shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/40 ring-1 ring-red-400/40'
                        : `${colors.tabInactiveText} hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white`
                    }`}
                  >
                    {/* Subtle circular container for icon to reinforce visual hierarchy */}
                    <span
                      className={`w-5 h-5 xl:w-5.5 xl:h-5.5 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 relative ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : showLivePulse
                          ? 'bg-red-500/25 text-red-500 dark:text-red-400 ring-2 ring-red-500 animate-pulse'
                          : 'bg-slate-200/60 dark:bg-slate-800/80 text-red-600 dark:text-red-400 border border-slate-300/40 dark:border-slate-700/50'
                      }`}
                    >
                      <span className={showLivePulse ? 'animate-bounce text-amber-300' : ''}>
                        {item.icon}
                      </span>
                      {showLivePulse && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      )}
                    </span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-[9px] font-black tracking-wider shadow-2xs">
                        {item.badge}
                      </span>
                    )}
                    {showLivePulse && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-mono text-[9px] font-black tracking-wider animate-pulse shadow-xs">
                        {language === 'es' ? 'NUEVA' : 'NEW'}
                      </span>
                    )}

                    {/* Active highlight glow underline dot */}
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Collapsible Navigation Menu */}
          {isMobileMenuOpen && (
            <div className={`lg:hidden flex flex-col p-4 rounded-3xl border shadow-2xl shadow-red-950/20 backdrop-blur-md mt-2 space-y-1.5 border-b-2 border-b-red-600/40 ${colors.headerBg} ${colors.headerBorder}`}>
              <div className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400 px-3 py-1 flex items-center justify-between">
                <span>MENÚ DE SEGURIDAD // COMUNA 8</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {navMenuItems.map((item) => {
                  const isActive = currentView === item.id;
                  const isAlertsItem = item.id === 'alerts';
                  const showLivePulse = isAlertsItem && hasLiveAlertPulse;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCurrentView(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`px-4 py-3 rounded-2xl font-bold text-xs tracking-wide flex items-center gap-3 transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/30'
                          : `${colors.tabInactiveText} hover:bg-slate-100 dark:hover:bg-slate-800`
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : showLivePulse
                            ? 'bg-red-500/25 text-red-500 dark:text-red-400 ring-2 ring-red-500 animate-pulse'
                            : 'bg-slate-200/60 dark:bg-slate-800/80 text-red-600 dark:text-red-400 border border-slate-300/40 dark:border-slate-700/50'
                        }`}
                      >
                        <span className={showLivePulse ? 'animate-bounce text-amber-300' : ''}>
                          {item.icon}
                        </span>
                      </span>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-[9px] font-black tracking-wider">
                          {item.badge}
                        </span>
                      )}
                      {showLivePulse && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-[9px] font-black animate-pulse">
                          {language === 'es' ? 'NUEVA' : 'NEW'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 px-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsTacticalMapOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Map className="w-4 h-4" />
                  <span>{t('exploreMap')}</span>
                </button>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleViewProfile();
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{t('viewMyProfile')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenSettings();
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{language === 'es' ? 'Ajustes' : 'Settings'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSignOut();
                    }}
                    className="py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/40 font-bold text-xs text-red-600 dark:text-red-400 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{t('signOut')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content Viewport for Authenticated User */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col items-center justify-center grow">
        {!currentUser.emailVerified ? (
          <EmailVerificationView
            user={currentUser}
            onVerificationSuccess={() => {
              setCurrentUser({ ...currentUser, emailVerified: true } as User);
            }}
          />
        ) : currentView === 'home' ? (
          // Requested "Inicio" (Home) Authenticated Welcome Screen
          <HomeScreen
            onNavigate={(targetTab) => setCurrentView(targetTab)}
            userName={currentUser?.displayName}
            userEmail={currentUser?.email}
            userRole={currentUserRole}
          />
        ) : currentView === 'dashboard' ? (
          // Dedicated "Panel de Control" (Dashboard)
          <DashboardScreen
            onNavigate={(targetTab) => setCurrentView(targetTab)}
            onOpenTacticalMap={() => setIsTacticalMapOpen(true)}
            currentUserId={currentUser?.uid}
          />
        ) : currentView === 'riskMap' ? (
          // Dedicated "Mapa de Riesgo" with real Google Maps and HeatmapLayer
          <RiskMapScreen
            onNavigateHome={() => setCurrentView('home')}
            onNavigateDashboard={() => setCurrentView('dashboard')}
          />
        ) : currentView === 'safeRoutes' ? (
          // Dedicated "Rutas Seguras" with real Places API New, Routes API (New), and live tracking
          <SafeRoutesScreen
            onNavigateHome={() => setCurrentView('home')}
            onNavigateRiskMap={() => setCurrentView('riskMap')}
          />
        ) : currentView === 'tacticalSupport' ? (
          // Dedicated "Apoyo Táctico" with real Google Places, Routes API ETA, and live dispatch tracking
          <TacticalSupportScreen
            onNavigateHome={() => setCurrentView('home')}
            onNavigateDashboard={() => setCurrentView('dashboard')}
          />
        ) : currentView === 'userManagement' ? (
          // Dedicated "Gestión de Usuarios" with Firestore sync, RBAC, live telemetry and account suspension
          <UserManagementScreen
            currentUserRole={currentUserRole}
            currentUserId={currentUser?.uid}
            onCurrentUserRoleChange={(newRole) => setCurrentUserRole(newRole)}
            onNavigateHome={() => setCurrentView('home')}
          />
        ) : currentView === 'myReports' ? (
          // Dedicated "Mis Reportes" with real-time onSnapshot and Admin verification
          <MyReportsScreen
            currentUserId={currentUser?.uid}
            currentUserEmail={currentUser?.email || undefined}
            currentUserRole={currentUserRole}
            onNavigateHome={() => setCurrentView('home')}
            onNavigateAlerts={() => setCurrentView('alerts')}
            onNavigateRiskMap={() => setCurrentView('riskMap')}
          />
        ) : currentView === 'alerts' ? (
          // Dedicated "Centro de Alertas" showing verified accepted reports
          <AlertsScreen
            onNavigateHome={() => setCurrentView('home')}
            onNavigateMyReports={() => setCurrentView('myReports')}
            onNavigateRiskMap={() => setCurrentView('riskMap')}
          />
        ) : currentView === 'settings' || currentView === 'profile' ? (
          // Dedicated "Ajustes del Sistema" (User Profile, App Preferences, Security, Privacy, About, Danger Zone)
          <SettingsScreen
            currentUser={currentUser}
            currentUserRole={currentUserRole}
            initialSection={currentView === 'profile' ? 'profile' : 'profile'}
            onNavigateHome={() => setCurrentView('home')}
            onSignOut={handleSignOut}
          />
        ) : (
          // Authenticated Modules: Mapa de riesgo, Rutas seguras, Apoyo Táctico, Mis Reportes, Alertas, Perfil, Configuración
          <ModulePlaceholderView
            tab={currentView}
            onNavigate={(targetTab) => setCurrentView(targetTab)}
            onOpenTacticalMap={() => setIsTacticalMapOpen(true)}
          />
        )}
      </main>

      {/* Global Tactical Map Modal */}
      <TacticalMapModal
        isOpen={isTacticalMapOpen}
        onClose={() => setIsTacticalMapOpen(false)}
        initialFilter="all"
      />

      {/* Floating Live Activity Toast Notification (Demo Simulation Mode) */}
      {liveSimulatedToast && (
        <div 
          role="alert"
          aria-live="assertive"
          className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div className="relative overflow-hidden rounded-2xl bg-slate-950/95 dark:bg-slate-900/95 border-2 border-red-500/80 shadow-[0_15px_40px_rgba(220,38,38,0.35)] p-4 backdrop-blur-xl text-white">
            {/* Top flashing indicator line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-red-500 to-rose-500 animate-pulse" />

            <div className="flex items-start gap-3">
              {/* Radar pulsing bell icon */}
              <div className="relative mt-0.5 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400">
                  <Bell className="w-5 h-5 animate-bounce text-amber-300" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
              </div>

              {/* Content */}
              <div className="grow min-w-0 pr-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black tracking-widest bg-red-600/30 text-red-300 border border-red-500/40 uppercase">
                    {language === 'es' ? 'ALERTA EN VIVO // VERIFICADA' : 'LIVE VERIFIED ALERT'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-400">
                    {liveSimulatedToast.fechaCreacionFormateada || (language === 'es' ? 'Reciente' : 'Recent')}
                  </span>
                </div>

                <h4 className="text-sm font-extrabold font-['Rajdhani'] tracking-wide text-white truncate">
                  {liveSimulatedToast.titulo}
                </h4>

                <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                  <span className="text-amber-400 font-bold">{liveSimulatedToast.sector}</span> • {liveSimulatedToast.categoria}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('alerts');
                      setLiveSimulatedToast(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-['Rajdhani'] uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{language === 'es' ? 'Ver en Centro de Alertas' : 'View in Alerts Center'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveSimulatedToast(null)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {language === 'es' ? 'Descartar' : 'Dismiss'}
                  </button>
                </div>
              </div>

              {/* Close "X" */}
              <button
                type="button"
                onClick={() => setLiveSimulatedToast(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/10 shrink-0"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainScreen />
      </LanguageProvider>
    </ThemeProvider>
  );
}
