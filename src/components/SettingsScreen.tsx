import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Globe,
  Moon,
  Sun,
  Bell,
  Navigation,
  Key,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Save,
  ArrowLeft,
  School,
  Lock,
  ChevronDown,
  Layers,
  Sparkles,
  Send,
  Eye,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole, FirestoreUser, UserPreferences } from '../types/user';
import {
  getFirestoreUserProfile,
  updateUserProfileAndFirestore,
  deleteUserAccountAndFirestore,
  saveUserPreferences,
} from '../services/userService';
import {
  executePasswordReset,
  executeSendEmailVerification,
  executeSignOut,
} from '../services/firebaseAuth';
import { ModalPortal } from './ModalPortal';

// Established sectors of Comuna 8 (Villa Hermosa)
export const COMUNA_8_SECTORS_LIST = [
  'Sucre',
  'El Pinal',
  'Trece de Noviembre',
  'La Libertad',
  'Llanaditas',
  'San Antonio',
  'Las Estancias',
  'Villa Turbay',
  'Villatina',
  'Enciso',
  'La Ladera',
  'Villa Hermosa',
  'Los Mangos',
  'Boston',
] as const;

interface SettingsScreenProps {
  currentUser: FirebaseUser | null;
  currentUserRole?: UserRole;
  onNavigateHome: () => void;
  onSignOut: () => void;
  initialSection?: 'profile' | 'preferences' | 'security' | 'privacy' | 'about' | 'danger';
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentUser,
  currentUserRole = 'ciudadano',
  onNavigateHome,
  onSignOut,
  initialSection = 'profile',
}) => {
  const { theme, toggleTheme, colors } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const isDark = theme === 'dark';

  // Active section tab for quick jump
  const [activeSection, setActiveSection] = useState<string>(initialSection);

  // Firestore user data state
  const [firestoreProfile, setFirestoreProfile] = useState<FirestoreUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  // Section 1: Profile form state
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [customSectorText, setCustomSectorText] = useState<string>('');
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Section 2: Preferences state
  const [notifPush, setNotifPush] = useState<boolean>(true);
  const [notifReportes, setNotifReportes] = useState<boolean>(true);
  const [notifApoyo, setNotifApoyo] = useState<boolean>(true);
  const [compartirUbicacion, setCompartirUbicacion] = useState<boolean>(() => {
    return localStorage.getItem('security_urban_auto_geolocation') === 'true';
  });

  // Section 3: Security state
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState<boolean>(false);
  const [verificationSuccessMsg, setVerificationSuccessMsg] = useState<string | null>(null);

  // Section 4: Privacy state
  const [perfilVisibleComunidad, setPerfilVisibleComunidad] = useState<boolean>(true);

  // Section 6: Danger Zone state (Double confirmation modal)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>('');
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  const profileAlertRef = useRef<HTMLDivElement | null>(null);
  const securityAlertRef = useRef<HTMLDivElement | null>(null);
  const deleteAlertRef = useRef<HTMLDivElement | null>(null);

  // PROMPT 3: Auto-scroll to feedback messages when they appear
  useEffect(() => {
    if ((profileSuccessMsg || profileErrorMsg) && profileAlertRef.current) {
      profileAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [profileSuccessMsg, profileErrorMsg]);

  useEffect(() => {
    if ((resetSuccessMsg || verificationSuccessMsg) && securityAlertRef.current) {
      securityAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [resetSuccessMsg, verificationSuccessMsg]);

  useEffect(() => {
    if (deleteErrorMsg && deleteAlertRef.current) {
      deleteAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [deleteErrorMsg]);

  // Fetch initial Firestore profile
  useEffect(() => {
    if (!currentUser) {
      setIsLoadingProfile(false);
      return;
    }

    let isMounted = true;
    setIsLoadingProfile(true);

    getFirestoreUserProfile(currentUser.uid)
      .then((profile) => {
        if (!isMounted) return;
        if (profile) {
          setFirestoreProfile(profile);
          setNombre(profile.nombre || currentUser.displayName || '');
          setTelefono(profile.telefono || '');

          // Check if sector is in standard list
          const foundSector = COMUNA_8_SECTORS_LIST.find(
            (s) => s.toLowerCase() === (profile.sector || '').toLowerCase()
          );
          if (foundSector) {
            setSelectedSector(foundSector);
          } else if (profile.sector) {
            setSelectedSector('otro');
            setCustomSectorText(profile.sector);
          } else {
            setSelectedSector('');
          }

          // Preferences
          if (profile.preferencias) {
            if (profile.preferencias.notificaciones) {
              setNotifPush(profile.preferencias.notificaciones.alertasPush ?? true);
              setNotifReportes(profile.preferencias.notificaciones.actualizacionesReportes ?? true);
              setNotifApoyo(profile.preferencias.notificaciones.apoyoTactico ?? true);
            }
            if (profile.preferencias.compartirUbicacion !== undefined) {
              setCompartirUbicacion(profile.preferencias.compartirUbicacion);
              localStorage.setItem('security_urban_auto_geolocation', String(profile.preferencias.compartirUbicacion));
            }
            if (profile.preferencias.perfilVisibleComunidad !== undefined) {
              setPerfilVisibleComunidad(profile.preferencias.perfilVisibleComunidad);
            }
          }
        } else {
          // Defaults from Auth
          setNombre(currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : ''));
        }
      })
      .catch((err) => {
        console.warn('[SettingsScreen] Error cargando perfil:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Derived user avatar initials
  const avatarInitials = useMemo(() => {
    const raw = nombre.trim() || currentUser?.displayName || currentUser?.email || 'U';
    const parts = raw.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [nombre, currentUser]);

  // Handle saving Profile (Section 1)
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    const finalSector = selectedSector === 'otro' 
      ? (customSectorText.trim() || 'Comuna 8 - Sector Personalizado')
      : selectedSector;

    try {
      const updated = await updateUserProfileAndFirestore(currentUser, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        sector: finalSector,
        preferencias: {
          notificaciones: {
            alertasPush: notifPush,
            actualizacionesReportes: notifReportes,
            apoyoTactico: notifApoyo,
          },
          compartirUbicacion,
          perfilVisibleComunidad,
        },
      });

      setFirestoreProfile(updated);
      setProfileSuccessMsg(
        language === 'es'
          ? '✔ Perfil actualizado en Firebase Auth y Firestore con éxito.'
          : '✔ Profile successfully synced with Firebase Auth and Firestore.'
      );

      setTimeout(() => {
        setProfileSuccessMsg(null);
      }, 4000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setProfileErrorMsg(
        language === 'es'
          ? `Error al sincronizar perfil: ${errorMsg}`
          : `Failed to update profile: ${errorMsg}`
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Preference updates
  const handleTogglePreference = async (
    key: 'notifPush' | 'notifReportes' | 'notifApoyo' | 'compartirUbicacion' | 'perfilVisible',
    value: boolean
  ) => {
    if (!currentUser) return;

    let newPush = notifPush;
    let newReportes = notifReportes;
    let newApoyo = notifApoyo;
    let newGeo = compartirUbicacion;
    let newVisible = perfilVisibleComunidad;

    if (key === 'notifPush') {
      newPush = value;
      setNotifPush(value);
    } else if (key === 'notifReportes') {
      newReportes = value;
      setNotifReportes(value);
    } else if (key === 'notifApoyo') {
      newApoyo = value;
      setNotifApoyo(value);
    } else if (key === 'compartirUbicacion') {
      newGeo = value;
      setCompartirUbicacion(value);
      localStorage.setItem('security_urban_auto_geolocation', String(value));
    } else if (key === 'perfilVisible') {
      newVisible = value;
      setPerfilVisibleComunidad(value);
    }

    try {
      const newPrefs: UserPreferences = {
        notificaciones: {
          alertasPush: newPush,
          actualizacionesReportes: newReportes,
          apoyoTactico: newApoyo,
        },
        compartirUbicacion: newGeo,
        perfilVisibleComunidad: newVisible,
      };
      await saveUserPreferences(currentUser.uid, newPrefs);
    } catch (err) {
      console.warn('[SettingsScreen] No se pudieron persistir preferencias de inmediato:', err);
    }
  };

  // Handle Password Reset (Section 3)
  const handleRequestPasswordReset = async () => {
    if (!currentUser || !currentUser.email) return;

    setIsSendingReset(true);
    setResetSuccessMsg(null);

    try {
      await executePasswordReset(currentUser.email);
      setResetSuccessMsg(
        language === 'es'
          ? `✔ Enlace de restablecimiento enviado a ${currentUser.email}. Revisa tu bandeja de entrada o spam.`
          : `✔ Password reset link sent to ${currentUser.email}. Check your inbox or spam folder.`
      );
      setTimeout(() => setResetSuccessMsg(null), 6000);
    } catch (err) {
      console.error('[SettingsScreen] Error enviando reset email:', err);
    } finally {
      setIsSendingReset(false);
    }
  };

  // Handle Email Verification resend (Section 3)
  const handleResendEmailVerification = async () => {
    if (!currentUser) return;
    setIsSendingVerification(true);
    setVerificationSuccessMsg(null);

    try {
      const res = await executeSendEmailVerification(currentUser);
      if (res.success) {
        setVerificationSuccessMsg(
          language === 'es'
            ? `✔ Correo de verificación reenviado a ${currentUser.email}.`
            : `✔ Verification email sent to ${currentUser.email}.`
        );
        setTimeout(() => setVerificationSuccessMsg(null), 6000);
      }
    } catch (err) {
      console.error('[SettingsScreen] Error reenviando verificación:', err);
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Handle Account Deletion with double confirmation (Section 6)
  const handleConfirmDeleteAccount = async () => {
    if (!currentUser) return;
    if (deleteConfirmationText.trim().toUpperCase() !== 'ELIMINAR') {
      setDeleteErrorMsg(
        language === 'es'
          ? 'Debes escribir exactamente la palabra "ELIMINAR" para confirmar.'
          : 'You must type "ELIMINAR" exactly to confirm.'
      );
      return;
    }

    setIsDeletingAccount(true);
    setDeleteErrorMsg(null);

    try {
      const result = await deleteUserAccountAndFirestore(currentUser);
      if (result.success) {
        setIsDeleteModalOpen(false);
        onSignOut();
      } else {
        setDeleteErrorMsg(result.error || 'Error desconocido al eliminar la cuenta.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setDeleteErrorMsg(errorMsg);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Registration date formatter
  const formattedCreationDate = useMemo(() => {
    if (currentUser?.metadata?.creationTime) {
      try {
        const d = new Date(currentUser.metadata.creationTime);
        return d.toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return currentUser.metadata.creationTime;
      }
    }
    return firestoreProfile?.fechaRegistro || 'Reciente (Comuna 8)';
  }, [currentUser, firestoreProfile, language]);

  return (
    <div className={`w-full min-h-[calc(100vh-4rem)] p-3 sm:p-6 md:p-8 transition-colors ${colors.canvasBg} ${colors.canvasText}`}>
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs'
              }`}
              title={language === 'es' ? 'Volver al Inicio' : 'Back to Home'}
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-500">
                  SISTEMA // AJUSTES & PREFERENCIAS
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800">
                  COMUNA 8
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {language === 'es' ? 'Ajustes del Sistema' : 'System Settings'}
              </h1>
            </div>
          </div>

          {/* Quick Jump Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href="#perfil"
              onClick={() => setActiveSection('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeSection === 'profile'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              1. {language === 'es' ? 'Perfil' : 'Profile'}
            </a>
            <a
              href="#preferencias"
              onClick={() => setActiveSection('preferences')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeSection === 'preferences'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              2. {language === 'es' ? 'Preferencias' : 'Preferences'}
            </a>
            <a
              href="#seguridad"
              onClick={() => setActiveSection('security')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeSection === 'security'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              3. {language === 'es' ? 'Seguridad' : 'Security'}
            </a>
            <a
              href="#privacidad"
              onClick={() => setActiveSection('privacy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeSection === 'privacy'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              4. {language === 'es' ? 'Privacidad' : 'Privacy'}
            </a>
            <a
              href="#acerca-de"
              onClick={() => setActiveSection('about')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeSection === 'about'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              5. {language === 'es' ? 'Acerca de' : 'About'}
            </a>
            <a
              href="#zona-peligro"
              onClick={() => setActiveSection('danger')}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-900/80 transition-all"
            >
              6. {language === 'es' ? 'Zona Peligro' : 'Danger Zone'}
            </a>
          </div>
        </div>

        {/* =========================================================================
            SECCIÓN 1: PERFIL DEL USUARIO
        ========================================================================= */}
        <section id="perfil" className="scroll-mt-32 lg:scroll-mt-40">
          <div className={`rounded-3xl border p-5 sm:p-7 md:p-8 backdrop-blur-md shadow-lg transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
              : 'bg-white/90 border-slate-200 shadow-slate-200/50'
          }`}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-500">
                  SECCIÓN 1 // SINCRONIZACIÓN FIREBASE AUTH & FIRESTORE
                </span>
                <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {language === 'es' ? 'Perfil del Usuario' : 'User Profile'}
                </h2>
              </div>
            </div>

            {/* Profile Overview Card: Avatar + Role Badge + Verification */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 mb-6">
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-red-900/30 border-2 border-red-400/50">
                  {avatarInitials}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 p-1 rounded-full bg-emerald-500 text-white border-2 border-slate-900 shadow-xs" title="En línea">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    {nombre || currentUser?.displayName || 'Usuario Comuna 8'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-wider ${
                    currentUserRole === 'administrador'
                      ? 'bg-red-600 text-white shadow-xs'
                      : currentUserRole === 'operador'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {currentUserRole === 'administrador'
                      ? 'ADMINISTRADOR'
                      : currentUserRole === 'operador'
                      ? 'OPERADOR TÁCTICO'
                      : 'CIUDADANO'}
                  </span>
                  {currentUser?.emailVerified ? (
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {language === 'es' ? 'Verificado' : 'Verified'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {language === 'es' ? 'No verificado' : 'Unverified'}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{currentUser?.email || 'Sin correo asociado'}</span>
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>
                    {language === 'es' ? 'Sector de residencia:' : 'Residence sector:'}{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedSector === 'otro'
                        ? (customSectorText || (language === 'es' ? 'No hay información registrada' : 'No information recorded'))
                        : (selectedSector || (language === 'es' ? 'No hay información registrada' : 'No information recorded'))}
                    </strong>
                  </span>
                </p>
              </div>
            </div>

            {/* Profile Editable Form */}
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-red-500" />
                    <span>{language === 'es' ? 'Nombre Completo' : 'Full Name'}</span>
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder={language === 'es' ? 'Ej. Juan Carlos Pérez' : 'e.g. John Doe'}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-red-500/30 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-red-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-600'
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {language === 'es'
                      ? 'Actualiza tu nombre en Firebase Auth (displayName) y en el documento de Firestore.'
                      : 'Updates your name in Firebase Auth (displayName) and in Firestore document.'}
                  </p>
                </div>

                {/* 2. Email Address (READ-ONLY) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'es' ? 'Correo Electrónico (Solo Lectura)' : 'Email Address (Read-Only)'}</span>
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Auth Locked
                    </span>
                  </div>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    readOnly
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono cursor-not-allowed bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {language === 'es'
                      ? 'Gestionado exclusivamente por las credenciales de Firebase Authentication.'
                      : 'Managed exclusively via Firebase Authentication credentials.'}
                  </p>
                </div>

                {/* 3. Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-red-500" />
                    <span>{language === 'es' ? 'Teléfono de Contacto' : 'Contact Phone'}</span>
                  </label>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+57 300 123 4567"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono transition-all focus:outline-hidden focus:ring-2 focus:ring-red-500/30 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-red-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-red-600'
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {language === 'es'
                      ? 'Utilizado para alertas de emergencia y soporte en cuadrante de la Comuna 8.'
                      : 'Used for emergency alerts and support in Comuna 8 quadrant.'}
                  </p>
                </div>

                {/* 4. Sector de Residencia (Selector with 'Otro') */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>{language === 'es' ? 'Sector de Residencia (Comuna 8)' : 'Residence Sector'}</span>
                  </label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsSectorDropdownOpen((prev) => !prev)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm text-left flex items-center justify-between transition-all cursor-pointer ${
                        isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-100 hover:border-slate-700'
                          : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400'
                      }`}
                    >
                      <span className="font-medium">
                        {selectedSector === 'otro'
                          ? `✏️ ${language === 'es' ? 'Otro (Especificar)' : 'Other (Specify)'}`
                          : selectedSector || (language === 'es' ? 'No hay información registrada (Seleccionar)' : 'No information recorded (Select)')}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isSectorDropdownOpen ? 'rotate-180 text-red-500' : 'text-slate-400'}`} />
                    </button>

                    {/* Sector Dropdown Menu */}
                    {isSectorDropdownOpen && (
                      <div className={`absolute z-30 w-full mt-1 max-h-60 overflow-y-auto rounded-2xl border shadow-xl backdrop-blur-md p-1.5 ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        <div className="px-2 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          {language === 'es' ? 'Sectores Comuna 8' : 'Comuna 8 Sectors'}
                        </div>
                        {COMUNA_8_SECTORS_LIST.map((sectorName) => (
                          <button
                            key={sectorName}
                            type="button"
                            onClick={() => {
                              setSelectedSector(sectorName);
                              setIsSectorDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-xs text-left font-medium transition-colors flex items-center justify-between cursor-pointer ${
                              selectedSector === sectorName
                                ? 'bg-red-600 text-white font-bold'
                                : isDark
                                ? 'hover:bg-slate-800 text-slate-200'
                                : 'hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <span>{sectorName}</span>
                            {selectedSector === sectorName && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                        <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSector('otro');
                            setIsSectorDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-xs text-left font-medium transition-colors flex items-center justify-between cursor-pointer ${
                            selectedSector === 'otro'
                              ? 'bg-red-600 text-white font-bold'
                              : isDark
                              ? 'hover:bg-slate-800 text-slate-200'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>✏️</span>
                            <span>{language === 'es' ? 'Otro (Escribir manualmente)' : 'Other (Manual entry)'}</span>
                          </span>
                          {selectedSector === 'otro' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Manual input if "Otro" is chosen */}
                  {selectedSector === 'otro' && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <input
                        type="text"
                        value={customSectorText}
                        onChange={(e) => setCustomSectorText(e.target.value)}
                        placeholder={language === 'es' ? 'Especifica tu barrio o sector (ej. Los Mangos Alto)' : 'Specify your neighborhood or sector'}
                        required
                        className={`w-full px-4 py-2 rounded-xl border text-sm font-medium ${
                          isDark
                            ? 'bg-slate-950 border-amber-500/50 text-slate-100 focus:border-amber-400'
                            : 'bg-amber-50/50 border-amber-300 text-slate-900 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Save Profile Button */}
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{language === 'es' ? 'Sincronizando...' : 'Syncing...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{language === 'es' ? 'Guardar Cambios de Perfil' : 'Save Profile Changes'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* PROMPT 3: Profile feedback alerts positioned directly below the submit action */}
              {(profileSuccessMsg || profileErrorMsg) && (
                <div ref={profileAlertRef} className="pt-3">
                  {profileSuccessMsg && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center gap-3 animate-in fade-in duration-200 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}
                  {profileErrorMsg && (
                    <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-3 animate-in fade-in duration-200 shadow-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </section>

        {/* =========================================================================
            SECCIÓN 2: PREFERENCIAS DE LA APP
        ========================================================================= */}
        <section id="preferencias" className="scroll-mt-32 lg:scroll-mt-40">
          <div className={`rounded-3xl border p-5 sm:p-7 md:p-8 backdrop-blur-md shadow-lg transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
              : 'bg-white/90 border-slate-200 shadow-slate-200/50'
          }`}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                  SECCIÓN 2 // PERSONALIZACIÓN & TELEMETRÍA
                </span>
                <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {language === 'es' ? 'Preferencias de la Aplicación' : 'Application Preferences'}
                </h2>
              </div>
            </div>

            <div className="space-y-6">
              {/* Row 1: Language & Theme synchronized with Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Language Selector */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        {language === 'es' ? 'Idioma de Interfaz' : 'Interface Language'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400">
                      {language.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'es'
                      ? 'Sincronizado en tiempo real con el selector del encabezado.'
                      : 'Synchronized in real-time with the header control.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setLanguage('es')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        language === 'es'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>🇨🇴</span>
                      <span>Español (ES)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        language === 'en'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>🇺🇸</span>
                      <span>English (EN)</span>
                    </button>
                  </div>
                </div>

                {/* Theme Mode Selector */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isDark ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        {language === 'es' ? 'Tema Visual (HUD)' : 'Visual Theme (HUD)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {isDark ? 'DARK HUD' : 'LIGHT HUD'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'es'
                      ? 'Alterna entre el modo táctico oscuro y el modo claro de alta visibilidad.'
                      : 'Toggle between tactical dark HUD and high-contrast light mode.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isDark) toggleTheme();
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        !isDark
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Modo Claro' : 'Light Mode'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDark) toggleTheme();
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isDark
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>{language === 'es' ? 'Modo Oscuro' : 'Dark Mode'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Notifications Toggles */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    {language === 'es' ? 'Canales de Notificación y Alertas' : 'Notification Channels & Alerts'}
                  </span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {/* Push alerts */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {language === 'es' ? 'Alertas push simuladas en tiempo real' : 'Real-time simulated push alerts'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'es'
                          ? 'Avisos de incidentes críticos o de alta prioridad en cuadrantes cercanos de la Comuna 8.'
                          : 'Critical or high priority incident notices in nearby Comuna 8 quadrants.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePreference('notifPush', !notifPush)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        notifPush ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={notifPush}
                    >
                      <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                        notifPush ? 'translate-x-6.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Report updates */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {language === 'es' ? 'Actualizaciones de reportes ciudadanos' : 'Citizen report status updates'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'es'
                          ? 'Notificaciones cuando un reporte tuyo sea verificado, asignado o atendido por el cuadrante.'
                          : 'Notifications when your report is verified, assigned, or resolved.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePreference('notifReportes', !notifReportes)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        notifReportes ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={notifReportes}
                    >
                      <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                        notifReportes ? 'translate-x-6.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Tactical support */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {language === 'es' ? 'Notificaciones de Apoyo Táctico y patrullas' : 'Tactical Support & patrol alerts'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {language === 'es'
                          ? 'Avisos de unidades policiales o red vecinal desplegada en el perímetro.'
                          : 'Alerts of police units or neighborhood watch deployed nearby.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePreference('notifApoyo', !notifApoyo)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        notifApoyo ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={notifApoyo}
                    >
                      <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                        notifApoyo ? 'translate-x-6.5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Real-time Geolocation sharing toggle */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {language === 'es' ? 'Compartir ubicación en tiempo real automáticamente' : 'Auto-share real-time location'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'es'
                      ? 'Determina si el botón de geolocalización se activa automáticamente en Mapa de Riesgo, Rutas y Apoyo Táctico, o si la app solicita confirmación cada vez.'
                      : 'Determines if geolocation is automatically queried in Risk Map, Safe Routes, and Tactical Support, or requests confirmation each time.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference('compartirUbicacion', !compartirUbicacion)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    compartirUbicacion ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={compartirUbicacion}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                    compartirUbicacion ? 'translate-x-6.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECCIÓN 3: SEGURIDAD
        ========================================================================= */}
        <section id="seguridad" className="scroll-mt-32 lg:scroll-mt-40">
          <div className={`rounded-3xl border p-5 sm:p-7 md:p-8 backdrop-blur-md shadow-lg transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
              : 'bg-white/90 border-slate-200 shadow-slate-200/50'
          }`}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-500">
                  SECCIÓN 3 // ACCESO & CREDENCIALES
                </span>
                <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {language === 'es' ? 'Seguridad de la Cuenta' : 'Account Security'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Account Metadata Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {language === 'es' ? 'Expediente de Registro' : 'Registration Record'}
                </div>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{language === 'es' ? 'Fecha de Creación:' : 'Creation Date:'}</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{formattedCreationDate}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{language === 'es' ? 'Verificación de Correo:' : 'Email Verification:'}</span>
                    {currentUser?.emailVerified ? (
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {language === 'es' ? 'Verificado' : 'Verified'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {language === 'es' ? 'Pendiente' : 'Pending'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{language === 'es' ? 'UID Firebase:' : 'Firebase UID:'}</span>
                    <span className="font-mono text-[11px] text-slate-500 truncate max-w-[180px]">{currentUser?.uid}</span>
                  </div>
                </div>

                {!currentUser?.emailVerified && (
                  <button
                    type="button"
                    onClick={handleResendEmailVerification}
                    disabled={isSendingVerification}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingVerification ? 'Enviando...' : 'Reenviar Correo de Verificación'}</span>
                  </button>
                )}

                {/* PROMPT 3: Verification alert positioned directly below the action */}
                {verificationSuccessMsg && (
                  <div ref={securityAlertRef} className="mt-2 p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{verificationSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* Password & Session Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {language === 'es' ? 'Acciones de Seguridad' : 'Security Actions'}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'es'
                      ? 'Puedes solicitar el restablecimiento de tu contraseña mediante Firebase Auth o cerrar tu sesión en este terminal.'
                      : 'You can request a password reset via Firebase Auth or sign out from this device.'}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleRequestPasswordReset}
                    disabled={isSendingReset}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingReset ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4 text-red-500" />
                    )}
                    <span>{language === 'es' ? 'Cambiar Contraseña (Reset por Correo)' : 'Change Password (Reset Email)'}</span>
                  </button>

                  {/* PROMPT 3: Reset password alert positioned directly below the action */}
                  {resetSuccessMsg && (
                    <div ref={securityAlertRef} className="p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>{resetSuccessMsg}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900/60 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{language === 'es' ? 'Cerrar Sesión Activa' : 'Sign Out Active Session'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECCIÓN 4: PRIVACIDAD
        ========================================================================= */}
        <section id="privacidad" className="scroll-mt-32 lg:scroll-mt-40">
          <div className={`rounded-3xl border p-5 sm:p-7 md:p-8 backdrop-blur-md shadow-lg transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
              : 'bg-white/90 border-slate-200 shadow-slate-200/50'
          }`}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                  SECCIÓN 4 // POLÍTICA DE DATOS
                </span>
                <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {language === 'es' ? 'Privacidad & Red Comunitaria' : 'Privacy & Community Network'}
                </h2>
              </div>
            </div>

            <div className="space-y-5">
              {/* Community visibility toggle */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {language === 'es'
                        ? 'Perfil visible en la red de apoyo comunitaria'
                        : 'Profile visible in community support network'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === 'es'
                      ? 'Permite que líderes comunitarios y operadores de cuadrante identifiquen tu sector de residencia para coordinación de frentes de seguridad.'
                      : 'Allows community leaders and operators to identify your residence sector for neighborhood security watch.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePreference('perfilVisible', !perfilVisibleComunidad)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    perfilVisibleComunidad ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={perfilVisibleComunidad}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                    perfilVisibleComunidad ? 'translate-x-6.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Informative Note: What data is stored and why */}
              <div className={`p-5 rounded-2xl border ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                  : 'bg-emerald-50/60 border-emerald-200 text-slate-700'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {language === 'es' ? 'Transparencia y Protección de Datos' : 'Data Transparency & Protection'}
                  </span>
                </div>
                <div className="text-xs sm:text-sm space-y-2 leading-relaxed">
                  <p>
                    <strong>{language === 'es' ? '¿Qué datos almacenamos?' : 'What data do we store?'}</strong>{' '}
                    {language === 'es'
                      ? 'Almacenamos únicamente tu nombre completo, correo electrónico, teléfono de contacto y sector o barrio de residencia en la Comuna 8 de Medellín.'
                      : 'We only store your full name, email address, contact phone, and residence sector in Comuna 8 of Medellín.'}
                  </p>
                  <p>
                    <strong>{language === 'es' ? '¿Con qué finalidad?' : 'For what purpose?'}</strong>{' '}
                    {language === 'es'
                      ? 'Estos datos se utilizan de manera exclusiva para la atención preventiva de emergencias, coordinación de cuadrantes policiales y comunitarios, y verificación de reportes de seguridad ciudadana. Tus credenciales están resguardadas por Firebase Authentication y ninguna información es comercializada con terceros.'
                      : 'These data are used exclusively for preventive emergency response, police/community quadrant coordination, and citizen report verification. Your credentials are protected by Firebase Authentication and are never sold to third parties.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECCIÓN 5: ACERCA DE
        ========================================================================= */}
        <section id="acerca-de" className="scroll-mt-32 lg:scroll-mt-40">
          <div className={`rounded-3xl border p-5 sm:p-7 md:p-8 backdrop-blur-md shadow-lg transition-all ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 shadow-slate-950/40'
              : 'bg-white/90 border-slate-200 shadow-slate-200/50'
          }`}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <School className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-500">
                  SECCIÓN 5 // INICIATIVA PEDAGÓGICA SENATIC
                </span>
                <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {language === 'es' ? 'Acerca del Proyecto' : 'About the Project'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* Institutional data */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Institución Educativa
                  </span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Institución Educativa Félix Henao Botero
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Medellín, Antioquia — Comuna 8 (Villa Hermosa)
                  </div>
                  <div className="text-xs font-mono text-purple-600 dark:text-purple-400 font-semibold pt-1">
                    Proyecto SENATIC 2026 • Innovación y Tecnología Comunitaria
                  </div>
                </div>
              </div>

              {/* Software Version */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Versión del Sistema
                  </span>
                </div>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="font-black text-slate-900 dark:text-slate-100 font-mono text-base">
                    SECURITY URBAN v2.4.0
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-mono">
                    Build: 2026.09-PROD • Firebase SDK v12 • Google Maps New Platform
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-mono">
                    Motor IA: Google Gemini 3.8 Flash (Server-Side Proxy)
                  </div>
                </div>
              </div>
            </div>

            {/* Educational disclaimer callout */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <strong className="block font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
                  {language === 'es' ? 'Aviso de Simulación Educativa' : 'Educational Simulation Notice'}
                </strong>
                {language === 'es'
                  ? 'Las funcionalidades de "Apoyo Táctico" y "Mapa de Riesgo Comunal" son simulaciones interactivas orientadas a la formación en convivencia ciudadana y prevención barrial. Utilizan datos cartográficos reales provistos por Google Maps Platform (Places API, Routes API y Geocoding API) para fines académicos y prototipado tecnológico.'
                  : 'Tactical Support and Risk Map features are interactive educational simulations designed for citizen coexistence and neighborhood prevention. They utilize real geographic data provided by Google Maps Platform for academic and technological prototyping.'}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECCIÓN 6: ZONA DE PELIGRO
        ========================================================================= */}
        <section id="zona-peligro" className="scroll-mt-32 lg:scroll-mt-40">
          <div className="rounded-3xl border border-rose-300 dark:border-rose-900/60 p-5 sm:p-7 md:p-8 backdrop-blur-md bg-rose-50/50 dark:bg-rose-950/20 shadow-lg shadow-rose-950/10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-200 dark:border-rose-900/60">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-900/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  SECCIÓN 6 // ACCIONES IRREVERSIBLES
                </span>
                <h2 className="text-lg sm:text-xl font-black font-['Rajdhani'] uppercase tracking-wider text-rose-900 dark:text-rose-200">
                  {language === 'es' ? 'Zona de Peligro' : 'Danger Zone'}
                </h2>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-rose-200 dark:border-rose-900/60">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-rose-700 dark:text-rose-300">
                  {language === 'es' ? 'Eliminar permanentemente mi cuenta' : 'Permanently delete my account'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                  {language === 'es'
                    ? 'Esta acción eliminará de forma irreversible tu cuenta en Firebase Authentication y tu documento en Firestore (colección usuarios). No podrás recuperar tus reportes ni historial.'
                    : 'This action permanently removes your Firebase Auth account and Firestore record. You will lose access to your reports and history.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationText('');
                  setDeleteErrorMsg(null);
                  setIsDeleteModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span>{language === 'es' ? 'Eliminar Mi Cuenta' : 'Delete My Account'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Modal: Doble Confirmación para Eliminar Cuenta */}
        <ModalPortal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          disableClose={isDeletingAccount}
          maxWidthClass="max-w-md"
          cardClassName={
            isDark ? 'bg-slate-900 border-rose-900/80 text-slate-100' : 'bg-white border-rose-300 text-slate-900'
          }
        >
          {/* Fixed Header */}
          <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-lg shadow-rose-900/40 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest block">
                  CONFIRMACIÓN DOBLE // IRREVERSIBLE
                </span>
                <h3 className="text-base sm:text-lg font-black font-['Rajdhani'] uppercase tracking-wide truncate">
                  {language === 'es' ? '¿Eliminar tu cuenta?' : 'Delete your account?'}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingAccount}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <p className="font-bold">
                {language === 'es'
                  ? '⚠️ Advertencia de eliminación irreversible:'
                  : '⚠️ Irreversible deletion warning:'}
              </p>
              <p>
                {language === 'es'
                  ? 'Se borrarán tus credenciales de Firebase Auth y tu expediente en Firestore (/usuarios/' + (currentUser?.uid || '') + ').'
                  : 'Your Firebase Auth credentials and Firestore record will be permanently deleted.'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                {language === 'es'
                  ? 'Para confirmar, escribe "ELIMINAR" abajo:'
                  : 'To confirm, type "ELIMINAR" below:'}
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="ELIMINAR"
                className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono tracking-widest text-center uppercase focus:outline-hidden focus:ring-2 focus:ring-rose-500/40 border-rose-400 dark:border-rose-800 bg-slate-50 dark:bg-slate-950"
                autoFocus
              />
            </div>

            {deleteErrorMsg && (
              <div
                ref={deleteAlertRef}
                className="p-3 rounded-xl bg-rose-500/20 border-2 border-rose-500/40 text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 animate-in fade-in duration-150"
              >
                {deleteErrorMsg}
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingAccount}
              className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold font-mono uppercase transition-colors cursor-pointer"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteAccount}
              disabled={isDeletingAccount || deleteConfirmationText.trim().toUpperCase() !== 'ELIMINAR'}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono uppercase transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isDeletingAccount ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{language === 'es' ? 'Borrando...' : 'Deleting...'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>{language === 'es' ? 'Confirmar' : 'Confirm'}</span>
                </>
              )}
            </button>
          </div>
        </ModalPortal>

      </div>
    </div>
  );
};
