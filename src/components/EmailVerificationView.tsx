import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Mail,
  CheckCircle2,
  RotateCw,
  RefreshCw,
  LogOut,
  AlertCircle,
  Shield,
  Clock,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { executeSendEmailVerification, executeSignOut } from '../services/firebaseAuth';

interface EmailVerificationViewProps {
  user: User;
  onVerificationSuccess: () => void;
}

export const EmailVerificationView: React.FC<EmailVerificationViewProps> = ({
  user,
  onVerificationSuccess,
}) => {
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [notification, setNotification] = useState<{ type: 'success' | 'warn'; message: string } | null>(null);

  const notificationRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to notification when it appears (PROMPT 3 compliance)
  useEffect(() => {
    if (notification && notificationRef.current) {
      notificationRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [notification]);

  // Cooldown timer for resending link
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // PROMPT 4: Automatic detection of email verification state via polling & window focus
  useEffect(() => {
    let isMounted = true;

    const checkVerificationStatus = async () => {
      try {
        await user.reload();
        if (user.emailVerified && isMounted) {
          console.log(
            '%c[Security Urban :: Auth] ✔ Detección automática en tiempo real: emailVerified = true!',
            'color: #10b981; font-weight: bold;'
          );
          onVerificationSuccess();
        }
      } catch {
        // Silently retry on next interval
      }
    };

    // Immediate check on mount
    checkVerificationStatus();

    // Periodic check every 3 seconds while waiting on this screen
    const interval = setInterval(checkVerificationStatus, 3000);

    // Immediate check when user switches back to this tab after clicking the verification link in their email
    const onWindowFocus = () => {
      console.log('[Security Urban :: Auth] Pestaña enfocada: comprobando si el usuario ya abrió el enlace de verificación...');
      checkVerificationStatus();
    };

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onWindowFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onWindowFocus);
    };
  }, [user, onVerificationSuccess]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setNotification(null);
    console.log('[Firebase Auth] Comprobando estado manual de emailVerified para:', user.email);

    try {
      await user.reload();
      if (user.emailVerified) {
        console.log('%c[Firebase Auth] ✔ Correo confirmado exitosamente: emailVerified = true', 'color: #10b981; font-weight: bold;');
        onVerificationSuccess();
      } else {
        console.warn('[Firebase Auth] Correo aún pendiente de confirmación en el servidor.');
        setNotification({
          type: 'warn',
          message:
            language === 'es'
              ? 'Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada o carpeta de spam y haz clic en el enlace enviado.'
              : t('verificationStillPending'),
        });
      }
    } catch (err) {
      console.error('[Firebase Auth] Error al recargar estado del usuario:', err);
      setNotification({
        type: 'warn',
        message:
          language === 'es'
            ? 'No se pudo verificar el estado en este momento. Intenta de nuevo.'
            : 'Could not verify status right now. Please try again.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setNotification(null);
    console.log('[Firebase Auth] Solicitud de reenvío de enlace de verificación para:', user.email);
    try {
      const res = await executeSendEmailVerification(user);
      if (res.success) {
        console.log('[Firebase Auth] ✔ Enlace de verificación reenviado exitosamente a:', user.email);
        setResendCooldown(45);
        setNotification({
          type: 'success',
          message:
            language === 'es'
              ? '¡Hemos enviado un nuevo enlace de verificación a tu correo! Revisa tu bandeja de entrada o spam.'
              : t('verificationResentSuccess'),
        });
      } else {
        console.error('[Firebase Auth] ✖ Error devuelto por Firebase al reenviar:', res.error);
        setNotification({
          type: 'warn',
          message:
            language === 'es'
              ? 'Por seguridad, espera unos segundos antes de solicitar otro enlace de verificación.'
              : res.error || 'Could not resend right now.',
        });
      }
    } catch (err) {
      console.error('[Firebase Auth] ✖ Excepción al reenviar correo:', err);
      setNotification({
        type: 'warn',
        message:
          language === 'es'
            ? 'Error al enviar el enlace de verificación. Intenta nuevamente.'
            : 'Error sending verification link.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await executeSignOut();
  };

  return (
    <div
      id="email-verification-container"
      className={`w-full max-w-lg rounded-3xl p-6 sm:p-10 shadow-2xl relative border overflow-hidden mx-auto backdrop-blur-md transition-colors ${colors.cardBg} ${colors.cardBorder} ${colors.canvasText}`}
    >
      {/* Red ambient highlight */}
      <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none ${colors.cardGlow}`} />

      {/* Header icon */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-red-100 border border-red-300 dark:bg-red-950/80 dark:border-red-600/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-lg shadow-red-950/20">
            <Mail className="w-8 h-8" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-900">
            !
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
            <Shield className="w-4 h-4" />
            <span>{language === 'es' ? 'Confirmación de Correo Electrónico' : 'Email Confirmation'}</span>
          </div>
          <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${colors.cardTitle}`}>
            {language === 'es' ? 'Revisa tu correo electrónico' : t('verificationPendingTitle')}
          </h2>
          <div className="inline-block px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {user.email}
          </div>
        </div>

        <p className={`text-sm sm:text-base leading-relaxed max-w-md ${colors.cardSubtitle}`}>
          {language === 'es'
            ? 'Hemos enviado un enlace de confirmación a tu correo electrónico. Revisa tu bandeja de entrada (o la carpeta de correo no deseado / spam) y haz clic en el enlace para activar tu cuenta.'
            : t('verificationPendingDesc')}
        </p>

        {/* Live auto-detection status banner */}
        <div className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium shadow-2xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>
            {language === 'es'
              ? 'Detección automática activa: en cuanto abras el enlace en tu correo, entraremos automáticamente a la plataforma.'
              : 'Auto-detection active: once you click the link in your email, you will be redirected automatically.'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mt-6">
        <button
          type="button"
          onClick={handleCheckStatus}
          disabled={isChecking}
          className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 transition cursor-pointer"
        >
          {isChecking ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>{language === 'es' ? 'Verificando estado...' : 'Checking status...'}</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>{language === 'es' ? 'Ya hice clic en el enlace (Continuar)' : t('verificationCheckStatus')}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleResendEmail}
          disabled={isResending || resendCooldown > 0}
          className="w-full py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm tracking-wide border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          {isResending ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>{language === 'es' ? 'Enviando enlace...' : 'Sending link...'}</span>
            </>
          ) : resendCooldown > 0 ? (
            <>
              <Clock className="w-4 h-4 text-amber-500" />
              <span>
                {language === 'es'
                  ? `Reenviar enlace de verificación (${resendCooldown}s)`
                  : `Resend verification link (${resendCooldown}s)`}
              </span>
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 text-red-600" />
              <span>{language === 'es' ? 'Reenviar enlace a mi correo' : t('verificationResend')}</span>
            </>
          )}
        </button>

        {/* PROMPT 3: Feedback Notification positioned directly below the action buttons with auto-scroll */}
        {notification && (
          <div
            ref={notificationRef}
            className={`mt-2 p-4 rounded-2xl flex items-start gap-3 text-sm leading-relaxed border-2 shadow-md animate-in fade-in slide-in-from-top-2 duration-150 ${
              notification.type === 'success'
                ? 'bg-emerald-100 border-emerald-500 text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-200'
                : 'bg-amber-100 border-amber-500 text-amber-950 dark:bg-amber-950/70 dark:border-amber-600 dark:text-amber-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className={`w-full py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${colors.mutedText} hover:text-red-600`}
        >
          <LogOut className="w-4 h-4" />
          <span>{t('signOut')}</span>
        </button>
      </div>
    </div>
  );
};
