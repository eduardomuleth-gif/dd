import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCw,
  Mail,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  applyEmailVerificationCode,
  executeVerifyPasswordResetCode,
  executeConfirmPasswordReset,
  executeSendEmailVerification,
  ActionCodeErrorType,
} from '../services/firebaseAuth';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

export interface AuthActionParams {
  mode: 'verifyEmail' | 'resetPassword';
  oobCode: string;
}

interface AuthActionViewProps {
  action: AuthActionParams;
  currentUser: User | null;
  onEmailVerifiedSuccess: () => Promise<void>;
  onPasswordResetSuccess: () => Promise<void>;
  onRequestNewPasswordReset: (email: string) => void;
  onBackToLogin: () => void;
}

export const AuthActionView: React.FC<AuthActionViewProps> = ({
  action,
  currentUser,
  onEmailVerifiedSuccess,
  onPasswordResetSuccess,
  onRequestNewPasswordReset,
  onBackToLogin,
}) => {
  const { colors } = useTheme();

  const [status, setStatus] = useState<'processing' | 'readyToReset' | 'error'>('processing');
  const [errorCode, setErrorCode] = useState<ActionCodeErrorType | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');

  // Password reset form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Resend verification email state (when verifyEmail link is expired/invalid)
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<{ type: 'success' | 'warn'; text: string } | null>(null);

  const isPasswordValid =
    newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword);

  useEffect(() => {
    let isMounted = true;

    const processActionLink = async () => {
      setStatus('processing');
      setErrorCode(null);
      setFormError(null);

      if (!action.oobCode || !action.oobCode.trim()) {
        if (isMounted) {
          setErrorCode('INVALID_ACTION_CODE');
          setStatus('error');
        }
        return;
      }

      if (action.mode === 'verifyEmail') {
        const res = await applyEmailVerificationCode(action.oobCode);
        if (!isMounted) return;

        if (res.success) {
          await onEmailVerifiedSuccess();
        } else {
          setErrorCode(res.errorCode || 'INVALID_ACTION_CODE');
          setStatus('error');
        }
      } else if (action.mode === 'resetPassword') {
        const res = await executeVerifyPasswordResetCode(action.oobCode);
        if (!isMounted) return;

        if (res.valid) {
          setResetEmail(res.email || '');
          setStatus('readyToReset');
        } else {
          setErrorCode(res.errorCode || 'INVALID_ACTION_CODE');
          setStatus('error');
        }
      }
    };

    processActionLink();

    return () => {
      isMounted = false;
    };
  }, [action.mode, action.oobCode]);

  const handleResendVerification = async () => {
    if (!currentUser || isResendingVerification) return;
    setIsResendingVerification(true);
    setResendFeedback(null);
    try {
      const res = await executeSendEmailVerification(currentUser);
      if (res.success) {
        setResendFeedback({
          type: 'success',
          text: 'Se ha enviado un nuevo correo de verificación. Revisa tu bandeja de entrada o spam.',
        });
      } else {
        setResendFeedback({
          type: 'warn',
          text: 'Espera unos segundos antes de solicitar un nuevo correo de verificación.',
        });
      }
    } catch {
      setResendFeedback({
        type: 'warn',
        text: 'No se pudo reenviar el correo en este momento. Intenta nuevamente.',
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isPasswordValid) {
      setFormError(
        'La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await executeConfirmPasswordReset(action.oobCode, newPassword);
      if (res.success) {
        await onPasswordResetSuccess();
      } else if (res.errorCode === 'EXPIRED_ACTION_CODE' || res.errorCode === 'INVALID_ACTION_CODE') {
        setErrorCode(res.errorCode);
        setStatus('error');
      } else if (res.errorCode === 'WEAK_PASSWORD') {
        setFormError('La contraseña elegida es demasiado débil. Intenta con una combinación más segura.');
      } else {
        setFormError('No se pudo actualizar la contraseña por un problema de conexión. Inténtalo de nuevo.');
      }
    } catch {
      setFormError('Ocurrió un error al actualizar la contraseña. Inténtalo nuevamente.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // 1. Loading / Validating state
  if (status === 'processing') {
    return (
      <div className="py-10 flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-600/15 border border-red-500/40 flex items-center justify-center text-red-600 dark:text-red-400">
          <RotateCw className="w-8 h-8 animate-spin" />
        </div>
        <h2 className={`text-xl sm:text-2xl font-bold ${colors.cardTitle}`}>
          {action.mode === 'verifyEmail'
            ? 'Verificando tu correo electrónico...'
            : 'Validando enlace de recuperación...'}
        </h2>
        <p className={`text-sm max-w-md ${colors.cardSubtitle}`}>
          {action.mode === 'verifyEmail'
            ? 'Estamos confirmando tu cuenta de forma segura en Security Urban. Por favor espera un momento.'
            : 'Comprobando la validez y vigencia de tu enlace de seguridad en Firebase Authentication.'}
        </p>
      </div>
    );
  }

  // 2. Error state (Expired or Invalid Action Code)
  if (status === 'error') {
    const isVerify = action.mode === 'verifyEmail';
    const isExpired = errorCode === 'EXPIRED_ACTION_CODE';

    const title = isVerify
      ? isExpired
        ? 'El enlace de verificación ha expirado'
        : 'Enlace de verificación inválido o ya utilizado'
      : isExpired
        ? 'El enlace de recuperación ha expirado'
        : 'Enlace de recuperación inválido o ya utilizado';

    const description = isVerify
      ? isExpired
        ? 'Por motivos de seguridad, el enlace de verificación caducó. Solicita un nuevo correo de verificación o vuelve al inicio de sesión.'
        : 'Este enlace de verificación no es válido, está incompleto o ya fue utilizado anteriormente para confirmar la cuenta.'
      : isExpired
        ? 'El tiempo de validez del enlace para restablecer tu contraseña ha vencido. Solicita un nuevo correo de recuperación para continuar.'
        : 'Este enlace de recuperación no es válido o ya fue utilizado anteriormente. Solicita un nuevo enlace si necesitas cambiar tu contraseña.';

    return (
      <div className="space-y-6 py-2">
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500 text-amber-950 dark:text-amber-200 flex items-start gap-3.5 shadow-md">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-base sm:text-lg leading-snug">{title}</h3>
            <p className="text-xs sm:text-sm leading-relaxed opacity-95">{description}</p>
          </div>
        </div>

        {resendFeedback && (
          <div
            className={`p-4 rounded-2xl border-2 text-sm flex items-start gap-3 ${
              resendFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-950 dark:text-red-200'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="font-semibold">{resendFeedback.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {isVerify && currentUser && !currentUser.emailVerified && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={isResendingVerification}
              className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
            >
              {isResendingVerification ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Enviando nuevo correo...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Solicitar nuevo correo de verificación</span>
                </>
              )}
            </button>
          )}

          {!isVerify && (
            <button
              type="button"
              onClick={() => onRequestNewPasswordReset(resetEmail)}
              className="w-full py-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
            >
              <Mail className="w-5 h-5" />
              <span>Solicitar nueva recuperación</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm tracking-wide border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio de sesión</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Ready to set new password form (mode === 'resetPassword' & oobCode verified)
  return (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Restablecimiento Seguro de Contraseña</span>
        </div>
        {resetEmail && (
          <p className={`text-xs sm:text-sm font-mono ${colors.mutedText}`}>
            Cuenta: <strong className={colors.cardTitle}>{resetEmail}</strong>
          </p>
        )}
      </div>

      {/* New Password */}
      <div>
        <label
          htmlFor="reset-new-password-input"
          className={`block text-sm sm:text-base font-semibold mb-2.5 ${colors.label}`}
        >
          Nueva contraseña de seguridad
        </label>
        <div className="relative">
          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <input
            id="reset-new-password-input"
            type={showPassword ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (formError) setFormError(null);
            }}
            placeholder="Ingresa tu nueva contraseña"
            autoComplete="new-password"
            className={`w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
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

      {/* Confirm New Password */}
      <div>
        <label
          htmlFor="reset-confirm-password-input"
          className={`block text-sm sm:text-base font-semibold mb-2.5 ${colors.label}`}
        >
          Confirmar nueva contraseña
        </label>
        <div className="relative">
          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <input
            id="reset-confirm-password-input"
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (formError) setFormError(null);
            }}
            placeholder="Repite tu nueva contraseña"
            autoComplete="new-password"
            className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
          />
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-2xl bg-red-100 border-2 border-red-500 text-red-900 dark:bg-red-950/80 dark:border-red-600 dark:text-red-200 text-sm flex items-start gap-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span className="font-bold leading-snug">{formError}</span>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <button
          type="submit"
          disabled={isSubmittingPassword}
          className="w-full py-4 sm:py-4.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 transition cursor-pointer"
        >
          {isSubmittingPassword ? (
            <>
              <RotateCw className="w-5 h-5 animate-spin" />
              <span>Actualizando contraseña...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>Guardar nueva contraseña</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBackToLogin}
          className="w-full py-3 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer text-slate-600 dark:text-slate-400 hover:text-red-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancelar y volver al inicio de sesión</span>
        </button>
      </div>
    </form>
  );
};
