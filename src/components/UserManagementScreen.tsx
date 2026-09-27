import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  Filter,
  Calendar,
  Mail,
  MapPin,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  KeyRound,
  Copy,
  Check,
  Radio,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { FirestoreUser, UserRole, UserStatus, UserStats } from '../types/user';
import {
  subscribeToFirestoreUsers,
  updateFirestoreUserRole,
  updateFirestoreUserStatus,
  seedInitialCommunityUsersIfEmpty,
} from '../services/userService';

interface UserManagementScreenProps {
  currentUserRole: UserRole;
  currentUserId?: string;
  onCurrentUserRoleChange?: (newRole: UserRole) => void;
  onNavigateHome: () => void;
}

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({
  currentUserRole,
  currentUserId,
  onCurrentUserRoleChange,
  onNavigateHome,
}) => {
  const { colors, theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';

  // State for users and metrics directly from Firestore
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    activos: 0,
    suspendidos: 0,
    nuevosEstaSemana: 0,
    ciudadanos: 0,
    operadores: 0,
    administradores: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'error' | 'syncing'>('syncing');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Interactive Modals
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<FirestoreUser | null>(null);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<FirestoreUser | null>(null);
  const [pendingRole, setPendingRole] = useState<UserRole>('ciudadano');
  const [selectedUserForStatusToggle, setSelectedUserForStatusToggle] = useState<FirestoreUser | null>(null);
  const [isUpdatingAction, setIsUpdatingAction] = useState<boolean>(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedUid, setCopiedUid] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Requirement 2: Subscribe to live Firestore updates via onSnapshot
  useEffect(() => {
    setIsLoading(true);
    setSyncStatus('syncing');

    const unsubscribe = subscribeToFirestoreUsers(
      (updatedUsers, updatedStats) => {
        setUsers(updatedUsers);
        setStats(updatedStats);
        setIsLoading(false);
        setIsRefreshing(false);
        setSyncStatus('connected');
      },
      (err) => {
        console.error('[UserManagementScreen] Error in live subscription:', err);
        setSyncStatus('error');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search by name or email
      const matchesSearch =
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.sector.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by role
      const matchesRole =
        selectedRoleFilter === 'all' || u.rol === selectedRoleFilter;

      // Filter by status
      const matchesStatus =
        selectedStatusFilter === 'all' || u.estado === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  // Handle manual refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Handle seed demo users for Comuna 8
  const handleSeedUsers = async () => {
    setIsRefreshing(true);
    try {
      await seedInitialCommunityUsersIfEmpty();
      showToast(
        language === 'es'
          ? 'Usuarios comunales sincronizados en Firestore'
          : 'Community users synchronized in Firestore',
        'success'
      );
    } catch {
      showToast(
        language === 'es'
          ? 'Error al sincronizar usuarios de prueba'
          : 'Error synchronizing sample users',
        'error'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Role Change Execution
  const handleConfirmRoleChange = async () => {
    if (!selectedUserForRoleChange) return;
    setIsUpdatingAction(true);
    try {
      await updateFirestoreUserRole(selectedUserForRoleChange.uid, pendingRole);
      showToast(
        language === 'es'
          ? `Rol de "${selectedUserForRoleChange.nombre}" actualizado a ${pendingRole.toUpperCase()}`
          : `Role for "${selectedUserForRoleChange.nombre}" updated to ${pendingRole.toUpperCase()}`,
        'success'
      );
      // If the admin modified their own role from the admin panel
      if (selectedUserForRoleChange.uid === currentUserId && onCurrentUserRoleChange) {
        onCurrentUserRoleChange(pendingRole);
      }
      setSelectedUserForRoleChange(null);
    } catch (err) {
      showToast(
        language === 'es' ? 'No se pudo actualizar el rol' : 'Failed to update role',
        'error'
      );
    } finally {
      setIsUpdatingAction(false);
    }
  };

  // Handle Status Toggle (Suspend / Reactivate) Execution
  const handleConfirmStatusToggle = async () => {
    if (!selectedUserForStatusToggle) return;
    const newStatus: UserStatus = selectedUserForStatusToggle.estado === 'activo' ? 'suspendido' : 'activo';
    setIsUpdatingAction(true);
    try {
      await updateFirestoreUserStatus(selectedUserForStatusToggle.uid, newStatus);
      showToast(
        language === 'es'
          ? `Cuenta de "${selectedUserForStatusToggle.nombre}" marcada como ${newStatus.toUpperCase()}`
          : `Account for "${selectedUserForStatusToggle.nombre}" set to ${newStatus.toUpperCase()}`,
        newStatus === 'suspendido' ? 'info' : 'success'
      );
      setSelectedUserForStatusToggle(null);
    } catch (err) {
      showToast(
        language === 'es' ? 'No se pudo cambiar el estado' : 'Failed to change status',
        'error'
      );
    } finally {
      setIsUpdatingAction(false);
    }
  };

  // Copy UID to clipboard
  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // ==========================================
  // REQUIREMENT 4: CONTROL DE ACCESO
  // Only users with role: "administrador" can view this screen
  // If not admin, show tactical access restricted message
  // ==========================================
  if (currentUserRole !== 'administrador') {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-300">
        <div className={`p-8 sm:p-12 rounded-3xl border shadow-2xl backdrop-blur-xl relative overflow-hidden ${
          isDark ? 'bg-slate-950/90 border-red-900/60' : 'bg-white border-red-200 shadow-red-950/5'
        }`}>
          {/* Tactical warning stripe */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />
          
          <div className="flex flex-col items-center text-center max-w-xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-red-600/10 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-xl shadow-red-950/30 mb-6 animate-pulse">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-mono font-bold uppercase tracking-widest mb-3">
              <span>SECURITY PROTOCOL 403 // RESTRICTED ACCESS</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {language === 'es' ? 'Acceso Restringido al Módulo' : 'Restricted Module Access'}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              {language === 'es'
                ? 'El módulo de Gestión de Usuarios está reservado exclusivamente para personal con rango de Administrador Comunal.'
                : 'The User Management module is reserved exclusively for personnel with Community Administrator rank.'}
            </p>

            <div className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Rol actual: ' : 'Current role: '}
              <strong className="text-red-600 dark:text-red-400 uppercase">
                {currentUserRole === 'ciudadano'
                  ? (language === 'es' ? 'Ciudadano' : 'Citizen')
                  : currentUserRole === 'operador'
                  ? (language === 'es' ? 'Operador Táctico' : 'Tactical Operator')
                  : currentUserRole}
              </strong>
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button
                type="button"
                onClick={onNavigateHome}
                className="py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              >
                {language === 'es' ? 'Volver al Inicio' : 'Back to Home'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMINISTRATOR VIEW: FULL USER MANAGEMENT TERMINAL
  // ==========================================
  return (
    <div className="w-full max-w-[1440px] mx-auto py-2 sm:py-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Tactical Command Header */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl backdrop-blur-xl transition-all relative overflow-hidden ${
        isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/90 border-slate-200/90 shadow-slate-200/50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-900/30 border border-red-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest">
                  TERMINAL DE SEGURIDAD // COMUNA 8
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  FIRESTORE LIVE
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {language === 'es' ? 'Gestión de Usuarios & Control de Accesos' : 'User Management & Access Control'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'es'
                  ? 'Base de datos en tiempo real de ciudadanos, operadores tácticos y administradores de la Comuna 8.'
                  : 'Real-time database of citizens, tactical operators, and administrators in Comuna 8.'}
              </p>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live Refresh */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Refrescar sincronización"
            >
              <RefreshCw className={`w-4 h-4 text-red-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{language === 'es' ? 'Sincronizar' : 'Sync'}</span>
            </button>

            {/* Seed / Populate Demo Database if needed */}
            <button
              type="button"
              onClick={handleSeedUsers}
              className="py-2.5 px-3.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold text-xs flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/60 transition cursor-pointer shadow-xs"
              title="Sembrar usuarios representativos de Comuna 8 si está vacío"
            >
              <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>{language === 'es' ? 'Población Comunal (Seed)' : 'Seed Population'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* REQUIREMENT 2: RESUMEN SUPERIOR (METRIC CARDS EN TIEMPO REAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Usuarios Registrados */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'es' ? 'Total Registrados' : 'Total Registered'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-['Rajdhani'] tracking-tight text-slate-900 dark:text-slate-100">
              {stats.total}
            </span>
            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
              {language === 'es' ? 'en Firestore' : 'in Firestore'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2">
            <span>{stats.ciudadanos} {language === 'es' ? 'ciudadanos' : 'citizens'}</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">100%</span>
          </div>
        </div>

        {/* Metric 2: Usuarios Activos */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {language === 'es' ? 'Usuarios Activos' : 'Active Users'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-['Rajdhani'] tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.activos}
            </span>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
              {stats.total > 0 ? `${Math.round((stats.activos / stats.total) * 100)}% operativo` : '0%'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2">
            <span>{language === 'es' ? 'Estado normal' : 'Normal status'}</span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {language === 'es' ? 'Sin bloqueo' : 'Unblocked'}
            </span>
          </div>
        </div>

        {/* Metric 3: Nuevos esta semana */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {language === 'es' ? 'Nuevos Esta Semana' : 'New This Week'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-['Rajdhani'] tracking-tight text-amber-600 dark:text-amber-400">
              {stats.nuevosEstaSemana}
            </span>
            <span className="text-[11px] font-mono text-amber-700 dark:text-amber-300 font-semibold">
              {language === 'es' ? 'últimos 7 días' : 'last 7 days'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2">
            <span>{language === 'es' ? 'Tasa de registro' : 'Signup rate'}</span>
            <span className="font-mono font-bold text-amber-600">
              +{stats.nuevosEstaSemana} {language === 'es' ? 'recientes' : 'recent'}
            </span>
          </div>
        </div>

        {/* Metric 4: Seguridad & Cuentas Suspendidas */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              {language === 'es' ? 'Operadores & Suspendidos' : 'Staff & Suspended'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-['Rajdhani'] tracking-tight text-rose-600 dark:text-rose-400">
              {stats.operadores + stats.administradores}
            </span>
            <span className="text-[11px] font-mono text-rose-700 dark:text-rose-300 font-semibold">
              {language === 'es' ? 'mandos' : 'staff'} • {stats.suspendidos} {language === 'es' ? 'suspendidos' : 'suspended'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2">
            <span>{stats.administradores} {language === 'es' ? 'admins' : 'admins'}</span>
            <span className={`font-mono font-bold ${stats.suspendidos > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {stats.suspendidos > 0 ? `⚠️ ${stats.suspendidos} sancionado(s)` : '0 bloqueos'}
            </span>
          </div>
        </div>
      </div>

      {/* REQUIREMENT 2: BUSCADOR Y FILTROS */}
      <div className={`p-4 rounded-2xl border shadow-sm backdrop-blur-md space-y-3 ${
        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search input */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'es' ? 'Buscar por nombre, correo electrónico o sector comunal...' : 'Search by name, email, or quadrant sector...'}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition shadow-xs ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-red-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-red-600'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Role */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              <Filter className="w-3.5 h-3.5 inline mr-1" />
              Rol:
            </span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className={`w-full md:w-auto py-2.5 px-3 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">{language === 'es' ? 'Todos los Roles' : 'All Roles'}</option>
              <option value="ciudadano">{language === 'es' ? 'Ciudadano' : 'Citizen'}</option>
              <option value="operador">{language === 'es' ? 'Operador Táctico' : 'Tactical Operator'}</option>
              <option value="administrador">{language === 'es' ? 'Administrador' : 'Administrator'}</option>
            </select>
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" />
              Estado:
            </span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className={`w-full md:w-auto py-2.5 px-3 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">{language === 'es' ? 'Todos los Estados' : 'All Statuses'}</option>
              <option value="activo">{language === 'es' ? 'Activo' : 'Active'}</option>
              <option value="suspendido">{language === 'es' ? 'Suspendido' : 'Suspended'}</option>
            </select>
          </div>
        </div>

        {/* Filter results info banner */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
          <span>
            {language === 'es'
              ? `Mostrando ${filteredUsers.length} de ${users.length} usuarios en Firestore`
              : `Showing ${filteredUsers.length} of ${users.length} users in Firestore`}
          </span>
          {(searchTerm || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedRoleFilter('all');
                setSelectedStatusFilter('all');
              }}
              className="text-red-500 hover:text-red-400 underline cursor-pointer"
            >
              {language === 'es' ? 'Limpiar filtros' : 'Reset filters'}
            </button>
          )}
        </div>
      </div>

      {/* Toast alert banner */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
          toastMessage.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
            : toastMessage.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
            : 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
        }`}>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:opacity-75 cursor-pointer text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* REQUIREMENT 2: TABLA DE USUARIOS DIRECTAMENTE DE FIRESTORE */}
      <div className={`rounded-3xl border shadow-xl overflow-hidden backdrop-blur-xl ${
        isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-mono font-extrabold uppercase tracking-wider ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 text-slate-400'
                  : 'bg-slate-100/90 border-slate-200 text-slate-600'
              }`}>
                <th className="py-4 px-4 sm:px-6">{language === 'es' ? 'Usuario' : 'User'}</th>
                <th className="py-4 px-4">{language === 'es' ? 'Correo Electrónico' : 'Email'}</th>
                <th className="py-4 px-4 hidden md:table-cell">{language === 'es' ? 'Sector / Barrio' : 'Quadrant'}</th>
                <th className="py-4 px-4">{language === 'es' ? 'Fecha Registro' : 'Registered'}</th>
                <th className="py-4 px-4">{language === 'es' ? 'Rol' : 'Role'}</th>
                <th className="py-4 px-4">{language === 'es' ? 'Estado' : 'Status'}</th>
                <th className="py-4 px-4 sm:px-6 text-right">{language === 'es' ? 'Acciones' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs sm:text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                      <span className="font-mono text-xs">
                        {language === 'es' ? 'Consultando colección "usuarios" en Firestore...' : 'Querying "usuarios" collection in Firestore...'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Users className="w-8 h-8 text-slate-400 mb-1" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        {language === 'es' ? 'No se encontraron usuarios' : 'No users found'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {searchTerm
                          ? language === 'es' ? 'Intenta modificar el término de búsqueda.' : 'Try adjusting the search query.'
                          : language === 'es' ? 'Haz clic en "Población Comunal (Seed)" para sembrar usuarios de prueba.' : 'Click "Seed Population" to populate sample users.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentLoggedUser = user.uid === currentUserId;
                  const initial = user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U';

                  return (
                    <tr
                      key={user.uid}
                      className={`transition-colors group ${
                        isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Col 1: Avatar + Name + Current User Badge */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shadow-xs border ${
                              user.rol === 'administrador'
                                ? 'bg-gradient-to-tr from-amber-600 to-red-600 text-white border-amber-400/50'
                                : user.rol === 'operador'
                                ? 'bg-gradient-to-tr from-blue-700 to-indigo-600 text-white border-blue-400/50'
                                : 'bg-gradient-to-tr from-slate-700 to-slate-600 text-white border-slate-500/40'
                            }`}>
                              {initial}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                                isDark ? 'border-slate-950' : 'border-white'
                              } ${user.estado === 'activo' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate max-w-[140px] sm:max-w-[180px]">
                                {user.nombre}
                              </span>
                              {isCurrentLoggedUser && (
                                <span className="px-1.5 py-0.2 rounded-md bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 font-mono text-[9px] font-extrabold border border-red-300 dark:border-red-800">
                                  TÚ
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[140px]">
                              UID: {user.uid.slice(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Correo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px] sm:max-w-[200px] text-xs font-medium">
                            {user.correo}
                          </span>
                        </div>
                      </td>

                      {/* Col 3: Sector Comuna 8 */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="truncate max-w-[140px] text-xs">
                            {user.sector}
                          </span>
                        </div>
                      </td>

                      {/* Col 4: Fecha Registro */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.fechaRegistro}</span>
                        </div>
                      </td>

                      {/* Col 5: Rol (Badge táctico) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold font-mono uppercase tracking-wide border ${
                          user.rol === 'administrador'
                            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800'
                            : user.rol === 'operador'
                            ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                          {user.rol === 'administrador' ? (
                            <Shield className="w-3 h-3 text-red-600" />
                          ) : user.rol === 'operador' ? (
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                          ) : (
                            <Users className="w-3 h-3 text-slate-500" />
                          )}
                          <span>{user.rol}</span>
                        </span>
                      </td>

                      {/* Col 6: Estado (Badge Activo / Suspendido) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wide border ${
                          user.estado === 'activo'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 animate-pulse'
                        }`}>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.estado === 'activo' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{user.estado}</span>
                        </span>
                      </td>

                      {/* Col 7: Acciones por usuario */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Acción 1: Cambiar rol */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForRoleChange(user);
                              setPendingRole(user.rol);
                            }}
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-red-500'
                                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:border-red-400'
                            }`}
                            title="Cambiar rol en Firestore"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                            <span className="hidden lg:inline">{language === 'es' ? 'Rol' : 'Role'}</span>
                          </button>

                          {/* Acción 2: Suspender / Reactivar */}
                          <button
                            type="button"
                            onClick={() => setSelectedUserForStatusToggle(user)}
                            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                              user.estado === 'activo'
                                ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                            }`}
                            title={user.estado === 'activo' ? 'Suspender cuenta' : 'Reactivar cuenta'}
                          >
                            {user.estado === 'activo' ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-rose-600" />
                                <span className="hidden lg:inline">{language === 'es' ? 'Suspender' : 'Suspend'}</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden lg:inline">{language === 'es' ? 'Reactivar' : 'Reactivate'}</span>
                              </>
                            )}
                          </button>

                          {/* Acción 3: Ver perfil detallado */}
                          <button
                            type="button"
                            onClick={() => setSelectedUserForDetail(user)}
                            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            title="Ver perfil completo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{language === 'es' ? 'Detalles' : 'Details'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL 1: VER PERFIL DETALLADO               */}
      {/* ========================================== */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden relative ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header accent strip */}
            <div className="h-2 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

            <div className="p-6 sm:p-7 space-y-6">
              {/* Modal Top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-red-900/30 border border-red-400">
                    {selectedUserForDetail.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">
                      EXPEDIENTE COMUNAL // FIRESTORE
                    </span>
                    <h3 className="text-xl font-black font-['Rajdhani'] tracking-wide">
                      {selectedUserForDetail.nombre}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{selectedUserForDetail.correo}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUserForDetail(null)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Role badges */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold uppercase border ${
                  selectedUserForDetail.rol === 'administrador'
                    ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800'
                    : selectedUserForDetail.rol === 'operador'
                    ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                    : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                }`}>
                  <Shield className="w-3.5 h-3.5" />
                  Rol: {selectedUserForDetail.rol}
                </span>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                  selectedUserForDetail.estado === 'activo'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedUserForDetail.estado === 'activo' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  Estado: {selectedUserForDetail.estado}
                </span>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Field: Sector */}
                <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Sector / Cuadrante</span>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span>{selectedUserForDetail.sector}</span>
                  </div>
                </div>

                {/* Field: Fecha Registro */}
                <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Fecha de Registro</span>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>{selectedUserForDetail.fechaRegistro}</span>
                  </div>
                </div>

                {/* Field: Último Acceso */}
                <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Última Conexión</span>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="truncate">
                      {selectedUserForDetail.ultimoAcceso && selectedUserForDetail.ultimoAcceso !== 'No registrado'
                        ? new Date(selectedUserForDetail.ultimoAcceso).toLocaleString('es-CO')
                        : 'Reciente'}
                    </span>
                  </div>
                </div>

                {/* Field: UID de Firebase */}
                <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Firebase UID</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold truncate max-w-[150px]">
                      {selectedUserForDetail.uid}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyUid(selectedUserForDetail.uid)}
                      className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title="Copiar UID"
                    >
                      {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status explanation notice */}
              {selectedUserForDetail.estado === 'suspendido' ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Cuenta actualmente suspendida:</strong> El usuario tiene bloqueado el acceso al sistema de Security Urban. Si intenta iniciar sesión, su acceso será denegado inmediatamente con aviso administrativo.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Cuenta activa y autorizada:</strong> Este usuario puede autenticarse, reportar incidencias en Comuna 8 y acceder a las herramientas según su rango táctico.
                  </p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const u = selectedUserForDetail;
                    setSelectedUserForDetail(null);
                    setSelectedUserForRoleChange(u);
                    setPendingRole(u.rol);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>{language === 'es' ? 'Cambiar Rol' : 'Change Role'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const u = selectedUserForDetail;
                    setSelectedUserForDetail(null);
                    setSelectedUserForStatusToggle(u);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer text-white ${
                    selectedUserForDetail.estado === 'activo'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {selectedUserForDetail.estado === 'activo' ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Suspender Cuenta' : 'Suspend Account'}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Reactivar Cuenta' : 'Reactivate Account'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: CAMBIAR ROL                        */}
      {/* ========================================== */}
      {selectedUserForRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="h-2 bg-gradient-to-r from-amber-500 to-red-600" />

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">
                    {language === 'es' ? 'Cambiar Rol de Acceso' : 'Change Access Role'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedUserForRoleChange.nombre} ({selectedUserForRoleChange.correo})
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'es'
                  ? 'Selecciona el nuevo nivel de privilegios para este usuario en Firestore. El cambio surtirá efecto inmediatamente en toda la plataforma.'
                  : 'Select the new privilege level for this user in Firestore. The change takes effect immediately.'}
              </p>

              {/* Role Radio Group */}
              <div className="space-y-2.5">
                {[
                  {
                    id: 'ciudadano',
                    label: language === 'es' ? 'Ciudadano (Agente Comunal)' : 'Citizen (Community Agent)',
                    desc: language === 'es' ? 'Reporte de incidentes, consulta de mapas y rutas seguras.' : 'Incident reporting, risk map, safe routes.',
                    icon: <Users className="w-4 h-4 text-slate-400" />,
                  },
                  {
                    id: 'operador',
                    label: language === 'es' ? 'Operador Táctico' : 'Tactical Operator',
                    desc: language === 'es' ? 'Despacho de patrullas, gestión de alertas y apoyo táctico.' : 'Patrol dispatch, tactical support, alerts.',
                    icon: <ShieldCheck className="w-4 h-4 text-blue-500" />,
                  },
                  {
                    id: 'administrador',
                    label: language === 'es' ? 'Administrador' : 'Administrator',
                    desc: language === 'es' ? 'Acceso total: gestión de usuarios, roles, configuración y telemetría.' : 'Full access: user management, roles, telemetry.',
                    icon: <Shield className="w-4 h-4 text-red-500" />,
                  },
                ].map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                      pendingRole === option.id
                        ? 'bg-red-50/80 border-red-500 dark:bg-red-950/40 dark:border-red-500 ring-2 ring-red-500/20'
                        : isDark
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="roleOption"
                      value={option.id}
                      checked={pendingRole === option.id}
                      onChange={() => setPendingRole(option.id as UserRole)}
                      className="mt-1 text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span className="font-bold text-xs sm:text-sm">{option.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {option.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRoleChange(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isUpdatingAction}
                  onClick={handleConfirmRoleChange}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{language === 'es' ? 'Guardar en Firestore' : 'Save to Firestore'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: CONFIRMAR SUSPENDER / REACTIVAR   */}
      {/* ========================================== */}
      {selectedUserForStatusToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div
              className={`h-2 ${
                selectedUserForStatusToggle.estado === 'activo'
                  ? 'bg-rose-600'
                  : 'bg-emerald-500'
              }`}
            />

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    selectedUserForStatusToggle.estado === 'activo'
                      ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                  }`}
                >
                  {selectedUserForStatusToggle.estado === 'activo' ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Unlock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">
                    {selectedUserForStatusToggle.estado === 'activo'
                      ? language === 'es' ? '¿Suspender Cuenta Comunal?' : 'Suspend Community Account?'
                      : language === 'es' ? '¿Reactivar Cuenta Comunal?' : 'Reactivate Community Account?'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedUserForStatusToggle.nombre}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedUserForStatusToggle.estado === 'activo' ? (
                  language === 'es' ? (
                    <>
                      Al suspender a este usuario, su campo <strong>estado</strong> en Firestore cambiará a <strong>"suspendido"</strong>. Si el usuario intenta autenticarse o ya tiene una sesión abierta, el sistema bloqueará su acceso de inmediato con el mensaje: <em>"Tu cuenta ha sido suspendida, contacta al administrador."</em>
                    </>
                  ) : (
                    <>
                      By suspending this user, their Firestore <strong>estado</strong> will be set to <strong>"suspendido"</strong>. When they log in, access will be blocked immediately.
                    </>
                  )
                ) : (
                  language === 'es' ? (
                    <>
                      Al reactivar la cuenta, el campo <strong>estado</strong> en Firestore cambiará a <strong>"activo"</strong>, restaurando el acceso normal del usuario a la plataforma de la Comuna 8.
                    </>
                  ) : (
                    <>
                      By reactivating this account, the Firestore status will be set to <strong>"activo"</strong>, restoring normal access.
                    </>
                  )
                )}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedUserForStatusToggle(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isUpdatingAction}
                  onClick={handleConfirmStatusToggle}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 ${
                    selectedUserForStatusToggle.estado === 'activo'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/30'
                  }`}
                >
                  {isUpdatingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {selectedUserForStatusToggle.estado === 'activo'
                      ? language === 'es' ? 'Confirmar Suspensión' : 'Confirm Suspension'
                      : language === 'es' ? 'Confirmar Reactivación' : 'Confirm Reactivation'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
