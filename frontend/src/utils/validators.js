/**
 * ─── validators.js ─────────────────────────────────────
 * Input validation helpers.
 */

/** Validate username (3-20 chars, alphanumeric + underscore) */
export const isValidUsername = (name) =>
  /^[a-zA-Z0-9_]{3,20}$/.test(name);

/** Validate message content (not empty, max 1000 chars) */
export const isValidMessage = (msg) =>
  typeof msg === 'string' && msg.trim().length > 0 && msg.length <= 1000;

/** Check if a string is a valid protocol */
export const isValidProtocol = (proto) =>
  ['TCP', 'UDP', 'HYBRID', 'AUTO'].includes(proto?.toUpperCase());
