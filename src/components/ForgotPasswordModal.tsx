import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  executePasswordReset,
  executeUpdateRecoveredPassword,
  cancelPasswordRecovery,
} from '../services/firebaseAuth';
import { ModalPortal } from './ModalPortal';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  isRecoveryMode?: boolean;
  recoveryEmail?: string | null;
  hasValidRecoverySession?: boolean;
  recoveryLinkError?: string | null;
  onExitRecoveryMode?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  isRecoveryMode = false,
  recoveryEmail = null,
  hasValidRecoverySession = false,
  recoveryLinkError = null,
  onExitRecoveryMode,
}) => {
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const [email, setEmail] = useState(defaultEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Estados para el formulario de nueva contraseña (PASSWORD_RECOVERY)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordUpdated, setIsPasswordUpdated] = useState(false);
  const [localRecoveryView, setLocalRecoveryView] = useState(isRecoveryMode);

  const errorNoticeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalRecoveryView(isRecoveryMode);
    if (isRecoveryMode) {
      setIsSuccess(false);
      setIsPasswordUpdated(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setErrorNotice(recoveryLinkError || null);
      if (recoveryEmail) {
        setEmail(recoveryEmail);
      }
    }
  }, [isRecoveryMode, recoveryEmail, recoveryLinkError]);

  useEffect(() => {
    if (defaultEmail && !isRecoveryMode) {
      setEmail(defaultEmail);
    }
  }, [defaultEmail, isRecoveryMode]);

  // Auto-scroll to error message when it appears
  useEffect(() => {
    if (errorNotice && errorNoticeRef.current) {
      errorNoticeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errorNotice]);

  if (!isOpen) return null;

  // Mismos requisitos de contraseña que en RegisterForm.tsx (mínimo 8 caracteres, 1 mayúscula, 1 número)
  const isNewPasswordValid =
    newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorNotice('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    setErrorNotice(null);
    console.log('[Security Urban :: UI] Usuario solicitó recuperación de contraseña para:', email.trim());

    try {
      const res = await executePasswordReset(email.trim());
      if (res.error) {
        console.error('[Security Urban :: UI] Error al solicitar restablecimiento:', res.error);
        setErrorNotice('No se pudo procesar la solicitud en este momento. Inténtalo de nuevo.');
      } else {
        console.log('[Security Urban :: UI] ✔ Solicitud de restablecimiento procesada exitosamente para:', email.trim());
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('[Security Urban :: UI] Excepción en flujo de restablecimiento:', err);
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    if (!hasValidRecoverySession) {
      setErrorNotice(
        'No existe una sesión de recuperación válida o el enlace ha expirado. Por favor solicita un nuevo enlace de recuperación.'
      );
      return;
    }

    if (!isNewPasswordValid) {
      setErrorNotice(
        'La nueva contraseña no cumple con los requisitos mínimos de seguridad (8+ caracteres, al menos una letra mayúscula y un número).'
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorNotice(t('pwMismatch'));
      return;
    }

    setIsLoading(true);
    console.log('[Security Urban :: UI] Guardando nueva contraseña mediante Supabase Auth...');

    try {
      const res = await executeUpdateRecoveredPassword(newPassword);
      if (res.error || !res.success) {
        if (res.error === 'NO_RECOVERY_SESSION') {
          setErrorNotice(
            'La sesión de recuperación no es válida o ha expirado. Solicita un nuevo correo de recuperación.'
          );
        } else if (res.error === 'SAME_PASSWORD') {
          setErrorNotice('La nueva contraseña debe ser diferente a tu contraseña anterior.');
        } else if (res.error === 'WEAK_PASSWORD') {
          setErrorNotice(
            'La contraseña proporcionada es demasiado débil. Usa al menos 8 caracteres, una mayúscula y un número.'
          );
        } else {
          setErrorNotice('No se pudo actualizar la contraseña en este momento. Inténtalo nuevamente.');
        }
      } else {
        setIsPasswordUpdated(true);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      console.warn('[Security Urban :: UI] Aviso al guardar nueva contraseña:', err);
      setErrorNotice('Ocurrió un error al guardar la nueva contraseña. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (localRecoveryView || isRecoveryMode) {
      await cancelPasswordRecovery();
      if (onExitRecoveryMode) onExitRecoveryMode();
    }
    setIsSuccess(false);
    setIsPasswordUpdated(false);
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorNotice(null);
    setLocalRecoveryView(false);
    onClose();
  };

  const handleSwitchToRequestNewLink = async () => {
    await cancelPasswordRecovery();
    if (onExitRecoveryMode) onExitRecoveryMode();
    setLocalRecoveryView(false);
    setIsPasswordUpdated(false);
    setErrorNotice(null);
  };

  return (
    <ModalPortal
      id="forgot-password-modal-backdrop"
      cardId="forgot-password-card"
      isOpen={isOpen}
      onClose={handleReset}
      disableClose={isLoading}
      maxWidthClass="max-w-lg"
      cardClassName={`p-6 sm:p-8 overflow-y-auto ${colors.modalBg} ${colors.modalBorder} ${colors.modalText}`}
    >
      {/* Subtle accent light */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Close Button */}
      <button
        type="button"
        onClick={handleReset}
        className={`absolute top-5 right-5 p-2 rounded-full transition cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 ${colors.inputIcon}`}
        aria-label={t('cancel')}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3.5 mb-5 pr-8">
        <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
          {localRecoveryView ? <Lock className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {localRecoveryView
              ? language === 'es'
                ? 'Establecer Nueva Contraseña'
                : 'Set New Password'
              : t('forgotModalTitle')}
          </h2>
          <p className={`text-xs sm:text-sm font-medium ${colors.modalMuted}`}>
            {localRecoveryView
              ? language === 'es'
                ? 'Restablecimiento Seguro de Credenciales'
                : 'Secure Credential Reset'
              : 'Recuperación Segura de Cuenta'}
          </p>
        </div>
      </div>

      {localRecoveryView ? (
        isPasswordUpdated ? (
          <div className="space-y-4 my-2 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold leading-relaxed">
              {language === 'es'
                ? '¡Tu contraseña ha sido actualizada exitosamente!'
                : 'Your password has been successfully updated!'}
            </p>
            <p className={`text-sm leading-relaxed ${colors.modalMuted}`}>
              {language === 'es'
                ? 'La nueva contraseña quedó registrada en tu cuenta de Security Urban. Ya puedes iniciar sesión con tu nueva clave.'
                : 'Your new password has been saved. You can now sign in with your new credentials.'}
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wide transition shadow-lg shadow-red-950/40 cursor-pointer"
            >
              {t('backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-5 mt-4">
            <p className={`text-sm sm:text-base leading-relaxed ${colors.modalMuted}`}>
              {language === 'es'
                ? 'Ingresa y confirma tu nueva contraseña para completar la recuperación de tu cuenta.'
                : 'Enter and confirm your new password to complete your account recovery.'}
            </p>

            {recoveryEmail && (
              <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Cuenta:</span>
                <span className="truncate">{recoveryEmail}</span>
              </div>
            )}

            {/* Nueva Contraseña */}
            <div>
              <label
                htmlFor="recovery-new-password-input"
                className={`block text-sm sm:text-base font-semibold mb-2 ${colors.label}`}
              >
                {language === 'es' ? 'Nueva contraseña' : 'New Password'}
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
                <input
                  id="recovery-new-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={!hasValidRecoverySession || isLoading}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorNotice) setErrorNotice(null);
                  }}
                  placeholder={t('passwordPlaceholder')}
                  autoComplete="new-password"
                  className={`w-full pl-12 pr-12 py-3.5 rounded-2xl text-base outline-none transition shadow-xs border disabled:opacity-60 ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
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

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label
                htmlFor="recovery-confirm-password-input"
                className={`block text-sm sm:text-base font-semibold mb-2 ${colors.label}`}
              >
                {t('confirmPasswordLabel')}
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
                <input
                  id="recovery-confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={!hasValidRecoverySession || isLoading}
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    if (errorNotice) setErrorNotice(null);
                  }}
                  placeholder={t('confirmPasswordPlaceholder')}
                  autoComplete="new-password"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-2xl text-base outline-none transition shadow-xs border disabled:opacity-60 ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading || !hasValidRecoverySession}
                className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition cursor-pointer"
              >
                {isLoading ? (
                  <span>{t('loading')}</span>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>
                      {language === 'es' ? 'Guardar Nueva Contraseña' : 'Save New Password'}
                    </span>
                  </>
                )}
              </button>

              {errorNotice && (
                <div
                  ref={errorNoticeRef}
                  className="p-3.5 rounded-xl bg-amber-100 border-2 border-amber-400 text-amber-950 dark:bg-amber-950/60 dark:border-amber-600/60 dark:text-amber-200 flex flex-col gap-2 text-sm font-semibold shadow-xs animate-in fade-in duration-150"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>{errorNotice}</span>
                  </div>
                  {!hasValidRecoverySession && (
                    <button
                      type="button"
                      onClick={handleSwitchToRequestNewLink}
                      className="self-start ml-7 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Solicitar nuevo enlace de recuperación
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                className={`w-full py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${colors.mutedText} hover:text-red-600`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('backToLogin')}</span>
              </button>
            </div>
          </form>
        )
      ) : isSuccess ? (
        <div className="space-y-4 my-2 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-base font-semibold leading-relaxed">
            {t('resetEmailSent')}
          </p>
          <p className={`text-sm leading-relaxed ${colors.modalMuted}`}>
            Hemos enviado un enlace a <span className="font-bold underline">{email.trim()}</span>. Revisa tu bandeja de entrada o spam para restablecer tu contraseña.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wide transition shadow-lg shadow-red-950/40 cursor-pointer"
          >
            {t('backToLogin')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <p className={`text-sm sm:text-base leading-relaxed ${colors.modalMuted}`}>
            {t('forgotModalDesc')}
          </p>

          <div>
            <label htmlFor="recovery-email-input" className={`block text-sm sm:text-base font-semibold mb-2 ${colors.label}`}>
              {t('emailLabel')}
            </label>
            <div className="relative">
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
              <input
                id="recovery-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorNotice) setErrorNotice(null);
                }}
                placeholder={t('emailPlaceholder')}
                className={`w-full pl-12 pr-4 py-3.5 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition cursor-pointer"
            >
              {isLoading ? (
                <span>{t('loading')}</span>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>{t('sendResetEmail')}</span>
                </>
              )}
            </button>

            {errorNotice && (
              <div
                ref={errorNoticeRef}
                className="p-3.5 rounded-xl bg-amber-100 border-2 border-amber-400 text-amber-950 dark:bg-amber-950/60 dark:border-amber-600/60 dark:text-amber-200 flex items-start gap-2.5 text-sm font-semibold shadow-xs animate-in fade-in duration-150"
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{errorNotice}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleReset}
              className={`w-full py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${colors.mutedText} hover:text-red-600`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('backToLogin')}</span>
            </button>
          </div>
        </form>
      )}
    </ModalPortal>
  );
};
