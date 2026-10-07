import React, { useState, useEffect, useRef } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { executePasswordReset } from '../services/firebaseAuth';
import { ModalPortal } from './ModalPortal';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [email, setEmail] = useState(defaultEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const errorNoticeRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to error message when it appears
  useEffect(() => {
    if (errorNotice && errorNoticeRef.current) {
      errorNoticeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errorNotice]);

  if (!isOpen) return null;

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
      // For security and user reassurance, show confirmation
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setErrorNotice(null);
    onClose();
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
          <Mail className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('forgotModalTitle')}
          </h2>
          <p className={`text-xs sm:text-sm font-medium ${colors.modalMuted}`}>
            Recuperación Segura de Cuenta
          </p>
        </div>
      </div>

      {isSuccess ? (
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
