/**
 * CallUI.jsx — Production-Grade WebRTC P2P Call Interface
 *
 * Features:
 *   ✦ Video tiles (local PIP + remote full-screen)
 *   ✦ Call duration timer (MM:SS)
 *   ✦ Speaker/earpiece toggle button
 *   ✦ Connection quality badge (RTT / packet-loss / bitrate)
 *   ✦ DataChannel in-call chat panel
 *   ✦ Device switcher (camera + mic + speaker dropdowns)
 *   ✦ Screen sharing indicator
 *   ✦ Reconnecting overlay with attempt counter
 *   ✦ "Calling..." pulse animation for ringing state
 *   ✦ Mobile-safe layout with safe-area insets
 *   ✦ Stable: UI does NOT close on minor connection issues
 */
import { useState, useRef, useEffect, useCallback } from 'react';

/* ── Animated SVG Icons ──────────────────────────────────────── */
const Ico = {
  MicOn:  () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 8v-2.07A8 8 0 0020 11h-2a6 6 0 01-12 0H4a8 8 0 007 7.93V19H8v2h8v-2h-3v-0z"/></svg>,
  MicOff: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5.07V11a1 1 0 002 0V5a3 3 0 00-5.94-.5L9.12 6.56A1 1 0 0011 5.07zM21 10h-2a7 7 0 01-1.16 3.88l1.42 1.42A9 9 0 0021 10zm-9 11v-2.07A8 8 0 0019.07 13l-1.42-1.42A6 6 0 018.56 14l-1.43 1.43A8 8 0 0012 21zm9.29-3.29L4.71 4.29 3.29 5.71 7 9.42V11a5 5 0 008.9 3.1l1.51 1.51A7 7 0 015 11H3a9 9 0 0015 6.7l2.29 2.3 1.42-1.42z"/></svg>,
  CamOn:  () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>,
  CamOff: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5l-4 4V7a1 1 0 00-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4a1 1 0 00-1 1v10a1 1 0 001 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>,
  Screen: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4a2 2 0 00-2 2v11a2 2 0 002 2h6v2H8v2h8v-2h-2v-2h6a2 2 0 002-2V5a2 2 0 00-2-2zm0 13H4V5h16v11z"/></svg>,
  Chat:   () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>,
  End:    () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96a7.01 7.01 0 00-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54a7.3 7.3 0 00-1.62.94l-2.39-.96a.48.48 0 00-.59.22L2.74 8.87a.47.47 0 00.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.36 1.04.67 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.58-.27 1.12-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 00-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z"/></svg>,
  Close:  () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>,
  Send:   () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
  Speaker: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>,
  SpeakerOff: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>,
};

/* ── Call Duration Timer ─────────────────────────────────────── */
function useCallTimer(isActive) {
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = startTimeRef.current || Date.now();
      const iv = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      return () => clearInterval(iv);
    } else {
      setElapsed(0);
      startTimeRef.current = null;
    }
  }, [isActive]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/* ── Quality Badge ────────────────────────────────────────────── */
function QualityBadge({ quality }) {
  const { rtt, packetLoss, bitrate, connState } = quality;
  const isReconnecting = connState === 'disconnected' || connState === 'failed';

  const label = isReconnecting ? 'Reconnecting'
    : quality.quality === 'good' ? 'HD P2P'
    : quality.quality === 'fair' ? 'SD P2P'
    : 'Low P2P';

  const dot = isReconnecting ? '#f59e0b'
    : quality.quality === 'good' ? '#34d399'
    : quality.quality === 'fair' ? '#fbbf24'
    : '#f87171';

  return (
    <div style={styles.qualityBadge}>
      <span style={{ ...styles.qualityDot, background: dot }} />
      <span>{label}</span>
      {rtt > 0 && !isReconnecting && (
        <span style={styles.qualityDetail}>
          {rtt}ms{packetLoss > 0 ? ` · ${packetLoss}%↓` : ''}{bitrate > 0 ? ` · ${bitrate}kbps` : ''}
        </span>
      )}
    </div>
  );
}

