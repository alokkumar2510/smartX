/**
 * ─── constants.js ──────────────────────────────────────
 * Frontend-specific constants.
 */

// ─── Server Endpoints ───────────────────────────────────
export const WS_URL      = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8765';
export const API_BASE    = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// ─── Protocol Types ─────────────────────────────────────
export const PROTOCOLS = {
  TCP:    'TCP',
  UDP:    'UDP',
  HYBRID: 'HYBRID',
  AUTO:   'AUTO',
};

// ─── Message Limits ─────────────────────────────────────
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_USERNAME_LENGTH = 20;
export const MIN_USERNAME_LENGTH = 3;

// ─── UI Constants ───────────────────────────────────────
export const TYPING_TIMEOUT = 3000;        // ms before typing indicator clears
export const RECONNECT_DELAY = 3000;       // ms between WS reconnect attempts
export const MAX_RECONNECT_RETRIES = 5;
export const TOAST_DURATION = 3000;        // ms toast notification displays
