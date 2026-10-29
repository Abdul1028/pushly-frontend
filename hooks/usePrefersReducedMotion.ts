import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Hydration-safe reduced-motion flag: false during SSR and hydration,
 * then the real preference, and it follows live changes to the OS setting.
 * (motion's useReducedMotion reads the media query on the first client
 * render, which mismatches the server HTML when the result changes markup.)
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