/* ── Reconnecting Overlay ────────────────────────────────────── */
function ReconnectingOverlay({ attempt }) {
  return (
    <div style={styles.reconnectOverlay}>
      <div style={styles.reconnectSpinner} />
      <p style={styles.reconnectText}>Reconnecting…</p>
      {attempt > 0 && (
        <p style={styles.reconnectSub}>Attempt {attempt} / 5</p>
      )}
      <p style={styles.reconnectHint}>Call will stay active</p>
    </div>
  );
}

/* ── Calling/Ringing Overlay ─────────────────────────────────── */
function CallingOverlay({ username, callType }) {
  return (
    <div style={styles.callingOverlay}>
      <div style={styles.callingPulse}>
        <div style={styles.callingAvatar}>
          {username?.charAt(0)?.toUpperCase() || '?'}
        </div>
      </div>
      <p style={styles.callingName}>{username}</p>
      <p style={styles.callingStatus}>
        {callType === 'video' ? '📹' : '📞'} Calling…
      </p>
    </div>
  );
}

/* ── DataChannel Chat Panel ──────────────────────────────────── */
function ChatPanel({ messages, onSend, onClose }) {
  const [input, setInput]   = useState('');
  const bottomRef           = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div style={styles.chatPanel}>
      <div style={styles.chatHeader}>
        <span>💬 In-Call Chat</span>
        <button style={styles.iconBtn} onClick={onClose}><Ico.Close /></button>
      </div>

      <div style={styles.chatMessages}>
        {messages.length === 0 && (
          <p style={styles.chatEmpty}>Messages are end-to-end encrypted via P2P DataChannel</p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            ...styles.chatBubble,
            alignSelf: m.received ? 'flex-start' : 'flex-end',
            background: m.received ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.7)',
          }}>
            {m.received && <span style={styles.chatFrom}>{m.from}</span>}
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={styles.chatInput}>
        <input
          style={styles.chatInputField}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…"
          maxLength={500}
        />
        <button style={styles.chatSendBtn} onClick={handleSend}>
          <Ico.Send />
        </button>
      </div>
    </div>
  );
}

