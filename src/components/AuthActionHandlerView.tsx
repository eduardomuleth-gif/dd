import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  MailCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  executeApplyActionCode,
  executeVerifyPasswordResetCode,
  executeConfirmPasswordReset,
  VERCEL_APP_URL,
  auth,
} from '../services/firebaseAuth';

interface AuthActionHandlerViewProps {
  mode: string;
  oobCode: string;
  continueUrl?: string | null;
  onCompleteToLogin: () => void;
  onEmailVerifiedSuccess?: () => void;
}

export const AuthActionHandlerView: React.FC<AuthActionHandlerViewProps> = ({
  mode,
  oobCode,
  continueUrl,
  onCompleteToLogin,
  onEmailVerifiedSuccess,
}) => {
  const { language } = useLanguage();
  const { colors } = useTheme();

  // Resolve target redirect URL, always defaulting to https://securityurban.vercel.app
  const targetRedirectUrl = (() => {
    if (continueUrl && continueUrl.trim()) {
      try {
        const parsed = new URL(continueUrl.trim());
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          return parsed.toString();
        }
      } catch {
        // Fallback to official Vercel URL
      }
    }
    return VERCEL_APP_URL;
  })();

  const handleReturnNavigation = () => {
    try {
      const currentOrigin = window.location.origin;
      const targetOrigin = new URL(targetRedirectUrl).origin;
      // If we are already on the target application origin, transition cleanly in-place without reloading or closing
      if (currentOrigin === targetOrigin) {
        onCompleteToLogin();
        return;
      }
      // Otherwise redirect cleanly to https://securityurban.vercel.app
      window.location.assign(targetRedirectUrl);
    } catch {
      onCompleteToLogin();
    }
  };

  const handleOpenInNewTab = () => {
    try {
      const opened = window.open(targetRedirectUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        // If popup/new tab is blocked by an in-app email WebView, navigate cleanly in the current window
        handleReturnNavigation();
      }
    } catch {
      handleReturnNavigation();
    }
  };

  const [status, setStatus] = useState<'verifying' | 'readyForReset' | 'submittingReset' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const processInitialAction = async () => {
      if (!oobCode) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage('El enlace no contiene un código de seguridad válido.');
        return;
      }

      if (mode === 'verifyEmail') {
        setStatus('verifying');
        const res = await executeApplyActionCode(oobCode);
        if (!isMounted) return;

        if (res.success) {
          if (auth.currentUser) {
            try {
              await auth.currentUser.reload();
              if (auth.currentUser.emailVerified && onEmailVerifiedSuccess) {
                onEmailVerifiedSuccess();
              }
            } catch {
              // Ignore reload error
            }
          }
          setStatus('success');
        } else {
          if (auth.currentUser) {
            try {
              await auth.currentUser.reload();
              if (auth.currentUser.emailVerified) {
                if (onEmailVerifiedSuccess) onEmailVerifiedSuccess();
                setStatus('success');
                return;
              }
            } catch {
              // Ignore
            }
          }
          setStatus('error');
          setErrorMessage(res.error);
        }
      } else if (mode === 'resetPassword') {
        setStatus('verifying');
        const res = await executeVerifyPasswordResetCode(oobCode);
        if (!isMounted) return;
        if (res.email && !res.error) {
          setResetEmail(res.email);
          setStatus('readyForReset');
        } else {
          setStatus('error');
          setErrorMessage(res.error || 'El enlace de restablecimiento ha expirado o ya fue utilizado.');
        }
      } else {
        if (!isMounted) return;
        onCompleteToLogin();
      }
    };

    processInitialAction();

    return () => {
      isMounted = false;
    };
  }, [mode, oobCode, onCompleteToLogin, onEmailVerifiedSuccess]);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < 6) {
      setFormError(
        language === 'es'
          ? 'La nueva contraseña debe tener al menos 6 caracteres.'
          : 'New password must be at least 6 characters.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError(
        language === 'es'
          ? 'Las contraseñas ingresadas no coinciden.'
          : 'Passwords do not match.'
      );
      return;
    }

    setStatus('submittingReset');
    const res = await executeConfirmPasswordReset(oobCode, newPassword);
    if (res.success) {
      setStatus('success');
    } else {
      setStatus('readyForReset');
      setFormError(res.error || 'No se pudo actualizar la contraseña.');
    }
  };

  return (
    <div
      id="auth-action-handler-card"
      className={`w-full max-w-xl rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-md relative overflow-hidden border transition-all mx-auto ${colors.cardBg} ${colors.cardBorder} ${colors.canvasText}`}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

      <div className="flex flex-col items-center text-center space-y-5">
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-lg">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                {mode === 'resetPassword'
                  ? 'SECURITY URBAN // RECUPERACIÓN DE CLAVE'
                  : 'SECURITY URBAN // VERIFICACIÓN DE CUENTA'}
              </span>
              <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                {mode === 'resetPassword'
                  ? language === 'es'
                    ? 'Validando enlace de recuperación...'
                    : 'Validating recovery link...'
                  : language === 'es'
                  ? 'Confirmando tu correo electrónico...'
                  : 'Verifying your email address...'}
              </h2>
              <p className={`text-sm sm:text-base ${colors.cardSubtitle}`}>
                {language === 'es'
                  ? 'Estamos validando tu enlace de seguridad con Firebase Authentication.'
                  : 'We are validating your security link with Firebase Authentication.'}
              </p>
            </div>
          </>
        )}

        {(status === 'readyForReset' || status === 'submittingReset') && (
          <div className="w-full space-y-5 text-left">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-md">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                {language === 'es' ? 'Restablecer Contraseña' : 'Reset Password'}
              </h2>
              {resetEmail && (
                <p className="text-xs sm:text-sm font-mono font-semibold text-slate-600 dark:text-slate-300 break-all">
                  {resetEmail}
                </p>
              )}
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-100 border border-red-400 text-red-900 dark:bg-red-950/70 dark:border-red-500/50 dark:text-red-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`block text-xs font-bold uppercase tracking-wider ${colors.label}`}>
                  {language === 'es' ? 'Nueva contraseña' : 'New password'}
                </label>
                <div className="relative flex items-center">
                  <Lock className={`w-4 h-4 absolute left-4 pointer-events-none ${colors.inputIcon}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-11 py-3.5 rounded-2xl border text-sm focus:outline-none transition ${colors.inputBg} ${colors.inputBorder} ${colors.inputText}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={`absolute right-3.5 p-1.5 rounded-lg cursor-pointer ${colors.inputIcon}`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`block text-xs font-bold uppercase tracking-wider ${colors.label}`}>
                  {language === 'es' ? 'Confirmar nueva contraseña' : 'Confirm new password'}
                </label>
                <div className="relative flex items-center">
                  <Lock className={`w-4 h-4 absolute left-4 pointer-events-none ${colors.inputIcon}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border text-sm focus:outline-none transition ${colors.inputBg} ${colors.inputBorder} ${colors.inputText}`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'submittingReset'}
                className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                {status === 'submittingReset' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{language === 'es' ? 'Guardando...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{language === 'es' ? 'Guardar nueva contraseña' : 'Save new password'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg">
              <MailCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {mode === 'resetPassword' ? 'CONTRASEÑA ACTUALIZADA' : 'VERIFICACIÓN COMPLETADA'}
              </span>
              <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                {mode === 'resetPassword'
                  ? language === 'es'
                    ? '¡Contraseña restablecida con éxito!'
                    : 'Password successfully reset!'
                  : language === 'es'
                  ? '¡Correo verificado con éxito!'
                  : 'Email successfully verified!'}
              </h2>
              <p className={`text-sm sm:text-base leading-relaxed max-w-md ${colors.cardSubtitle}`}>
                {mode === 'resetPassword'
                  ? language === 'es'
                    ? 'Tu clave de acceso ha sido actualizada correctamente. Haz clic abajo para ir a la página principal e iniciar sesión con tu nueva contraseña.'
                    : 'Your password has been updated. Click below to go to the main page and sign in.'
                  : language === 'es'
                  ? 'Tu cuenta en Security Urban (Comuna 8) ha sido activada correctamente. Ya puedes continuar e iniciar sesión en la plataforma.'
                  : 'Your Security Urban (Comuna 8) account has been activated. You can now continue to the platform.'}
              </p>
            </div>

            <div className="w-full space-y-3 pt-2">
              <button
                type="button"
                onClick={handleReturnNavigation}
                className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
              >
                <span>
                  {auth.currentUser && mode === 'verifyEmail'
                    ? language === 'es'
                      ? 'Continuar a la Plataforma'
                      : 'Continue to Platform'
                    : language === 'es'
                    ? 'Ir al Inicio de Sesión'
                    : 'Go to Sign In'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <a
                href={targetRedirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenInNewTab();
                }}
                className="w-full py-3.5 px-4 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>
                  {language === 'es'
                    ? 'Abrir Security Urban en una nueva pestaña'
                    : 'Open Security Urban in a new tab'}
                </span>
              </a>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:border-amber-500/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                AVISO DE SEGURIDAD
              </span>
              <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                {language === 'es' ? 'Enlace ya utilizado o expirado' : 'Link already used or expired'}
              </h2>
              <p className={`text-sm sm:text-base leading-relaxed max-w-md ${colors.cardSubtitle}`}>
                {errorMessage ||
                  (language === 'es'
                    ? 'Si ya completaste este proceso anteriormente, puedes ir directamente a la página principal de inicio de sesión.'
                    : 'If you already completed this process, you can proceed directly to sign in.')}
              </p>
            </div>
            <div className="w-full space-y-3 pt-2">
              <button
                type="button"
                onClick={handleReturnNavigation}
                className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
              >
                <span>{language === 'es' ? 'Ir al Inicio de Sesión' : 'Go to Sign In'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <a
                href={targetRedirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenInNewTab();
                }}
                className="w-full py-3.5 px-4 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>
                  {language === 'es'
                    ? 'Abrir Security Urban en una nueva pestaña'
                    : 'Open Security Urban in a new tab'}
                </span>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


