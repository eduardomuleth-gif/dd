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
          isDark ? 'bg-[#090d16]' : 'bg-slate-50'
        }`}
      />

      {/* Subtle Architectural Grid Texture */}
      <svg
        className={`absolute inset-0 w-full h-full ${
          isDark ? 'opacity-[0.06]' : 'opacity-[0.045]'
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
            {/* Subtle center point for tactical coordinate mesh */}
            <circle cx="24" cy="24" r="0.75" fill={isDark ? '#ffffff' : '#0f172a'} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* Tactical Ambient Radial Gradients for visual depth */}
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(ellipse_at_80%_15%,rgba(220,38,38,0.16),transparent_50%),radial-gradient(ellipse_at_15%_85%,rgba(15,23,42,0.6),transparent_55%),radial-gradient(circle_at_50%_40%,rgba(30,41,59,0.25),transparent_60%)]'
            : 'bg-[radial-gradient(ellipse_at_80%_15%,rgba(239,68,68,0.08),transparent_50%),radial-gradient(ellipse_at_15%_85%,rgba(203,213,225,0.45),transparent_55%)]'
        }`}
      />

      {/* Subtle Corner Tactical HUD Crosshairs */}
      <div className={`absolute top-4 left-4 text-xs font-mono font-bold ${isDark ? 'text-red-500/20' : 'text-slate-400/30'}`}>
        +
      </div>
      <div className={`absolute top-4 right-4 text-xs font-mono font-bold ${isDark ? 'text-red-500/20' : 'text-slate-400/30'}`}>
        +
      </div>
      <div className={`absolute bottom-4 left-4 text-xs font-mono font-bold ${isDark ? 'text-red-500/20' : 'text-slate-400/30'}`}>
        +
      </div>
      <div className={`absolute bottom-4 right-4 text-xs font-mono font-bold ${isDark ? 'text-red-500/20' : 'text-slate-400/30'}`}>
        +
      </div>
    </div>
  );
});
