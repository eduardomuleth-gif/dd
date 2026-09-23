import React from 'react';
import { Shield, Lock, Fingerprint, Camera, MapPin, Radio } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const BackgroundArtwork: React.FC = () => {
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {/* Base Canvas */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          isDark ? 'bg-[#07090e]' : 'bg-slate-100'
        }`}
      />

      {/* Subtle Circuit & Star Matrix Pattern */}
      <svg
        className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
          isDark ? 'opacity-20' : 'opacity-10'
        }`}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="security-circuit-grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            {/* Grid Dots */}
            <circle cx="2" cy="2" r="1.2" fill={isDark ? '#ef4444' : '#991b1b'} opacity="0.6" />
            <circle cx="30" cy="30" r="1" fill={isDark ? '#ffffff' : '#64748b'} opacity="0.4" />
            <circle cx="58" cy="58" r="1.2" fill={isDark ? '#ef4444' : '#991b1b'} opacity="0.6" />
            {/* Subtle Circuit Traces */}
            <path
              d="M 2 2 L 15 2 L 30 17 L 30 45 L 45 60"
              fill="none"
              stroke={isDark ? '#ef4444' : '#cbd5e1'}
              strokeWidth="0.75"
              strokeDasharray="2,4"
              opacity="0.35"
            />
            <path
              d="M 60 10 L 40 10 L 25 25"
              fill="none"
              stroke={isDark ? '#f87171' : '#94a3b8'}
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#security-circuit-grid)" />
      </svg>

      {/* Large Diagonal Wine / Garnet Block (Split Panel) cutting from corner to corner */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          clipPath: 'polygon(38% 0%, 100% 0%, 100% 100%, 65% 100%)',
          background:
            isDark
              ? 'linear-gradient(135deg, rgba(120, 12, 26, 0.95) 0%, rgba(76, 5, 14, 0.98) 50%, rgba(45, 3, 8, 1) 100%)'
              : 'linear-gradient(135deg, rgba(185, 28, 28, 0.92) 0%, rgba(153, 27, 27, 0.95) 50%, rgba(127, 29, 29, 0.98) 100%)',
        }}
      />

      {/* Glowing Diagonal Border Accent Line */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          clipPath: 'polygon(37.8% 0%, 38.3% 0%, 65.3% 100%, 64.8% 100%)',
          background: 'linear-gradient(180deg, #ff4d6d 0%, #dc2626 50%, #7f1d1d 100%)',
          filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.8))',
        }}
      />

      {/* ========================================================================= */}
      {/* TACTICAL HUD & RADAR OVERLAY (Distributed across entire canvas)           */}
      {/* ========================================================================= */}

      {/* 1. Radar Concentric Rings in Bottom-Left Flank */}
      <div className="absolute -bottom-20 -left-20 w-[420px] h-[420px] sm:w-[520px] sm:h-[520px] pointer-events-none">
        <svg
          viewBox="0 0 500 500"
          className={`w-full h-full ${
            isDark
              ? 'text-red-500/15 stroke-red-500/20'
              : 'text-slate-800/15 stroke-slate-600/25'
          }`}
          fill="none"
        >
          {/* Outer Ring */}
          <circle cx="250" cy="250" r="230" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
          {/* Middle Ring */}
          <circle cx="250" cy="250" r="160" stroke="currentColor" strokeWidth="1.25" />
          {/* Inner Ring */}
          <circle cx="250" cy="250" r="90" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" />
          {/* Bullseye Ring */}
          <circle cx="250" cy="250" r="25" stroke="currentColor" strokeWidth="1.5" />
          {/* Center Pivot */}
          <circle cx="250" cy="250" r="3" fill="currentColor" stroke="none" />

          {/* Crosshair Axes */}
          <line x1="20" y1="250" x2="480" y2="250" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 8" />
          <line x1="250" y1="20" x2="250" y2="480" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 8" />

          {/* 45-degree angle marker */}
          <line x1="140" y1="140" x2="360" y2="360" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 6" />

          {/* Degree Ticks around outer circumference */}
          <g stroke="currentColor" strokeWidth="1.5">
            <line x1="250" y1="12" x2="250" y2="24" />
            <line x1="250" y1="476" x2="250" y2="488" />
            <line x1="12" y1="250" x2="24" y2="250" />
            <line x1="476" y1="250" x2="488" y2="250" />
          </g>
        </svg>

        {/* Radar Sweeper Radial Beam */}
        <div
          className={`absolute inset-0 rounded-full animate-[spin_12s_linear_infinite] opacity-30 dark:opacity-20 pointer-events-none ${
            isDark
              ? 'bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(239,68,68,0.18)_360deg)]'
              : 'bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(185,28,28,0.15)_360deg)]'
          }`}
        />
      </div>

      {/* 1B. Secondary Radar Reticle in Top-Right Flank */}
      <div className="absolute -top-24 -right-24 w-[380px] h-[380px] sm:w-[460px] sm:h-[460px] pointer-events-none opacity-20 dark:opacity-25">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full text-white/30 stroke-white/40"
          fill="none"
        >
          <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="200" r="60" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
          <line x1="20" y1="200" x2="380" y2="200" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 6" />
          <line x1="200" y1="20" x2="200" y2="380" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 6" />
          <circle cx="200" cy="200" r="4" fill="currentColor" />
        </svg>
      </div>

      {/* 2. Vector Network Connection Lines across Floating Security Nodes (Distributed) */}
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none ${
          isDark ? 'text-red-500/15' : 'text-slate-700/20'
        }`}
        fill="none"
        stroke="currentColor"
      >
        {/* Connection circuit left flank */}
        <path
          d="M 90 180 L 170 180 L 170 340 L 110 450"
          strokeWidth="1"
          strokeDasharray="4 5"
        />
        {/* Connection circuit mid-left */}
        <path
          d="M 240 230 L 290 230 L 290 490 L 210 580"
          strokeWidth="0.75"
          strokeDasharray="3 6"
        />
        {/* Horizontal scan auxiliary line across top */}
        <line
          x1="30"
          y1="120"
          x2="900"
          y2="120"
          strokeWidth="0.5"
          strokeDasharray="2 8"
          opacity="0.4"
        />
        {/* Horizontal scan auxiliary line across mid */}
        <line
          x1="30"
          y1="340"
          x2="600"
          y2="340"
          strokeWidth="0.5"
          strokeDasharray="2 8"
          opacity="0.6"
        />
        {/* Right side connection telemetry line */}
        <path
          d="M 850 80 L 980 80 L 1050 200"
          strokeWidth="0.75"
          strokeDasharray="3 5"
          opacity="0.3"
        />
      </svg>

      {/* 3. Floating Security HUD Icons & Pulsing Scan Points (Distributed across the whole area) */}
      
      {/* Node 1: Video Surveillance Camera (Top-Left Flank) */}
      <div className="absolute top-[16%] left-[3%] sm:left-[4%] flex items-center gap-2.5 opacity-20 dark:opacity-25 transition-opacity">
        <div className="relative p-2.5 rounded-xl border border-red-600/30 bg-red-500/10 dark:bg-red-950/30 text-red-600 dark:text-red-400 shadow-sm">
          <Camera className="w-5 h-5 stroke-[1.75]" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
          </span>
        </div>
        <div className="hidden lg:flex flex-col text-[10px] font-mono tracking-wider font-semibold text-slate-700 dark:text-red-300/80">
          <span>CAM-08 // NORTE</span>
          <span className="text-[8px] opacity-75">STREAM 1080p • ACTIVO</span>
        </div>
      </div>

      {/* Node 2: Biometric Fingerprint Sensor (Mid-Left Flank) */}
      <div className="absolute top-[44%] left-[4%] sm:left-[5%] flex items-center gap-2.5 opacity-20 dark:opacity-25 transition-opacity">
        <div className="relative p-2.5 rounded-xl border border-red-600/30 bg-red-500/10 dark:bg-red-950/30 text-red-600 dark:text-red-400 shadow-sm">
          <Fingerprint className="w-5 h-5 stroke-[1.75]" />
          <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
        </div>
        <div className="hidden lg:flex flex-col text-[10px] font-mono tracking-wider font-semibold text-slate-700 dark:text-red-300/80">
          <span>BIO-AUTH // 256-BIT</span>
          <span className="text-[8px] opacity-75">ACCESO PROTOCOLO OK</span>
        </div>
      </div>

      {/* Node 3: Perimeter Lock Sensor (Upper-Mid Flank) */}
      <div className="hidden sm:flex absolute top-[22%] left-[18%] items-center gap-2 opacity-15 dark:opacity-20 transition-opacity">
        <div className="p-2 rounded-lg border border-slate-400/40 dark:border-red-500/30 bg-slate-200/40 dark:bg-slate-900/50 text-slate-800 dark:text-red-400">
          <Lock className="w-4 h-4 stroke-[1.75]" />
        </div>
        <span className="text-[9px] font-mono tracking-widest uppercase font-semibold text-slate-700 dark:text-slate-400">
          PERIMETER: LOCKED
        </span>
      </div>

      {/* Node 4: Map Location Checkpoint (Lower-Left Flank) */}
      <div className="absolute top-[72%] left-[3%] sm:left-[5%] flex items-center gap-2.5 opacity-20 dark:opacity-25 transition-opacity">
        <div className="relative p-2.5 rounded-xl border border-red-600/30 bg-red-500/10 dark:bg-red-950/30 text-red-600 dark:text-red-400 shadow-sm">
          <MapPin className="w-5 h-5 stroke-[1.75]" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        </div>
        <div className="hidden lg:flex flex-col text-[10px] font-mono tracking-wider font-semibold text-slate-700 dark:text-red-300/80">
          <span>POSTE 42 // ZONA 8</span>
          <span className="text-[8px] opacity-75">TELEMETRÍA OK</span>
        </div>
      </div>

      {/* Node 5: Radio Frequency node on right peripheral */}
      <div className="hidden md:flex absolute top-[14%] right-[3%] sm:right-[4%] items-center gap-2 opacity-20 dark:opacity-25">
        <div className="p-2 rounded-xl border border-white/20 bg-black/30 text-white shadow-xs">
          <Radio className="w-4 h-4" />
        </div>
        <div className="flex flex-col text-[9px] font-mono tracking-widest text-white/90">
          <span>RF-CHANNEL: CH-08</span>
          <span className="text-[8px] text-white/70">FREC: 462.5625 MHz</span>
        </div>
      </div>

      {/* Node 6: Perimeter Cam East (Mid-Right Flank) */}
      <div className="hidden md:flex absolute top-[48%] right-[4%] items-center gap-2.5 opacity-20 dark:opacity-25">
        <div className="relative p-2.5 rounded-xl border border-white/20 bg-black/30 text-white shadow-xs">
          <Camera className="w-4 h-4" />
          <span className="absolute -bottom-1 -left-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
        </div>
        <div className="flex flex-col text-[9px] font-mono tracking-widest text-white/90">
          <span>CAM-ORIENTAL // ENCISO</span>
          <span className="text-[8px] text-emerald-300">DETECCIÓN NOCTURNA ON</span>
        </div>
      </div>

      {/* Node 7: Guard Beacon (Lower-Right Flank) */}
      <div className="hidden sm:flex absolute bottom-[14%] right-[5%] items-center gap-2 opacity-20 dark:opacity-25">
        <div className="p-2 rounded-xl border border-white/20 bg-black/30 text-white shadow-xs">
          <Shield className="w-4 h-4 text-amber-300" />
        </div>
        <div className="flex flex-col text-[9px] font-mono tracking-widest text-white/90">
          <span>CUADRANTE 8-2 // VILLA HERMOSA</span>
          <span className="text-[8px] text-white/70">PATRULLAJE ACTIVO</span>
        </div>
      </div>

      {/* 4. Telemetry Coordinates & HUD Identifier in Bottom-Left Corner */}
      <div className="absolute bottom-5 left-6 pointer-events-none hidden sm:block opacity-25 dark:opacity-30 transition-opacity">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-800 dark:text-red-300">
            SEC-URB-08 // SISTEMA PERIMETRAL
          </span>
        </div>
        <p className="text-[9px] font-mono tracking-wider text-slate-700 dark:text-slate-400 leading-tight">
          COORD: 06.2476° N, -75.5658° W • ELEV: 1,540m
        </p>
        <p className="text-[9px] font-mono tracking-wider text-slate-600 dark:text-slate-500 leading-tight">
          NODO MEDELLÍN • COMUNA 8 • ESTADO: ESCANEO CONTINUO
        </p>
      </div>

      {/* 5. Telemetry Node Counter in Bottom-Right Corner */}
      <div className="absolute bottom-5 right-6 pointer-events-none hidden sm:block opacity-25 dark:opacity-30 transition-opacity text-right">
        <div className="flex items-center justify-end gap-2 mb-1">
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-white/90">
            RED COMUNAL ACTIVA // 24 NODOS
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <p className="text-[9px] font-mono tracking-wider text-white/70 leading-tight">
          CANAL TÁCTICO CIFRADO • TLS 1.3
        </p>
      </div>

      {/* Ambient Radial Vignette */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_30%_50%,rgba(15,23,42,0)_0%,rgba(7,9,14,0.75)_100%)]'
            : 'bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0)_0%,rgba(241,245,249,0.6)_100%)]'
        }`}
      />
    </div>
  );
};

