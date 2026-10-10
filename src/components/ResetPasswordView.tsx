import React, { useState, useEffect } from 'react';
import { confirmPasswordReset } from 'firebase/auth';
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { auth } from '../services/firebaseAuth';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface ResetPasswordViewProps {
  initialOobCode?: string | null;
  onRedirectToLogin: (successMessage?: string) => void;
}

interface ExtractedResetUrlParams {
  oobCode: string;
  mode: string;
  apiKey: string;
}

function extractUrlParamsFromLocation(fallbackOobCode?: string | null): ExtractedResetUrlParams {
  if (typeof window === 'undefined') {
    return { oobCode: fallbackOobCode || '', mode: 'resetPassword', apiKey: '' };
  }

  const searchParams = new URLSearchParams(window.location.search);
  let oobCode = searchParams.get('oobCode') || fallbackOobCode || '';
  let mode = searchParams.get('mode') || 'resetPassword';
  let apiKey = searchParams.get('apiKey') || '';

  // Also check hash query params if present (e.g. #/reset-password?oobCode=...)
  if (!oobCode && window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?'));
    const hashParams = new URLSearchParams(hashQuery);
    oobCode = hashParams.get('oobCode') || oobCode;
    mode = hashParams.get('mode') || mode;
    apiKey = hashParams.get('apiKey') || apiKey;
  }

  // Also check nested continueUrl if present
  if (!oobCode) {
    const continueUrl = searchParams.get('continueUrl');
    if (continueUrl) {
      try {
        const nestedUrl = new URL(continueUrl, window.location.origin);
        oobCode = nestedUrl.searchParams.get('oobCode') || oobCode;
        mode = nestedUrl.searchParams.get('mode') || mode;
        apiKey = nestedUrl.searchParams.get('apiKey') || apiKey;
      } catch {
        // Ignore malformed continueUrl
      }
    }
  }

  return { oobCode, mode, apiKey };
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  initialOobCode,
  onRedirectToLogin,
}) => {
  const { colors } = useTheme();
  const { language } = useLanguage();

  // Extract oobCode, mode, and apiKey directly and synchronously on load
  const [urlParams, setUrlParams] = useState<ExtractedResetUrlParams>(() =>
    extractUrlParamsFromLocation(initialOobCode)
  );
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    const extracted = extractUrlParamsFromLocation(initialOobCode);
    setUrlParams(extracted);
    console.log('[ResetPasswordView] Parámetros extraídos de la URL:', {
      hasOobCode: Boolean(extracted.oobCode),
      mode: extracted.mode,
      hasApiKey: Boolean(extracted.apiKey),
    });
  }, [initialOobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const activeOobCode = urlParams.oobCode.trim();

    if (!activeOobCode) {
      setErrorMessage(
        language === 'es'
          ? 'No se encontró el código de seguridad (oobCode) en la URL. Asegúrate de abrir el enlace directamente desde el correo de recuperación.'
          : 'Security code (oobCode) not found in the URL. Please open the link directly from your recovery email.'
      );
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(
        language === 'es'
          ? 'La nueva contraseña debe tener al menos 6 caracteres.'
          : 'The new password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        language === 'es'
          ? 'Las contraseñas no coinciden. Verifica ambos campos.'
          : 'Passwords do not match. Please check both fields.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[ResetPasswordView] Ejecutando confirmPasswordReset(auth, oobCode, newPassword)...');
      await confirmPasswordReset(auth, activeOobCode, newPassword);
      console.log('[ResetPasswordView] ✔ Contraseña actualizada exitosamente en Firebase Auth.');
      setIsSuccess(true);
      setTimeout(() => {
        onRedirectToLogin(
          language === 'es'
            ? '¡Contraseña actualizada con éxito! Inicia sesión con tu nueva clave.'
            : 'Password updated successfully! Sign in with your new password.'
        );
      }, 1000);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      const code = firebaseError?.code || 'auth/unknown-error';
      console.error('[ResetPasswordView] ✖ Error en confirmPasswordReset():', code, firebaseError?.message);

      if (code === 'auth/expired-action-code') {
        setErrorMessage(
          language === 'es'
            ? 'El código de recuperación ha expirado (auth/expired-action-code). Solicita un nuevo enlace.'
            : 'The reset code has expired (auth/expired-action-code). Please request a new link.'
        );
      } else if (code === 'auth/invalid-action-code') {
        setErrorMessage(
          language === 'es'
            ? 'El enlace de recuperación ya fue utilizado o no es válido (auth/invalid-action-code).'
            : 'The reset link was already used or is invalid (auth/invalid-action-code).'
        );
      } else if (code === 'auth/weak-password') {
        setErrorMessage(
          language === 'es'
            ? 'La contraseña elegida es demasiado débil (auth/weak-password).'
            : 'The chosen password is too weak (auth/weak-password).'
        );
      } else {
        setErrorMessage(
          `${language === 'es' ? 'Error al guardar la nueva contraseña' : 'Failed to save new password'} (${code}): ${
            firebaseError?.message || ''
          }`
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="reset-password-card"
      className={`w-full max-w-xl rounded-3xl p-8 sm:p-12 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_25px_rgba(220,38,38,0.1)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(220,38,38,0.2)] backdrop-blur-md relative overflow-hidden border transition-all mx-auto ${colors.cardBg} ${colors.cardBorder} ${colors.canvasText}`}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 inset-x-0 h-[5px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-sm shadow-red-500/25" />

      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-md mb-3">
            <KeyRound className="w-7 h-7" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-600 dark:text-red-400 block">
            SECURITY URBAN // RESTABLECER CONTRASEÑA
          </span>
          <h1 className={`text-2xl sm:text-3xl font-extrabold font-['Rajdhani'] uppercase tracking-wider ${colors.cardTitle}`}>
            {language === 'es' ? 'Nueva Contraseña' : 'New Password'}
          </h1>
          <p className={`text-sm ${colors.cardSubtitle}`}>
            {language === 'es'
              ? 'Ingresa tu nueva contraseña y confírmala para actualizar tu clave directamente.'
              : 'Enter your new password and confirm it to update your credentials directly.'}
          </p>
        </div>

        {isSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-100 border-2 border-emerald-500 text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-200 text-center space-y-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h2 className="text-lg font-extrabold">
              {language === 'es' ? '¡Contraseña guardada correctamente!' : 'Password saved successfully!'}
            </h2>
            <p className="text-xs sm:text-sm">
              {language === 'es'
                ? 'Redirigiendo al inicio de sesión...'
                : 'Redirecting to sign in...'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Field 1: Nueva contraseña */}
            <div>
              <label
                htmlFor="reset-new-password"
                className={`block text-sm sm:text-base font-semibold mb-2 ${colors.label}`}
              >
                {language === 'es' ? 'Nueva contraseña' : 'New password'}
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
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
                  onClick={() => setShowPassword((prev) => !prev)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg transition cursor-pointer ${colors.inputEyeIcon} ${colors.inputEyeHover}`}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <PasswordStrengthMeter password={newPassword} />
            </div>

            {/* Field 2: Confirmar contraseña */}
            <div>
              <label
                htmlFor="reset-confirm-password"
                className={`block text-sm sm:text-base font-semibold mb-2 ${colors.label}`}
              >
                {language === 'es' ? 'Confirmar contraseña' : 'Confirm password'}
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
                <input
                  id="reset-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
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

            {/* Submit Button: Guardar */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{language === 'es' ? 'Guardando...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>{language === 'es' ? 'Guardar' : 'Save'}</span>
                </>
              )}
            </button>

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-100 border-2 border-red-500 text-red-900 dark:bg-red-950/80 dark:border-red-600 dark:text-red-200 text-sm flex items-start gap-3 shadow-md animate-in fade-in duration-150">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span className="font-bold leading-snug">{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onRedirectToLogin()}
              className={`w-full py-2 text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${colors.mutedText} hover:text-red-600`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'es' ? 'Volver al inicio de sesión' : 'Back to sign in'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
