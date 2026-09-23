import React, { useMemo } from 'react';
import { Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const criteria = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  }, [password]);

  const score = useMemo(() => {
    let count = 0;
    if (criteria.minLength) count++;
    if (criteria.hasUppercase) count++;
    if (criteria.hasNumber) count++;
    return count;
  }, [criteria]);

  if (!password) {
    return null;
  }

  let progressColor = 'bg-red-500';
  let labelText = t('pwStrengthWeak');
  let textColor = 'text-red-600 dark:text-red-400';

  if (score === 2) {
    progressColor = 'bg-amber-500';
    labelText = t('pwStrengthMedium');
    textColor = 'text-amber-600 dark:text-amber-400';
  } else if (score === 3) {
    progressColor = 'bg-emerald-600';
    labelText = t('pwStrengthStrong');
    textColor = 'text-emerald-700 dark:text-emerald-400';
  }

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
      {/* Strength Bar */}
      <div className="flex items-center justify-between">
        <span className={`text-xs sm:text-sm font-medium flex items-center gap-1.5 ${colors.mutedText}`}>
          {score === 3 ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 inline" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 inline" />
          )}
          {t('pwCriteriaTitle')}
        </span>
        <span className={`font-bold text-xs sm:text-sm ${textColor}`}>{labelText}</span>
      </div>

      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${(score / 3) * 100}%` }}
        />
      </div>

      {/* Criteria Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <div
          className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${
            criteria.minLength
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-500'
          }`}
        >
          {criteria.minLength ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <X className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
          )}
          <span>{t('pwMinLength')}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${
            criteria.hasUppercase
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-500'
          }`}
        >
          {criteria.hasUppercase ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <X className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
          )}
          <span>{t('pwUppercase')}</span>
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${
            criteria.hasNumber
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-500'
          }`}
        >
          {criteria.hasNumber ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <X className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
          )}
          <span>{t('pwNumber')}</span>
        </div>
      </div>
    </div>
  );
};
