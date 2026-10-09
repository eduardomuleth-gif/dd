import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Language } from '../types/auth';

export type TranslationKey = string;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
  translateCategory: (category: string) => string;
  translateStatus: (status: string) => string;
  translatePriority: (priority: string) => string;
  translateRole: (role: string) => string;
  translateDay: (day: string) => string;
  translateRisk: (risk: string) => string;
  translateService: (service: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Brand & General
    appName: 'SECURITY URBAN',
    appTagline: 'Monitoreo y prevención inteligente • Comuna 8 de Medellín',
    locationBadge: '📍 Comuna 8 - Medellín',
    statusOnline: '● Enlace Seguro',
    statusSecure: '● SSL 256-bit',
    versionBadge: 'v1.0 • SENATIC 2026',
    nodeBadge: 'COMUNA 8 • NODO SEGURO',
    footerInitiative: 'Iniciativa de Seguridad Comunitaria • Medellín 2026',
    allRightsReserved: 'Todos los derechos reservados',
    cancel: 'Cancelar',
    save: 'Guardar',
    close: 'Cerrar',
    back: 'Volver',
    search: 'Buscar',
    loading: 'Cargando información...',
    error: 'Error',
    success: 'Éxito',
    confirm: 'Confirmar',
    filterAll: 'Todos',
    viewDetails: 'Ver detalles',
    actions: 'Acciones',
    status: 'Estado',
    priority: 'Prioridad',
    date: 'Fecha',
    sector: 'Sector',
    description: 'Descripción',
    title: 'Título',
    address: 'Dirección',
    category: 'Categoría',

    // Navigation Items
    navHome: 'Inicio',
    navDashboard: 'Panel de Control',
    navRiskMap: 'Mapa de Riesgo',
    navSafeRoutes: 'Rutas Seguras',
    navTacticalSupport: 'Apoyo Táctico',
    navUserManagement: 'Gestión de Usuarios',
    navMyReports: 'Mis Reportes',
    navAlerts: 'Alertas',
    navLogin: 'Iniciar Sesión',
    navRegister: 'Crear Cuenta',
    exploreMap: 'Explorar Mapa',
    goToDashboard: 'Ir al Panel de Control',
    viewMyProfile: 'Mi Perfil',
    settingsAndConfig: 'Configuración / Ajustes',
    signOut: 'Cerrar Sesión',
    welcomeBack: 'Bienvenido de nuevo',
    sessionUser: 'Usuario conectado',

    // Auth & Login / Register
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
    invalidCredentials: 'La contraseña es incorrecta. Verifica tus datos e inténtalo nuevamente.',
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
    verificationPendingTitle: 'Confirma tu correo electrónico',
    verificationPendingDesc: 'Hemos enviado un mensaje de verificación a tu dirección de correo electrónico. Por políticas de seguridad de la Comuna 8, debes verificar tu cuenta antes de acceder al panel de alertas.',
    verificationCheckStatus: 'Ya lo confirmé, comprobar estado',
    verificationResend: 'Reenviar correo de verificación',
    verificationResentSuccess: 'Correo de verificación reenviado exitosamente.',
    verificationStillPending: 'El correo aún no ha sido verificado. Por favor revisa tu bandeja de entrada o spam.',

    // Roles & User Statuses
    userRoleCitizen: 'Agente Comunal',
    userRoleOperator: 'Operador Táctico',
    userRoleAdmin: 'Administrador',
    accountStatusVerified: 'Verificado',
    accountStatusPending: 'Pendiente',
    accountStatusSuspended: 'Suspendido',
    accountStatusActive: 'Activo',
    accountSuspendedError: 'Tu cuenta ha sido suspendida, contacta al administrador.',

    // Home Screen
    heroTagline: 'Prevenir • Orientar • Proteger',
    heroDescription: 'Plataforma comunitaria de vigilancia inteligente, alerta temprana y corredores seguros para la Comuna 8 de Medellín.',
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
    viewFullMap: 'Ver mapa interactivo',
    viewSectorArrow: 'VER SECTOR →',
    viewReportsArrow: 'VER REPORTES →',
    planRouteArrow: 'TRAZAR RUTA →',
    requestSupportArrow: 'PEDIR APOYO →',

    // Dashboard Screen
    dashboardTitle: 'Centro de Control & Métricas',
    dashboardSubtitle: 'Monitoreo de actividad, incidentes verificados y respuesta táctica comunal',
    dashboardSubheader: 'PANEL DE MANDO // COMUNA 8',
    reportIncidentBtn: 'Reportar Incidente',
    tacticalMapBtn: 'Mapa Táctico',
    metricActiveAlerts: 'Alertas activas verificadas',
    metricActiveAlertsDesc: 'Aprobadas por administración',
    metricMonitoredSectors: 'Sectores en monitoreo',
    metricMonitoredSectorsDesc: 'Comuna 8 Medellín',
    metricSystemStatus: 'Red de Apoyo Comunal',
    metricSystemStatusDesc: 'Google Maps Platform 24/7',
    metricMyReports: 'Mis reportes registrados',
    metricMyReportsBadge: 'Tus Registros',
    viewMyReportsBtn: 'Ver mis reportes',
    trendTitle: 'TENDENCIA DE INCIDENTES // ÚLTIMOS 7 DÍAS',
    trendSubtitle: 'Reportes verificados y aceptados en Firestore',
    demoSimulationBadge: 'SIMULACIÓN DEMO',
    currentWeekTab: 'Semana actual',
    previousWeekTab: 'Semana anterior',
    noIncidentsThisDay: 'Sin incidentes registrados este día',
    topIncidentSector: 'Sector con más reportes:',
    incidentsCount: 'incidentes',
    incidentCountSingular: 'incidente',
    recentAlertsFeedTitle: 'ALERTAS RECIENTES VERIFICADAS',
    recentAlertsFeedDesc: 'Incidentes en tiempo real validados por la administración comunal',
    viewAllAlertsLink: 'Ver todas las alertas',
    noAlertsDashboard: 'No hay alertas activas en este momento',
    noAlertsDashboardDesc: 'La Comuna 8 no registra incidentes vigentes aprobados en el sistema.',
    quickCall123: 'Línea de Emergencia 123 Medellín',
    quickCall123Desc: 'Acceso directo e inmediato al Centro Automático de Despacho CAD de la Policía Nacional.',

    // Risk Map Screen
    riskMapBadge: 'Módulo Geoespacial // Comuna 8 — Villa Hermosa',
    riskMapProvider: 'Google Maps Platform',
    riskMapTitle: 'Mapa de Riesgo y Prevención',
    riskMapDescription: 'Monitoreo preventivo de sectores, termografía de concentración de riesgo y cuadrantes comunitarios de la Comuna 8 (Villa Hermosa, Medellín).',
    disclaimerTitle: 'Aviso informativo de referencia y transparencia comunitaria:',
    disclaimerText: 'La clasificación y niveles de referencia de los 18 sectores de la Comuna 8 (Villa Hermosa) es orientativa y se basa en dinámicas históricas comunitarias y reportes públicos disponibles. No constituye un diagnóstico exacto por barrio ni una calificación institucional vinculante o estigmatizante sobre los territorios. Para información oficial y actualizada, consulta el',
    siscLinkText: 'SISC de la Alcaldía de Medellín',
    searchPlacesPlaceholder: 'Buscar calle, carrera, barrio o lugar en Medellín...',
    modeHeat: 'Calor',
    modeMarkers: 'Marcadores',
    modeHybrid: 'Híbrida',
    centerGpsBtn: 'GPS',
    locatingGps: 'Localizando...',
    recenterComuna8Btn: 'Centrar en Comuna 8',
    thermalLegendTitle: 'Termografía de Riesgo (Concentración)',
    thermalLow: 'Tránsito / Base',
    thermalMed: 'Moderado',
    thermalHigh: 'Mayor atención',
    sectorExplorerTitle: 'Explorador de Sectores',
    searchSectorPlaceholder: 'Buscar barrio de Comuna 8...',
    filterLevelAll: 'Todos',
    filterLevelHigh: 'Mayor',
    filterLevelModerate: 'Inter.',
    filterLevelCentral: 'Base',
    noSectorsFound: 'No se encontraron sectores que coincidan con la búsqueda.',
    resetFilters: 'Restablecer filtros',
    sectorCardHistoricalDiag: 'Diagnóstico de referencia pública:',
    sectorCardCitizenAdvice: 'Pauta de cuidado para el ciudadano:',
    centerSectorBtn: 'Centrar',
    searchedLocationTitle: 'Búsqueda // Medellín',
    noRiskDataBadge: 'Sin datos de riesgo',
    geolocatedPlaceLabel: 'Lugar geolocalizado:',
    territorialCoverageNotice: 'Nota de cobertura comunitaria:',
    territorialCoverageText: 'Esta ubicación corresponde a un sector de Medellín situado fuera del perímetro focalizado de la Comuna 8 (Villa Hermosa). El mapa muestra el marcador exacto de ubicación.',
    urbanSelfCareNotice: 'Pauta de autocuidado urbano:',
    urbanSelfCareText: 'Utiliza corredores iluminados y vías principales, mantente alerta al entorno y acude al sistema integrado 123 ante cualquier novedad de seguridad o convivencia.',
    selectSectorPlaceholder: 'Selecciona un sector o busca un lugar',
    selectSectorSubPlaceholder: 'Usa el buscador de lugares de Medellín o haz clic en un sector del mapa o explorador para inspeccionar su ficha informativa.',
    monitoredSectorsCount: '18 Sectores Monitoreados',

    // Safe Routes Screen
    safeRoutesBadge: 'Módulo de Navegación // Rutas Seguras Comuna 8',
    safeRoutesTitle: 'Trazador de Rutas y Corredores Seguros',
    safeRoutesDescription: 'Calcula trayectos optimizados priorizando vías principales, iluminación pública, proximidad a CAIs policiales y sectores de bajo riesgo en Medellín.',
    routeParamsTitle: 'Parámetros de trayecto',
    realSafePlacesTitle: 'Elegir ubicaciones',
    suggestedRoutesTitle: 'Rutas disponibles para elegir',
    routeOriginLabel: 'Dirección o punto de origen',
    routeDestinationLabel: 'Dirección o punto de destino',
    customPointPlaceholder: 'Escribe una dirección o elige un punto en Medellín...',
    modeWalking: 'A pie',
    modeDriving: 'En auto',
    modeBicycling: 'En bici',
    calculate: 'Trazar ruta',
    calculating: 'Trazando...',
    calculateRouteBtn: 'Calcular Ruta Segura',
    calculatingRoute: 'Calculando mejor trayecto...',
    routeOptionsTitle: 'Opciones de Trayecto Calculadas',
    routeOptionSafe: 'Ruta Más Segura (Recomendada)',
    routeOptionDirect: 'Ruta Más Directa',
    estimatedTime: 'Tiempo estimado',
    distance: 'Distancia',
    securityScore: 'Índice de Seguridad',
    originShort: 'Origen',
    destShort: 'Destino',
    readyToStartRoute: '¿Listo para iniciar el recorrido por la ruta seleccionada?',
    readyToStartRouteDesc: 'Activa el seguimiento en vivo para recibir instrucciones paso a paso hasta tu destino.',
    startLiveTracking: 'Iniciar Acompañamiento en Ruta',
    stopLiveTracking: 'Finalizar Ruta',
    userOnRouteBadge: 'Usuario en ruta guiada',
    safePlacesTitle: 'Elegir ubicaciones',
    safePlacesFilterPolice: 'CAI / Policía',
    safePlacesFilterHealth: 'Salud',
    safePlacesFilterEducation: 'Colegios',
    safePlacesFilterParks: 'Parques',

    // Tactical Support Screen
    tacticalBadge: 'Centro de Respuesta Inmediata // SOS Comunal',
    tacticalTitle: 'Apoyo Táctico y Asistencia de Emergencia',
    tacticalDescription: 'Línea de auxilio coordinada con el 123 de Medellín, red de cuadrantes policiales de la Comuna 8 y unidades móviles de rescate.',
    sosButtonLabel: 'BOTÓN SOS // ALERTA DE PÁNICO',
    sosButtonDesc: 'Presiona para emitir una alerta prioritaria de emergencia georreferenciada.',
    sosConfirmTitle: '¿Confirmar Alerta SOS de Emergencia?',
    sosConfirmDesc: 'Se notificará al centro de monitoreo comunal y se compartirán tus coordenadas GPS actuales.',
    sosDispatched: '¡Alerta SOS despachada con éxito!',
    tacticalUnitsTitle: 'Unidades Tácticas y Cuadrantes Policiales',
    categoryPolice: 'Policía Nacional',
    categoryAmbulance: 'Ambulancia / Salud',
    categoryFire: 'Cuerpo de Bomberos',
    unitCallBtn: 'Llamar a la Unidad',
    unitDispatchBtn: 'Despachar Apoyo',
    dispatchSimulationActive: 'Simulación de despacho en curso hacia tu posición...',
    etaLabel: 'Tiempo estimado de llegada (ETA):',
    tacticalHistoryTitle: 'Historial de Asistencias Solicitadas',
    noTacticalHistory: 'No hay solicitudes de auxilio registradas en esta sesión.',

    // Alerts Screen
    alertsBadge: 'CENTRO DE MONITOREO 24/7 // COMUNA 8',
    alertsTitle: 'Centro de Alertas Comunitarias',
    alertsVerifiedBadge: 'VERIFICADO',
    filterCategoryAll: 'Todas las categorías',
    noAlertsFound: 'No hay alertas comunitarias activas en este momento.',
    noAlertsFoundDesc: 'La Comuna 8 no cuenta con novedades críticas verificadas vigentes. Si presencias una situación que deba ser atendida, genera un nuevo reporte para su validación.',
    createNewReportBtn: 'Crear Nuevo Reporte',
    verificationNotice: 'Este centro muestra exclusivamente incidentes verificados y aprobados por la mesa de administración de Security Urban en la Comuna 8. Los reportes pendientes de revisión no se publican aquí para prevenir desinformación.',

    // My Reports & Admin Screen
    myReportsBadge: 'REGISTROS CIUDADANOS // COMUNA 8',
    myReportsTitle: 'Mis Reportes de Seguridad',
    myReportsTab: 'Mis Reportes Registrados',
    adminReviewTab: 'Panel de Verificación Admin',
    pendingVerificationBadge: 'PENDIENTES',
    searchReportsPlaceholder: 'Buscar por título exacto, categoría, sector o descripción...',
    statusAll: 'Todos los estados',
    statusPending: 'Pendientes',
    statusApproved: 'Aceptados / Aprobados',
    statusRejected: 'Rechazados',
    statusInProgress: 'En Proceso',
    statusResolved: 'Resueltos',
    noReportsFound: 'No se encontraron reportes con los filtros seleccionados.',
    noReportsFoundDesc: 'Puedes crear un nuevo reporte ciudadano para alertar sobre novedades en tu barrio.',
    adminApproveBtn: 'Aprobar Reporte',
    adminRejectBtn: 'Rechazar Reporte',
    adminRejectReasonPlaceholder: 'Motivo del rechazo (ej. falta de evidencia, duplicado, broma)...',
    confirmApproveReport: '¿Confirmar aprobación y publicación pública de esta alerta?',
    confirmRejectReport: '¿Confirmar rechazo de este reporte?',
    editReportTitle: 'Editar Título',
    deleteReport: 'Eliminar Reporte',

    // Create Report Modal
    createReportModalTitle: 'Reportar Nuevo Incidente Ciudadano',
    createReportModalDesc: 'Tu reporte será revisado por la administración para su validación en el mapa y alertas de la Comuna 8.',
    reportTitleLabel: 'Título o Asunto Breve',
    reportTitlePlaceholder: 'Ej. Foco de poca iluminación en la cancha',
    reportCategoryLabel: 'Tipo de Incidente / Categoría',
    reportSectorLabel: 'Barrio / Sector de la Comuna 8',
    reportAddressLabel: 'Dirección o Referencia Específica (Opcional)',
    reportAddressPlaceholder: 'Ej. Calle 56 con Carrera 28, cerca a la tienda',
    reportDescriptionLabel: 'Descripción Detallada de los Hechos',
    reportDescriptionPlaceholder: 'Describe la situación, si hay personas afectadas, vehículos involucrados o sugerencias preventivas...',
    reportPriorityLabel: 'Nivel de Prioridad Estimado',
    submitReportBtn: 'Enviar Reporte para Verificación',
    submittingReport: 'Enviando reporte...',
    reportCreatedSuccess: 'Reporte registrado exitosamente. Será evaluado por el equipo de seguridad.',

    // User Management Screen
    userManagementBadge: 'ADMINISTRACIÓN DEL SISTEMA // COMUNA 8',
    userManagementTitle: 'Gestión de Usuarios y Roles',
    userManagementDesc: 'Administra los accesos comunitarios, asigna credenciales y audita los perfiles registrados en la red.',
    totalUsersStat: 'Total Usuarios',
    activeUsersStat: 'Usuarios Activos',
    suspendedUsersStat: 'Cuentas Suspendidas',
    newThisWeekStat: 'Nuevos esta semana',
    searchUsersPlaceholder: 'Buscar usuario por nombre o correo electrónico...',
    filterRoleAll: 'Todos los roles',
    filterStatusAll: 'Todos los estados',
    colUser: 'Usuario / Identidad',
    colRole: 'Rol Comunitario',
    colSector: 'Sector Habitual',
    colStatus: 'Estado de Cuenta',
    colRegistrationDate: 'Registro',
    colActions: 'Acciones',
    changeRoleBtn: 'Cambiar Rol',
    suspendUserBtn: 'Suspender Cuenta',
    activateUserBtn: 'Reactivar Cuenta',
    userRoleCitizenDesc: 'Acceso para reportar incidentes, consultar mapa de riesgo y solicitar rutas seguras.',
    userRoleOperatorDesc: 'Acceso para atender alertas SOS, monitorear cámaras comunitarias y despachar unidades.',
    userRoleAdminDesc: 'Acceso total para validar reportes, gestionar usuarios y configurar parámetros de la plataforma.',

    // Settings Screen
    settingsTitle: 'Configuración y Preferencias',
    settingsSubtitle: 'Personaliza tu experiencia de usuario, seguridad de la cuenta y parámetros de alerta',
    sectionProfile: 'Perfil de Usuario',
    sectionPreferences: 'Preferencias & Tema',
    sectionSecurity: 'Seguridad de Cuenta',
    sectionPrivacy: 'Privacidad de Datos',
    sectionAbout: 'Acerca del Proyecto',
    sectionDanger: 'Zona de Seguridad Crítica',
    themeModeLabel: 'Modo de Visualización (Claro / Oscuro)',
    themeModeDesc: 'Alterna entre el tema visual claro de alto contraste y el tema táctico oscuro.',
    languageSelectLabel: 'Idioma de la Plataforma (ES / EN)',
    languageSelectDesc: 'Cambia todos los textos y datos de la aplicación entre español e inglés.',
    notifPushLabel: 'Notificaciones Push de Alertas',
    notifPushDesc: 'Recibe notificaciones inmediatas cuando ocurran incidentes graves en tu sector.',
    notifReportsLabel: 'Actualizaciones de mis reportes',
    notifReportsDesc: 'Notifícame cuando un reporte enviado sea aprobado, rechazado o investigado.',
    notifTacticalLabel: 'Alertas de Apoyo Táctico',
    notifTacticalDesc: 'Avisos sobre simulacros y movilizaciones de seguridad comunitaria.',
    saveSettingsBtn: 'Guardar Preferencias',
    settingsSavedSuccess: 'Preferencias guardadas exitosamente.',

    // Incident Categories
    catSuspiciousPerson: 'Sujeto sospechoso',
    catStreetRobbery: 'Robo a persona',
    catBrokenStreetlight: 'Luminaria dañada',
    catTrafficAccident: 'Accidente de tránsito',
    catDebrisDumping: 'Relleno sanitario / escombros',
    catPhysicalFight: 'Violencia / Riña',
    catRoadClosure: 'Cierre vial o derrumbe',
    catGeneralAlert: 'Alerta comunitaria general',
    catDrugUse: 'Consumo de sustancias',

    // Priorities
    priorityCritical: 'Crítica',
    priorityHigh: 'Alta',
    priorityMedium: 'Media',
    priorityLow: 'Baja',

    // Days of the week
    dayMon: 'Lun',
    dayTue: 'Mar',
    dayWed: 'Mié',
    dayThu: 'Jue',
    dayFri: 'Vie',
    daySat: 'Sáb',
    daySun: 'Dom',
  },
  en: {
    // Brand & General
    appName: 'SECURITY URBAN',
    appTagline: 'Intelligent monitoring and prevention • Comuna 8, Medellín',
    locationBadge: '📍 Comuna 8 - Medellín',
    statusOnline: '● Secure Link',
    statusSecure: '● SSL 256-bit',
    versionBadge: 'v1.0 • SENATIC 2026',
    nodeBadge: 'COMUNA 8 • SECURE NODE',
    footerInitiative: 'Community Security Initiative • Medellín 2026',
    allRightsReserved: 'All rights reserved',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    back: 'Back',
    search: 'Search',
    loading: 'Loading information...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    filterAll: 'All',
    viewDetails: 'View details',
    actions: 'Actions',
    status: 'Status',
    priority: 'Priority',
    date: 'Date',
    sector: 'Sector',
    description: 'Description',
    title: 'Title',
    address: 'Address',
    category: 'Category',

    // Navigation Items
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
    exploreMap: 'Explore Map',
    goToDashboard: 'Go to Dashboard',
    viewMyProfile: 'My Profile',
    settingsAndConfig: 'Settings & Preferences',
    signOut: 'Sign Out',
    welcomeBack: 'Welcome back',
    sessionUser: 'Connected user',

    // Auth & Login / Register
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
    invalidCredentials: 'The password is incorrect. Please check your details and try again.',
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
    verificationPendingTitle: 'Verify Your Email Address',
    verificationPendingDesc: 'We sent a verification link to your email address. In accordance with Comuna 8 security protocols, you must confirm your email before accessing the live dashboard.',
    verificationCheckStatus: 'I verified, check status',
    verificationResend: 'Resend verification email',
    verificationResentSuccess: 'Verification email resent successfully.',
    verificationStillPending: 'Your email has not been verified yet. Please check your inbox and spam folder.',

    // Roles & User Statuses
    userRoleCitizen: 'Community Agent',
    userRoleOperator: 'Tactical Operator',
    userRoleAdmin: 'Administrator',
    accountStatusVerified: 'Verified',
    accountStatusPending: 'Pending',
    accountStatusSuspended: 'Suspended',
    accountStatusActive: 'Active',
    accountSuspendedError: 'Your account has been suspended, please contact the administrator.',

    // Home Screen
    heroTagline: 'Prevent • Guide • Protect',
    heroDescription: 'Community platform for smart surveillance, early alerts, and safe corridors across Comuna 8, Medellín.',
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
    viewFullMap: 'View interactive map',
    viewSectorArrow: 'VIEW SECTOR →',
    viewReportsArrow: 'VIEW REPORTS →',
    planRouteArrow: 'PLAN ROUTE →',
    requestSupportArrow: 'GET SUPPORT →',

    // Dashboard Screen
    dashboardTitle: 'Control Center & Metrics',
    dashboardSubtitle: 'Activity tracking, verified incidents and community tactical response',
    dashboardSubheader: 'COMMAND PANEL // COMUNA 8',
    reportIncidentBtn: 'Report Incident',
    tacticalMapBtn: 'Tactical Map',
    metricActiveAlerts: 'Active verified alerts',
    metricActiveAlertsDesc: 'Approved by administration',
    metricMonitoredSectors: 'Monitored sectors',
    metricMonitoredSectorsDesc: 'Comuna 8 Medellín',
    metricSystemStatus: 'Community Support Net',
    metricSystemStatusDesc: 'Google Maps Platform 24/7',
    metricMyReports: 'My registered reports',
    metricMyReportsBadge: 'Your Reports',
    viewMyReportsBtn: 'View my reports',
    trendTitle: 'INCIDENT TREND // LAST 7 DAYS',
    trendSubtitle: 'Verified and accepted reports in Firestore',
    demoSimulationBadge: 'DEMO SIMULATION',
    currentWeekTab: 'Current week',
    previousWeekTab: 'Previous week',
    noIncidentsThisDay: 'No incidents recorded on this day',
    topIncidentSector: 'Top incident sector:',
    incidentsCount: 'incidents',
    incidentCountSingular: 'incident',
    recentAlertsFeedTitle: 'RECENT VERIFIED ALERTS',
    recentAlertsFeedDesc: 'Real-time incidents validated by community leadership',
    viewAllAlertsLink: 'View all alerts',
    noAlertsDashboard: 'No active alerts at this moment',
    noAlertsDashboardDesc: 'Comuna 8 has zero approved critical events recorded in the system.',
    quickCall123: 'Emergency Dispatch 123 Medellín',
    quickCall123Desc: 'Immediate, direct connection to the National Police Dispatch CAD.',

    // Risk Map Screen
    riskMapBadge: 'Geospatial Module // Comuna 8 — Villa Hermosa',
    riskMapProvider: 'Google Maps Platform',
    riskMapTitle: 'Risk & Prevention Map',
    riskMapDescription: 'Preventive sector monitoring, risk concentration thermography, and community quadrants for Comuna 8 (Villa Hermosa, Medellín).',
    disclaimerTitle: 'Community Reference & Transparency Notice:',
    disclaimerText: 'The classification and risk levels of the 18 sectors in Comuna 8 (Villa Hermosa) are orientative and based on historical community dynamics and publicly accessible records. They do not constitute an exact diagnostic per neighborhood nor a stigmatizing official rating. For official and updated data, please consult the',
    siscLinkText: 'Medellín Mayor\'s Office SISC',
    searchPlacesPlaceholder: 'Search street, avenue, neighborhood or landmark in Medellín...',
    modeHeat: 'Heat',
    modeMarkers: 'Markers',
    modeHybrid: 'Hybrid',
    centerGpsBtn: 'GPS',
    locatingGps: 'Locating...',
    recenterComuna8Btn: 'Center on Comuna 8',
    thermalLegendTitle: 'Risk Thermography (Concentration)',
    thermalLow: 'Transit / Baseline',
    thermalMed: 'Moderate',
    thermalHigh: 'High Caution',
    sectorExplorerTitle: 'Sector Explorer',
    searchSectorPlaceholder: 'Search Comuna 8 neighborhood...',
    filterLevelAll: 'All',
    filterLevelHigh: 'High',
    filterLevelModerate: 'Mod.',
    filterLevelCentral: 'Base',
    noSectorsFound: 'No sectors found matching your query.',
    resetFilters: 'Reset filters',
    sectorCardHistoricalDiag: 'Public reference diagnostic:',
    sectorCardCitizenAdvice: 'Citizen safety guideline:',
    centerSectorBtn: 'Center',
    searchedLocationTitle: 'Search // Medellín',
    noRiskDataBadge: 'No risk data',
    geolocatedPlaceLabel: 'Geolocated landmark:',
    territorialCoverageNotice: 'Community coverage note:',
    territorialCoverageText: 'This location is situated outside the focused perimeter of Comuna 8 (Villa Hermosa). The map displays the exact pin location.',
    urbanSelfCareNotice: 'Urban safety guideline:',
    urbanSelfCareText: 'Stick to well-lit main streets, remain alert to surroundings, and contact the 123 emergency dispatch for any public safety event.',
    selectSectorPlaceholder: 'Select a sector or search a location',
    selectSectorSubPlaceholder: 'Use the Medellín search bar or click on any sector on the map or explorer list to review its safety card.',
    monitoredSectorsCount: '18 Monitored Sectors',

    // Safe Routes Screen
    safeRoutesBadge: 'Navigation Module // Comuna 8 Safe Corridors',
    safeRoutesTitle: 'Safe Routes & Corridor Planner',
    safeRoutesDescription: 'Calculate optimized paths prioritizing major avenues, street lighting, proximity to police posts, and lower-risk quadrants in Medellín.',
    routeParamsTitle: 'Route Parameters',
    realSafePlacesTitle: 'Choose Locations',
    suggestedRoutesTitle: 'Available Routes to Choose',
    routeOriginLabel: 'Origin Address or Point',
    routeDestinationLabel: 'Destination Address or Point',
    customPointPlaceholder: 'Type an address or choose a point in Medellín...',
    modeWalking: 'Walking',
    modeDriving: 'Driving',
    modeBicycling: 'Bicycling',
    calculate: 'Plot Route',
    calculating: 'Plotting...',
    calculateRouteBtn: 'Calculate Safe Route',
    calculatingRoute: 'Calculating optimal path...',
    routeOptionsTitle: 'Calculated Route Options',
    routeOptionSafe: 'Safest Route (Recommended)',
    routeOptionDirect: 'Most Direct Route',
    estimatedTime: 'Estimated time',
    distance: 'Distance',
    securityScore: 'Safety Score',
    originShort: 'Origin',
    destShort: 'Dest',
    readyToStartRoute: 'Ready to start navigating the selected route?',
    readyToStartRouteDesc: 'Activate live tracking to receive turn-by-turn guidance to your destination.',
    startLiveTracking: 'Start Live Route Companion',
    stopLiveTracking: 'End Navigation',
    userOnRouteBadge: 'User in guided route',
    safePlacesTitle: 'Choose Locations',
    safePlacesFilterPolice: 'CAI / Police',
    safePlacesFilterHealth: 'Health',
    safePlacesFilterEducation: 'Schools',
    safePlacesFilterParks: 'Parks',

    // Tactical Support Screen
    tacticalBadge: 'Immediate Response Center // Community SOS',
    tacticalTitle: 'Tactical Support & Emergency Assistance',
    tacticalDescription: 'Emergency helpline coordinated with Medellín 123, Comuna 8 police quadrants, and mobile rescue teams.',
    sosButtonLabel: 'SOS BUTTON // PANIC ALARM',
    sosButtonDesc: 'Press to broadcast a prioritized emergency alert with your live GPS coordinates.',
    sosConfirmTitle: 'Confirm Emergency SOS Alert?',
    sosConfirmDesc: 'The community monitoring desk will be notified and your current GPS coordinates will be dispatched.',
    sosDispatched: 'Emergency SOS dispatched successfully!',
    tacticalUnitsTitle: 'Tactical Units & Police Quadrants',
    categoryPolice: 'National Police',
    categoryAmbulance: 'Ambulance / Health',
    categoryFire: 'Fire Department',
    unitCallBtn: 'Call Unit',
    unitDispatchBtn: 'Dispatch Support',
    dispatchSimulationActive: 'Simulated unit dispatching to your coordinates...',
    etaLabel: 'Estimated Time of Arrival (ETA):',
    tacticalHistoryTitle: 'Assistance Request History',
    noTacticalHistory: 'No tactical assistance requests recorded in this session.',

    // Alerts Screen
    alertsBadge: '24/7 MONITORING CENTER // COMUNA 8',
    alertsTitle: 'Community Alert Center',
    alertsVerifiedBadge: 'VERIFIED',
    filterCategoryAll: 'All categories',
    noAlertsFound: 'No active community alerts at this time.',
    noAlertsFoundDesc: 'Comuna 8 has zero critical verified alerts active. If you observe an urgent event, submit a new report for validation.',
    createNewReportBtn: 'Create New Report',
    verificationNotice: 'This feed broadcasts exclusively verified and approved incident reports from the Security Urban administration. Pending reports are held to prevent misinformation.',

    // My Reports & Admin Screen
    myReportsBadge: 'CITIZEN LOGS // COMUNA 8',
    myReportsTitle: 'My Security Reports',
    myReportsTab: 'My Registered Reports',
    adminReviewTab: 'Admin Review Panel',
    pendingVerificationBadge: 'PENDING',
    searchReportsPlaceholder: 'Search by title, category, sector or description...',
    statusAll: 'All statuses',
    statusPending: 'Pending',
    statusApproved: 'Accepted / Approved',
    statusRejected: 'Rejected',
    statusInProgress: 'In Progress',
    statusResolved: 'Resolved',
    noReportsFound: 'No reports found matching your criteria.',
    noReportsFoundDesc: 'You can create a new citizen report to notify authorities about events in your neighborhood.',
    adminApproveBtn: 'Approve Report',
    adminRejectBtn: 'Reject Report',
    adminRejectReasonPlaceholder: 'Reason for rejection (e.g. insufficient proof, duplicate, prank)...',
    confirmApproveReport: 'Confirm approval and public broadcast of this alert?',
    confirmRejectReport: 'Confirm rejection of this report?',
    editReportTitle: 'Edit Title',
    deleteReport: 'Delete Report',

    // Create Report Modal
    createReportModalTitle: 'Report New Citizen Incident',
    createReportModalDesc: 'Your submission will be reviewed by administrators before being broadcast on the map and alert feeds.',
    reportTitleLabel: 'Brief Title or Subject',
    reportTitlePlaceholder: 'e.g. Broken streetlight near park entrance',
    reportCategoryLabel: 'Incident Type / Category',
    reportSectorLabel: 'Comuna 8 Neighborhood / Sector',
    reportAddressLabel: 'Specific Address or Reference Point (Optional)',
    reportAddressPlaceholder: 'e.g. Cl 56 with Cra 28, near bakery',
    reportDescriptionLabel: 'Detailed Incident Description',
    reportDescriptionPlaceholder: 'Describe the situation, affected persons, involved vehicles or preventative recommendations...',
    reportPriorityLabel: 'Estimated Priority Level',
    submitReportBtn: 'Submit Report for Verification',
    submittingReport: 'Submitting report...',
    reportCreatedSuccess: 'Report submitted successfully. The safety team is reviewing it.',

    // User Management Screen
    userManagementBadge: 'SYSTEM ADMINISTRATION // COMUNA 8',
    userManagementTitle: 'User & Role Management',
    userManagementDesc: 'Manage community permissions, assign verified credentials, and audit member activity.',
    totalUsersStat: 'Total Users',
    activeUsersStat: 'Active Users',
    suspendedUsersStat: 'Suspended Accounts',
    newThisWeekStat: 'New this week',
    searchUsersPlaceholder: 'Search user by full name or email address...',
    filterRoleAll: 'All roles',
    filterStatusAll: 'All statuses',
    colUser: 'User / Identity',
    colRole: 'Community Role',
    colSector: 'Primary Sector',
    colStatus: 'Account Status',
    colRegistrationDate: 'Joined',
    colActions: 'Actions',
    changeRoleBtn: 'Change Role',
    suspendUserBtn: 'Suspend Account',
    activateUserBtn: 'Reactivate Account',
    userRoleCitizenDesc: 'Standard access to file incident reports, view risk map and plan safe routes.',
    userRoleOperatorDesc: 'Elevated access to respond to SOS alarms, monitor alerts and dispatch units.',
    userRoleAdminDesc: 'Full administrative access to validate reports, manage users and configure platform.',

    // Settings Screen
    settingsTitle: 'Settings & Preferences',
    settingsSubtitle: 'Customize your user experience, account security, and alert triggers',
    sectionProfile: 'User Profile',
    sectionPreferences: 'Preferences & Theme',
    sectionSecurity: 'Account Security',
    sectionPrivacy: 'Data Privacy',
    sectionAbout: 'About the Project',
    sectionDanger: 'Critical Security Zone',
    themeModeLabel: 'Display Mode (Light / Dark)',
    themeModeDesc: 'Switch between high-contrast light mode and tactical dark mode.',
    languageSelectLabel: 'Platform Language (ES / EN)',
    languageSelectDesc: 'Switch all text and data across the platform between Spanish and English.',
    notifPushLabel: 'Push Alert Notifications',
    notifPushDesc: 'Receive immediate alerts when urgent incidents occur in your designated sector.',
    notifReportsLabel: 'My Reports Updates',
    notifReportsDesc: 'Notify me when my report is approved, investigated, or updated.',
    notifTacticalLabel: 'Tactical Support Notices',
    notifTacticalDesc: 'Updates regarding community safety patrols and tactical drills.',
    saveSettingsBtn: 'Save Preferences',
    settingsSavedSuccess: 'Preferences saved successfully.',

    // Incident Categories
    catSuspiciousPerson: 'Suspicious person',
    catStreetRobbery: 'Street robbery',
    catBrokenStreetlight: 'Broken streetlight',
    catTrafficAccident: 'Traffic accident',
    catDebrisDumping: 'Debris / Illegal dumping',
    catPhysicalFight: 'Physical altercation / Fight',
    catRoadClosure: 'Road closure / Landslide',
    catGeneralAlert: 'General community alert',
    catDrugUse: 'Substance abuse',

    // Priorities
    priorityCritical: 'Critical',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',

    // Days of the week
    dayMon: 'Mon',
    dayTue: 'Tue',
    dayWed: 'Wed',
    dayThu: 'Thu',
    dayFri: 'Fri',
    daySat: 'Sat',
    daySun: 'Sun',
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
      document.documentElement.lang = language;
    } catch (err) {
      console.warn('[Security Urban Lang] Failed to persist language:', err);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const currentDict = translations[language] || translations.es;
      if (currentDict && key in currentDict) {
        return currentDict[key];
      }
      if (translations.es && key in translations.es) {
        return translations.es[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [language]
  );

  const translateCategory = useCallback(
    (category: string): string => {
      if (!category) return '';
      if (language === 'es') return category;

      const norm = category.toLowerCase().trim();
      if (norm.includes('sospech') || norm.includes('persona extraña')) return translations.en.catSuspiciousPerson;
      if (norm.includes('robo') || norm.includes('hurto')) return translations.en.catStreetRobbery;
      if (norm.includes('luminaria') || norm.includes('alumbrado') || norm.includes('luz')) return translations.en.catBrokenStreetlight;
      if (norm.includes('tránsito') || norm.includes('accidente') || norm.includes('choque')) return translations.en.catTrafficAccident;
      if (norm.includes('escombros') || norm.includes('basura') || norm.includes('relleno')) return translations.en.catDebrisDumping;
      if (norm.includes('riña') || norm.includes('pelea') || norm.includes('violencia')) return translations.en.catPhysicalFight;
      if (norm.includes('cierre') || norm.includes('vial') || norm.includes('derrumbe')) return translations.en.catRoadClosure;
      if (norm.includes('sustancia') || norm.includes('droga')) return translations.en.catDrugUse;
      if (norm.includes('general') || norm.includes('alerta')) return translations.en.catGeneralAlert;

      return category;
    },
    [language]
  );

  const translateStatus = useCallback(
    (status: string): string => {
      if (!status) return '';
      const s = status.toLowerCase();
      if (language === 'es') {
        if (s === 'pendiente') return 'Pendiente';
        if (s === 'aceptado' || s === 'aprobado') return 'Aprobado';
        if (s === 'rechazado') return 'Rechazado';
        if (s === 'en_proceso' || s === 'en proceso') return 'En Proceso';
        if (s === 'resuelto') return 'Resuelto';
        if (s === 'activo') return 'Activo';
        if (s === 'suspendido') return 'Suspendido';
        return status;
      } else {
        if (s === 'pendiente') return 'Pending';
        if (s === 'aceptado' || s === 'aprobado') return 'Approved';
        if (s === 'rechazado') return 'Rejected';
        if (s === 'en_proceso' || s === 'en proceso') return 'In Progress';
        if (s === 'resuelto') return 'Resolved';
        if (s === 'activo') return 'Active';
        if (s === 'suspendido') return 'Suspended';
        return status;
      }
    },
    [language]
  );

  const translatePriority = useCallback(
    (priority: string): string => {
      if (!priority) return '';
      const p = priority.toLowerCase();
      if (language === 'es') {
        if (p === 'critica' || p === 'crítica') return 'Crítica';
        if (p === 'alta') return 'Alta';
        if (p === 'media') return 'Media';
        if (p === 'baja') return 'Baja';
        return priority;
      } else {
        if (p === 'critica' || p === 'crítica') return 'Critical';
        if (p === 'alta') return 'High';
        if (p === 'media') return 'Medium';
        if (p === 'baja') return 'Low';
        return priority;
      }
    },
    [language]
  );

  const translateRole = useCallback(
    (role: string): string => {
      if (!role) return '';
      const r = role.toLowerCase();
      if (language === 'es') {
        if (r === 'ciudadano') return 'Agente Comunal';
        if (r === 'operador') return 'Operador Táctico';
        if (r === 'administrador') return 'Administrador';
        return role;
      } else {
        if (r === 'ciudadano') return 'Community Agent';
        if (r === 'operador') return 'Tactical Operator';
        if (r === 'administrador') return 'Administrator';
        return role;
      }
    },
    [language]
  );

  const translateDay = useCallback(
    (day: string): string => {
      if (!day) return '';
      const d = day.trim();
      const mapEsToEn: Record<string, string> = {
        Dom: 'Sun',
        Lun: 'Mon',
        Mar: 'Tue',
        Mié: 'Wed',
        Mie: 'Wed',
        Jue: 'Thu',
        Vie: 'Fri',
        Sáb: 'Sat',
        Sab: 'Sat',
      };
      const mapEnToEs: Record<string, string> = {
        Sun: 'Dom',
        Mon: 'Lun',
        Tue: 'Mar',
        Wed: 'Mié',
        Thu: 'Jue',
        Fri: 'Vie',
        Sat: 'Sáb',
      };
      if (language === 'es') {
        return mapEnToEs[d] || d;
      } else {
        return mapEsToEn[d] || d;
      }
    },
    [language]
  );

  const translateRisk = useCallback(
    (risk: string): string => {
      if (!risk) return '';
      const r = risk.toLowerCase();
      if (language === 'es') {
        if (r === 'high' || r === 'mayor') return 'Mayor atención';
        if (r === 'moderate' || r === 'intermedia' || r === 'moderado') return 'Intermedia';
        if (r === 'central' || r === 'base' || r === 'bajo') return 'Base / Menos crítica';
        return risk;
      } else {
        if (r === 'high' || r === 'mayor') return 'High Caution';
        if (r === 'moderate' || r === 'intermedia' || r === 'moderado') return 'Moderate';
        if (r === 'central' || r === 'base' || r === 'bajo') return 'Base / Low Risk';
        return risk;
      }
    },
    [language]
  );

  const translateService = useCallback(
    (service: string): string => {
      if (!service) return '';
      const s = service.toLowerCase();
      if (language === 'es') {
        if (s === 'police') return 'Policía Nacional';
        if (s === 'ambulance') return 'Ambulancia / Salud';
        if (s === 'fire') return 'Cuerpo de Bomberos';
        return service;
      } else {
        if (s === 'police') return 'National Police';
        if (s === 'ambulance') return 'Ambulance / Health';
        if (s === 'fire') return 'Fire Department';
        return service;
      }
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      translateCategory,
      translateStatus,
      translatePriority,
      translateRole,
      translateDay,
      translateRisk,
      translateService,
    }),
    [
      language,
      t,
      translateCategory,
      translateStatus,
      translatePriority,
      translateRole,
      translateDay,
      translateRisk,
      translateService,
    ]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
