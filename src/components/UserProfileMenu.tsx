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

interface UserProfileMenuProps {
  user: FirebaseUser | null;
  userRole?: string;
  onViewProfile: () => void;
  onOpenSettings: () => void;
  onNavigateToUsers?: () => void;
  onSignOut: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  userRole = 'ciudadano',
  onViewProfile,
  onOpenSettings,
  onNavigateToUsers,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { colors, theme } = useTheme();
  const { t, language } = useLanguage();
  const isDark = theme === 'dark';

  // Compute initials and clean display name
  const rawName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Luis');
  // Format to nice capitalized name (e.g. "luis.muleth" -> "Luis", or "Luis")
  const displayName = rawName.split(/[._-]/)[0]
    ? rawName.split(/[._-]/)[0].charAt(0).toUpperCase() + rawName.split(/[._-]/)[0].slice(1)
    : 'Luis';

  const userEmail = user?.email || 'usuario@seguridadcomuna8.gov.co';
  const initial = displayName.charAt(0).toUpperCase();

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
        className={`group flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-full border shadow-xs transition-all cursor-pointer select-none ${
          isOpen
            ? 'border-red-600 bg-red-50/70 dark:bg-red-950/60 ring-2 ring-red-500/20'
            : `${colors.headerBg} ${colors.headerBorder} hover:border-red-500 hover:bg-slate-50 dark:hover:bg-slate-800/70`
        }`}
      >
        {/* Circular Avatar */}
        <div className="relative shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm shadow-red-900/30 border border-red-400">
            {initial || <UserIcon className="w-4 h-4" />}
          </div>
          {/* Online green indicator */}
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" 
            title="Conectado"
          />
        </div>

        {/* User Name */}
        <div className="flex flex-col text-left leading-tight max-w-[85px] xs:max-w-[120px] sm:max-w-[140px]">
          <span className="text-xs sm:text-sm font-extrabold tracking-wide text-slate-900 dark:text-slate-100 truncate">
            {displayName}
          </span>
          <span className={`text-[10px] font-mono font-semibold truncate flex items-center gap-1 ${
            userRole === 'administrador'
              ? 'text-red-600 dark:text-red-400'
              : userRole === 'operador'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            <span className="hidden xs:inline">
              {userRole === 'administrador'
                ? t('userRoleAdmin')
                : userRole === 'operador'
                ? t('userRoleOperator')
                : t('userRoleCitizen')}
            </span>
            <span className="xs:hidden">Activo</span>
          </span>
        </div>

        {/* Chevron Icon */}
        <ChevronDown 
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-red-600 dark:text-red-400' : 'group-hover:text-slate-800 dark:group-hover:text-slate-200'
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-profile-menu-button"
          className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl shadow-2xl border backdrop-blur-xl z-50 overflow-hidden transform origin-top-right transition-all duration-150 animate-in fade-in zoom-in-95 ${
            isDark 
              ? 'bg-slate-950/95 border-red-600/30 text-slate-100 divide-slate-800' 
              : 'bg-white/95 border-slate-200 text-slate-800 divide-slate-100'
          }`}
        >
          {/* Top subtle accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

          {/* User Profile Header inside dropdown */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 text-white font-extrabold text-base flex items-center justify-center shadow-md shadow-red-900/30 border border-red-400/50 shrink-0">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wide text-slate-900 dark:text-slate-100 truncate">
                  {displayName}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold font-mono">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {t('accountStatusVerified')}
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{userEmail}</span>
              </div>

              <div className="text-[10px] font-mono font-bold text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                <span>COMUNA 8 • VILLA HERMOSA</span>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="py-2 px-1.5 space-y-0.5">
            {/* Option 1: Ver mi perfil */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectOption(onViewProfile)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                <UserIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex flex-col text-left">
                <span>{t('viewMyProfile')}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                  {language === 'es' ? 'Datos personales y sector comunal' : 'Personal info & quadrant sector'}
                </span>
              </div>
            </button>

            {/* Option 2: Configuración/Ajustes */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelectOption(onOpenSettings)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                <Settings className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex flex-col text-left">
                <span>{t('settingsAndConfig')}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                  {language === 'es' ? 'Alertas, notificaciones y privacidad' : 'Alerts, notifications & privacy'}
                </span>
              </div>
            </button>

            {/* Option: Gestión de Usuarios (Admin Terminal) */}
            {onNavigateToUsers && (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSelectOption(onNavigateToUsers)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/80 flex items-center justify-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span>{t('navUserManagement')}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-red-600 text-white font-mono text-[9px] font-extrabold">
                      ADMIN
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    {language === 'es' ? 'Roles, estados y auditoría comunal' : 'Roles, statuses & community audit'}
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
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/80 flex items-center justify-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span>{t('signOut')}</span>
                <span className="text-[10px] text-red-500/80 dark:text-red-400/80 font-normal">
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
