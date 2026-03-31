/**
 * useNetworkMode — Detect network speed and derive data mode
 * Modes: 'high' | 'medium' | 'low'
 *
 * Detection strategy:
 *   1. navigator.connection API (effectiveType / downlink)
 *   2. Latency probe fallback (ping /favicon.ico)
 *   3. navigator.onLine for hard offline
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const PROBE_URL = '/favicon.ico'; // tiny asset, same origin
const PROBE_INTERVAL = 20_000;    // re-check every 20s

function classifyConnection(conn) {
  if (!conn) return null;
  const { effectiveType, downlink } = conn;
  if (effectiveType === '4g' && downlink >= 2) return 'high';
  if (effectiveType === '4g' || effectiveType === '3g') return 'medium';
  return 'low'; // 2g / slow-2g / very low downlink
}

async function probeLatency() {
  const start = performance.now();
  try {
    await fetch(`${PROBE_URL}?_=${Date.now()}`, {
      cache: 'no-store',
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000),
    });
    return performance.now() - start;
  } catch {
    return Infinity;
  }
}

function latencyToMode(ms) {
  if (ms === Infinity) return 'low';
  if (ms < 200)        return 'high';
  if (ms < 600)        return 'medium';
  return 'low';
}

export function useNetworkMode() {
  const [mode, setMode]         = useState('high'); // optimistic start
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const probeTimer  = useRef(null);
  const manualRef   = useRef(null); // user-forced override

  const detect = useCallback(async () => {
    if (!navigator.onLine) { setMode('low'); setIsOnline(false); return; }
    setIsOnline(true);

    // navigator.connection API (Chrome / Android)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const fromAPI = classifyConnection(conn);
    if (fromAPI) { setMode(manualRef.current || fromAPI); return; }

    // Fallback: latency probe
    const ms = await probeLatency();
    setMode(manualRef.current || latencyToMode(ms));
  }, []);

  useEffect(() => {
    detect();

    // Listen to browser network events
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    conn?.addEventListener('change', detect);
    window.addEventListener('online',  detect);
    window.addEventListener('offline', detect);

    probeTimer.current = setInterval(detect, PROBE_INTERVAL);

    return () => {
      conn?.removeEventListener('change', detect);
      window.removeEventListener('online',  detect);
      window.removeEventListener('offline', detect);
      clearInterval(probeTimer.current);
    };
  }, [detect]);

  /** Allow user to manually force a mode (null = auto) */
  const forceMode = useCallback((m) => {
    manualRef.current = m;
    setMode(m || 'high');
    if (!m) detect(); // re-auto-detect when cleared
  }, [detect]);

  return { mode, isOnline, forceMode };
}
