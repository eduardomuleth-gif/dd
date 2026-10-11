import React from 'react';
import { 
  ShieldAlert, 
  Map, 
  Route, 
  Users, 
  FileText, 
  Bell, 
  Activity, 
  ArrowLeft,
  Navigation,
  User,
  Settings
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export type NavTabId = 'home' | 'dashboard' | 'riskMap' | 'safeRoutes' | 'tacticalSupport' | 'userManagement' | 'myReports' | 'alerts' | 'profile' | 'settings';

interface ModulePlaceholderViewProps {
  tab: NavTabId;
  onNavigate: (tab: NavTabId) => void;
  onOpenTacticalMap?: () => void;
}

export const ModulePlaceholderView: React.FC<ModulePlaceholderViewProps> = ({
  tab,
  onNavigate,
  onOpenTacticalMap,
}) => {
  const { colors, theme } = useTheme();
  const { t, language } = useLanguage();
  const isDark = theme === 'dark';

  const configMap: Record<NavTabId, {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    tag: string;
    description: string;
    status: string;
    bullets: string[];
  }> = {
    home: {
      title: t('navHome'),
      subtitle: 'Pantalla principal de inicio',
      icon: <Activity className="w-8 h-8 text-red-500" />,
      tag: 'SYS-00',
      description: 'Vista principal de bienvenida y módulos tácticos.',
      status: 'ACTIVO',
      bullets: [],
    },
    dashboard: {
      title: t('navDashboard'),
      subtitle: language === 'es' ? 'Centro de comando y telemetría comunitaria' : 'Command center & community telemetry',
      icon: <Activity className="w-8 h-8 text-red-500" />,
      tag: 'PANEL // COMUNA 8',
      description: language === 'es'
        ? 'Resumen integral de índices de seguridad, cuadrantes vigilados, reportes activos y métricas de prevención barrial.'
        : 'Comprehensive overview of security indexes, monitored quadrants, active reports, and neighborhood prevention metrics.',
      status: 'SISTEMA EN LÍNEA',
      bullets: language === 'es' 
        ? ['Monitoreo continuo de 5 cuadrantes', 'Conexión con CAD Policía Medellín 123', 'Índice de seguridad comunal: 94.2%']
        : ['Continuous monitoring across 5 quadrants', 'CAD Medellín Police 123 connection', 'Community safety index: 94.2%'],
    },
    riskMap: {
      title: t('navRiskMap'),
      subtitle: language === 'es' ? 'Cartografía térmica y zonas de precaución' : 'Thermal cartography & precaution zones',
      icon: <Map className="w-8 h-8 text-amber-500" />,
      tag: 'GEO // CARTOGRAFÍA',
      description: language === 'es'
        ? 'Mapa georreferenciado con capas de iluminación, puntos de atención rápida y sectores con alertas preventivas activas.'
        : 'Georeferenced map with street lighting layers, fast-response points, and active caution sectors.',
      status: 'CAPAS TÁCTICAS DISPONIBLES',
      bullets: language === 'es'
        ? ['Sector Villa Hermosa: Vías con iluminación óptima', 'Sector Enciso: Puntos de control preventivo', 'Sector Sucre: Corredor comercial vigilado']
        : ['Villa Hermosa sector: Well-lit avenues', 'Enciso sector: Preventive checkpoints', 'Sucre sector: Monitored commercial area'],
    },
    safeRoutes: {
      title: t('navSafeRoutes'),
      subtitle: language === 'es' ? 'Corredores peatonales y acompañamiento vecinal' : 'Pedestrian corridors & neighborhood escort',
      icon: <Route className="w-8 h-8 text-emerald-500" />,
      tag: 'RUTA // CORREDORES',
      description: language === 'es'
        ? 'Trazado dinámico de rutas seguras con cámaras PTZ activas, frentes de seguridad barrial y comercios aliados en la Comuna 8.'
        : 'Dynamic routing of safe corridors equipped with PTZ cameras, neighborhood watches, and allied shops across Comuna 8.',
      status: '4 CORREDORES ACTIVOS',
      bullets: language === 'es'
        ? ['Corredor Carrera 40 y Calle 66 (Parque Villa Hermosa)', 'Ruta escolar Carrera 36A (Enciso)', 'Eje Metrocable Línea H (Oriente - Villa Sierra)']
        : ['Carrera 40 & Calle 66 Corridor (Villa Hermosa Park)', 'Carrera 36A School Corridor (Enciso)', 'Line H Metrocable Axis (Oriente - Villa Sierra)'],
    },
    tacticalSupport: {
      title: t('navTacticalSupport'),
      subtitle: language === 'es' ? 'Enlace directo con cuadrantes y frentes ciudadanos' : 'Direct link to police quadrants & neighborhood units',
      icon: <Users className="w-8 h-8 text-rose-500" />,
      tag: 'APOYO // CUADRANTES',
      description: language === 'es'
        ? 'Directorio de contacto inmediato, líderes comunitarios de seguridad, cuadrantes de la Policía Nacional y botones de asistencia rápida.'
        : 'Immediate contact directory, community security leaders, National Police quadrants, and quick-dispatch buttons.',
      status: 'ENLACE DIRECTO AL 123',
      bullets: language === 'es'
        ? ['Cuadrante 8-1 (Villa Hermosa): +57 300 123 4567', 'Cuadrante 8-2 (Boston/Sucre): +57 300 234 5678', 'Cuadrante 8-3 (Enciso): +57 300 345 6789']
        : ['Quadrant 8-1 (Villa Hermosa): +57 300 123 4567', 'Quadrant 8-2 (Boston/Sucre): +57 300 234 5678', 'Quadrant 8-3 (Enciso): +57 300 345 6789'],
    },
    userManagement: {
      title: language === 'es' ? 'Gestión de Usuarios' : 'User Management',
      subtitle: language === 'es' ? 'Control de roles y suspensión en Firestore' : 'Role control & suspension in Firestore',
      icon: <Users className="w-8 h-8 text-amber-500" />,
      tag: 'ADMIN // ROLES',
      description: language === 'es'
        ? 'Directorio en tiempo real de ciudadanos, operadores y administradores con control de acceso RBAC.'
        : 'Real-time directory of citizens, operators, and administrators with RBAC access control.',
      status: 'FIRESTORE SINCRONIZADO',
      bullets: language === 'es'
        ? ['Cambio de rol (ciudadano/operador/administrador)', 'Suspensión y reactivación inmediata', 'Verificación de estado en login']
        : ['Role change (citizen/operator/administrator)', 'Immediate suspension and reactivation', 'Login status enforcement'],
    },
    myReports: {
      title: t('navMyReports'),
      subtitle: language === 'es' ? 'Historial y seguimiento de incidentes comunitarios' : 'History & tracking of community incidents',
      icon: <FileText className="w-8 h-8 text-blue-500" />,
      tag: 'HISTORIAL // BITÁCORA',
      description: language === 'es'
        ? 'Registro personal de reportes generados, estado de atención por autoridades y confirmación de recepción vecinal.'
        : 'Personal log of generated reports, authority response status, and community confirmation acknowledgments.',
      status: 'SIN ALERTAS CRÍTICAS PENDIENTES',
      bullets: language === 'es'
        ? ['Reporte #08-412: Luminaria reparada en Cl 56 (Cerrado)', 'Reporte #08-425: Solicitud de patrullaje escolar (Atendido)']
        : ['Report #08-412: Streetlight fixed on Cl 56 (Closed)', 'Report #08-425: School patrol request (Resolved)'],
    },
    alerts: {
      title: t('navAlerts'),
      subtitle: language === 'es' ? 'Feed en tiempo real de novedades y avisos urgentes' : 'Real-time feed of alerts & urgent notifications',
      icon: <Bell className="w-8 h-8 text-amber-500" />,
      tag: 'CENTRO // ALERTAS',
      description: language === 'es'
        ? 'Avisos tempranos sobre emergencias viales, cierres por obras, condiciones climáticas y recomendaciones de tránsito seguro en la Comuna 8.'
        : 'Early alerts on road emergencies, construction closures, weather conditions, and safe transit recommendations across Comuna 8.',
      status: 'MONITOR 24/7 EN LÍNEA',
      bullets: language === 'es'
        ? ['Aviso preventivo: Obras viales en sector La Sierra / Calle 56', 'Alerta verde: Operación normal del Metrocable Línea H', 'Monitoreo preventivo nocturno en corredores comerciales']
        : ['Preventive notice: Road maintenance in La Sierra / Calle 56', 'Green alert: Normal operation on Metrocable Line H', 'Night preventive monitoring on commercial avenues'],
    },
    profile: {
      title: language === 'es' ? 'Mi Perfil de Usuario' : 'My User Profile',
      subtitle: language === 'es' ? 'Credenciales, datos de contacto y estado de verificación' : 'Credentials, contact details & verification status',
      icon: <User className="w-8 h-8 text-red-500" />,
      tag: 'PERFIL // CIUDADANO',
      description: language === 'es'
        ? 'Gestiona tu información de ciudadano, credenciales de acceso, número de contacto para emergencias y verificación barrial en la Comuna 8.'
        : 'Manage your citizen profile, access credentials, emergency contact phone, and neighborhood verification in Comuna 8.',
      status: 'VERIFICADO',
      bullets: language === 'es'
        ? ['Rol asignado: Ciudadano', 'Sector georreferenciado: Comuna 8 (Villa Hermosa)', 'Estado de seguridad: Verificación en 2 pasos activa']
        : ['Assigned Role: Citizen', 'Georeferenced Sector: Comuna 8 (Villa Hermosa)', 'Security Status: 2-factor verification active'],
    },
    settings: {
      title: language === 'es' ? 'Configuración y Ajustes' : 'Settings & Preferences',
      subtitle: language === 'es' ? 'Parámetros del sistema, alertas tácticas y privacidad' : 'System parameters, tactical alerts & privacy',
      icon: <Settings className="w-8 h-8 text-amber-500" />,
      tag: 'SISTEMA // AJUSTES',
      description: language === 'es'
        ? 'Configura tus canales de notificación en tiempo real, umbrales de alerta comunitaria, permisos de geolocalización y preferencias de visualización táctica.'
        : 'Configure your real-time notification channels, community alert thresholds, geolocation permissions, and tactical display preferences.',
      status: 'SISTEMA ÓPTIMO',
      bullets: language === 'es'
        ? ['Notificaciones prioritarias: Activadas (Sonido y vibración)', 'Capa de visualización: HUD de alta legibilidad', 'Frecuencia de telemetría: Tiempo real (WebSockets)']
        : ['Priority notifications: Enabled (Sound & vibration)', 'Display layer: High-legibility HUD', 'Telemetry frequency: Real-time (WebSockets)'],
    },
  };

  const current = configMap[tab] || configMap.dashboard;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
      {/* Top back button to home */}
      <div className="w-full mb-4 px-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === 'es' ? 'Volver al Inicio' : 'Back to Home'}</span>
        </button>

        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full border border-red-500/30 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300">
          {current.tag}
        </span>
      </div>

      {/* Main Container Card */}
      <div
        className={`w-full rounded-3xl p-6 sm:p-10 shadow-2xl relative border overflow-hidden backdrop-blur-md transition-colors ${colors.cardBg} ${colors.cardBorder} ${colors.canvasText}`}
      >
        {/* Accent bar */}
        <div className="absolute top-0 inset-x-0 h-[5px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-sm shadow-red-500/25" />

        {/* Ambient glow */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none bg-red-600/15" />

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600/20 to-amber-500/10 border border-red-500/30 flex items-center justify-center shadow-md">
              {current.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-xl sm:text-2xl font-bold tracking-tight font-['Rajdhani'] ${colors.cardTitle}`}>
                  {current.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 text-xs font-mono font-bold">
                  {current.status}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-medium ${colors.cardSubtitle}`}>
                {current.subtitle}
              </p>
            </div>
          </div>

          {onOpenTacticalMap && (
            <button
              type="button"
              onClick={onOpenTacticalMap}
              className="px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-md shadow-red-950/40"
            >
              <Navigation className="w-4 h-4" />
              <span>{language === 'es' ? 'Ver Mapa Táctico' : 'Open Tactical Map'}</span>
            </button>
          )}
        </div>

        {/* Card Body */}
        <div className="pt-6 space-y-6">
          <p className={`text-sm sm:text-base leading-relaxed ${colors.cardSubtitle}`}>
            {current.description}
          </p>

          {/* Active Data Items */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-red-600/20 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              {language === 'es' ? 'PUNTOS ACTIVOS DEL MÓDULO // COMUNA 8' : 'ACTIVE MODULE NODES // COMUNA 8'}
            </h4>
            <div className="space-y-2">
              {current.bullets.map((bullet, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{bullet}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">OK</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500 font-mono">
              SECURITY URBAN OS • MOD-{tab.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="px-5 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition cursor-pointer"
            >
              {language === 'es' ? 'Volver a la Pantalla de Inicio' : 'Return to Home Screen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
