import React from 'react';
import { User } from 'firebase/auth';
import { ShieldCheck, UserCheck, LogOut, Radio, Activity } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { executeSignOut } from '../services/firebaseAuth';

interface AuthenticatedViewProps {
  user: User;
  onBackToHome?: () => void;
}

export const AuthenticatedView: React.FC<AuthenticatedViewProps> = ({ user, onBackToHome }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const handleSignOut = async () => {
    console.log('[Security Urban] Cerrando sesión para usuario:', user.email);
    await executeSignOut();
  };

  return (
    <div
      id="authenticated-portal-card"
      className={`w-full max-w-2xl rounded-3xl p-6 sm:p-10 shadow-2xl relative border overflow-hidden mx-auto backdrop-blur-md transition-colors ${colors.cardBg} ${colors.cardBorder} ${colors.canvasText}`}
    >
      {/* Red ambient highlight */}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${colors.cardGlow}`} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${colors.cardTitle}`}>
                SECURITY URBAN
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-600/40 text-xs font-mono font-bold">
                ACTIVO
              </span>
            </div>
            <p className={`text-xs sm:text-sm font-medium ${colors.cardSubtitle}`}>
              Comuna 8 • Villa Hermosa - Medellín
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-4 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
            >
              <span>{t('navHome')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-red-100 dark:bg-slate-800 dark:hover:bg-red-950/60 text-slate-800 hover:text-red-700 dark:text-slate-200 dark:hover:text-red-300 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('signOut')}</span>
          </button>
        </div>
      </div>

      {/* Welcome Body */}
      <div className="py-6 space-y-5">
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
            <UserCheck className="w-5 h-5" />
            <span>SESIÓN AUTENTICADA Y VERIFICADA</span>
          </div>
          <p className={`text-base sm:text-lg font-bold ${colors.cardTitle}`}>
            {user.displayName ? user.displayName : user.email}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs sm:text-sm font-mono">
            <div className={colors.mutedText}>
              Correo: <span className="font-semibold text-slate-900 dark:text-slate-100">{user.email}</span>
            </div>
            <div className={colors.mutedText}>
              UID: <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{user.uid}</span>
            </div>
            <div className={colors.mutedText}>
              Estado Correo: <span className="text-emerald-700 dark:text-emerald-400 font-bold">Verificado ✔</span>
            </div>
            <div className={colors.mutedText}>
              Zona: <span className="text-red-600 dark:text-red-400 font-bold">Comuna 8 (Medellín)</span>
            </div>
          </div>
        </div>

        {/* Informational Cards for Next Phases */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
              <Radio className="w-4 h-4" />
              <span>Red de Alertas Comuna 8</span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${colors.cardSubtitle}`}>
              Monitoreo activo de cuadrantes, rutas escolares y reportes comunitarios en tiempo real.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
              <span>Mapa de Calor Preventivo</span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${colors.cardSubtitle}`}>
              Algoritmo de análisis de riesgo preparado para la integración con geolocalización.
            </p>
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <span className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
          Conexión Segura Firebase Activa
        </span>

        <span className={`text-xs font-mono font-medium ${colors.mutedText}`}>
          SENATIC 2026 • Félix Henao Botero
        </span>
      </div>
    </div>
  );
};
