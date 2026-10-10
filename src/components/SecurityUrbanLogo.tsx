import React, { useId } from 'react';

interface SecurityUrbanLogoProps {
  className?: string;
  size?: number | string;
  animated?: boolean;
}

/**
 * Security Urban Brand Identity Logo
 * Silhouette of a person holding a magnifying glass inspecting a tactical mini-map with location pin.
 */
export const SecurityUrbanLogo: React.FC<SecurityUrbanLogoProps> = React.memo(({
  className = 'w-6 h-6',
  size,
  animated = false,
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const clipPathId = `urban-lens-clip-${uniqueId}`;
  const glowGradId = `lens-glass-glow-${uniqueId}`;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      focusable="false"
      className={`shrink-0 select-none aspect-square ${className} ${animated ? 'transition-transform duration-300 group-hover:scale-105' : ''}`}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Security Urban Logo"
    >
      <defs>
        {/* Lens Clip Path to ensure map streets stay strictly inside magnifying glass */}
        <clipPath id={clipPathId}>
          <circle cx="63" cy="42" r="20" />
        </clipPath>
        
        {/* Subtle lens tint gradient */}
        <radialGradient id={glowGradId} cx="60%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
        </radialGradient>
      </defs>

      {/* 1. Person Silhouette (Head, Neck, Torso and Arm reaching forward) */}
      <g fill="currentColor">
        {/* Head */}
        <circle cx="32" cy="28" r="12" />

        {/* Torso & Shoulders */}
        <path
          d="M12 78 C12 58, 22 47, 34 47 C40 47, 46 50, 49 54 C45 61, 41 70, 39 78 Z"
          fill="currentColor"
        />

        {/* Forward-reaching Arm holding the magnifying glass handle */}
        <path
          d="M34 52 C44 52, 54 58, 68 64 C70 65, 71 68, 69 71 C67 73, 64 73, 61 71 C50 66, 42 61, 35 60 Z"
          fill="currentColor"
        />

        {/* Hand grasping the base of the lens handle */}
        <circle cx="68" cy="65" r="4.5" />
      </g>

      {/* 2. Magnifying Glass Interior (Tactical Mini-Map Grid) */}
      <g clipPath={`url(#${clipPathId})`}>
        {/* Glass lens background tint */}
        <circle cx="63" cy="42" r="20" fill={`url(#${glowGradId})`} />

        {/* Map Streets / Urban Grid lines */}
        <path
          d="M40 42 L86 42"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeOpacity="0.85"
          strokeLinecap="round"
        />
        <path
          d="M51 22 L75 62"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.85"
          strokeLinecap="round"
        />
        <path
          d="M72 23 L55 61"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeOpacity="0.75"
          strokeLinecap="round"
        />
        <path
          d="M44 32 L82 54"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.65"
          strokeLinecap="round"
        />

        {/* Mini Location Pin inside the mini-map */}
        <g transform="translate(63, 39)">
          {/* Pulsing beacon radar ring */}
          <circle cx="0" cy="0" r="7" stroke="#f43f5e" strokeWidth="1.2" opacity="0.6" />
          
          {/* Map Pin Droplet Shape */}
          <path
            d="M0 -9 C-4.5 -9 -8 -5.5 -8 -1 C-8 4.2 0 10 0 10 C0 10 8 4.2 8 -1 C8 -5.5 4.5 -9 0 -9 Z"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth="1.4"
          />
          {/* Inner pin eye dot */}
          <circle cx="0" cy="-2" r="2.2" fill="#ffffff" />
        </g>
      </g>

      {/* 3. Magnifying Glass Outer Rim and Handle */}
      {/* Outer circular metal frame */}
      <circle
        cx="63"
        cy="42"
        r="20"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />

      {/* Reflection shine on upper-left lens rim */}
      <path
        d="M49 32 A 18 18 0 0 1 63 24"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Magnifying Glass Sturdy Handle */}
      <line
        x1="76"
        y1="56"
        x2="90"
        y2="74"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
});

export default SecurityUrbanLogo;
