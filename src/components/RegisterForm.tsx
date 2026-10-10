import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, ArrowRight, AlertTriangle, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { executeSignUp } from '../services/firebaseAuth';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { SecurityCaptcha } from './SecurityCaptcha';

export const COMUNA_8_SECTORS_REGISTRATION = [
  'Villa Hermosa',
  'La Ladera',
  'Sucre',
  'Enciso',
  'Boston',
  'Los Mangos',
  'Trece de Noviembre',
  'El Pinal',
  'Las Estancias',
  'San Antonio',
  'Llanaditas',
  'La Libertad',
  'Villa Turbay',
  'Villatina',
  'Golondrinas',
  'Batallón Girardot',
  'Santa Lucía',
  'Pinares de Oriente',
  'Otro',
] as const;

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
  const [sector, setSector] = useState<string>('Villa Hermosa');
  const [customSector, setCustomSector] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEmailInUseError, setIsEmailInUseError] = useState(false);

  const alertContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to error message when it appears
  useEffect(() => {
    if (errorMessage && alertContainerRef.current) {
      alertContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errorMessage]);

  // Validate password criteria: minimum 8 chars, uppercase, number
  const isPasswordValid =
    password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsEmailInUseError(false);

    // Full name check
    if (!fullName.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }

    // Sector validation if "Otro"
    if (sector === 'Otro' && !customSector.trim()) {
      setErrorMessage('Por favor especifique su sector o barrio de residencia en la Comuna 8.');
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
    const finalSector = sector === 'Otro' ? customSector.trim() : sector;
    console.log('[Security Urban :: UI] Enviando formulario de registro para sector:', finalSector);

    try {
      const result = await executeSignUp(email.trim(), password, fullName.trim(), finalSector);

      if (result.error) {
        if (result.error === 'EMAIL_ALREADY_IN_USE') {
          setIsEmailInUseError(true);
          setErrorMessage('Este correo electrónico ya se encuentra registrado en la plataforma. Por favor inicia sesión con tu cuenta existente.');
        } else if (result.error === 'WEAK_PASSWORD') {
          setErrorMessage('La contraseña proporcionada es demasiado débil.');
        } else if (result.error === 'INVALID_EMAIL') {
          setErrorMessage('El formato del correo electrónico no es válido.');
        } else if (result.error === 'TOO_MANY_REQUESTS') {
          setErrorMessage('Demasiados intentos seguidos. Por favor espera un momento antes de volver a intentar.');
        } else {
          setErrorMessage('No se pudo completar el registro en este momento. Intenta de nuevo.');
        }
      } else {
        console.log('[Security Urban :: UI] ✔ Registro exitoso. Verificación de correo despachada.');
        onSuccess();
      }
    } catch (err) {
      console.warn('[Security Urban :: UI] Aviso inesperado en registro:', err);
      setErrorMessage('Ocurrió un inconveniente al registrar la cuenta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            onChange={(e) => {
              setFullName(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
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
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            className={`w-full pl-12 pr-4 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText} ${colors.inputPlaceholder}`}
          />
        </div>
      </div>

      {/* Sector Comunal (Comuna 8) */}
      <div className="space-y-2">
        <label htmlFor="register-sector-input" className={`block text-sm sm:text-base font-semibold ${colors.label}`}>
          Sector / Barrio de Residencia (Comuna 8)
        </label>
        <div className="relative">
          <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.inputIcon}`} />
          <select
            id="register-sector-input"
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            className={`w-full pl-12 pr-10 py-3.5 sm:py-4 rounded-2xl text-base outline-none transition shadow-xs border appearance-none cursor-pointer ${colors.inputBg} ${colors.inputBorder} ${colors.inputFocusBorder} ${colors.inputText}`}
          >
            {COMUNA_8_SECTORS_REGISTRATION.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'Otro' ? 'Otro sector / barrio (Comuna 8)' : sec}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
            ▼
          </div>
        </div>

        {/* PROMPT 2: Immediate Manual Input Field if 'Otro' is selected */}
        {sector === 'Otro' && (
          <div
            id="register-manual-sector-field"
            className="p-3 sm:p-3.5 rounded-2xl border-2 border-red-500/80 bg-red-50/90 dark:bg-red-950/40 flex flex-col gap-1.5 transition-all shadow-xs animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor="register-custom-sector-input"
                className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5"
              >
                <span>Especifique su sector:</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold">Requerido</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="register-custom-sector-input"
                type="text"
                autoFocus
                required
                value={customSector}
                onChange={(e) => {
                  setCustomSector(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ej. Villa Lili, La Honda, San José de la Cima, etc."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm sm:text-base border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
              />
            </div>
          </div>
        )}
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
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
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
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
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
          onChange={(e) => {
            setAcceptTerms(e.target.checked);
            if (errorMessage) setErrorMessage(null);
          }}
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
          onVerify={(v) => {
            setIsCaptchaVerified(v);
            if (v) setCaptchaError(false);
          }}
          error={captchaError}
        />
      </div>

      {/* Solid Red Pill Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
        className="w-full py-4 sm:py-4.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 dark:shadow-red-950/60 transition cursor-pointer active:scale-[0.99]"
      >
        {isLoading ? (
          <span>{t('loading')}</span>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            <span>{t('registerButton')}</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </>
        )}
      </button>

      {/* PROMPT 3: Error Message Positioned Directly Under the Submit Action */}
      {errorMessage && (
        <div
          ref={alertContainerRef}
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-2xl bg-red-100 border-2 border-red-500 text-red-900 dark:bg-red-950/80 dark:border-red-600 dark:text-red-200 text-sm sm:text-base flex flex-col gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-snug font-bold">{errorMessage}</span>
          </div>
          {isEmailInUseError && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="self-start ml-8 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <span>Ir a Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

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
