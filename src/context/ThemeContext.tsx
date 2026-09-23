import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeMode } from '../types/auth';

export interface ThemeColors {
  // Page canvas
  canvasBg: string;
  canvasText: string;

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
      canvasBg: isDark ? 'bg-[#07090e]' : 'bg-slate-100',
      canvasText: isDark ? 'text-slate-100' : 'text-slate-900',

      // Header & Navigation
      headerBg: isDark ? 'bg-slate-900/80' : 'bg-white/90',
      headerBorder: isDark ? 'border-slate-700/60' : 'border-slate-300',
      headerBrandText: isDark ? 'text-white' : 'text-slate-900',
      headerSubText: isDark ? 'text-slate-400' : 'text-slate-600',

      // Primary Card: In light mode, deep crisp white with distinct red border & shadow
      cardBg: isDark ? 'bg-slate-950/90' : 'bg-white/95',
      cardBorder: isDark ? 'border-red-600/40' : 'border-red-600/40',
      cardTitle: isDark ? 'text-white' : 'text-slate-900',
      cardSubtitle: isDark ? 'text-slate-400' : 'text-slate-600',
      cardGlow: isDark ? 'bg-red-600/15' : 'bg-red-500/10',

      // Segmented Tabs
      tabTrackBg: isDark ? 'bg-slate-900/90' : 'bg-slate-100',
      tabTrackBorder: isDark ? 'border-slate-800' : 'border-slate-300',
      tabInactiveText: isDark ? 'text-slate-400' : 'text-slate-700',
      tabInactiveHover: isDark ? 'hover:text-white' : 'hover:text-slate-950',

      // Form Inputs & Labels: In light mode, dark high-contrast slate-800 text with slate-200 background
      label: isDark ? 'text-slate-200' : 'text-slate-800 font-bold',
      inputBg: isDark ? 'bg-slate-900/90' : 'bg-slate-50',
      inputBorder: isDark ? 'border-slate-700/80' : 'border-slate-300',
      inputFocusBorder: 'focus:border-red-600 focus:ring-1 focus:ring-red-600',
      inputText: isDark ? 'text-white' : 'text-slate-900',
      inputPlaceholder: isDark ? 'placeholder-slate-500' : 'placeholder-slate-400',
      inputIcon: isDark ? 'text-slate-400' : 'text-slate-600',
      inputEyeIcon: isDark ? 'text-slate-400' : 'text-slate-600',
      inputEyeHover: isDark ? 'hover:text-slate-200' : 'hover:text-slate-900',

      // Secondary elements & Links
      linkText: isDark ? 'text-red-400' : 'text-red-700',
      linkHover: isDark ? 'hover:text-red-300' : 'hover:text-red-800',
      mutedText: isDark ? 'text-slate-400' : 'text-slate-600',
      checkboxText: isDark ? 'text-slate-300' : 'text-slate-800',
      checkboxBg: isDark ? 'bg-slate-900' : 'bg-white',
      checkboxBorder: isDark ? 'border-slate-700' : 'border-slate-400',

      // Captcha Box
      captchaBg: isDark ? 'bg-slate-900/70' : 'bg-slate-50',
      captchaBorder: isDark ? 'border-slate-700/80' : 'border-slate-300',
      captchaVerifiedBg: isDark ? 'bg-emerald-950/20' : 'bg-emerald-50/80',
      captchaVerifiedBorder: isDark ? 'border-emerald-600/40' : 'border-emerald-600/60',
      captchaBoxBg: isDark ? 'bg-slate-800' : 'bg-white',
      captchaBoxBorder: isDark ? 'border-slate-500' : 'border-slate-400',
      captchaText: isDark ? 'text-slate-200' : 'text-slate-800',
      captchaVerifiedText: isDark ? 'text-emerald-400' : 'text-emerald-800',
      captchaSubText: isDark ? 'text-slate-400' : 'text-slate-600',

      // Badges & Pills
      badgeLocationBg: isDark ? 'bg-red-950/50' : 'bg-red-100',
      badgeLocationText: isDark ? 'text-red-200' : 'text-red-900 font-semibold',
      badgeLocationBorder: isDark ? 'border-red-800/40' : 'border-red-300',
      badgeOnlineBg: isDark ? 'bg-slate-900/70' : 'bg-emerald-50',
      badgeOnlineText: isDark ? 'text-emerald-300' : 'text-emerald-900 font-semibold',
      badgeOnlineBorder: isDark ? 'border-emerald-900/40' : 'border-emerald-300',
      badgeSecureBg: isDark ? 'bg-slate-900/60' : 'bg-slate-200',
      badgeSecureText: isDark ? 'text-slate-200' : 'text-slate-800 font-semibold',
      badgeSecureBorder: isDark ? 'border-slate-700/50' : 'border-slate-300',

      // Modals & Drawers
      modalBg: isDark ? 'bg-slate-900' : 'bg-white',
      modalBorder: isDark ? 'border-red-600/40' : 'border-red-600/40',
      modalText: isDark ? 'text-slate-100' : 'text-slate-900',
      modalMuted: isDark ? 'text-slate-400' : 'text-slate-600',
      modalInputBg: isDark ? 'bg-slate-800/80' : 'bg-slate-50',
      modalInputBorder: isDark ? 'border-slate-700' : 'border-slate-300',
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
