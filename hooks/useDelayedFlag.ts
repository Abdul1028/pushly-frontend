import { useEffect, useState } from "react";

/**
 * Returns true only once `active` has stayed true for `delayMs`.
 * Used to hold back skeletons so fast loads never flash them.
 */
export function useDelayedFlag(active: boolean, delayMs = 300) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setElapsed(true), delayMs);
    return () => {
      clearTimeout(id);
      setElapsed(false);
    };
  }, [active, delayMs]);

  return active && elapsed;
}
