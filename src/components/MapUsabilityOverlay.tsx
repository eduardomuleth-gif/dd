/// <reference types="@types/google.maps" />

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Minus, Crosshair, MousePointerClick } from 'lucide-react';

export interface UseSmoothMapUsabilityOptions {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  mapInstanceRef: React.MutableRefObject<google.maps.Map | null>;
  mapLoaded: boolean;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  buttonStep?: number;
  wheelStep?: number;
  onZoomChange?: (zoom: number) => void;
}

export interface SmoothMapUsabilityController {
  zoomLevel: number;
  isHintHighlighted: boolean;
  isCtrlZooming: boolean;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  smoothZoomTo: (targetZoom: number) => void;
  smoothZoomBy: (delta: number) => void;
}

/**
 * Unified hook for all Google Maps across the platform:
 * - Disables default mouse-wheel zoom so the wheel always scrolls the page naturally.
 * - Enables smooth fractional wheel zoom ONLY when holding Ctrl (or Cmd on Mac).
 * - Provides smooth animated + / - zoom with small steps.
 * - Works alongside gestureHandling: 'cooperative' so mobile uses 2 fingers to move the map and 1 finger to scroll the page.
 */
export function useSmoothMapUsability({
  mapContainerRef,
  mapInstanceRef,
  mapLoaded,
  initialZoom = 14,
  minZoom = 10,
  maxZoom = 20,
  buttonStep = 0.5,
  wheelStep = 0.35,
  onZoomChange,
}: UseSmoothMapUsabilityOptions): SmoothMapUsabilityController {
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom);
  const [isHintHighlighted, setIsHintHighlighted] = useState<boolean>(false);
  const [isCtrlZooming, setIsCtrlZooming] = useState<boolean>(false);

  const currentZoomRef = useRef<number>(initialZoom);
  const targetZoomRef = useRef<number>(initialZoom);
  const rafIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctrlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMapZoom = useCallback((map: google.maps.Map, nextZoom: number) => {
    try {
      if (typeof map.moveCamera === 'function') {
        map.moveCamera({ zoom: nextZoom });
      } else {
        map.setZoom(nextZoom);
      }
    } catch {
      try {
        map.setZoom(nextZoom);
      } catch {
        // Ignore if map not ready
      }
    }
  }, []);

  const startZoomAnimation = useCallback(() => {
    if (rafIdRef.current !== null) return;
    isAnimatingRef.current = true;

    const stepFrame = () => {
      const map = mapInstanceRef.current;
      if (!map) {
        isAnimatingRef.current = false;
        rafIdRef.current = null;
        return;
      }

      const current = currentZoomRef.current;
      const target = targetZoomRef.current;
      const diff = target - current;

      if (Math.abs(diff) < 0.01) {
        currentZoomRef.current = target;
        applyMapZoom(map, target);
        const rounded = Math.round(target * 10) / 10;
        setZoomLevel(rounded);
        onZoomChange?.(rounded);
        isAnimatingRef.current = false;
        rafIdRef.current = null;
        return;
      }

      // Smooth cubic-like interpolation at 60fps
      const next = current + diff * 0.22;
      currentZoomRef.current = next;
      applyMapZoom(map, next);

      const rounded = Math.round(next * 10) / 10;
      setZoomLevel(rounded);
      onZoomChange?.(rounded);

      rafIdRef.current = requestAnimationFrame(stepFrame);
    };

    rafIdRef.current = requestAnimationFrame(stepFrame);
  }, [applyMapZoom, mapInstanceRef, onZoomChange]);

  const smoothZoomTo = useCallback(
    (target: number) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (!isAnimatingRef.current) {
        const actual = map.getZoom();
        if (typeof actual === 'number' && !isNaN(actual)) {
          currentZoomRef.current = actual;
        }
      }

      const clamped = Math.min(maxZoom, Math.max(minZoom, target));
      targetZoomRef.current = clamped;
      startZoomAnimation();
    },
    [mapInstanceRef, maxZoom, minZoom, startZoomAnimation]
  );

  const smoothZoomBy = useCallback(
    (delta: number) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const base = isAnimatingRef.current
        ? targetZoomRef.current
        : map.getZoom() ?? currentZoomRef.current ?? initialZoom;

      if (!isAnimatingRef.current) {
        currentZoomRef.current = base;
      }

      const clamped = Math.min(maxZoom, Math.max(minZoom, base + delta));
      targetZoomRef.current = clamped;
      startZoomAnimation();
    },
    [initialZoom, mapInstanceRef, maxZoom, minZoom, startZoomAnimation]
  );

  const handleZoomIn = useCallback(() => {
    smoothZoomBy(buttonStep);
  }, [buttonStep, smoothZoomBy]);

  const handleZoomOut = useCallback(() => {
    smoothZoomBy(-buttonStep);
  }, [buttonStep, smoothZoomBy]);

  // Sync zoom state when map changes zoom externally (e.g. fitBounds, marker click, sector select)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const initialActual = map.getZoom();
    if (typeof initialActual === 'number' && !isNaN(initialActual)) {
      currentZoomRef.current = initialActual;
      targetZoomRef.current = initialActual;
      const rounded = Math.round(initialActual * 10) / 10;
      setZoomLevel(rounded);
      onZoomChange?.(rounded);
    }

    const listener = map.addListener('zoom_changed', () => {
      if (isAnimatingRef.current) return;
      const z = map.getZoom();
      if (typeof z === 'number' && !isNaN(z)) {
        currentZoomRef.current = z;
        targetZoomRef.current = z;
        const rounded = Math.round(z * 10) / 10;
        setZoomLevel(rounded);
        onZoomChange?.(rounded);
      }
    });

    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, [mapInstanceRef, mapLoaded, onZoomChange]);

  // Intercept wheel & touch gestures on the map container
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const triggerHintHighlight = () => {
      setIsHintHighlighted(true);
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
      hintTimeoutRef.current = setTimeout(() => {
        setIsHintHighlighted(false);
      }, 1800);
    };

    const handleWheelCapture = (e: WheelEvent) => {
      const isModifierPressed = e.ctrlKey || e.metaKey;

      if (!isModifierPressed) {
        // Stop Google Maps from seeing the wheel event so it NEVER zooms abruptly,
        // while NOT calling preventDefault() so the page scrolls 100% naturally.
        e.stopPropagation();
        triggerHintHighlight();
        return;
      }

      // Ctrl (or Cmd on Mac) is held: prevent browser page zoom and perform smooth fractional map zoom
      e.preventDefault();
      e.stopPropagation();

      setIsCtrlZooming(true);
      setIsHintHighlighted(false);
      if (ctrlTimeoutRef.current) {
        clearTimeout(ctrlTimeoutRef.current);
      }
      ctrlTimeoutRef.current = setTimeout(() => {
        setIsCtrlZooming(false);
      }, 900);

      if (e.deltaY === 0) return;
      const direction = e.deltaY < 0 ? 1 : -1;
      smoothZoomBy(direction * wheelStep);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        triggerHintHighlight();
      }
    };

    container.addEventListener('wheel', handleWheelCapture, { capture: true, passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheelCapture, { capture: true });
      container.removeEventListener('touchstart', handleTouchStart);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      if (ctrlTimeoutRef.current) clearTimeout(ctrlTimeoutRef.current);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [mapContainerRef, smoothZoomBy, wheelStep]);

  return {
    zoomLevel,
    isHintHighlighted,
    isCtrlZooming,
    handleZoomIn,
    handleZoomOut,
    smoothZoomTo,
    smoothZoomBy,
  };
}

