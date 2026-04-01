/**
 * ════════════════════════════════════════════════════════
 *  IncomingCallPopup.jsx — Full-screen incoming call alert
 *
 *  Shown when 'incoming-call' is received from the
 *  Mediasoup signaling server. Displays caller info,
 *  animated avatar ring, and Accept/Reject buttons.
 * ════════════════════════════════════════════════════════
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Format seconds as MM:SS */
function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function IncomingCallPopup({ callState, onAccept, onReject }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!callState || callState.status !== 'incoming') return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [callState?.status]);

  const isVideo = callState?.type === 'video';

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
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl relative z-10"
                style={{
                  background: 'rgba(0,240,255,0.06)',
                  border: '2px solid rgba(0,240,255,0.3)',
                  boxShadow: '0 0 40px rgba(0,240,255,0.2)',
                }}
              >
                {isVideo ? '📹' : '📞'}
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
              Via Mediasoup SFU · End-to-end encrypted
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