/* ── Device Settings Panel ───────────────────────────────────── */
function DevicePanel({ availableDevices, onSwitchCamera, onSwitchMicrophone, onSwitchSpeaker, onClose }) {
  return (
    <div style={styles.devicePanel}>
      <div style={styles.chatHeader}>
        <span>⚙️ Devices</span>
        <button style={styles.iconBtn} onClick={onClose}><Ico.Close /></button>
      </div>

      {availableDevices.cameras.length > 1 && (
        <label style={styles.deviceLabel}>
          <span>📷 Camera</span>
          <select style={styles.deviceSelect}
            onChange={e => onSwitchCamera(e.target.value)}>
            {availableDevices.cameras.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {availableDevices.microphones.length > 0 && (
        <label style={styles.deviceLabel}>
          <span>🎤 Microphone</span>
          <select style={styles.deviceSelect}
            onChange={e => onSwitchMicrophone(e.target.value)}>
            {availableDevices.microphones.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {availableDevices.speakers?.length > 0 && (
        <label style={styles.deviceLabel}>
          <span>🔊 Speaker</span>
          <select style={styles.deviceSelect}
            onChange={e => onSwitchSpeaker(e.target.value)}>
            {availableDevices.speakers.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Speaker ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <p style={{ ...styles.chatEmpty, textAlign: 'left', paddingTop: 8 }}>
        🔒 Device switching without renegotiation
      </p>
    </div>
  );
}

/* ── Video Tile ──────────────────────────────────────────────── */
function VideoTile({ stream, label, muted = false, pip = false, noVideo = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream && !noVideo) {
      el.srcObject = stream;
    } else {
      el.srcObject = null; // Clear stale frame
    }
  }, [stream, noVideo]);

  return (
    <div style={{ ...styles.videoTile, ...(pip ? styles.pipTile : styles.remoteTile) }}>
      {stream && !noVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={styles.videoEl}
        />
      ) : (
        <div style={styles.videoPlaceholder}>
          <div style={styles.avatarCircle}>{label?.charAt(0)?.toUpperCase()}</div>
        </div>
      )}
      {label && <span style={{ ...styles.videoLabel, ...(pip ? styles.pipLabel : {}) }}>{label}</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main CallUI Component
══════════════════════════════════════════════════════════════ */
export default function CallUI({
  callState,
  localStream,
  remoteStreams,
  isMuted,
  isCameraOff,
  isScreenSharing,
  isSpeakerOn = true,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleSpeaker,
  onEnd,
  username,
  // New P2P props
  connectionQuality = {},
  dataMessages = [],
  onSendDataMessage,
  availableDevices = { cameras: [], microphones: [], speakers: [] },
  onSwitchCamera,
  onSwitchMicrophone,
  onSwitchSpeaker,
  currentUsername,
}) {
  const [showChat, setShowChat]       = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive       = callState?.status === 'active';
  const isReconnecting = callState?.status === 'reconnecting';
  const isConnecting   = callState?.status === 'connecting';
  const isRinging      = callState?.status === 'ringing';
  const isVideo        = callState?.type === 'video';
  const remoteStream   = remoteStreams instanceof Map
    ? [...remoteStreams.values()][0]
    : null;

  // Call duration timer
  const duration = useCallTimer(isActive);

  // Unread badge
  useEffect(() => {
    if (showChat) { setUnreadCount(0); return; }
    const lastMsg = dataMessages[dataMessages.length - 1];
    if (lastMsg?.received) setUnreadCount(n => n + 1);
  }, [dataMessages, showChat]);

  const handleOpenChat = () => { setShowChat(true); setShowDevices(false); };
  const handleOpenDevices = () => { setShowDevices(true); setShowChat(false); };

  if (!callState) return null;

  // Don't show full CallUI for 'incoming' status — that's handled by IncomingCallPopup
  if (callState.status === 'incoming') return null;

  return (
    <div style={styles.root}>
      {/* ── Main video area ─────────────────────────────────── */}
      <div style={styles.videoArea}>

        {/* Ringing/Calling overlay */}
        {isRinging && (
          <CallingOverlay username={username} callType={callState.type} />
        )}

        {/* Remote video (full bg) */}
        {!isRinging && isVideo ? (
          <VideoTile
            stream={remoteStream}
            label={username}
            muted={false}
            noVideo={!remoteStream}
          />
        ) : !isRinging && (
          /* Voice call — big avatar */
          <div style={styles.voiceCenter}>
            <div style={styles.bigAvatar}>{username?.charAt(0)?.toUpperCase()}</div>
            <p style={styles.voiceName}>{username}</p>
            <p style={styles.voiceStatus}>
              {isReconnecting ? '↺ Reconnecting…'
                : isConnecting ? '⏳ Connecting…'
                : isActive ? `🔒 ${duration}` 
                : ''}
            </p>
            {isActive && (
              <p style={styles.voiceEncrypted}>Voice Call · P2P Encrypted</p>
            )}
          </div>
        )}

        {/* Local PIP (video calls only) */}
        {isVideo && localStream && !isRinging && (
          <VideoTile
            stream={localStream}
            label="You"
            muted={true}
            pip={true}
            noVideo={isCameraOff}
          />
        )}

        {/* Reconnecting overlay */}
        {isReconnecting && <ReconnectingOverlay attempt={0} />}

        {/* Top bar */}
        <div style={styles.topBar}>
          <div style={styles.callInfo}>
            <span style={styles.callName}>{username}</span>
            <span style={styles.callStatus}>
              {isReconnecting ? '↺ Reconnecting'
                : isConnecting ? 'Connecting…'
                : isRinging ? 'Calling…'
                : isActive ? duration
                : ''}
            </span>
          </div>

          {isActive && (
            <QualityBadge quality={connectionQuality} />
          )}

          <div style={styles.topRight}>
            {isActive && (
              <button
                style={{ ...styles.iconBtn, position: 'relative' }}
                onClick={handleOpenChat}
                title="In-call chat"
              >
                <Ico.Chat />
                {unreadCount > 0 && (
                  <span style={styles.unreadBadge}>{unreadCount}</span>
                )}
              </button>
            )}

            {isActive && (
              <button
                style={styles.iconBtn}
                onClick={handleOpenDevices}
                title="Device settings"
              >
                <Ico.Settings />
              </button>
            )}
          </div>
        </div>

        {/* Screen sharing indicator */}
        {isScreenSharing && (
          <div style={styles.screenBanner}>📺 Sharing your screen</div>
        )}
      </div>

      {/* ── Side panels ─────────────────────────────────────── */}
      {showChat && (
        <ChatPanel
          messages={dataMessages}
          onSend={onSendDataMessage}
          onClose={() => setShowChat(false)}
          username={currentUsername}
        />
      )}

      {showDevices && (
        <DevicePanel
          availableDevices={availableDevices}
          onSwitchCamera={onSwitchCamera}
          onSwitchMicrophone={onSwitchMicrophone}
          onSwitchSpeaker={onSwitchSpeaker}
          onClose={() => setShowDevices(false)}
        />
      )}

      {/* ── Control Bar ─────────────────────────────────────── */}
      <div style={styles.controls}>
        {/* Mic */}
        <button
          style={{
            ...styles.controlBtn,
            ...(isMuted ? styles.controlBtnActive : {}),
          }}
          onClick={onToggleMic}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <Ico.MicOff /> : <Ico.MicOn />}
          <span style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Speaker toggle */}
        <button
          style={{
            ...styles.controlBtn,
            ...(!isSpeakerOn ? styles.controlBtnWarn : {}),
          }}
          onClick={onToggleSpeaker}
          title={isSpeakerOn ? 'Speaker Off' : 'Speaker On'}
        >
          {isSpeakerOn ? <Ico.Speaker /> : <Ico.SpeakerOff />}
          <span style={styles.controlLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</span>
        </button>

        {/* Camera (video calls only) */}
        {isVideo && (
          <button
            style={{
              ...styles.controlBtn,
              ...(isCameraOff ? styles.controlBtnActive : {}),
            }}
            onClick={onToggleCamera}
            title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isCameraOff ? <Ico.CamOff /> : <Ico.CamOn />}
            <span style={styles.controlLabel}>Camera</span>
          </button>
        )}

        {/* Screen share (video calls only) */}
        {isVideo && (
          <button
            style={{
              ...styles.controlBtn,
              ...(isScreenSharing ? styles.controlBtnActive : {}),
            }}
            onClick={onToggleScreenShare}
            title="Share screen"
          >
            <Ico.Screen />
            <span style={styles.controlLabel}>Share</span>
          </button>
        )}

        {/* End call */}
        <button
          style={{ ...styles.controlBtn, ...styles.endBtn }}
          onClick={onEnd}
          title="End call"
        >
          <Ico.End />
          <span style={styles.controlLabel}>End</span>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Styles
══════════════════════════════════════════════════════════════ */
const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#0d0d14',
    zIndex: 9999,
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'hidden',
    paddingTop:    'env(safe-area-inset-top,    0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingLeft:   'env(safe-area-inset-left,   0px)',
    paddingRight:  'env(safe-area-inset-right,  0px)',
  },

  videoArea: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    background: '#111118',
  },

  remoteTile: {
    position: 'absolute',
    inset: 0,
  },
  pipTile: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 120,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.3)',
    zIndex: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  videoTile: {
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoEl: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e1e2e, #2d1b4e)',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    fontWeight: 700,
    color: '#fff',
  },
  videoLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: '2px 6px',
    backdropFilter: 'blur(4px)',
  },
  pipLabel: {
    fontSize: 10,
    bottom: 4,
    left: 4,
  },

  // Voice call center
  voiceCenter: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 100%)',
  },
  bigAvatar: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 42,
    fontWeight: 700,
    color: '#fff',
    boxShadow: '0 0 40px rgba(99,102,241,0.4)',
  },
  voiceName: {
    fontSize: 22,
    fontWeight: 600,
    color: '#fff',
    margin: 0,
  },
  voiceStatus: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    margin: 0,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.05em',
  },
  voiceEncrypted: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    margin: 0,
    marginTop: 4,
  },

  // Calling/Ringing overlay
  callingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 100%)',
  },
  callingPulse: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callingAvatar: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 42,
    fontWeight: 700,
    color: '#fff',
    boxShadow: '0 0 40px rgba(99,102,241,0.4)',
    animation: 'callPulse 2s ease-in-out infinite',
  },
  callingName: {
    fontSize: 22,
    fontWeight: 600,
    color: '#fff',
    margin: 0,
  },
  callingStatus: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
    animation: 'callingDots 1.5s ease-in-out infinite',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
    zIndex: 20,
    gap: 8,
  },
  callInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  callName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  callStatus: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontVariantNumeric: 'tabular-nums',
  },
  topRight: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },

  // Quality badge
  qualityBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(8px)',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    color: '#fff',
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  qualityDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
  },
  qualityDetail: {
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 2,
  },

  // Reconnect overlay
  reconnectOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
    zIndex: 30,
    gap: 12,
  },
  reconnectSpinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  reconnectText: {
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
    margin: 0,
  },
  reconnectSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    margin: 0,
  },
  reconnectHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    margin: 0,
    marginTop: 4,
  },

  // Screen share banner
  screenBanner: {
    position: 'absolute',
    top: 60,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(99,102,241,0.85)',
    color: '#fff',
    fontSize: 13,
    padding: '6px 14px',
    borderRadius: 20,
    backdropFilter: 'blur(8px)',
    zIndex: 20,
  },

  // Control bar
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '14px 12px',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  controlBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    width: 58,
    height: 58,
    borderRadius: 16,
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 11,
    padding: 0,
    transition: 'all 0.15s ease',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
  },
  controlBtnActive: {
    background: 'rgba(239,68,68,0.3)',
    border: '1px solid rgba(239,68,68,0.5)',
  },
  controlBtnWarn: {
    background: 'rgba(245,158,11,0.25)',
    border: '1px solid rgba(245,158,11,0.4)',
  },
  controlLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 1,
  },
  endBtn: {
    background: 'rgba(239,68,68,0.85)',
    width: 66,
    height: 66,
    borderRadius: 50,
  },

  // Icon button (top bar)
  iconBtn: {
    background: 'rgba(255,255,255,0.12)',
    border: 'none',
    borderRadius: 10,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    padding: 6,
    backdropFilter: 'blur(4px)',
    outline: 'none',
    transition: 'background 0.15s',
  },

  // Unread badge
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    background: '#ef4444',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat panel
  chatPanel: {
    width: 300,
    maxWidth: '90vw',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(15,15,25,0.96)',
    backdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#fff',
    fontWeight: 600,
    fontSize: 14,
    flexShrink: 0,
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  chatEmpty: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    padding: '20px 8px',
    lineHeight: 1.5,
  },
  chatBubble: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: 12,
    color: '#fff',
    fontSize: 13,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  chatFrom: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
    marginBottom: 2,
  },
  chatInput: {
    display: 'flex',
    gap: 8,
    padding: '10px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  chatInputField: {
    flex: 1,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#fff',
    fontSize: 13,
    padding: '8px 12px',
    outline: 'none',
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: '#6366f1',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    flexShrink: 0,
  },

  // Device panel
  devicePanel: {
    width: 280,
    maxWidth: '90vw',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    background: 'rgba(15,15,25,0.96)',
    backdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    padding: 0,
  },
  deviceLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '16px 16px 0',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: 500,
  },
  deviceSelect: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    padding: '8px 10px',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
  },
};

/* CSS animations — injected once */
if (typeof document !== 'undefined' && !document.getElementById('callui-anim-v2')) {
  const style = document.createElement('style');
  style.id = 'callui-anim-v2';
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes callPulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(99,102,241,0.4); }
      50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(99,102,241,0.6); }
    }
    @keyframes callingDots {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
