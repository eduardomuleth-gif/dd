import { setOptions } from '@googlemaps/js-api-loader';

// Google Maps Platform Configuration for Security Urban
// Uses VITE_GOOGLE_MAPS_API_KEY environment variable or the active Maps Demo Key
export const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
  (typeof window !== 'undefined' && (window as any).__GOOGLE_MAPS_API_KEY__) ||
  'AIzaSyCPKUPur7Fa_0iSebQbfepDMFeDl1T3Ul4';

let isMapsInitialized = false;

export function ensureGoogleMapsInitialized(): void {
  if (isMapsInitialized) return;
  if (typeof window !== 'undefined' && (window as any).google?.maps?.importLibrary) {
    isMapsInitialized = true;
    return;
  }
  try {
    setOptions({
      key: GOOGLE_MAPS_API_KEY,
      v: 'weekly',
    });
    isMapsInitialized = true;
  } catch {
    // Ignore if already configured
    isMapsInitialized = true;
  }
}
