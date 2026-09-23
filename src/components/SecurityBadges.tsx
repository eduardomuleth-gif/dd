import React from 'react';
import { ShieldCheck, MapPin, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export const SecurityBadges: React.FC = () => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <div className="flex items-center justify-center sm:justify-end gap-2.5 text-xs sm:text-sm">
      {/* SSL / Safe Channel status */}
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs transition-colors font-medium text-xs sm:text-sm ${colors.badgeOnlineBg} ${colors.badgeOnlineText} ${colors.badgeOnlineBorder}`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
        </span>
        <span>{t('statusOnline')}</span>
      </span>

      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs transition-colors font-medium text-xs sm:text-sm ${colors.badgeSecureBg} ${colors.badgeSecureText} ${colors.badgeSecureBorder}`}
      >
        <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
        <span>{t('statusSecure')}</span>
      </span>
    </div>
  );
};
