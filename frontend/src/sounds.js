/* ═══════════════════════════════════════════════════════════
   sounds.js — Web Audio API Notification Sounds & Tones
   No external files needed - generates tones programmatically
   ═══════════════════════════════════════════════════════════ */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// ── Play a tone with given frequency, duration, and type ──
function playTone(freq, duration = 0.15, type = 'sine', volume = 0.3) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context not available
  }
}

// ── Message received notification ──
export function playMessageSound() {
  playTone(880, 0.08, 'sine', 0.2);
  setTimeout(() => playTone(1100, 0.1, 'sine', 0.15), 100);
}

// ── Message sent confirmation ──
export function playSentSound() {
  playTone(600, 0.06, 'sine', 0.1);
}

// ── DM notification (slightly different) ──
export function playDMSound() {
  playTone(700, 0.1, 'sine', 0.25);
  setTimeout(() => playTone(900, 0.1, 'sine', 0.2), 120);
  setTimeout(() => playTone(1200, 0.12, 'sine', 0.15), 250);
}

// ── Incoming call ringtone (repeating pattern) ──
let ringInterval = null;
export function startRingtone() {
  stopRingtone();
  const ring = () => {
    playTone(800, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(1000, 0.15, 'sine', 0.3), 200);
    setTimeout(() => playTone(800, 0.15, 'sine', 0.3), 400);
    setTimeout(() => playTone(1000, 0.15, 'sine', 0.3), 600);
  };
  ring();
  ringInterval = setInterval(ring, 2000);
}

export function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
}

// ── Call connected sound ──
export function playCallConnected() {
  playTone(523, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 120);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.2), 240);
}

// ── Call ended sound ──
export function playCallEnded() {
  playTone(600, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(400, 0.2, 'sine', 0.15), 180);
}

// ── Error sound ──
export function playErrorSound() {
  playTone(300, 0.2, 'square', 0.15);
  setTimeout(() => playTone(250, 0.3, 'square', 0.1), 250);
}

// ── Browser notification (requires permission) ──
export async function showNotification(title, body, icon = '⚡') {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon, tag: 'smartchat-' + Date.now() });
    } catch (e) {
      // Notification not supported in this context
    }
  }
}

// ── Request notification permission on first interaction ──
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
