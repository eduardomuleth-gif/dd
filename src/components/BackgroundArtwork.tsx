import React, { useId } from 'react';
import { useTheme } from '../context/ThemeContext';

export const BackgroundArtwork: React.FC = React.memo(() => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const patternId = `clean-architectural-grid-${useId().replace(/:/g, '')}`;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* Base Surface Canvas */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          isDark ? 'bg-[#0b0f19]' : 'bg-slate-50'
        }`}
      />

      {/* Subtle Architectural Grid Texture (Low-contrast, non-distracting) */}
      <svg
        className={`absolute inset-0 w-full h-full ${
          isDark ? 'opacity-[0.04]' : 'opacity-[0.035]'
        }`}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        focusable="false"
      >
        <defs>
          <pattern
            id={patternId}
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke={isDark ? '#ffffff' : '#0f172a'}
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* Lightweight Ambient Radial Gradients (Zero GPU filter blur overhead) */}
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_90%_10%,rgba(127,29,29,0.14),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(30,41,59,0.32),transparent_45%)]'
            : 'bg-[radial-gradient(circle_at_90%_10%,rgba(239,68,68,0.05),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(203,213,225,0.35),transparent_45%)]'
        }`}
      />
    </div>
  );
});
