import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  MailCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  executeApplyActionCode,
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

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const processInitialAction = async () => {
      if (!oobCode || mode !== 'verifyEmail') {
        if (!isMounted) return;
        onCompleteToLogin();
        return;
      }

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
    };

    processInitialAction();

    return () => {
      isMounted = false;
    };
  }, [mode, oobCode, onCompleteToLogin, onEmailVerifiedSuccess]);

  return (
    <div
      id="auth-action-handler-card"
      className={`w-full max-w-xl rounded-3xl p-8 sm:p-12 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18),0_0_25px_rgba(220,38,38,0.1)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(220,38,38,0.2)] backdrop-blur-md relative overflow-hidden border transition-all mx-auto ${colors.cardBg} ${colors.cardBorder} ${colors.canvasText}`}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 inset-x-0 h-[5px] bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-sm shadow-red-500/25" />

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
    </div>
  );
};

