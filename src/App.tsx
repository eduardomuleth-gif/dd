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
import { AuthActionHandlerView } from './components/AuthActionHandlerView';
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
import { SecurityUrbanLogo } from './components/SecurityUrbanLogo';
import {
  subscribeToAuth,
  executeSignOut,
  auth,
  AUTH_SYNC_CHANNEL_NAME,
  PASSWORD_RESET_PENDING_KEY,
} from './services/firebaseAuth';
import { syncCurrentUserFirestoreProfile } from './services/userService';
import { UserRole } from './types/user';
import { startActivitySimulation } from './services/activitySimulationService';
import { DEMO_MODE } from './config/simulation';

const MainScreen: React.FC = () => {
  const { theme, toggleTheme, colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Authentication State with Route Guard
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
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

  // Firebase Email Action Code Parameters (?mode=verifyEmail|resetPassword&oobCode=...) or Return Flow (?authFlow=...)
  const [authActionParams, setAuthActionParams] = useState<{
    mode: string;
    oobCode: string;
    continueUrl?: string | null;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if ((mode === 'verifyEmail' || mode === 'resetPassword') && oobCode) {
      return {
        mode,
        oobCode,
        continueUrl: params.get('continueUrl') || 'https://securityurban.vercel.app',
      };
    }
    return null;
  });

  const [authReturnNotice, setAuthReturnNotice] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const authFlow = params.get('authFlow');
    if (!oobCode && (authFlow === 'verifyEmail' || mode === 'verifyEmail')) {
      return '¡Tu correo electrónico ha sido confirmado! Ya puedes iniciar sesión para acceder a Security Urban.';
    }
    if (!oobCode && (authFlow === 'resetPassword' || mode === 'resetPassword')) {
      return 'Proceso de restablecimiento completado. Inicia sesión con tu nueva contraseña.';
    }
    try {
      const pendingRaw = localStorage.getItem(PASSWORD_RESET_PENDING_KEY);
      if (!oobCode && pendingRaw) {
        const parsed = JSON.parse(pendingRaw) as { email?: string; timestamp?: number };
        if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          localStorage.removeItem(PASSWORD_RESET_PENDING_KEY);
          return 'Proceso de restablecimiento completado. Inicia sesión con tu nueva contraseña.';
        }
      }
    } catch {
      // Ignore storage access errors
    }
    return null;
  });

  const clearUrlAuthParams = () => {
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const cleanPath = window.location.pathname === '/reset-password' ? '/' : window.location.pathname;
      const cleanUrl = cleanPath + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
      clearUrlAuthParams();
    }
  }, []);

  useEffect(() => {
    if (authReturnNotice) {
      clearUrlAuthParams();
    }
  }, [authReturnNotice]);

  // Synchronize auth return state across tabs cleanly WITHOUT calling window.close()
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL_NAME);
    const tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || params.get('authFlow');
    const isReturningFromAuthFlow =
      mode === 'resetPassword' || mode === 'verifyEmail' || Boolean(authReturnNotice);

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        senderId?: string;
        flow?: string;
      };
      if (!data || data.senderId === tabId) return;

      if (data.type === 'NEW_AUTH_RETURN_TAB_OPENED') {
        setActiveTab('login');
        setIsForgotPasswordOpen(false);
        if (data.flow === 'resetPassword') {
          setAuthReturnNotice(
            'Proceso de restablecimiento completado. Inicia sesión con tu nueva contraseña.'
          );
          try {
            localStorage.removeItem(PASSWORD_RESET_PENDING_KEY);
          } catch {
            // Ignore
          }
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    if (isReturningFromAuthFlow) {
      channel.postMessage({
        type: 'NEW_AUTH_RETURN_TAB_OPENED',
        senderId: tabId,
        flow: mode || 'resetPassword',
      });
    }

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [authReturnNotice]);

  // Measure fixed header height so main content never hides behind the navigation bar
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const updateHeight = () => {
      const nextHeight = headerEl.offsetHeight;
      setHeaderHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(headerEl);
    window.addEventListener('resize', updateHeight, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [currentUser, language]);

  // Live simulation report toast & bell animation
  const [hasLiveAlertPulse, setHasLiveAlertPulse] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
      }
      pulseTimerRef.current = setTimeout(() => {
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
    };

    window.addEventListener('security_urban_new_simulated_report', handleNewReport);
    return () => {
      window.removeEventListener('security_urban_new_simulated_report', handleNewReport);
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
      }
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

  // Scroll to top immediately when currentView changes to prevent header overlapping
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView]);

  // PROMPT 4: Automatic emailVerified reload listener across the application
  useEffect(() => {
    if (!currentUser || currentUser.emailVerified || isEmailVerified) return;
    let isMounted = true;

    const checkVerificationStatus = async () => {
      try {
        const activeUser = auth.currentUser || currentUser;
        if (typeof activeUser.reload === 'function') {
          await activeUser.reload();
        }
        if (activeUser.emailVerified && isMounted) {
          console.log('[Security Urban :: RouteGuard] ✔ emailVerified = true detectado en recarga. Desbloqueando acceso completo a la plataforma.');
          setIsEmailVerified(true);
          setCurrentUser(auth.currentUser || activeUser);
        }
      } catch {
        // Silently retry
      }
    };

    const interval = setInterval(checkVerificationStatus, 3000);
    const onFocus = () => checkVerificationStatus();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [currentUser, isEmailVerified]);

  // Subscribe to real Firebase auth changes via route guard
  useEffect(() => {
    console.log('[Security Urban :: RouteGuard] Inicializando listener onAuthStateChanged...');
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      setIsEmailVerified(Boolean(user?.emailVerified));
      setIsAuthLoading(false);

      if (user) {
        console.log('[Security Urban :: RouteGuard] ✔ Usuario autenticado:', user.email, '-> Sincronizando perfil con Firestore');
        try {
          const profile = await syncCurrentUserFirestoreProfile(user);
          if (profile.estado === 'suspendido') {
            console.warn('[Security Urban :: RouteGuard] Cuenta suspendida en Firestore, forzando cierre de sesión...');
            await executeSignOut();
            setCurrentUser(null);
            setIsEmailVerified(false);
            return;
          }

          // If verified via 6-digit OTP code in Firestore, honor verified status
          if (profile.correoVerificado === true && !user.emailVerified) {
            console.log('[Security Urban :: RouteGuard] Correo verificado mediante código OTP en Firestore -> Acceso completo habilitado');
            setIsEmailVerified(true);
          }

          // Default demo elevation to admin if email contains admin/root, otherwise use profile.rol
          setCurrentUserRole(profile.rol);
        } catch (syncErr) {
          console.error('[Security Urban :: RouteGuard] Error al sincronizar perfil de Firestore:', syncErr);
        }
      } else {
        console.log('[Security Urban :: RouteGuard] ✖ Sin sesión activa -> Redirigiendo a Login');
        setIsEmailVerified(false);
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
              <SecurityUrbanLogo className="w-9 h-9" />
            </div>
            <Loader2 className="w-6 h-6 text-red-500 animate-spin absolute -bottom-2 -right-2" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-extrabold font-['Rajdhani'] tracking-widest uppercase text-slate-900 dark:text-slate-100">
              SECURITY URBAN // COMUNA 8
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              {t('loading')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNAUTHENTICATED OR EMAIL ACTION HANDLER FLOW
  if (!currentUser || authActionParams) {
    return (
      <div className={`min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-red-600 selection:text-white pb-8 transition-colors ${colors.canvasBg} ${colors.canvasText}`}>
        {/* Accessibility Skip Link */}
        <a
          href="#auth-main-card-container"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-red-600 focus:text-white focus:font-bold focus:text-xs focus:shadow-xl"
        >
          {language === 'es' ? 'Saltar al formulario principal' : 'Skip to main form'}
        </a>

        {/* Visual Background: canvas + diagonal split panel + subtle circuit texture */}
        <BackgroundArtwork />

        {/* Minimal Unauthenticated Header: Brand + Language + Theme toggle only */}
        <header className="relative z-20 w-full max-w-7xl mx-auto px-3.5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand identity */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-600 border border-red-400 flex items-center justify-center text-white shadow-lg shadow-red-900/40 shrink-0">
              <SecurityUrbanLogo className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className={`font-extrabold tracking-wider text-sm min-[360px]:text-base sm:text-lg font-['Rajdhani'] whitespace-nowrap ${colors.headerBrandText}`}>
                  SECURITY URBAN
                </span>
                <span className={`hidden min-[380px]:inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap ${colors.badgeLocationBg} ${colors.badgeLocationText} ${colors.badgeLocationBorder}`}>
                  COMUNA 8
                </span>
              </div>
              <p className={`text-[11px] sm:text-xs font-medium hidden sm:block truncate ${colors.headerSubText}`}>
                {t('appTagline')}
              </p>
            </div>
          </div>

          {/* Minimal Controls: Language switcher & Theme toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Selector */}
            <div
              role="group"
              aria-label={language === 'es' ? 'Selector de idioma' : 'Language selector'}
              className={`relative inline-flex items-center rounded-full p-1 text-xs border shadow-xs ${colors.headerBg} ${colors.headerBorder}`}
            >
              <button
                type="button"
                onClick={() => setLanguage('es')}
                aria-pressed={language === 'es'}
                className={`px-2.5 py-1.5 rounded-full font-bold transition cursor-pointer min-h-[32px] min-w-[36px] ${
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
                aria-pressed={language === 'en'}
                className={`px-2.5 py-1.5 rounded-full font-bold transition cursor-pointer min-h-[32px] min-w-[36px] ${
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
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition cursor-pointer shadow-xs shrink-0 ${colors.headerBg} ${colors.headerBorder} hover:border-red-600`}
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

        {/* Center: Full-Screen Dedicated Login / Register / Email Action Handler Card */}
        <main className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-8 flex flex-col items-center justify-center grow">
          <div
            id="auth-main-card-container"
            className="w-full max-w-xl sm:max-w-2xl transition-all duration-300"
          >
            {/* Clean Security Badge Ribbon */}
            <div className="mb-3.5 sm:mb-4 px-1">
              <SecurityBadges />
            </div>

            {authActionParams ? (
              <AuthActionHandlerView
                mode={authActionParams.mode}
                oobCode={authActionParams.oobCode}
                continueUrl={authActionParams.continueUrl}
                onEmailVerifiedSuccess={() => {
                  setIsEmailVerified(true);
                  if (currentUser) {
                    setCurrentUser(auth.currentUser || currentUser);
                  }
                }}
                onCompleteToLogin={() => {
                  clearUrlAuthParams();
                  setAuthActionParams(null);
                  setActiveTab('login');
                }}
              />
            ) : (
              /* Clean, balanced Authentication Card with subtle elevation */
              <div
                id="auth-card"
                className={`rounded-3xl p-5 min-[380px]:p-6 sm:p-10 md:p-11 shadow-xl backdrop-blur-md relative overflow-hidden border transition-all ${colors.cardBg} ${colors.cardBorder}`}
              >
                {/* Subtle 3px top accent line */}
                <div className="absolute top-0 inset-x-0 h-[3px] bg-red-600" />

                {/* Return banner when coming back from Firebase hosted action page */}
                {authReturnNotice && (
                  <div
                    role="status"
                    className="mb-6 p-4 rounded-2xl bg-emerald-100 border border-emerald-500 text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-200 text-sm font-bold flex items-center justify-between gap-3 shadow-xs"
                  >
                    <span>{authReturnNotice}</span>
                    <button
                      type="button"
                      onClick={() => setAuthReturnNotice(null)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono underline shrink-0 cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                )}

                {/* Title Header */}
                <div className="text-center space-y-2 mb-6 sm:mb-7">
                  <h1 className={`text-[26px] sm:text-3xl md:text-4xl font-extrabold tracking-wide font-['Rajdhani'] uppercase ${colors.cardTitle}`}>
                    {activeTab === 'login' ? t('loginTitle') : t('registerTitle')}
                  </h1>
                  <p className={`text-sm sm:text-base font-medium ${colors.cardSubtitle}`}>
                    {activeTab === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
                  </p>
                </div>

                {/* Pill Segmented Tab Switcher */}
                <div
                  role="tablist"
                  aria-label={language === 'es' ? 'Opciones de acceso' : 'Authentication options'}
                  className={`grid grid-cols-2 p-1.5 rounded-2xl border ${colors.tabTrackBg} ${colors.tabTrackBorder}`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'login'}
                    onClick={() => setActiveTab('login')}
                    className={`py-2.5 sm:py-3 px-3 text-sm sm:text-base font-bold rounded-xl transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'login'
                        ? 'bg-red-600 text-white shadow-sm'
                        : `${colors.tabInactiveText} ${colors.tabInactiveHover}`
                    }`}
                  >
                    {t('loginTab')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'register'}
                    onClick={() => setActiveTab('register')}
                    className={`py-2.5 sm:py-3 px-3 text-sm sm:text-base font-bold rounded-xl transition-all cursor-pointer min-h-[44px] ${
                      activeTab === 'register'
                        ? 'bg-red-600 text-white shadow-sm'
                        : `${colors.tabInactiveText} ${colors.tabInactiveHover}`
                    }`}
                  >
                    {t('registerTab')}
                  </button>
                </div>

                {/* Clean subtle divider */}
                <div className="my-6 h-px bg-slate-200 dark:bg-slate-800" />

                {/* Active Tab Form */}
                {activeTab === 'login' ? (
                  <LoginForm
                    onSuccess={() => {
                      setCurrentView('home');
                    }}
                    onOpenForgotPassword={handleOpenForgotPassword}
                    onSwitchToRegister={() => setActiveTab('register')}
                  />
                ) : (
                  <RegisterForm
                    onSuccess={() => {
                      setCurrentView('home');
                    }}
                    onSwitchToLogin={() => setActiveTab('login')}
                  />
                )}
              </div>
            )}

            {/* Footer Project Tag */}
            <div className={`mt-4 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 px-2 ${colors.mutedText}`}>
              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
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
    <div className={`min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-red-600 selection:text-white pb-20 lg:pb-8 transition-colors ${colors.canvasBg} ${colors.canvasText}`}>
      {/* Accessibility Skip Link */}
      <a
        href="#main-content-viewport"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-red-600 focus:text-white focus:font-bold focus:text-xs focus:shadow-xl"
      >
        {language === 'es' ? 'Saltar al contenido principal' : 'Skip to main content'}
      </a>

      {/* Visual Background: canvas + diagonal split panel + subtle circuit texture */}
      <BackgroundArtwork />

      {/* Mobile Menu Backdrop Overlay (closes menu on outside tap) */}
      {isMobileMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Top Header Bar for Authenticated Users - Fixed at top with dedicated height */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-md transition-colors"
      >
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Brand identity (clickable to go home) */}
            <button
              type="button"
              onClick={() => {
                setCurrentView('home');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 sm:gap-3 text-left cursor-pointer group min-w-0 shrink"
              aria-label="Ir al inicio de Security Urban"
            >
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-red-600 border border-red-400 flex items-center justify-center text-white shadow-lg shadow-red-900/40 shrink-0 group-hover:scale-105 transition-transform">
                <SecurityUrbanLogo className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`font-extrabold tracking-wider text-sm min-[360px]:text-base sm:text-lg font-['Rajdhani'] truncate ${colors.headerBrandText}`}>
                    SECURITY URBAN
                  </span>
                  <span className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap shrink-0 ${colors.badgeLocationBg} ${colors.badgeLocationText} ${colors.badgeLocationBorder}`}>
                    COMUNA 8
                  </span>
                </div>
                <p className={`text-[11px] sm:text-xs font-medium hidden md:block truncate ${colors.headerSubText}`}>
                  {t('appTagline')}
                </p>
              </div>
            </button>

            {/* Right Header Controls: Status Badge, User Profile Menu, Language switcher, Theme toggle, Mobile Menu button */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Informative Status Badge (distinct from user profile menu; visible on extra wide screens) */}
              <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 shadow-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('nodeBadge')}</span>
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

              {/* Language Selector (Hidden on ultra-small screens where it lives inside the mobile menu) */}
              <div
                role="group"
                aria-label={language === 'es' ? 'Selector de idioma' : 'Language selector'}
                className={`hidden sm:inline-flex relative items-center rounded-full p-1 text-xs border shadow-xs ${colors.headerBg} ${colors.headerBorder} shrink-0`}
              >
                <button
                  type="button"
                  onClick={() => setLanguage('es')}
                  aria-pressed={language === 'es'}
                  className={`px-2.5 py-1 rounded-full font-bold transition cursor-pointer min-h-[30px] ${
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
                  aria-pressed={language === 'en'}
                  className={`px-2.5 py-1 rounded-full font-bold transition cursor-pointer min-h-[30px] ${
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
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-nav-drawer"
                className={`lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition cursor-pointer shadow-xs ${colors.headerBg} ${colors.headerBorder} hover:border-red-600 shrink-0`}
                aria-label={isMobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-red-600" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                )}
              </button>
            </div>
          </div>

          {/* Full Authenticated Navigation Menu (Desktop: clean pill bar; Mobile/Tablet: active location bar + collapsible drawer) */}
          <nav
            aria-label="Navegación principal de Security Urban"
            className="w-full"
          >
            {/* Desktop full navigation bar: balanced, accessible, with clear active state */}
            <div className={`hidden lg:flex items-center justify-between p-1.5 rounded-2xl border shadow-xs backdrop-blur-md transition-all ${colors.headerBg} ${colors.headerBorder}`}>
              <div className="flex flex-wrap items-center justify-center gap-1 xl:gap-1.5 2xl:gap-2.5 w-full">
                {navMenuItems.map((item) => {
                  const isActive = currentView === item.id;
                  const isAlertsItem = item.id === 'alerts';
                  const showLivePulse = isAlertsItem && hasLiveAlertPulse;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => setCurrentView(item.id)}
                      className={`px-3 py-2 xl:px-3.5 2xl:px-4 rounded-xl font-semibold text-xs xl:text-sm tracking-normal flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap relative group shrink-0 min-h-[40px] ${
                        isActive
                          ? 'bg-red-600 text-white shadow-xs'
                          : `${colors.tabInactiveText} hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white`
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform relative ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : showLivePulse
                            ? 'bg-red-500/20 text-red-600 dark:text-red-400 ring-1 ring-red-500'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        <span>{item.icon}</span>
                        {showLivePulse && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        )}
                      </span>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 rounded-md font-mono text-2xs font-bold tracking-wider ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {showLivePulse && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-mono text-2xs font-bold tracking-wider shadow-2xs">
                          {language === 'es' ? 'NUEVA' : 'NEW'}
                        </span>
                      )}

                      {/* Active highlight indicator bar */}
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-amber-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contextual Location Recognition Bar (Mobile/Tablet always visible; Desktop visible on subviews like Perfil/Ajustes) */}
            <div
              aria-label={language === 'es' ? 'Ubicación actual en la aplicación' : 'Current location in app'}
              className={`${
                currentView === 'settings' || currentView === 'profile' ? 'flex' : 'flex lg:hidden'
              } items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                theme === 'dark'
                  ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                  : 'bg-slate-100/90 border-slate-200/90 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className="font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <HomeIcon className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>{t('navHome')}</span>
                </button>
                {currentView !== 'home' && (
                  <>
                    <span className="text-slate-400 dark:text-slate-600 select-none">/</span>
                    <span
                      aria-current="page"
                      className="font-bold text-red-600 dark:text-red-400 truncate"
                    >
                      {currentView === 'settings'
                        ? t('navSettings')
                        : currentView === 'profile'
                        ? t('viewMyProfile')
                        : navMenuItems.find((i) => i.id === currentView)?.label || t('navHome')}
                    </span>
                  </>
                )}
              </div>

              {currentView !== 'home' ? (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-2xs font-mono font-bold text-red-600 dark:text-red-400 hover:underline shrink-0 cursor-pointer"
                >
                  {language === 'es' ? '← Volver al inicio' : '← Back to home'}
                </button>
              ) : (
                <span className="text-2xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{language === 'es' ? 'Vista Principal' : 'Main View'}</span>
                </span>
              )}
            </div>

            {/* Mobile Collapsible Navigation Menu */}
            {isMobileMenuOpen && (
              <div
                id="mobile-nav-drawer"
                role="dialog"
                aria-label={language === 'es' ? 'Menú de navegación móvil' : 'Mobile navigation menu'}
                className={`lg:hidden absolute top-full left-2 right-2 sm:left-4 sm:right-4 z-50 flex flex-col p-3.5 sm:p-4 rounded-2xl border shadow-xl backdrop-blur-xl mt-2 space-y-2.5 max-h-[calc(100dvh-82px)] overflow-y-auto overscroll-contain ${colors.headerBg} ${colors.headerBorder}`}
              >
                <div className="text-xs font-mono font-bold text-red-600 dark:text-red-400 px-2 py-1 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span>{language === 'es' ? 'MENÚ DE NAVEGACIÓN • COMUNA 8' : 'NAVIGATION MENU • COMUNA 8'}</span>
                  {/* Mobile language selector for <640px screens */}
                  <div className="flex sm:hidden items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-full">
                    <button
                      type="button"
                      onClick={() => setLanguage('es')}
                      className={`px-2.5 py-1 rounded-full text-2xs font-bold min-h-[28px] cursor-pointer ${
                        language === 'es' ? 'bg-red-600 text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      ES
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`px-2.5 py-1 rounded-full text-2xs font-bold min-h-[28px] cursor-pointer ${
                        language === 'en' ? 'bg-red-600 text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                  {navMenuItems.map((item) => {
                    const isActive = currentView === item.id;
                    const isAlertsItem = item.id === 'alerts';
                    const showLivePulse = isAlertsItem && hasLiveAlertPulse;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          setCurrentView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`px-3.5 py-3 rounded-xl font-semibold text-sm tracking-normal flex items-center gap-3 transition-all cursor-pointer text-left min-h-[48px] ${
                          isActive
                            ? 'bg-red-600 text-white shadow-xs'
                            : `${colors.tabInactiveText} hover:bg-slate-100 dark:hover:bg-slate-800`
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : showLivePulse
                              ? 'bg-red-500/20 text-red-600 dark:text-red-400 ring-1 ring-red-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span>{item.icon}</span>
                        </span>
                        <span className="truncate font-bold">{item.label}</span>
                        {item.badge && (
                          <span className={`ml-auto px-2 py-0.5 rounded-md font-mono text-2xs font-bold tracking-wider ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {showLivePulse && (
                          <span className="ml-auto px-2 py-0.5 rounded-full bg-red-600 text-white font-mono text-2xs font-bold">
                            {language === 'es' ? 'NUEVA' : 'NEW'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleViewProfile();
                      }}
                      className={`py-2.5 px-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer min-h-[44px] truncate ${
                        currentView === 'profile'
                          ? 'border-red-600 bg-red-600/10 text-red-600 dark:text-red-400'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{t('viewMyProfile')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenSettings();
                      }}
                      className={`py-2.5 px-2 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer min-h-[44px] truncate ${
                        currentView === 'settings'
                          ? 'border-red-600 bg-red-600/10 text-red-600 dark:text-red-400'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{t('navSettings')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleSignOut();
                      }}
                      className="py-2.5 px-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 font-semibold text-xs text-red-700 dark:text-red-400 flex items-center justify-center gap-1 cursor-pointer min-h-[44px] truncate"
                    >
                      <span className="truncate">{t('signOut')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Viewport for Authenticated User - Padded below fixed top bar */}
      <main
        id="main-content-viewport"
        style={{ paddingTop: headerHeight ? `${headerHeight + 20}px` : undefined }}
        className={`relative w-full ${currentView === 'riskMap' ? 'max-w-[1720px]' : 'max-w-[1440px]'} mx-auto px-3 sm:px-6 lg:px-8 ${headerHeight ? '' : 'pt-20 sm:pt-24 lg:pt-36'} pb-6 sm:pb-12 flex flex-col items-stretch justify-start grow`}
      >
        {!currentUser.emailVerified && !isEmailVerified ? (
          <EmailVerificationView
            user={currentUser}
            onVerificationSuccess={() => {
              setIsEmailVerified(true);
              setCurrentUser(auth.currentUser || currentUser);
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

      {/* Mobile & Tablet Bottom Quick-Access Navigation Bar (lg:hidden) */}
      <nav
        aria-label={language === 'es' ? 'Barra de navegación inferior móvil' : 'Mobile bottom navigation bar'}
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl shadow-lg ${colors.headerBg} ${colors.headerBorder}`}
      >
        <div className="max-w-xl mx-auto px-1.5 py-1 grid grid-cols-6 gap-0.5">
          {[
            { id: 'home' as NavTabId, shortLabel: language === 'es' ? 'Inicio' : 'Home', icon: <HomeIcon className="w-4 h-4" /> },
            { id: 'dashboard' as NavTabId, shortLabel: language === 'es' ? 'Panel' : 'Panel', icon: <Activity className="w-4 h-4" /> },
            { id: 'riskMap' as NavTabId, shortLabel: language === 'es' ? 'Mapa' : 'Map', icon: <Map className="w-4 h-4" /> },
            { id: 'safeRoutes' as NavTabId, shortLabel: language === 'es' ? 'Rutas' : 'Routes', icon: <Route className="w-4 h-4" /> },
            { id: 'alerts' as NavTabId, shortLabel: language === 'es' ? 'Alertas' : 'Alerts', icon: <Bell className="w-4 h-4" /> },
          ].map((tab) => {
            const isActive = currentView === tab.id && !isMobileMenuOpen;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setCurrentView(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative ${
                  isActive
                    ? 'text-red-600 dark:text-red-400 font-bold bg-red-500/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                }`}
              >
                {tab.icon}
                <span className="text-2xs leading-tight truncate max-w-full">{tab.shortLabel}</span>
                {isActive && (
                  <span className="absolute top-0.5 w-4 h-0.5 rounded-full bg-red-600 dark:bg-red-400" />
                )}
              </button>
            );
          })}

          {/* More / Full Drawer Trigger */}
          <button
            type="button"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={`min-h-[48px] py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer relative ${
              isMobileMenuOpen || ['tacticalSupport', 'userManagement', 'myReports', 'settings', 'profile'].includes(currentView)
                ? 'text-red-600 dark:text-red-400 font-bold bg-red-500/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="text-2xs leading-tight truncate max-w-full">
              {language === 'es' ? 'Más' : 'More'}
            </span>
          </button>
        </div>
      </nav>

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
