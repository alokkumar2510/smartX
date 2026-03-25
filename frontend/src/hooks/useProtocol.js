/**
 * ─── useProtocol.js ────────────────────────────────────
 * Hook for managing protocol selection (TCP/UDP/Hybrid/Auto).
 */
import { useState, useCallback } from 'react';

const PROTOCOLS = ['TCP', 'UDP', 'HYBRID', 'AUTO'];

const useProtocol = (defaultProtocol = 'AUTO') => {
  const [protocol, setProtocol] = useState(defaultProtocol);

  const switchProtocol = useCallback((newProtocol) => {
    if (PROTOCOLS.includes(newProtocol)) {
      setProtocol(newProtocol);
    }
  }, []);

  const cycleProtocol = useCallback(() => {
    setProtocol((curr) => {
      const idx = PROTOCOLS.indexOf(curr);
      return PROTOCOLS[(idx + 1) % PROTOCOLS.length];
    });
  }, []);

  return { protocol, switchProtocol, cycleProtocol, availableProtocols: PROTOCOLS };
};

export default useProtocol;
