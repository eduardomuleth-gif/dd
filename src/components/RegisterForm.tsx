import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowRight, AlertTriangle, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { executeSignUp } from '../services/firebaseAuth';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { SecurityCaptcha } from './SecurityCaptcha';

interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [sector, setSector] = useState('Villa Hermosa');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validate password criteria: minimum 8 chars, uppercase, number
  const isPasswordValid =
    password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Full name check
    if (!fullName.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }

    // Password criteria check
    if (!isPasswordValid) {
      setErrorMessage(
        'La contraseña no cumple con los requisitos mínimos de seguridad (8+ caracteres, mayúscula y número).'
      );
      return;
    }

    // Passwords match check
    if (password !== confirmPassword) {
      setErrorMessage(t('pwMismatch'));
      return;
    }

    // Terms check
    if (!acceptTerms) {
      setErrorMessage('Debes aceptar los términos y condiciones de seguridad comunal.');
      return;
    }

    // Captcha check
    if (!isCaptchaVerified) {
      setCaptchaError(true);
      return;
    }
    setCaptchaError(false);

    setIsLoading(true);
    console.log('[Security Urban :: UI] Enviando formulario de registro para:', email.trim());

    try {
      const result = await executeSignUp(email.trim(), password, fullName.trim(), sector);

      if (result.error) {
        if (result.error === 'EMAIL_ALREADY_IN_USE') {
          setErrorMessage('Ya existe una cuenta registrada con este correo electrónico.');
        } else if (result.error === 'WEAK_PASSWORD') {
          setErrorMessage('La contraseña proporcionada es demasiado débil.');
        } else {
          setErrorMessage('No se pudo completar el registro en este momento. Intenta de nuevo.');
        }
      } else {
        console.log('[Security Urban :: UI] ✔ Registro exitoso. Verificación de correo despachada.');
        onSuccess();
      }
    } catch (err) {
      console.error('[Security Urban :: UI] Error inesperado en registro:', err);
      setErrorMessage('Ocurrió un error inesperado al registrar la cuenta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-100 border border-red-400 text-red-900 dark:bg-red-950/70 dark:border-red-600/70 dark:text-red-200 text-sm flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span className="leading-snug font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label htmlFor="register-name-input" className={`block text-sm sm:text-base font-semibold mb-2.5 ${colors.label}`}>
          {t('fullNameLabel')}
        </label>
        <div className="relative">
          <UserIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <input
            id="register-name-input"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('fullNamePlaceholder')}
            autoComplete="name"
            className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="register-email-input" className={`block text-sm sm:text-base font-semibold mb-2.5 ${colors.label}`}>
          {t('emailLabel')}
        </label>
        <div className="relative">
          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <input
            id="register-email-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
          />
        </div>
      </div>

      {/* Sector Comunal (Comuna 8) */}
      <div>
        <label htmlFor="register-sector-input" className={`block text-sm sm:text-base font-semibold mb-2.5 ${colors.label}`}>
          Sector / Barrio (Comuna 8)
        </label>
        <div className="relative">
          <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <select
            id="register-sector-input"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border appearance-none cursor-pointer ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText}`}
          >
            <option value="Villa Hermosa">Villa Hermosa (Comuna 8)</option>
            <option value="Enciso">Enciso</option>
            <option value="La Ladera">La Ladera</option>
            <option value="Sucre">Sucre</option>
            <option value="Boston">Boston</option>
            <option value="Los Mangos">Los Mangos</option>
            <option value="Trece de Noviembre">Trece de Noviembre</option>
            <option value="El Pinal">El Pinal</option>
            <option value="Las Estancias">Las Estancias</option>
            <option value="San Antonio">San Antonio</option>
            <option value="Llanaditas">Llanaditas</option>
            <option value="La Libertad">La Libertad</option>
            <option value="Otro sector Comuna 8">Otro sector (Comuna 8)</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
            ▼
          </div>
        </div>
      </div>

      {/* Password with Strength Meter */}
      <div>
        <label htmlFor="register-password-input" className={`block text-sm sm:text-base font-semibold mb-2.5 ${colors.label}`}>
          {t('passwordLabel')}
        </label>
        <div className="relative">
          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <input
            id="register-password-input"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('passwordPlaceholder')}
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

        {/* Real-time Password Strength Criteria */}
        <PasswordStrengthMeter password={password} />
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="register-confirm-password-input" className={`block text-sm sm:text-base font-semibold mb-2.5 ${colors.label}`}>
          {t('confirmPasswordLabel')}
        </label>
        <div className="relative">
          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <input
            id="register-confirm-password-input"
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('confirmPasswordPlaceholder')}
            autoComplete="new-password"
            className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
          />
        </div>
      </div>

      {/* Terms Agreement */}
      <label className="flex items-start gap-3 pt-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 rounded border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-900 text-red-600 focus:ring-red-500 shrink-0 cursor-pointer"
        />
        <span className={`text-xs sm:text-sm font-medium leading-relaxed ${colors.mutedText}`}>
          {t('termsAgreement')} (Comuna 8 - Medellín).
        </span>
      </label>

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
        disabled={isLoading}
        className="w-full py-4 sm:py-4.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 dark:shadow-red-950/60 transition cursor-pointer active:scale-[0.99]"
      >
        {isLoading ? (
          <span>{t('loading')}</span>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5" />
            <span>{t('registerButton')}</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      {/* Switch to Login link */}
      <div className="text-center pt-2">
        <p className={`text-sm sm:text-base font-medium ${colors.mutedText}`}>
          {t('haveAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className={`font-bold transition hover:underline cursor-pointer ${colors.linkText} ${colors.linkHover}`}
          >
            {t('loginTab')}
          </button>
        </p>
      </div>
    </form>
  );
};
