/**
 * ════════════════════════════════════════════════════════
 *  CallUI.jsx — Active Call Screen (Mediasoup SFU)
 *
 *  Features:
 *    - Dynamic video grid (adapts 1–6+ participants)
 *    - Local + remote video tiles with audio activity ring
 *    - Mic / Camera / Screen-share / End-call controls
 *    - Ringing / Connecting states
 *    - Call duration timer
 *    - Network quality badge
 * ════════════════════════════════════════════════════════
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetwork } from '../../context/NetworkContext';

/* ── Audio activity analyser — returns true when speaking ── */
function useAudioActivity(stream, isLocal) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let ctx, analyser, afId;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const check = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setIsActive(avg > 12);
        afId = requestAnimationFrame(check);
      };
      check();
    } catch { /* ignore — might be local muted stream */ }

    return () => {
      cancelAnimationFrame(afId);
      ctx?.close().catch(() => {});
    };
  }, [stream]);

  return isActive;
}

/* ── Single video/audio tile ──────────────────────────────── */
function CallTile({ stream, label, isLocal, isVideo, isCameraOff }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const isActive = useAudioActivity(stream, isLocal);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
    if (audioRef.current && stream && !isLocal) audioRef.current.srcObject = stream;
  }, [stream, isLocal]);

  const showVideo = isVideo && !isCameraOff && stream;

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden"
      style={{
        background: '#0a0a16',
        border: `2px solid ${isActive ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.04)'}`,
        boxShadow: isActive ? '0 0 20px rgba(0,255,136,0.25)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Video element */}
      {showVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      )}

      {/* Audio-only / camera-off placeholder */}
      {(!showVideo) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <motion.div
            animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ repeat: isActive ? Infinity : 0, duration: 0.6 }}
            className="text-5xl"
            style={{ filter: isActive ? 'drop-shadow(0 0 12px rgba(0,255,136,0.6))' : 'none' }}
          >
            {isCameraOff ? '📷' : '🎙️'}
          </motion.div>
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {isCameraOff ? 'Camera off' : label}
          </span>
        </div>
      )}

      {/* Hidden audio for remote */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

      {/* Name tag */}
      <div
        className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-mono"
        style={{
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        {label} {isLocal && '(You)'}
        {isActive && (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="ml-1 text-green-400"
          >●</motion.span>
        )}
      </div>
    </div>
  );
}

/* ── Grid layout calculator ───────────────────────────────── */
function getGridStyle(count) {
  if (count === 1) return 'grid-cols-1 grid-rows-1';
  if (count === 2) return 'grid-cols-2 grid-rows-1';
  if (count <= 4) return 'grid-cols-2 grid-rows-2';
  if (count <= 6) return 'grid-cols-3 grid-rows-2';
  return 'grid-cols-3 grid-rows-3';
}

/* ── Control button ───────────────────────────────────────── */
function ControlBtn({ onClick, active, danger, icon, label, id }) {
  return (
    <motion.button
      id={id}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex flex-col items-center gap-1"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all"
        style={{
          background: danger
            ? 'rgba(239,68,68,0.15)'
            : active
              ? 'rgba(0,240,255,0.12)'
              : 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${danger ? 'rgba(239,68,68,0.5)' : active ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
          color: danger ? '#ef4444' : active ? '#00f0ff' : 'rgba(255,255,255,0.6)',
          boxShadow: active && !danger ? '0 0 16px rgba(0,240,255,0.25)' : 'none',
        }}
      >
        {icon}
      </div>
      <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {label}
      </span>
    </motion.button>
  );
}

/* ── Main CallUI component ────────────────────────────────── */
export default function CallUI({
  callState,
  localStream,
  remoteStreams,   // Map<peerId, MediaStream>
  isMuted,
  isCameraOff,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onEnd,
  username,        // remote username (single call)
}) {
  const [duration, setDuration] = useState(0);
  const { mode: networkMode } = useNetwork();

  const qualityColor = { high: '#34d399', medium: '#fbbf24', low: '#f87171' }[networkMode];
  const qualityLabel = { high: 'HD', medium: 'SD', low: 'Low' }[networkMode];

  const isVideo = callState?.type === 'video';
  const isActive = callState?.status === 'active';
  const isRinging = callState?.status === 'ringing';
  const isConnecting = callState?.status === 'connecting';

  // Duration timer
  useEffect(() => {
    if (!isActive) { setDuration(0); return; }
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const formatDuration = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Build tiles array
  const remotePeers = [...(remoteStreams?.entries?.() || [])];
  const totalCount = 1 + remotePeers.length;
  const gridClass = getGridStyle(totalCount);

  return (
    <AnimatePresence>
      {callState && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex flex-col"
          style={{ background: 'rgba(5,5,20,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {/* ── Header ─────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div>
              <h2
                className="text-base font-bold tracking-wider"
                style={{ color: '#e2e8f0', fontFamily: 'Orbitron, monospace' }}
              >
                {isRinging
                  ? `Calling ${callState.username}...`
                  : isConnecting
                    ? 'Connecting...'
                    : callState.username}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {isActive && (
                  <span className="text-sm font-mono text-green-400">
                    {formatDuration(duration)}
                  </span>
                )}
                {(isRinging || isConnecting) && (
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="text-xs font-mono"
                    style={{ color: 'rgba(0,240,255,0.6)' }}
                  >
                    {isConnecting ? '⏳ Setting up Mediasoup...' : '📡 Ringing...'}
                  </motion.span>
                )}
              </div>
            </div>

            {/* Network quality badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold"
              style={{
                background: `${qualityColor}15`,
                border: `1px solid ${qualityColor}40`,
                color: qualityColor,
              }}
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: qualityColor }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              {qualityLabel} · SFU
            </div>
          </div>

          {/* ── Video Grid ─────────────────────────────────── */}
          <div className="flex-1 min-h-0 p-3">
            {isActive ? (
              <div className={`grid gap-3 w-full h-full ${gridClass}`}>
                {/* Local tile */}
                <CallTile
                  stream={localStream}
                  label="You"
                  isLocal={true}
                  isVideo={isVideo}
                  isCameraOff={isCameraOff}
                />
                {/* Remote tiles */}
                {remotePeers.map(([peerId, stream]) => (
                  <CallTile
                    key={peerId}
                    stream={stream}
                    label={callState.username || 'Participant'}
                    isLocal={false}
                    isVideo={isVideo}
                    isCameraOff={false}
                  />
                ))}
              </div>
            ) : (
              /* Waiting / ringing state */
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full border border-cyan-400/10"
                      style={{
                        width: 120 + i * 50,
                        height: 120 + i * 50,
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.05, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                    />
                  ))}
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center text-5xl mx-auto mb-5 relative z-10"
                    style={{
                      background: 'rgba(0,240,255,0.05)',
                      border: '2px solid rgba(0,240,255,0.2)',
                    }}
                  >
                    {isVideo ? '📹' : '📞'}
                  </div>
                  <p className="text-sm font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {isVideo ? 'Video' : 'Voice'} · Mediasoup SFU
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Controls ───────────────────────────────────── */}
          <div
            className="flex items-center justify-center gap-5 px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            {isActive && (
              <>
                <ControlBtn
                  id="call-toggle-mic"
                  onClick={onToggleMic}
                  active={isMuted}
                  icon={isMuted ? '🔇' : '🎙️'}
                  label={isMuted ? 'Unmute' : 'Mute'}
                />
                {isVideo && (
                  <ControlBtn
                    id="call-toggle-camera"
                    onClick={onToggleCamera}
                    active={isCameraOff}
                    icon={isCameraOff ? '📷' : '📹'}
                    label={isCameraOff ? 'Cam On' : 'Cam Off'}
                  />
                )}
                <ControlBtn
                  id="call-toggle-screen"
                  onClick={onToggleScreenShare}
                  active={isScreenSharing}
                  icon="🖥️"
                  label={isScreenSharing ? 'Stop Share' : 'Share'}
                />
              </>
            )}

            {/* End call — always visible */}
            <motion.button
              id="call-end-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              onClick={onEnd}
              aria-label="End call"
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white"
              style={{
                background: '#dc2626',
                border: '2px solid rgba(220,38,38,0.5)',
                boxShadow: '0 0 30px rgba(220,38,38,0.4)',
              }}
            >
              📞
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
