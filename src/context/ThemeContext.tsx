import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeMode } from '../types/auth';

export interface ThemeColors {
  // Page canvas
  canvasBg: string;
  canvasText: string;

  // General theme text tokens
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;

  // Header & Navigation
  headerBg: string;
  headerBorder: string;
  headerBrandText: string;
  headerSubText: string;

  // Primary Card
  cardBg: string;
  cardBorder: string;
  cardTitle: string;
  cardSubtitle: string;
  cardGlow: string;

  // Segmented Tabs
  tabTrackBg: string;
  tabTrackBorder: string;
  tabInactiveText: string;
  tabInactiveHover: string;

  // Form Inputs & Labels
  label: string;
  inputBg: string;
  inputBorder: string;
  inputFocusBorder: string;
  inputText: string;
  inputPlaceholder: string;
  inputIcon: string;
  inputEyeIcon: string;
  inputEyeHover: string;

  // Secondary elements & Links
  linkText: string;
  linkHover: string;
  mutedText: string;
  checkboxText: string;
  checkboxBg: string;
  checkboxBorder: string;

  // Captcha Box
  captchaBg: string;
  captchaBorder: string;
  captchaVerifiedBg: string;
  captchaVerifiedBorder: string;
  captchaBoxBg: string;
  captchaBoxBorder: string;
  captchaText: string;
  captchaVerifiedText: string;
  captchaSubText: string;

  // Badges & Pills
  badgeLocationBg: string;
  badgeLocationText: string;
  badgeLocationBorder: string;
  badgeOnlineBg: string;
  badgeOnlineText: string;
  badgeOnlineBorder: string;
  badgeSecureBg: string;
  badgeSecureText: string;
  badgeSecureBorder: string;

  // Modals & Drawers
  modalBg: string;
  modalBorder: string;
  modalText: string;
  modalMuted: string;
  modalInputBg: string;
  modalInputBorder: string;

  // Semantic Status Tokens (Success, Warning, Danger, Info) & Structural Dividers
  divider: string;
  surfaceSubtle: string;
  semanticSuccessBadge: string;
  semanticWarningBadge: string;
  semanticDangerBadge: string;
  semanticInfoBadge: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  colors: ThemeColors;
}