interface MapUsabilityOverlayProps {
  zoomLevel: number;
  isHintHighlighted: boolean;
  isCtrlZooming: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetCenter?: () => void;
  resetTitle?: string;
  noticePosition?: 'top-center' | 'bottom-center';
}

/**
 * Consistent on-map overlay for all maps across the platform:
 * 1. Subtle notice "Usa Ctrl + rueda para hacer zoom" (highlights when scrolling without Ctrl/Cmd, plus 2-finger mobile hint).
 * 2. Visible + and - buttons for smooth, small-step animated zoom.
 */
export const MapUsabilityOverlay: React.FC<MapUsabilityOverlayProps> = ({
  zoomLevel,
  isHintHighlighted,
  isCtrlZooming,
  onZoomIn,
  onZoomOut,
  onResetCenter,
  resetTitle = 'Centrar mapa',
  noticePosition = 'bottom-center',
}) => {
  const positionClasses =
    noticePosition === 'top-center'
      ? 'top-3.5 left-1/2 -translate-x-1/2'
      : 'bottom-3.5 left-1/2 -translate-x-1/2';

  return (
    <>
      {/* Subtle on-map notice: "Usa Ctrl + rueda para hacer zoom" */}
      <div
        className={`absolute ${positionClasses} z-20 pointer-events-none select-none transition-all duration-300 max-w-[92%]`}
      >
        <div
          className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-[11px] font-medium flex items-center gap-2 transition-all duration-300 ${
            isCtrlZooming
              ? 'bg-emerald-950/90 border-emerald-400/80 text-emerald-200 shadow-lg shadow-emerald-950/50 scale-105'
              : isHintHighlighted
              ? 'bg-slate-950/95 border-cyan-400/90 text-white shadow-xl shadow-cyan-950/60 scale-105 ring-2 ring-cyan-400/30'
              : 'bg-slate-950/75 border-white/15 text-slate-200/90 shadow-md'
          }`}
        >
          <MousePointerClick
            className={`w-3.5 h-3.5 shrink-0 ${
              isCtrlZooming
                ? 'text-emerald-400'
                : isHintHighlighted
                ? 'text-cyan-400 animate-pulse'
                : 'text-cyan-400/80'
            }`}
          />
          <span className="whitespace-nowrap font-semibold tracking-tight">
            Usa Ctrl + rueda para hacer zoom
          </span>
          <span className="hidden sm:inline text-slate-400 text-[10px] font-mono">
            (o Cmd en Mac)
          </span>
          <span className="sm:hidden text-slate-300 text-[10px] border-l border-white/20 pl-1.5">
            2 dedos para mover
          </span>
        </div>
      </div>

      {/* Smooth Animated + / - Zoom Controls */}
      <div className="absolute right-3.5 bottom-5 z-20 flex flex-col items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md shadow-2xl">
        <button
          type="button"
          onClick={onZoomIn}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 text-white transition-all active:scale-95 shadow cursor-pointer"
          title="Acercar zoom suave (+)"
          aria-label="Acercar zoom (+)"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="px-1 py-0.5 text-[10px] font-mono font-bold text-cyan-300 select-none">
          {zoomLevel.toFixed(1).replace(/\.0$/, '')}x
        </div>

        <button
          type="button"
          onClick={onZoomOut}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 text-white transition-all active:scale-95 shadow cursor-pointer"
          title="Alejar zoom suave (-)"
          aria-label="Alejar zoom (-)"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {onResetCenter && (
          <>
            <div className="w-6 h-[1px] bg-white/15 my-0.5" />
            <button
              type="button"
              onClick={onResetCenter}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/90 hover:bg-slate-700 text-cyan-400 transition-all active:scale-95 shadow cursor-pointer"
              title={resetTitle}
              aria-label={resetTitle}
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </>
  );
};
