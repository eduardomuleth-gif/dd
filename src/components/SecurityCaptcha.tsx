import React, { useState } from 'react';
import { Check, ShieldCheck, RotateCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface SecurityCaptchaProps {
  isVerified: boolean;
  onVerify: (verified: boolean) => void;
  error?: boolean;
}

export const SecurityCaptcha: React.FC<SecurityCaptchaProps> = ({
  isVerified,
  onVerify,
  error = false,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleCheckboxClick = () => {
    if (isVerified || isVerifying) return;
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onVerify(true);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleCheckboxClick();
    }
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        error
          ? 'border-red-600 bg-red-500/10'
          : isVerified
          ? `${colors.captchaVerifiedBorder} ${colors.captchaVerifiedBg}`
          : `${colors.captchaBorder} ${colors.captchaBg}`
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          id="security-captcha-checkbox"
          role="checkbox"
          tabIndex={0}
          aria-checked={isVerified}
          aria-busy={isVerifying}
          aria-invalid={error && !isVerified}
          aria-label={isVerified ? t('captchaVerified') : t('captchaLabel')}
          onClick={handleCheckboxClick}
          onKeyDown={handleKeyDown}
          className="flex items-center gap-3.5 cursor-pointer select-none grow rounded-xl py-1 focus-visible:outline-2 focus-visible:outline-red-600"
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all shrink-0 ${
              isVerified
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                : error
                ? 'border-red-600 bg-red-100/50 dark:bg-red-950/40'
                : `${colors.captchaBoxBorder} ${colors.captchaBoxBg} hover:border-red-600`
            }`}
          >
            {isVerifying ? (
              <RotateCw className="w-4 h-4 text-red-600 animate-spin" aria-hidden="true" />
            ) : isVerified ? (
              <Check className="w-5 h-5 stroke-[3] text-white" aria-hidden="true" />
            ) : null}
          </div>
          <span
            className={`text-sm sm:text-base font-semibold leading-tight transition-colors ${
              isVerified ? colors.captchaVerifiedText : colors.captchaText
            }`}
          >
            {isVerified ? t('captchaVerified') : t('captchaLabel')}
          </span>
        </div>

        {/* Clean security badge */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <ShieldCheck className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
          <span className={`text-xs sm:text-sm font-semibold hidden min-[360px]:inline ${colors.captchaSubText}`}>
            Seguridad Activa
          </span>
        </div>
      </div>

      {error && !isVerified && (
        <p role="alert" className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2 font-semibold">
          {t('captchaRequired')}
        </p>
      )}
    </div>
  );
};
