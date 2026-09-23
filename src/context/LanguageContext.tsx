import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types/auth';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

export type TranslationKey =
  | 'appName'
  | 'appTagline'
  | 'locationBadge'
  | 'statusOnline'
  | 'statusSecure'
  | 'versionBadge'
  | 'loginTab'
  | 'registerTab'
  | 'loginTitle'
  | 'loginSubtitle'
  | 'registerTitle'
  | 'registerSubtitle'
  | 'emailLabel'
  | 'emailPlaceholder'
  | 'passwordLabel'
  | 'passwordPlaceholder'
  | 'confirmPasswordLabel'
  | 'confirmPasswordPlaceholder'
  | 'fullNameLabel'
  | 'fullNamePlaceholder'
  | 'forgotPasswordLink'
  | 'loginButton'
  | 'registerButton'
  | 'haveAccount'
  | 'dontHaveAccount'
  | 'termsAgreement'
  | 'rememberMe'
  | 'loading'
  | 'invalidCredentials'
  | 'tooManyAttempts'
  | 'lockoutWarning'
  | 'lockoutTimeRemaining'
  | 'captchaLabel'
  | 'captchaVerified'
  | 'captchaRequired'
  | 'pwCriteriaTitle'
  | 'pwMinLength'
  | 'pwUppercase'
  | 'pwNumber'
  | 'pwStrengthWeak'
  | 'pwStrengthMedium'
  | 'pwStrengthStrong'
  | 'pwMismatch'
  | 'forgotModalTitle'
  | 'forgotModalDesc'
  | 'sendResetEmail'
  | 'resetEmailSent'
  | 'backToLogin'
  | 'cancel'
  | 'verificationPendingTitle'
  | 'verificationPendingDesc'
  | 'verificationCheckStatus'
  | 'verificationResend'
  | 'verificationResentSuccess'
  | 'verificationStillPending'
  | 'signOut'
  | 'welcomePortalTitle'
  | 'welcomePortalSubtitle'
  | 'configFirebaseBtn'
  | 'configFirebaseTitle'
  | 'configFirebaseDesc'
  | 'saveConfig'
  | 'configSaved'
  | 'logsDrawerTitle'
  | 'clearLogs'
  | 'firebaseConnected'
  | 'firebaseNotConfigured'
  | 'firebaseSetupPrompt'
  | 'heroTagline'
  | 'heroDescription'
  | 'exploreMap'
  | 'goToDashboard'
  | 'quickAccessTitle'
  | 'quickAccessSubtitle'
  | 'cardPreventionTitle'
  | 'cardPreventionDesc'
  | 'cardAlertsTitle'
  | 'cardAlertsDesc'
  | 'cardRoutesTitle'
  | 'cardRoutesDesc'
  | 'cardCommunityTitle'
  | 'cardCommunityDesc'
  | 'badgeMonitoring'
  | 'badgeComuna8'
  | 'badgeActiveNet'
  | 'navHome'
  | 'navDashboard'
  | 'navRiskMap'
  | 'navSafeRoutes'
  | 'navTacticalSupport'
  | 'navUserManagement'
  | 'navMyReports'
  | 'navAlerts'
  | 'navLogin'
  | 'navRegister'
  | 'welcomeBack'
  | 'sessionUser'
  | 'viewMyProfile'
  | 'settingsAndConfig'
  | 'userRoleCitizen'
  | 'userRoleOperator'
  | 'userRoleAdmin'
  | 'accountStatusVerified'
  | 'accountSuspendedError'
  | 'footerInitiative';

