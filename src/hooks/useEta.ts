import { useEffect, useRef, useState } from 'react';

export function useEta(progress: number) {
  const startRef = useRef<number | null>(null);
  const [etaMs, setEtaMs] = useState<number | null>(null);

  useEffect(() => {
    // Progress is 0-100. Ignore 0 to avoid division by zero.
    if (progress > 0 && progress <= 100) {
      if (startRef.current === null) startRef.current = Date.now();

      const elapsed = Date.now() - startRef.current;
      const remaining = (elapsed * (100 - progress)) / progress;
      setEtaMs(remaining);
    }
    // Reset when a new analysis starts (progress goes back to 0)
    if (progress === 0) {
      startRef.current = null;
      setEtaMs(null);
    }
  }, [progress]);

  return etaMs; // null until we have a valid estimate
}
