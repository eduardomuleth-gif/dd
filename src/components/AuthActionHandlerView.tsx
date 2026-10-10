import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
  MailCheck,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import {
  executeApplyActionCode,
  executeVerifyPasswordResetCode,
  executeConfirmPasswordReset,
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

  const handleReturnNavigation = () => {
    if (continueUrl) {
      try {
        const parsed = new URL(continueUrl, window.location.origin);
        if (parsed.origin === window.location.origin) {
          onCompleteToLogin();
          return;
        }
      } catch {
        // Fallback to default in-app navigation
      }
    }
    onCompleteToLogin();
  };

  // Shared status states
  const [status, setStatus] = useState<'verifying' | 'ready' | 'submitting' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState<string | null>(null);

  // Reset password form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordValid =
    newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword);

  useEffect(() => {
    let isMounted = true;

    const processInitialAction = async () => {
      if (!oobCode) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(
          language === 'es'
            ? 'El enlace no contiene un código de seguridad válido (oobCode).'
            : 'The link does not contain a valid security code (oobCode).'
        );
        return;
      }

      if (mode === 'verifyEmail') {
        setStatus('verifying');
        const res = await executeApplyActionCode(oobCode);
        if (!isMounted) return;

        if (res.success) {
          // Reload current user if signed in so emailVerified updates immediately
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
          // If the user already clicked it or is already verified in current session
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

        if (res.email) {
          setTargetEmail(res.email);
          setStatus('ready');
        } else {
          setStatus('error');
          setErrorMessage(res.error);
        }
      } else {
        setStatus('error');
        setErrorMessage(
          language === 'es'
            ? 'Acción de seguridad no reconocida o enlace incompleto.'
            : 'Unrecognized security action or incomplete link.'
        );
      }
    };

    processInitialAction();

    return () => {
      isMounted = false;
    };
  }, [mode, oobCode, language, onEmailVerifiedSuccess]);

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPasswordValid) {
      setErrorMessage(
        language === 'es'
          ? 'La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número.'
          : 'Password must be at least 8 characters long and include an uppercase letter and a number.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        language === 'es'
          ? 'Las contraseñas no coinciden. Verifica e intenta de nuevo.'
          : 'Passwords do not match. Please check and try again.'
      );
      return;
    }

    setStatus('submitting');
    const res = await executeConfirmPasswordReset(oobCode, newPassword);
    if (res.success) {
      setStatus('success');
    } else {
      setStatus('ready');
      setErrorMessage(res.error);
    }
  };

  return (
    <div
      id="auth-action-handler-card"
      className={`w-full max-w-xl rounded-3xl p-8 sm:p-12 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_25px_rgba(220,38,38,0.1)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(220,38,38,0.2)] backdrop-blur-md relative overflow-hidden border transition-all mx-auto ${colors.cardBg} ${colors.cardBorder} ${colors.canvasText}`}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 inset-x-0 h-[5px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-sm shadow-red-500/25" />

      {/* =========================================================
          MODE 1: VERIFY EMAIL
      ========================================================= */}
      {mode === 'verifyEmail' && (
        <div className="flex flex-col items-center text-center space-y-5">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 rounded-3xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                  SECURITY URBAN // VERIFICACIÓN DE CUENTA
                </span>
                <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                  {language === 'es' ? 'Confirmando tu correo electrónico...' : 'Verifying your email address...'}
                </h2>
                <p className={`text-sm sm:text-base ${colors.cardSubtitle}`}>
                  {language === 'es'
                    ? 'Estamos validando tu enlace de seguridad con Firebase Authentication.'
                    : 'We are validating your security link with Firebase Authentication.'}
                </p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg">
                <MailCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  VERIFICACIÓN COMPLETADA
                </span>
                <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                  {language === 'es' ? '¡Correo verificado con éxito!' : 'Email successfully verified!'}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed max-w-md ${colors.cardSubtitle}`}>
                  {language === 'es'
                    ? 'Tu cuenta en Security Urban (Comuna 8) ha sido activada correctamente. Ya puedes continuar e iniciar sesión en la plataforma.'
                    : 'Your Security Urban (Comuna 8) account has been activated. You can now continue to the platform.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleReturnNavigation}
                className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
              >
                <span>
                  {auth.currentUser
                    ? language === 'es'
                      ? 'Continuar a la Plataforma'
                      : 'Continue to Platform'
                    : language === 'es'
                    ? 'Continuar al Inicio de Sesión'
                    : 'Continue to Sign In'}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:border-amber-500/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  AVISO DE VERIFICACIÓN
                </span>
                <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                  {language === 'es' ? 'Enlace ya utilizado o expirado' : 'Link already used or expired'}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed max-w-md ${colors.cardSubtitle}`}>
                  {errorMessage ||
                    (language === 'es'
                      ? 'Si ya confirmaste tu correo anteriormente, puedes ir directamente al inicio de sesión.'
                      : 'If you already confirmed your email, you can proceed directly to sign in.')}
                </p>
              </div>
              <button
                type="button"
                onClick={onCompleteToLogin}
                className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
              >
                <span>{language === 'es' ? 'Ir al Inicio de Sesión' : 'Go to Sign In'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* =========================================================
          MODE 2: RESET PASSWORD
      ========================================================= */}
      {mode === 'resetPassword' && (
        <div className="space-y-6">
          {status === 'verifying' && (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-3xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h2 className={`text-2xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                {language === 'es' ? 'Validando solicitud de seguridad...' : 'Validating security request...'}
              </h2>
              <p className={`text-sm ${colors.cardSubtitle}`}>
                {language === 'es'
                  ? 'Verificando el código de recuperación de contraseña con Firebase Auth.'
                  : 'Verifying password reset code with Firebase Auth.'}
              </p>
            </div>
          )}

          {(status === 'ready' || status === 'submitting') && (
            <>
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-md mb-3">
                  <KeyRound className="w-7 h-7" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-400 block">
                  SECURITY URBAN // RECUPERACIÓN DE ACCESO
                </span>
                <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                  {language === 'es' ? 'Restablecer Contraseña' : 'Reset Password'}
                </h2>
                {targetEmail && (
                  <div className="inline-block px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {targetEmail}
                  </div>
                )}
                <p className={`text-sm ${colors.cardSubtitle}`}>
                  {language === 'es'
                    ? 'Ingresa y confirma tu nueva contraseña para recuperar el acceso a tu cuenta.'
                    : 'Enter and confirm your new password to regain access to your account.'}
                </p>
              </div>

              <form onSubmit={handlePasswordResetSubmit} className="space-y-5 pt-2">
                <div>
                  <label
                    htmlFor="new-reset-password-input"
                    className={`block text-sm sm:text-base font-semibold mb-2 ${colors.label}`}
                  >
                    {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
                    <input
                      id="new-reset-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      disabled={status === 'submitting'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className={`w-full pl-12 pr-12 py-3.5 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition cursor-pointer ${colors.inputEyeIcon} ${colors.inputEyeHover}`}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <PasswordStrengthMeter password={newPassword} />
                </div>

                <div>
                  <label
                    htmlFor="confirm-reset-password-input"
                    className={`block text-sm sm:text-base font-semibold mb-2 ${colors.label}`}
                  >
                    {language === 'es' ? 'Confirmar Nueva Contraseña' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
                    <input
                      id="confirm-reset-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      disabled={status === 'submitting'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className={`w-full pl-12 pr-4 py-3.5 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
                >
                  {status === 'submitting' ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{language === 'es' ? 'Guardando contraseña...' : 'Saving password...'}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>{language === 'es' ? 'Guardar Nueva Contraseña' : 'Save New Password'}</span>
                    </>
                  )}
                </button>

                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-red-100 border-2 border-red-500 text-red-900 dark:bg-red-950/80 dark:border-red-600 dark:text-red-200 text-sm flex items-start gap-3 shadow-md">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <span className="font-bold leading-snug">{errorMessage}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onCompleteToLogin}
                  className={`w-full py-2 text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${colors.mutedText} hover:text-red-600`}
                >
                  <span>{language === 'es' ? 'Cancelar y volver al inicio de sesión' : 'Cancel and back to sign in'}</span>
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  CONTRASEÑA ACTUALIZADA
                </span>
                <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                  {language === 'es' ? '¡Contraseña restablecida!' : 'Password reset complete!'}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed max-w-md ${colors.cardSubtitle}`}>
                  {language === 'es'
                    ? 'Tu contraseña ha sido actualizada exitosamente en Firebase Authentication. Ya puedes iniciar sesión con tu nueva clave.'
                    : 'Your password has been successfully updated in Firebase Authentication. You can now sign in with your new password.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleReturnNavigation}
                className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
              >
                <span>{language === 'es' ? 'Iniciar Sesión Ahora' : 'Sign In Now'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center text-center space-y-5 py-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:border-amber-500/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  ENLACE INVÁLIDO O EXPIRADO
                </span>
                <h2 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
                  {language === 'es' ? 'No se pudo procesar el enlace' : 'Could not process link'}
                </h2>
                <p className={`text-sm sm:text-base leading-relaxed max-w-md ${colors.cardSubtitle}`}>
                  {errorMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={onCompleteToLogin}
                className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
              >
                <span>{language === 'es' ? 'Volver al Inicio de Sesión' : 'Back to Sign In'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          FALLBACK UNKNOWN MODE
      ========================================================= */}
      {mode !== 'verifyEmail' && mode !== 'resetPassword' && (
        <div className="flex flex-col items-center text-center space-y-5 py-2">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-300 dark:bg-amber-950/80 dark:border-amber-500/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className={`text-2xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
            {language === 'es' ? 'Enlace de acción no válido' : 'Invalid action link'}
          </h2>
          <button
            type="button"
            onClick={onCompleteToLogin}
            className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
          >
            <span>{language === 'es' ? 'Ir al Inicio de Sesión' : 'Go to Sign In'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