const THEME_STORAGE_KEY = 'security_urban_theme_pref';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (err) {
      console.warn('[Security Urban Theme] Failed to persist theme:', err);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  // Centralized theme color tokens guaranteeing WCAG AA contrast and no invisible text
  const colors: ThemeColors = useMemo(() => {
    const isDark = theme === 'dark';

    return {
      // Page canvas
      canvasBg: isDark ? 'bg-[#0b0f19]' : 'bg-slate-50',
      canvasText: isDark ? 'text-slate-100' : 'text-slate-900',

      // General theme text tokens (WCAG AA contrast guaranteed)
      textPrimary: isDark ? 'text-slate-100' : 'text-slate-900',
      textSecondary: isDark ? 'text-slate-300' : 'text-slate-700',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-600',
      textSubtle: isDark ? 'text-slate-400' : 'text-slate-600',

      // Header & Navigation
      headerBg: isDark ? 'bg-slate-900/95' : 'bg-white/95',
      headerBorder: isDark ? 'border-slate-800' : 'border-slate-200',
      headerBrandText: isDark ? 'text-white' : 'text-slate-900',
      headerSubText: isDark ? 'text-slate-400' : 'text-slate-600',

      // Primary Card: Clean, balanced surfaces and subtle structural borders
      cardBg: isDark ? 'bg-slate-900/90' : 'bg-white',
      cardBorder: isDark ? 'border-slate-800' : 'border-slate-200/90',
      cardTitle: isDark ? 'text-white' : 'text-slate-900',
      cardSubtitle: isDark ? 'text-slate-300' : 'text-slate-600',
      cardGlow: isDark ? 'bg-red-600/10' : 'bg-red-500/5',

      // Segmented Tabs
      tabTrackBg: isDark ? 'bg-slate-950/80' : 'bg-slate-100',
      tabTrackBorder: isDark ? 'border-slate-800' : 'border-slate-200',
      tabInactiveText: isDark ? 'text-slate-300' : 'text-slate-700',
      tabInactiveHover: isDark ? 'hover:text-white' : 'hover:text-slate-900',

      // Form Inputs & Labels
      label: isDark ? 'text-slate-200 font-semibold' : 'text-slate-800 font-semibold',
      inputBg: isDark ? 'bg-slate-950/80' : 'bg-white',
      inputBorder: isDark ? 'border-slate-700/80' : 'border-slate-300',
      inputFocusBorder: 'focus:border-red-600 focus:ring-2 focus:ring-red-600/20',
      inputText: isDark ? 'text-white' : 'text-slate-900',
      inputPlaceholder: isDark ? 'placeholder-slate-500' : 'placeholder-slate-400',
      inputIcon: isDark ? 'text-slate-400' : 'text-slate-500',
      inputEyeIcon: isDark ? 'text-slate-400' : 'text-slate-500',
      inputEyeHover: isDark ? 'hover:text-slate-200' : 'hover:text-slate-900',

      // Secondary elements & Links
      linkText: isDark ? 'text-red-400' : 'text-red-600',
      linkHover: isDark ? 'hover:text-red-300' : 'hover:text-red-700',
      mutedText: isDark ? 'text-slate-400' : 'text-slate-600',
      checkboxText: isDark ? 'text-slate-300' : 'text-slate-700',
      checkboxBg: isDark ? 'bg-slate-900' : 'bg-white',
      checkboxBorder: isDark ? 'border-slate-700' : 'border-slate-300',

      // Captcha Box
      captchaBg: isDark ? 'bg-slate-950/60' : 'bg-slate-50',
      captchaBorder: isDark ? 'border-slate-800' : 'border-slate-200',
      captchaVerifiedBg: isDark ? 'bg-emerald-950/25' : 'bg-emerald-50/80',
      captchaVerifiedBorder: isDark ? 'border-emerald-600/40' : 'border-emerald-500/50',
      captchaBoxBg: isDark ? 'bg-slate-800' : 'bg-white',
      captchaBoxBorder: isDark ? 'border-slate-600' : 'border-slate-300',
      captchaText: isDark ? 'text-slate-200' : 'text-slate-800',
      captchaVerifiedText: isDark ? 'text-emerald-400' : 'text-emerald-800',
      captchaSubText: isDark ? 'text-slate-400' : 'text-slate-600',

      // Badges & Pills
      badgeLocationBg: isDark ? 'bg-red-950/40' : 'bg-red-50',
      badgeLocationText: isDark ? 'text-red-300' : 'text-red-800 font-semibold',
      badgeLocationBorder: isDark ? 'border-red-800/40' : 'border-red-200',
      badgeOnlineBg: isDark ? 'bg-emerald-950/40' : 'bg-emerald-50',
      badgeOnlineText: isDark ? 'text-emerald-300' : 'text-emerald-800 font-semibold',
      badgeOnlineBorder: isDark ? 'border-emerald-800/40' : 'border-emerald-200',
      badgeSecureBg: isDark ? 'bg-slate-800/70' : 'bg-slate-100',
      badgeSecureText: isDark ? 'text-slate-300' : 'text-slate-700 font-semibold',
      badgeSecureBorder: isDark ? 'border-slate-700/60' : 'border-slate-200',

      // Modals & Drawers
      modalBg: isDark ? 'bg-slate-900' : 'bg-white',
      modalBorder: isDark ? 'border-slate-800' : 'border-slate-200',
      modalText: isDark ? 'text-slate-100' : 'text-slate-900',
      modalMuted: isDark ? 'text-slate-400' : 'text-slate-600',
      modalInputBg: isDark ? 'bg-slate-950' : 'bg-slate-50',
      modalInputBorder: isDark ? 'border-slate-700' : 'border-slate-300',

      // Semantic Status Tokens & Structural Dividers
      divider: isDark ? 'border-slate-800' : 'border-slate-200',
      surfaceSubtle: isDark ? 'bg-slate-950/70' : 'bg-slate-50',
      semanticSuccessBadge: isDark
        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200',
      semanticWarningBadge: isDark
        ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
        : 'bg-amber-50 text-amber-800 border-amber-200',
      semanticDangerBadge: isDark
        ? 'bg-red-950/60 text-red-300 border-red-700/50'
        : 'bg-red-50 text-red-800 border-red-200',
      semanticInfoBadge: isDark
        ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
        : 'bg-blue-50 text-blue-800 border-blue-200',
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
