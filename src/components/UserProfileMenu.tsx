import React, { useState, useRef, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  User as UserIcon, 
  Settings, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  Mail, 
  MapPin,
  ExternalLink,
  Users
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { isExplicitAdminEmail } from '../services/userService';
import { UserRole } from '../types/user';

interface UserProfileMenuProps {
  user: FirebaseUser | null;
  userRole?: string;
  onViewProfile: () => void;
  onOpenSettings: () => void;
  onNavigateToAdminControlCenter?: () => void;
  onSignOut: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  userRole = 'ciudadano',
  onViewProfile,
  onOpenSettings,
  onNavigateToAdminControlCenter,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { colors, theme } = useTheme();
  const { t, language, translateRole } = useLanguage();
  const isDark = theme === 'dark';

  const isExplicitAdmin = isExplicitAdminEmail(user?.email);
  const effectiveRole: UserRole = isExplicitAdmin ? 'administrador' : 'ciudadano';

  // Compute initials and clean display name
  const rawName = user?.displayName?.trim() || (user?.email ? user.email.split('@')[0] : 'Ciudadano');
  // Preserve full display name (e.g. "Luis (Administrador)" or "Victor Manuel") if displayName is present
  const displayName = isExplicitAdmin
    ? (user?.displayName && user.displayName !== 'Ciudadano' && user.displayName !== 'eduardomuleth'
        ? user.displayName.trim()
        : 'Luis (Administrador)')
    : user?.displayName?.trim()
    ? user.displayName.trim()
    : rawName.split(/[._-]/)[0]
    ? rawName.split(/[._-]/)[0].charAt(0).toUpperCase() + rawName.split(/[._-]/)[0].slice(1)
    : 'Ciudadano';

  const userEmail = user?.email || 'usuario@seguridadcomuna8.gov.co';
  const initial = displayName.charAt(0).toUpperCase();
  const hasValidPhoto = Boolean(user?.photoURL && !avatarImgError);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectOption = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button: User Avatar + Name + Dropdown indicator */}
      <button
        type="button"
        id="user-profile-menu-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Menú de perfil de ${displayName}`}
        className={`group min-h-[40px] sm:min-h-[42px] flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-full border shadow-xs transition-all cursor-pointer select-none ${
          isOpen
            ? 'border-red-600 bg-red-50/70 dark:bg-red-950/60 ring-2 ring-red-500/20'
            : `${colors.headerBg} ${colors.headerBorder} hover:border-red-500 hover:bg-slate-50 dark:hover:bg-slate-800/70`
        }`}
      >
        {/* Circular Avatar */}
        <div className="relative shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 aspect-square rounded-full bg-red-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs border border-red-500/50 overflow-hidden">
            {hasValidPhoto && user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={`Foto de perfil de ${displayName}`}
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
                onError={() => setAvatarImgError(true)}
                className="w-full h-full object-cover aspect-square"
              />
            ) : (
              initial || <UserIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
          </div>
          {/* Online green indicator */}
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" 
            title="Conectado"
            aria-hidden="true"
          />
        </div>

        {/* User Name & Role Badge */}
        <div className="flex flex-col text-left leading-tight max-w-[92px] min-[380px]:max-w-[125px] sm:max-w-[160px]">
          <span className="text-xs sm:text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 truncate">
            {displayName}
          </span>
          <span className={`text-2xs font-mono font-semibold truncate flex items-center gap-1 ${
            effectiveRole === 'administrador'
              ? 'text-red-600 dark:text-red-400'
              : 'text-emerald-700 dark:text-emerald-400'
          }`}>
            <span>
              {translateRole(effectiveRole)}
            </span>
          </span>
        </div>

        {/* Chevron Icon */}
        <ChevronDown 
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-red-600 dark:text-red-400' : 'group-hover:text-slate-900 dark:group-hover:text-slate-200'
          }`} 
        />
      </button>

      {/* Dropdown Menu - Responsive positioning so it never overflows 320px-430px viewports */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-profile-menu-button"
          className={`fixed left-3 right-3 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl shadow-xl border backdrop-blur-xl z-50 overflow-hidden transform origin-top-right transition-all duration-150 ${
            isDark 
              ? 'bg-slate-900/98 border-slate-700 text-slate-100 divide-slate-800' 
              : 'bg-white/98 border-slate-200 text-slate-800 divide-slate-100'
          }`}
        >
          {/* Top subtle accent bar */}
          <div className="h-[3px] bg-red-600" />

          {/* User Profile Header inside dropdown */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-600 text-white font-bold text-base flex items-center justify-center shadow-sm border border-red-500/40 shrink-0">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm tracking-wide text-slate-900 dark:text-slate-100 truncate">
                  {displayName}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold font-mono ${
                  effectiveRole === 'administrador'
                    ? 'bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-700/60 text-red-700 dark:text-red-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  {translateRole(effectiveRole)}
                </span>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 truncate flex items-center gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{userEmail}</span>
              </div>

              <div className="text-2xs font-mono font-bold text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>COMUNA 8 • VILLA HERMOSA</span>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="py-2 px-1.5 space-y-1">
            {/* Option 1: Ver mi perfil */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectOption(onViewProfile)}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer text-slate-800 dark:text-slate-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                <UserIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span>{t('viewMyProfile')}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-normal truncate">
                  {language === 'es' ? 'Datos personales y sector comunal' : 'Personal info & quadrant sector'}
                </span>
              </div>
            </button>

            {/* Option 2: Configuración/Ajustes */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectOption(onOpenSettings)}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer text-slate-800 dark:text-slate-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span>{t('settingsAndConfig')}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-normal truncate">
                  {language === 'es' ? 'Alertas, notificaciones y privacidad' : 'Alerts, notifications & privacy'}
                </span>
              </div>
            </button>

            {/* Option: Centro de Control Operativo (Admin Exclusive) */}
            {onNavigateToAdminControlCenter && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSelectOption(onNavigateToAdminControlCenter)}
                className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition cursor-pointer text-slate-800 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span>{language === 'es' ? 'Centro de Control Operativo' : 'Operations Control'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-mono text-2xs font-bold">
                      OFICIAL
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-normal truncate">
                    {language === 'es' ? 'Aprobaciones, alertas masivas y control' : 'Approvals, mass alerts & telemetry'}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-800" />

          {/* Option 3: Cerrar sesión */}
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectOption(onSignOut)}
              className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/80 flex items-center justify-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span>{t('signOut')}</span>
                <span className="text-xs text-red-600/80 dark:text-red-400/80 font-normal truncate">
                  {language === 'es' ? 'Finalizar sesión de seguridad' : 'End security session'}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