const translations: Record<Language, Record<TranslationKey, string>> = {
  es: {
    appName: 'SECURITY URBAN',
    appTagline: 'Monitoreo y prevención inteligente • Comuna 8 de Medellín',
    locationBadge: '📍 Comuna 8 - Medellín',
    statusOnline: '● Enlace Seguro',
    statusSecure: '● SSL 256-bit',
    versionBadge: 'v1.0 • SENATIC 2026',
    loginTab: 'Iniciar sesión',
    registerTab: 'Crear cuenta',
    loginTitle: 'INICIAR SESIÓN',
    loginSubtitle: 'Acceso seguro al sistema de monitoreo comunitario',
    registerTitle: 'REGISTRO DE USUARIO',
    registerSubtitle: 'Únete a la red ciudadana de protección comunal',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'ejemplo@correo.com',
    passwordLabel: 'Contraseña de seguridad',
    passwordPlaceholder: 'Ingresa tu contraseña',
    confirmPasswordLabel: 'Confirmar contraseña',
    confirmPasswordPlaceholder: 'Repite tu contraseña',
    fullNameLabel: 'Nombre completo',
    fullNamePlaceholder: 'Nombre y apellido',
    forgotPasswordLink: '¿Olvidaste tu contraseña?',
    loginButton: 'Ingresar a Security Urban',
    registerButton: 'Completar Registro',
    haveAccount: '¿Ya tienes una cuenta registrada?',
    dontHaveAccount: '¿Aún no tienes cuenta comunitaria?',
    termsAgreement: 'Acepto los términos de uso y el tratamiento de datos para la seguridad comunal',
    rememberMe: 'Recordar este equipo seguro',
    loading: 'Verificando credenciales...',
    invalidCredentials: 'El correo electrónico o la contraseña ingresada son incorrectos.',
    tooManyAttempts: 'Acceso bloqueado temporalmente por exceder 5 intentos fallidos.',
    lockoutWarning: 'Por razones de seguridad, espera a que termine el temporizador.',
    lockoutTimeRemaining: 'Tiempo restante de bloqueo:',
    captchaLabel: 'Verificación de seguridad: No soy un robot',
    captchaVerified: 'Identidad humana verificada con éxito',
    captchaRequired: 'Por favor, marca la casilla de seguridad antes de continuar.',
    pwCriteriaTitle: 'Requisitos de seguridad de la contraseña:',
    pwMinLength: 'Mínimo 8 caracteres',
    pwUppercase: 'Al menos una letra mayúscula',
    pwNumber: 'Al menos un número',
    pwStrengthWeak: 'Nivel: Débil',
    pwStrengthMedium: 'Nivel: Medio',
    pwStrengthStrong: 'Nivel: Robusta y Segura',
    pwMismatch: 'Las contraseñas ingresadas no coinciden.',
    forgotModalTitle: 'Recuperar Contraseña',
    forgotModalDesc: 'Ingresa tu correo registrado y te enviaremos un enlace oficial de restablecimiento a través de Firebase.',
    sendResetEmail: 'Enviar enlace de recuperación',
    resetEmailSent: 'Si la cuenta existe, se ha enviado un correo con las instrucciones de recuperación.',
    backToLogin: 'Volver al inicio de sesión',
    cancel: 'Cancelar',
    verificationPendingTitle: 'Confirma tu correo electrónico',
    verificationPendingDesc: 'Hemos enviado un mensaje de verificación a tu dirección de correo electrónico. Por políticas de seguridad de la Comuna 8, debes verificar tu cuenta antes de acceder al panel de alertas.',
    verificationCheckStatus: 'Ya lo confirmé, comprobar estado',
    verificationResend: 'Reenviar correo de verificación',
    verificationResentSuccess: 'Correo de verificación reenviado exitosamente.',
    verificationStillPending: 'El correo aún no ha sido verificado. Por favor revisa tu bandeja de entrada o spam.',
    signOut: 'Cerrar sesión',
    welcomePortalTitle: '¡Bienvenido a Security Urban!',
    welcomePortalSubtitle: 'Tu cuenta ha sido verificada y está autorizada para la red de prevención de la Comuna 8.',
    configFirebaseBtn: 'Configurar Firebase',
    configFirebaseTitle: 'Configuración de Firebase Auth',
    configFirebaseDesc: 'Configura las credenciales de tu proyecto de Firebase. Los cambios se guardan localmente para este entorno.',
    saveConfig: 'Guardar Credenciales',
    configSaved: 'Configuración guardada exitosamente.',
    logsDrawerTitle: 'Logs de Seguridad y Autenticación en Tiempo Real',
    clearLogs: 'Limpiar logs',
    firebaseConnected: 'Conectado a Firebase',
    firebaseNotConfigured: 'Credenciales pendientes de configurar',
    firebaseSetupPrompt: 'Haz clic aquí para ingresar tus credenciales de Firebase o verificar el archivo de entorno.',
    heroTagline: 'Prevenir • Orientar • Proteger',
    heroDescription: 'Plataforma comunitaria de vigilancia inteligente, alerta temprana y corredores seguros para la Comuna 8 de Medellín.',
    exploreMap: 'Explorar Mapa',
    goToDashboard: 'Ir al Panel de Control',
    quickAccessTitle: 'Módulos de Seguridad Ciudadana',
    quickAccessSubtitle: 'Herramientas preventivas activas para la protección de tu comunidad',
    cardPreventionTitle: 'Prevención',
    cardPreventionDesc: 'Anticipa riesgos y zonas de precaución con alertas tempranas y recomendaciones vecinales.',
    cardAlertsTitle: 'Alertas',
    cardAlertsDesc: 'Notificaciones y reportes en tiempo real sobre incidentes, cierres viales o emergencias.',
    cardRoutesTitle: 'Rutas Seguras',
    cardRoutesDesc: 'Mejores opciones de trayecto y corredores iluminados con acompañamiento vecinal.',
    cardCommunityTitle: 'Comunidad',
    cardCommunityDesc: 'Red solidaria de apoyo ciudadano, números de emergencia y frentes barriales organizados.',
    badgeMonitoring: '● Monitoreo 24/7',
    badgeComuna8: '📍 Comuna 8',
    badgeActiveNet: '● Red Activa',
    navHome: 'Inicio',
    navDashboard: 'Panel de control',
    navRiskMap: 'Mapa de riesgo',
    navSafeRoutes: 'Rutas seguras',
    navTacticalSupport: 'Apoyo Táctico',
    navUserManagement: 'Gestión de Usuarios',
    navMyReports: 'Mis Reportes',
    navAlerts: 'Alertas',
    navLogin: 'Iniciar Sesión',
    navRegister: 'Crear Cuenta',
    welcomeBack: 'Bienvenido de nuevo',
    sessionUser: 'Usuario conectado',
    viewMyProfile: 'Ver mi perfil',
    settingsAndConfig: 'Configuración/Ajustes',
    userRoleCitizen: 'Agente Comunal',
    userRoleOperator: 'Operador Táctico',
    userRoleAdmin: 'Administrador',
    accountStatusVerified: 'Verificado',
    accountSuspendedError: 'Tu cuenta ha sido suspendida, contacta al administrador.',
    footerInitiative: 'Iniciativa de Seguridad Comunitaria • Medellín 2026',
  },
  en: {
    appName: 'SECURITY URBAN',
    appTagline: 'Intelligent monitoring and prevention • Comuna 8, Medellín',
    locationBadge: '📍 Comuna 8 - Medellín',
    statusOnline: '● Secure Link',
    statusSecure: '● SSL 256-bit',
    versionBadge: 'v1.0 • SENATIC 2026',
    loginTab: 'Sign In',
    registerTab: 'Sign Up',
    loginTitle: 'SIGN IN',
    loginSubtitle: 'Secure portal for community surveillance & safety',
    registerTitle: 'USER REGISTRATION',
    registerSubtitle: 'Join the community safety and alert network',
    emailLabel: 'Email address',
    emailPlaceholder: 'user@example.com',
    passwordLabel: 'Security password',
    passwordPlaceholder: 'Enter your password',
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    fullNameLabel: 'Full name',
    fullNamePlaceholder: 'First and last name',
    forgotPasswordLink: 'Forgot your password?',
    loginButton: 'Sign In to Security Urban',
    registerButton: 'Complete Registration',
    haveAccount: 'Already have an active account?',
    dontHaveAccount: 'Don\'t have an account yet?',
    termsAgreement: 'I accept the terms of use and data processing for community safety',
    rememberMe: 'Remember this device',
    loading: 'Verifying credentials...',
    invalidCredentials: 'The email address or password entered is incorrect.',
    tooManyAttempts: 'Access temporarily blocked due to 5 consecutive failed attempts.',
    lockoutWarning: 'For security purposes, please wait for the countdown to expire.',
    lockoutTimeRemaining: 'Lockout time remaining:',
    captchaLabel: 'Security check: I am not a robot',
    captchaVerified: 'Human identity verified successfully',
    captchaRequired: 'Please complete the security check before proceeding.',
    pwCriteriaTitle: 'Password security requirements:',
    pwMinLength: 'At least 8 characters',
    pwUppercase: 'At least one uppercase letter',
    pwNumber: 'At least one number',
    pwStrengthWeak: 'Strength: Weak',
    pwStrengthMedium: 'Strength: Medium',
    pwStrengthStrong: 'Strength: Strong & Secure',
    pwMismatch: 'Passwords do not match.',
    forgotModalTitle: 'Reset Password',
    forgotModalDesc: 'Enter your registered email address and we will dispatch an official Firebase password reset link.',
    sendResetEmail: 'Send recovery link',
    resetEmailSent: 'If an account exists, a password reset link has been dispatched.',
    backToLogin: 'Back to Sign In',
    cancel: 'Cancel',
    verificationPendingTitle: 'Verify Your Email Address',
    verificationPendingDesc: 'We sent a verification link to your email address. In accordance with Comuna 8 security protocols, you must confirm your email before accessing the live dashboard.',
    verificationCheckStatus: 'I verified, check status',
    verificationResend: 'Resend verification email',
    verificationResentSuccess: 'Verification email resent successfully.',
    verificationStillPending: 'Your email has not been verified yet. Please check your inbox and spam folder.',
    signOut: 'Sign Out',
    welcomePortalTitle: 'Welcome to Security Urban!',
    welcomePortalSubtitle: 'Your account is verified and authorized for the Comuna 8 safety network.',
    configFirebaseBtn: 'Configure Firebase',
    configFirebaseTitle: 'Firebase Auth Settings',
    configFirebaseDesc: 'Enter your Firebase project credentials. Values are persisted locally for this environment.',
    saveConfig: 'Save Credentials',
    configSaved: 'Configuration saved successfully.',
    logsDrawerTitle: 'Real-Time Security & Auth Audit Logs',
    clearLogs: 'Clear logs',
    firebaseConnected: 'Connected to Firebase',
    firebaseNotConfigured: 'Firebase keys pending configuration',
    firebaseSetupPrompt: 'Click here to input your Firebase credentials or check environment variables.',
    heroTagline: 'Prevent • Guide • Protect',
    heroDescription: 'Community platform for smart surveillance, early alerts, and safe corridors across Comuna 8, Medellín.',
    exploreMap: 'Explore Map',
    goToDashboard: 'Go to Dashboard',
    quickAccessTitle: 'Citizen Safety Modules',
    quickAccessSubtitle: 'Active preventive tools for community security & protection',
    cardPreventionTitle: 'Prevention',
    cardPreventionDesc: 'Anticipate risks and hazard zones with early warnings and neighborhood recommendations.',
    cardAlertsTitle: 'Alerts',
    cardAlertsDesc: 'Real-time notifications and incident reports, road closures, or local emergencies.',
    cardRoutesTitle: 'Safe Routes',
    cardRoutesDesc: 'Best travel options, well-lit corridors, and 24/7 monitored quadrants.',
    cardCommunityTitle: 'Community',
    cardCommunityDesc: 'Solidarity network for citizen support, emergency numbers, and organized neighborhood groups.',
    badgeMonitoring: '● 24/7 Monitoring',
    badgeComuna8: '📍 Comuna 8',
    badgeActiveNet: '● Active Network',
    navHome: 'Home',
    navDashboard: 'Dashboard',
    navRiskMap: 'Risk Map',
    navSafeRoutes: 'Safe Routes',
    navTacticalSupport: 'Tactical Support',
    navUserManagement: 'User Management',
    navMyReports: 'My Reports',
    navAlerts: 'Alerts',
    navLogin: 'Sign In',
    navRegister: 'Sign Up',
    welcomeBack: 'Welcome back',
    sessionUser: 'Connected user',
    viewMyProfile: 'View my profile',
    settingsAndConfig: 'Settings & Preferences',
    userRoleCitizen: 'Community Agent',
    userRoleOperator: 'Tactical Operator',
    userRoleAdmin: 'Administrator',
    accountStatusVerified: 'Verified',
    accountSuspendedError: 'Your account has been suspended, please contact the administrator.',
    footerInitiative: 'Community Security Initiative • Medellín 2026',
  },
};

const LANG_STORAGE_KEY = 'security_urban_lang_pref';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'es' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'es'; // Spanish default for Medellín project
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch (err) {
      console.warn('[Security Urban Lang] Failed to persist language:', err);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.es[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
