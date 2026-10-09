import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, ShieldAlert, ArrowRight, Clock, UserPlus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { executeSignIn } from '../services/firebaseAuth';
import { SecurityCaptcha } from './SecurityCaptcha';

interface LoginFormProps {
  onSuccess: () => void;
  onOpenForgotPassword: (email: string) => void;
  onSwitchToRegister: () => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 45;
const FAILED_ATTEMPTS_STORAGE_KEY = 'security_urban_failed_login_attempts';
const LOCKOUT_EXPIRY_STORAGE_KEY = 'security_urban_lockout_expiry';

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onOpenForgotPassword,
  onSwitchToRegister,
}) => {
  const { t, language } = useLanguage();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUserNotFound, setIsUserNotFound] = useState(false);
  const [isWrongPassword, setIsWrongPassword] = useState(false);

  const alertContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to error message when it appears
  useEffect(() => {
    if ((errorMessage || isUserNotFound) && alertContainerRef.current) {
      alertContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errorMessage, isUserNotFound]);

  // Failed attempts and lockout management
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    try {
      const val = sessionStorage.getItem(FAILED_ATTEMPTS_STORAGE_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [lockoutRemaining, setLockoutRemaining] = useState<number>(() => {
    try {
      const expiry = sessionStorage.getItem(LOCKOUT_EXPIRY_STORAGE_KEY);
      if (expiry) {
        const remaining = Math.ceil((parseInt(expiry, 10) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch {
      // Ignore
    }
    return 0;
  });

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          sessionStorage.removeItem(LOCKOUT_EXPIRY_STORAGE_KEY);
          sessionStorage.setItem(FAILED_ATTEMPTS_STORAGE_KEY, '0');
          setFailedAttempts(0);
          setErrorMessage(null);
          setIsUserNotFound(false);
          console.log('[Security Urban :: UI] Bloqueo temporal de intentos fallidos finalizado.');
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsUserNotFound(false);
    setIsWrongPassword(false);

    // Lockout check
    if (lockoutRemaining > 0) {
      console.warn('[Security Urban :: UI] Intento bloqueado por límite de intentos. Segundos restantes:', lockoutRemaining);
      setErrorMessage(`${t('lockoutWarning')} (${lockoutRemaining}s)`);
      return;
    }

    // Captcha validation
    if (!isCaptchaVerified) {
      setCaptchaError(true);
      return;
    }
    setCaptchaError(false);

    setIsLoading(true);
    console.log('[Security Urban :: UI] Enviando intento de inicio de sesión...');

    try {
      const result = await executeSignIn(email.trim(), password);

      if (result.error || !result.user) {
        if (result.error === 'ACCOUNT_SUSPENDED') {
          setErrorMessage(
            language === 'es'
              ? 'Tu cuenta ha sido suspendida, contacta al administrador.'
              : 'Your account has been suspended, please contact the administrator.'
          );
          return;
        }

        // Case 2: Unregistered email explicitly reported by Firebase Auth
        if (result.error === 'USER_NOT_FOUND') {
          setIsUserNotFound(true);
          setErrorMessage(
            language === 'es'
              ? 'Este correo no está registrado. Debes crear una cuenta primero.'
              : 'This email is not registered. You must create an account first.'
          );
          return;
        }

        // Invalid email format
        if (result.error === 'INVALID_EMAIL') {
          setErrorMessage(
            language === 'es'
              ? 'El formato del correo electrónico no es válido. Verifica tus datos e inténtalo nuevamente.'
              : 'The email address format is invalid. Please check your details and try again.'
          );
          return;
        }

        // Case 3a: Network connectivity failure
        if (result.error === 'NETWORK_ERROR') {
          setErrorMessage(
            language === 'es'
              ? 'Error de conexión. Verifica tu conexión a internet e inténtalo nuevamente.'
              : 'Connection error. Please check your internet connection and try again.'
          );
          return;
        }

        // Case 3b: Server, configuration, or service unavailability error
        if (result.error === 'SERVER_ERROR') {
          setErrorMessage(
            language === 'es'
              ? 'No se pudo iniciar sesión por un problema de conexión con el servidor o de configuración. Inténtalo nuevamente más tarde.'
              : 'Unable to sign in due to a server or configuration issue. Please try again later.'
          );
          return;
        }

        // Firebase rate limit
        if (result.error === 'TOO_MANY_REQUESTS') {
          setErrorMessage(
            language === 'es'
              ? 'Demasiados intentos fallidos. Por seguridad, espera unos minutos antes de volver a intentarlo.'
              : 'Too many failed attempts. For security, please wait a few minutes before trying again.'
          );
          return;
        }

        // Case 1: Wrong password / invalid credentials for existing account
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        sessionStorage.setItem(FAILED_ATTEMPTS_STORAGE_KEY, nextAttempts.toString());
        console.warn(`[Security Urban :: UI] Intento fallido ${nextAttempts} de ${MAX_FAILED_ATTEMPTS}.`);

        if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
          const expiryTime = Date.now() + LOCKOUT_SECONDS * 1000;
          sessionStorage.setItem(LOCKOUT_EXPIRY_STORAGE_KEY, expiryTime.toString());
          setLockoutRemaining(LOCKOUT_SECONDS);
          console.warn(`[Security Urban :: UI] Límite de ${MAX_FAILED_ATTEMPTS} intentos alcanzado. Bloqueando por ${LOCKOUT_SECONDS}s.`);
          setErrorMessage(t('tooManyAttempts'));
        } else {
          setIsWrongPassword(true);
          setErrorMessage(
            language === 'es'
              ? 'La contraseña es incorrecta. Verifica tus datos e inténtalo nuevamente.'
              : 'The password is incorrect. Please check your details and try again.'
          );
        }
      } else {
        // Success
        sessionStorage.setItem(FAILED_ATTEMPTS_STORAGE_KEY, '0');
        sessionStorage.removeItem(LOCKOUT_EXPIRY_STORAGE_KEY);
        setFailedAttempts(0);
        console.log('[Security Urban :: UI] ✔ Inicio de sesión exitoso. Usuario verificado.');
        onSuccess();
      }
    } catch (err: unknown) {
      console.warn('[Security Urban :: UI] Aviso de conexión o servidor en inicio de sesión:', err);
      setErrorMessage(
        language === 'es'
          ? 'No se pudo iniciar sesión por un problema de conexión o del servidor. Inténtalo nuevamente.'
          : 'Could not sign in due to a connection or server issue. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
      {/* Email input */}
      <div>
        <label htmlFor="login-email-input" className={`block text-sm sm:text-base font-semibold mb-2.5 ${colors.label}`}>
          {t('emailLabel')}
        </label>
        <div className="relative">
          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <input
            id="login-email-input"
            type="email"
            required
            disabled={isLocked}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) {
                setErrorMessage(null);
                setIsUserNotFound(false);
              }
            }}
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder} disabled:opacity-50`}
          />
        </div>
      </div>

      {/* Password input */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label htmlFor="login-password-input" className={`text-sm sm:text-base font-semibold ${colors.label}`}>
            {t('passwordLabel')}
          </label>
          <button
            type="button"
            onClick={() => onOpenForgotPassword(email)}
            className={`text-xs sm:text-sm font-semibold transition hover:underline cursor-pointer ${colors.linkText} ${colors.linkHover}`}
          >
            {t('forgotPasswordLink')}
          </button>
        </div>
        <div className="relative">
          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <input
            id="login-password-input"
            type={showPassword ? 'text' : 'password'}
            required
            disabled={isLocked}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) {
                setErrorMessage(null);
                setIsUserNotFound(false);
              }
            }}
            placeholder={t('passwordPlaceholder')}
            autoComplete="current-password"
            className={`w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder} disabled:opacity-50`}
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
      </div>

      {/* Remember me */}
      <div className="flex items-center justify-between pt-0.5">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-900 text-red-600 focus:ring-red-500 cursor-pointer"
          />
          <span className={`text-sm sm:text-base font-medium ${colors.checkboxText}`}>
            {t('rememberMe')}
          </span>
        </label>
      </div>

      {/* Security Captcha Checkbox */}
      <div className="pt-1">
        <SecurityCaptcha
          isVerified={isCaptchaVerified}
          onVerify={setIsCaptchaVerified}
          error={captchaError}
        />
      </div>

      {/* Solid Red Pill Submit Button */}
      <button
        type="submit"
        disabled={isLoading || isLocked}
        className="w-full py-4 sm:py-4.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 dark:shadow-red-950/60 transition cursor-pointer active:scale-[0.99]"
      >
        {isLoading ? (
          <span>{t('loading')}</span>
        ) : (
          <>
            <span>{t('loginButton')}</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      {/* PROMPT 3: Repositioned Alerts/Errors Directly Below the Submit Action */}
      {/* Lockout Warning Banner */}
      {isLocked && (
        <div
          ref={alertContainerRef}
          className="p-4 rounded-2xl bg-red-100 border border-red-500 text-red-900 dark:bg-red-950/80 dark:border-red-500/80 dark:text-red-200 text-sm flex items-start gap-3 animate-pulse shadow-sm"
        >
          <Clock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm sm:text-base">{t('tooManyAttempts')}</p>
            <p className="text-xs sm:text-sm font-medium">
              {t('lockoutTimeRemaining')} <span className="font-mono font-bold text-base">{lockoutRemaining}s</span>
            </p>
          </div>
        </div>
      )}

      {/* PROMPT 1: Specific Error Banner for User Not Found with Direct Register Link / Button */}
      {!isLocked && errorMessage && (
        <div
          ref={alertContainerRef}
          className={`p-4 rounded-2xl border-2 text-sm flex items-start gap-3.5 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
            isUserNotFound
              ? 'bg-amber-50 border-amber-500 text-amber-950 dark:bg-amber-950/60 dark:border-amber-500 dark:text-amber-200'
              : 'bg-red-100 border-red-400 text-red-900 dark:bg-red-950/70 dark:border-red-600 dark:text-red-200'
          }`}
        >
          <ShieldAlert
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              isUserNotFound ? 'text-amber-600 dark:text-amber-400' : 'text-red-600'
            }`}
          />
          <div className="space-y-2.5 flex-1">
            <span className="leading-snug block font-bold text-sm sm:text-base">{errorMessage}</span>

            {/* Direct action button to Register when email is not registered */}
            {isUserNotFound && (
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-red-900/30 transition cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{language === 'es' ? 'Crear cuenta ahora' : 'Create account now'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!isUserNotFound && isWrongPassword && failedAttempts > 0 && failedAttempts < MAX_FAILED_ATTEMPTS && (
              <span className="text-xs font-mono font-medium opacity-90 block">
                Intento fallido {failedAttempts} de {MAX_FAILED_ATTEMPTS}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Switch to Register link */}
      <div className="text-center pt-2">
        <p className={`text-sm sm:text-base font-medium ${colors.mutedText}`}>
          {t('dontHaveAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className={`font-bold transition hover:underline cursor-pointer ${colors.linkText} ${colors.linkHover}`}
          >
            {t('registerTab')}
          </button>
        </p>
      </div>
    </form>
  );
};
