/**
 * ════════════════════════════════════════════════════════
 *  IncomingCallPopup.jsx — Full-screen incoming call alert
 *
 *  Features:
 *   ✦ Beautiful glassmorphic card with pulsing rings
 *   ✦ 45-second auto-reject timer (visual countdown)
 *   ✦ Vibration pattern for mobile devices
 *   ✦ Accept/Reject with spring animations
 *   ✦ End-to-end encrypted badge
 *   ✦ Caller avatar with animated glow
 * ════════════════════════════════════════════════════════
 */
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AUTO_REJECT_SECONDS = 45;

/** Format seconds as MM:SS */
function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function IncomingCallPopup({ callState, onAccept, onReject }) {
  const [elapsed, setElapsed] = useState(0);
  const vibrationRef = useRef(null);

  // Elapsed timer + auto-reject
  useEffect(() => {
    if (!callState || callState.status !== 'incoming') {
      setElapsed(0);
      return;
    }

    setElapsed(0); // Reset on new incoming call

    const t = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        if (next >= AUTO_REJECT_SECONDS) {
          clearInterval(t);
          onReject?.();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [callState?.status, callState?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vibration pattern for mobile
  useEffect(() => {
    if (!callState || callState.status !== 'incoming') {
      if (vibrationRef.current) {
        clearInterval(vibrationRef.current);
        vibrationRef.current = null;
      }
      try { navigator.vibrate?.(0); } catch (_) {} // Cancel vibration
      return;
    }

    // Start vibrating
    const vibrate = () => {
      try { navigator.vibrate?.([200, 100, 200, 100, 200]); } catch (_) {}
    };
    vibrate();
    vibrationRef.current = setInterval(vibrate, 2000);

    return () => {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
      try { navigator.vibrate?.(0); } catch (_) {}
    };
  }, [callState?.status, callState?.userId]);

  const isVideo = callState?.type === 'video';
  const remaining = AUTO_REJECT_SECONDS - elapsed;
  const progress  = elapsed / AUTO_REJECT_SECONDS; // 0 → 1

  return (
    <AnimatePresence>
      {callState?.status === 'incoming' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -40 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(24px)' }}
        >
          {/* Glassmorphic card */}
          <div
            className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden p-8 flex flex-col items-center gap-6"
            style={{
              background: 'rgba(14,14,34,0.9)',
              border: '1px solid rgba(0,240,255,0.15)',
              boxShadow: '0 0 80px rgba(0,240,255,0.08), 0 40px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Animated ring around avatar */}
            <div className="relative flex items-center justify-center">
              {/* Pulsing rings */}
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border"
                  style={{
                    width: 90 + i * 30,
                    height: 90 + i * 30,
                    borderColor: 'rgba(0,240,255,0.15)',
                  }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}

              {/* Avatar */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold relative z-10"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                  border: '2px solid rgba(0,240,255,0.3)',
                  boxShadow: '0 0 40px rgba(0,240,255,0.2)',
                  color: '#fff',
                }}
              >
                {callState.username?.charAt(0)?.toUpperCase() || (isVideo ? '📹' : '📞')}
              </div>
            </div>

            {/* Caller info */}
            <div className="text-center">
              <motion.p
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[11px] font-mono uppercase tracking-widest mb-1"
                style={{ color: 'rgba(0,240,255,0.6)' }}
              >
                {isVideo ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}
              </motion.p>
              <h2
                className="text-2xl font-bold tracking-wide"
                style={{ color: '#e2e8f0', fontFamily: 'Orbitron, monospace' }}
              >
                {callState.username}
              </h2>
              <p className="text-sm mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {formatTime(elapsed)}
              </p>
            </div>

            {/* Auto-reject countdown */}
            <div className="w-full px-4">
              <div style={{
                height: 3,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
              }}>
                <motion.div
                  style={{
                    height: '100%',
                    background: remaining <= 10
                      ? 'linear-gradient(90deg, #ef4444, #f97316)'
                      : 'linear-gradient(90deg, #6366f1, #06b6d4)',
                    borderRadius: 2,
                  }}
                  animate={{ width: `${(1 - progress) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </div>
              {remaining <= 15 && (
                <p className="text-[10px] text-center mt-1 font-mono"
                   style={{ color: remaining <= 10 ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.3)' }}>
                  Auto-declining in {remaining}s
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-8 mt-2">
              {/* Reject */}
              <motion.button
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                onClick={onReject}
                id="reject-call-btn"
                aria-label="Reject call"
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '2px solid rgba(239,68,68,0.4)',
                  color: '#ef4444',
                  boxShadow: '0 0 30px rgba(239,68,68,0.2)',
                }}
              >
                ✕
              </motion.button>

              {/* Accept */}
              <motion.button
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.88 }}
                onClick={onAccept}
                id="accept-call-btn"
                aria-label="Accept call"
                animate={{ boxShadow: ['0 0 20px rgba(0,255,136,0.3)', '0 0 40px rgba(0,255,136,0.6)', '0 0 20px rgba(0,255,136,0.3)'] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={{
                  background: 'rgba(0,255,136,0.12)',
                  border: '2px solid rgba(0,255,136,0.4)',
                  color: '#00ff88',
                }}
              >
                ✓
              </motion.button>
            </div>

            {/* Swipe hint */}
            <p className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.12)' }}>
              Via P2P WebRTC · End-to-end encrypted
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
