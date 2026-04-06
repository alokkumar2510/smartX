/* ═══════════════════════════════════════════════════════════
   DMPanel.jsx — Private DM + Call UI (Voice/Video) + AI Chat
   SmartChat X v5.0 — w/ Reactions, Deletion & Search
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playDMSound } from './sounds';
import { supabase } from './lib/supabase';
import VoiceRecorder, { VoicePlayer } from './components/VoiceRecorder';
import FileUpload, { FileMessage } from './components/FileShare';
import { useNetwork } from './context/NetworkContext';
import { Virtuoso } from 'react-virtuoso';
import MessageBubble from './components/MessageBubble';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname || '127.0.0.1'}:8000`;

// Quick helper to grab the session token from storage
const getToken = () => sessionStorage.getItem('token') || localStorage.getItem('auth_token') || '';

// Emoji shortcuts for reaction picker
const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👏'];

/* ─── PARTICIPANT VIDEO ───────────────────────────── */
const ParticipantVideo = ({ stream, isVideo, label, isLocal }) => {
  const [isActive, setIsActive] = useState(false);

  // Callback refs: fire synchronously when element mounts, fixing the race
  // where stream arrives before the video/audio element is in the DOM.
  const videoRef = useCallback((el) => {
    if (el && stream) { el.srcObject = stream; el.play().catch(() => {}); }
  }, [stream]); // eslint-disable-line react-hooks/exhaustive-deps

  const audioRef = useCallback((el) => {
    if (el && stream && !isLocal) { el.srcObject = stream; el.play().catch(() => {}); }
  }, [stream, isLocal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!stream || isLocal) return;
    let ctx, afId;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const check = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0; for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setIsActive(sum > dataArray.length * 15);
        afId = requestAnimationFrame(check);
      };
      check();
    } catch (_) {}
    return () => { if (afId) cancelAnimationFrame(afId); try { ctx?.close(); } catch (_) {} };
  }, [stream, isLocal]);

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden bg-[#111] border-2 transition-all duration-300 ${isActive ? 'border-neon-green shadow-[0_0_20px_rgba(0,255,136,0.4)] scale-[1.02]' : 'border-[rgba(255,255,255,0.05)]'}`}>
      <video ref={videoRef} autoPlay playsInline muted={isLocal} className={`w-full h-full object-cover ${!isVideo && 'hidden'}`} />
      {!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}
      {!isVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a16]">
          <div className={`text-4xl mb-3 ${isActive ? 'text-neon-green animate-pulse' : 'text-white/30'}`}>🎙️</div>
          <span className="text-white/60 text-sm font-poppins">{label}</span>
        </div>
      )}
      {isVideo && (
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md">
          <span className="text-white/90 text-xs">{label}</span>
        </div>
      )}
    </div>
  );
};

/* ─── CALL MODAL — Multi-Peer Group Voice & Video ──────────────────────────── */
export const CallModal = ({ callState, localStream, remoteStreams = {}, onAccept, onReject, onEnd, onToggleScreenShare, isScreenSharing, onInvite, connections = [] }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [showInviteOption, setShowInviteOption] = useState(false);
  // Phase 3: Network-aware quality
  const { mode: networkMode } = useNetwork();
  const qualityColors = { high: '#34d399', medium: '#fbbf24', low: '#f87171' };
  const qualityLabels = { high: 'HD', medium: 'SD', low: 'Low' };


  useEffect(() => {
    let timer;
    if (callState?.status === 'active') timer = setInterval(() => setDuration(d => d + 1), 1000);
    else setDuration(0);
    return () => clearInterval(timer);
  }, [callState?.status]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoDisabled(!localStream.getVideoTracks()[0]?.enabled);
    }
  };

  if (!callState) return null;
  const isVideo = callState.type === 'video';
  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const remoteEntries = remoteStreams instanceof Map
    ? [...remoteStreams.entries()]
    : Object.entries(remoteStreams);
  const allCount = remoteEntries.length + 1; // including local
  // Dynamic layout calculation
  let gridCols = 'grid-cols-1';
  let gridRows = 'grid-rows-1';
  if (allCount === 2) { gridCols = 'grid-cols-1 md:grid-cols-2'; }
  else if (allCount === 3 || allCount === 4) { gridCols = 'grid-cols-2'; gridRows = 'grid-rows-2'; }
  else if (allCount > 4) { gridCols = 'grid-cols-3'; gridRows = 'grid-rows-2'; }
  const isConnecting = callState.status === 'connecting' || callState.status === 'reconnecting';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 lg:p-8"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex flex-col w-full h-full max-w-6xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 shrink-0 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
            <div>
              <h2 className="font-orbitron tracking-wider text-white text-lg">
                {callState.status === 'incoming' ? 'Incoming Call' : callState.status === 'ringing' ? 'Calling...' : 'In Call'}
              </h2>
              <div className="text-white/50 text-xs font-mono">
                {callState.username} {allCount > 2 && `+ ${allCount - 2} others`}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Phase 3: Network quality pill */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-mono font-bold"
                style={{ background: `${qualityColors[networkMode]}15`, border: `1px solid ${qualityColors[networkMode]}40`, color: qualityColors[networkMode] }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: qualityColors[networkMode] }} />
                {qualityLabels[networkMode]} Quality
              </div>
              {networkMode === 'low' && callState.type === 'video' && (
                <div className="text-[9px] font-mono text-yellow-400 px-2 py-0.5 rounded-lg"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  ⚠️ Audio-only (Low Network)
                </div>
              )}
              {callState.status === 'active' && <div className="text-neon-green font-mono text-xl">{formatTime(duration)}</div>}
            </div>
          </div>

          {/* Grid Area */}
          <div className="relative flex-1 min-h-0 w-full mb-4">
            {callState.status === 'active' ? (
              <div className={`grid gap-4 w-full h-full ${gridCols} ${gridRows}`}>
                <ParticipantVideo stream={localStream} isVideo={isVideo && !isVideoDisabled} label="You" isLocal={true} />
                {remoteEntries.map(([id, stream]) => (
                   <ParticipantVideo key={id} stream={stream} isVideo={isVideo} label="Participant" isLocal={false} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <motion.div
                    animate={callState.status === 'incoming' ? { rotate: [0,-10,10,-10,10,0] } : { scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: callState.status === 'incoming' ? 0.6 : 1.5 }}
                    className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center text-6xl"
                    style={{
                      background: callState.status === 'incoming' ? 'rgba(0,240,255,0.08)' : 'rgba(0,255,136,0.08)',
                      border: `2px solid ${callState.status === 'incoming' ? 'rgba(0,240,255,0.3)' : 'rgba(0,255,136,0.3)'}`,
                      boxShadow: `0 0 60px ${callState.status === 'incoming' ? 'rgba(0,240,255,0.15)' : 'rgba(0,255,136,0.15)'}`,
                    }}
                  >
                    {isVideo ? '📹' : '📞'}
                  </motion.div>
                  {isConnecting ? (
                    <p className="text-neon-cyan/70 font-mono text-sm animate-pulse">
                      {callState.status === 'reconnecting' ? '🔄 Reconnecting...' : '⚡ Establishing P2P connection...'}
                    </p>
                  ) : (
                    <p className="text-white/40 font-mono text-sm">{isVideo ? 'Video Call' : 'Voice Call'} - WebRTC P2P</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center items-center shrink-0">
            {callState.status === 'incoming' && (
              <>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onAccept}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl text-neon-green bg-neon-green/10 border-2 border-neon-green/50 shadow-[0_0_30px_rgba(0,255,136,0.3)]">
                  ✓
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onReject}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl text-[#ff2d78] bg-[#ff2d78]/10 border-2 border-[#ff2d78]/50 shadow-[0_0_30px_rgba(255,45,120,0.3)]">
                  ✕
                </motion.button>
              </>
            )}

            {(callState.status === 'ringing' || callState.status === 'active') && (
              <>
                {callState.status === 'active' && (
                  <>
                    {/* Controls */}
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleMute}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-xl border-2 transition-colors ${isMuted ? 'text-red-500 border-red-500/50 bg-red-500/10' : 'text-white/60 border-white/10 bg-white/5'}`}>
                      {isMuted ? '🔇' : '🎙️'}
                    </motion.button>
                    {isVideo && (
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleVideo}
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-xl border-2 transition-colors ${isVideoDisabled ? 'text-red-500 border-red-500/50 bg-red-500/10' : 'text-white/60 border-white/10 bg-white/5'}`}>
                        {isVideoDisabled ? '🚫' : '📹'}
                      </motion.button>
                    )}
                    {onToggleScreenShare && (
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onToggleScreenShare}
                        className={`w-14 h-14 rounded-full flex items-center justify-center text-xl border-2 ${isScreenSharing ? 'text-neon-cyan border-neon-cyan bg-neon-cyan/20 shadow-[0_0_20px_rgba(0,240,255,0.4)]' : 'text-white/60 border-white/10 bg-white/5'}`}>
                        🖥️
                      </motion.button>
                    )}
                    {/* Add Participant */}
                    {onInvite && (
                      <div className="relative">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowInviteOption(!showInviteOption)}
                          className="w-14 h-14 rounded-full flex items-center justify-center text-xl border-2 text-white/60 border-white/10 bg-white/5">
                          ➕
                        </motion.button>
                        {showInviteOption && (
                          <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 bg-[#111] border border-white/10 rounded-xl p-2 shadow-2xl">
                            <h3 className="text-white/40 text-[10px] uppercase font-bold mb-2 px-2">Invite to call</h3>
                            {connections.filter(c => c.status === 'accepted').map(c => {
                               const targetId = c.receiver_id === callState.user_id ? null : c.receiver_id; 
                               // Needs refined logic to get friends list
                               const isAlreadyInCall = remoteStreams[c.receiver_id] || remoteStreams[c.sender_id];
                               if (isAlreadyInCall) return null;
                               return (
                                 <button key={c.id} onClick={() => { onInvite(c.receiver_id); setShowInviteOption(false); }}
                                   className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg text-sm text-white/80 transition-colors">
                                   Invite Friend
                                 </button>
                               );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onEnd}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl text-white bg-red-600 border-2 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
                  📞
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};


/* ─── DM PANEL — Private Chat Drawer ──────────────────────── */
export const DMPanel = ({ targetUser, currentUser, ws, connections, blocks, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  const isBlocked = blocks?.some(b => 
    (b.blocker_id === currentUser?.id && b.blocked_id === targetUser?.id) ||
    (b.blocked_id === currentUser?.id && b.blocker_id === targetUser?.id)
  );

  const amIBlocker = blocks?.some(b => b.blocker_id === currentUser?.id && b.blocked_id === targetUser?.id);

  const isConnected = !isBlocked && (targetUser?.id === currentUser?.id || connections?.some(
    c => c.status === 'accepted' && 
    (c.sender_id === targetUser?.id || c.receiver_id === targetUser?.id)
  ));
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);

  // Seen-message dedup guard (prevents doubles from WS + history overlap)
  const seenIds = useRef(new Set());
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── REST fallback for DM history ──────────────────────────────
  const fetchHistoryViaREST = useCallback(async (targetId, currentUserId) => {
    if (!targetId || !currentUserId) return;
    try {
      setHistoryLoading(true);
      const res = await fetch(
        `${API}/api/dm/history?user_id=${currentUserId}&target_id=${targetId}&limit=50`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const incoming = json.messages || [];
      const newSeen = new Set(incoming.map(m => m.id));
      seenIds.current = newSeen;
      setMessages(incoming);
      setHasMore(json.has_more || false);
    } catch (err) {
      console.warn('[DM] REST history fallback failed:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load initial DM history — dual strategy: WS first, REST fallback
  useEffect(() => {
    if (!targetUser) return;
    seenIds.current = new Set();
    setMessages([]); // Clear stale messages immediately to prevent old chat flash

    if (ws?.readyState === 1) {
      // WS is open — request via WebSocket (server will push dm_history event)
      ws.send(JSON.stringify({ type: 'get_dm_history', target_user_id: targetUser.id, limit: 50 }));
      ws.send(JSON.stringify({ type: 'read_receipt', target_user_id: targetUser.id }));
    } else {
      // WS not ready — load history immediately via REST so panel is never blank
      fetchHistoryViaREST(targetUser.id, currentUser?.id);
    }

    // Also retry via WS after 1.5s in case socket was still connecting
    const retryTimer = setTimeout(() => {
      if (ws?.readyState === 1) {
        ws.send(JSON.stringify({ type: 'get_dm_history', target_user_id: targetUser.id, limit: 50 }));
      }
    }, 1500);

    return () => clearTimeout(retryTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUser?.id, ws]);

  // Listen for DM events
  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'dm_history' && data.target_user_id === targetUser?.id) {
          // Replace messages with server-authoritative history
          // Build seen set from incoming messages to avoid future dupes
          const incoming = data.messages || [];
          const newSeen = new Set(incoming.map(m => m.id));

          setMessages(prev => {
            if (data.messages?.[0]?.id && prev.length > 0) {
              // Infinite scroll: prepend older messages (filter already-seen)
              const newMsgs = incoming.filter(m => !prev.some(p => p.id === m.id));
              newMsgs.forEach(m => newSeen.add(m.id));
              prev.forEach(m => newSeen.add(m.id));
              seenIds.current = newSeen;
              return [...newMsgs, ...prev.filter(m => !m._optimistic)];
            }
            // Initial load: replace optimistic messages that now have real IDs
            seenIds.current = newSeen;
            return incoming;
          });
          setHasMore(data.has_more || false);
          setLoadingMore(false);

        } else if (data.type === 'dm_sent' && data.target_user_id === targetUser?.id) {
          // Confirm optimistic message: replace temp entry with real server data
          if (seenIds.current.has(data.id)) return;
          seenIds.current.add(data.id);
          setMessages(prev => {
            // Find and replace the most recent optimistic message
            const idx = [...prev].reverse().findIndex(m => m._optimistic);
            if (idx !== -1) {
              const realIdx = prev.length - 1 - idx;
              const updated = [...prev];
              updated[realIdx] = { ...data, _optimistic: false };
              return updated;
            }
            return [...prev, data];
          });

        } else if (data.type === 'private_message' && data.sender_id === targetUser?.id) {
          if (seenIds.current.has(data.id)) return;
          seenIds.current.add(data.id);
          setMessages(prev => [...prev, data]);
          playDMSound();
          if (ws.readyState === 1)
            ws.send(JSON.stringify({ type: 'read_receipt', target_user_id: targetUser.id, message_ids: [data.id] }));

        } else if (data.type === 'messages_read' && data.reader_id === targetUser?.id) {
          setMessages(prev => prev.map(m =>
            m.sender_id === currentUser?.id ? { ...m, status: 'read' } : m
          ));
        } else if (data.type === 'user_typing' && data.user_id === targetUser?.id) {
          setIsTyping(true);
          clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
        } else if (data.type === 'user_stop_typing' && data.user_id === targetUser?.id) {
          setIsTyping(false);
        } else if (data.type === 'dm_deleted') {
          setMessages(prev => prev.map(m =>
            m.id === data.message_id ? { ...m, deleted: 1, content: '' } : m
          ));
        } else if (data.type === 'dm_reaction') {
          setMessages(prev => prev.map(m =>
            m.id === data.message_id ? { ...m, reactions: data.reactions } : m
          ));
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws, targetUser?.id, currentUser?.id]);

  // Auto-scroll is handled natively by Virtuoso (followOutput)

  // Typing indicator sender
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'typing', target_user_id: targetUser.id }));
    }
  };

  // Optimistic send: add message to UI instantly, confirm on dm_sent
  const sendDM = (overridePayload) => {
    const payload = overridePayload || (
      input.trim() ? {
        type: 'private_message',
        target_user_id: targetUser.id,
        content: input.trim(),
        ...(replyTo ? { reply_to: replyTo } : {}),
      } : null
    );
    if (!payload) return;

    // Add optimistic message immediately for instant UI feedback
    if (!overridePayload) {
      const optimistic = {
        _optimistic: true,
        id: `opt_${Date.now()}`,
        sender_id: currentUser?.id,
        sender_username: currentUser?.username,
        target_user_id: targetUser.id,
        content: payload.content,
        content_type: payload.content_type || 'text',
        status: 'sending',
        created_at: new Date().toISOString(),
        reply_to: replyTo || null,
      };
      setMessages(prev => [...prev, optimistic]);
      setInput('');
      setReplyTo(null);
    }

    if (ws && ws.readyState === 1) ws.send(JSON.stringify(payload));
    else if (overridePayload === undefined) {
      // WS not ready — show failed state on optimistic msg
      setMessages(prev => prev.map(m =>
        m._optimistic ? { ...m, status: 'failed' } : m
      ));
    }
  };

  const sendVoice = ({ url, duration }) => {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({
      type: 'private_message',
      target_user_id: targetUser.id,
      content_type: 'voice',
      voice_url: url,
      voice_duration: duration,
    }));
  };

  const sendFile = ({ url, name, size }) => {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({
      type: 'private_message',
      target_user_id: targetUser.id,
      content_type: 'file',
      file_url: url,
      file_name: name,
      file_size: size,
    }));
  };

  // Delete own message via WS
  const deleteMsg = useCallback((msgId) => {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({
      type: 'dm_delete',
      message_id: msgId,
      target_user_id: targetUser.id,
    }));
  }, [ws, targetUser?.id]);

  // Toggle emoji reaction via WS
  const reactMsg = useCallback((msgId, emoji) => {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({
      type: 'dm_react',
      message_id: msgId,
      emoji,
      target_user_id: targetUser.id,
    }));
  }, [ws, targetUser?.id]);

  // Search within conversation
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (!searchMode) { setSearchQuery(''); setSearchResults([]); return; }
  }, [searchMode]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${API}/api/dm/search?user_id=${currentUser?.id}&target_id=${targetUser?.id}&q=${encodeURIComponent(searchQuery)}&limit=30`
        );
        const json = await res.json();
        setSearchResults(json.messages || []);
      } catch {}
      setSearching(false);
    }, 350);
  }, [searchQuery]);  // eslint-disable-line

  if (!targetUser) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 z-50"
      style={{
        width: 'min(384px, 100vw)',
        height: '100dvh',
        background: 'rgba(14,14,34,0.98)',
        borderLeft: '1px solid rgba(0,240,255,0.1)',
        backdropFilter: 'blur(30px)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.2)' }}>
            {targetUser.avatar || '👤'}
          </div>
          <div>
            <p className="font-poppins font-medium text-white/80 text-sm">{targetUser.username}</p>
            <p className="text-[9px] font-mono text-neon-cyan">🔒 Private • Encrypted Transit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search toggle */}
          <button onClick={() => setSearchMode(s => !s)}
            className="text-[11px] w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              color: searchMode ? 'var(--accent)' : 'rgba(255,255,255,0.3)',
              background: searchMode ? 'rgba(99,102,241,0.15)' : 'transparent',
            }}
            title="Search messages">🔍</button>
          {targetUser.id !== currentUser.id && (
            <button 
              onClick={async () => {
                if (amIBlocker) {
                  await supabase.from('blocks').delete()
                    .eq('blocker_id', currentUser.id)
                    .eq('blocked_id', targetUser.id);
                } else {
                  await supabase.from('blocks').insert({ blocker_id: currentUser.id, blocked_id: targetUser.id });
                }
              }}
              className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md transition-colors border ${amIBlocker ? 'text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 border-neon-cyan/30' : 'text-[#ff2a2a] bg-[#ff2a2a]/10 hover:bg-[#ff2a2a]/20 border-[#ff2a2a]/30'}`}
            >
              {amIBlocker ? 'Unblock' : 'Block'}
            </button>
          )}
          <button onClick={onClose} className="text-white/20 hover:text-white/50 text-xl transition-colors">✕</button>
        </div>
      </div>

      {/* Search bar */}
      {searchMode && (
        <div className="px-3 py-2 border-b border-white/[0.04]" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <input
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages…"
            className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-1)' }}
          />
          {searching && <p className="text-[9px] text-center mt-1 text-white/20">Searching…</p>}
          {!searching && searchQuery && searchResults.length === 0 && (
            <p className="text-[9px] text-center mt-1 text-white/20">No messages found</p>
          )}
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map(m => (
                <div key={m.id}
                  className="px-2 py-1 rounded-lg text-[10px] cursor-pointer transition-colors"
                  style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--text-2)' }}
                  onClick={() => setSearchMode(false)}
                >
                  <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>{m.sender_username}: </span>
                  {m.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <Virtuoso
        className="flex-1 w-full"
        data={messages}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        followOutput="smooth"
        startReached={() => {
          if (!loadingMore && hasMore && messages.length > 0) {
            setLoadingMore(true);
            ws?.send(JSON.stringify({
              type: 'get_dm_history',
              target_user_id: targetUser.id,
              before_id: messages[0]?.id,
              limit: 50,
            }));
          }
        }}
        components={{
          Header: () => (
            <div className="py-4 px-4">
              {loadingMore && (
                <div className="text-center py-2">
                  <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="text-[10px] font-mono text-neon-cyan/40">
                    Loading older messages...
                  </motion.p>
                </div>
              )}
              {!hasMore && messages.length > 0 && (
                <div className="text-center py-2">
                  <p className="text-[9px] font-mono text-white/10">🔒 Start of conversation</p>
                </div>
              )}
              {messages.length === 0 && !loadingMore && (
                <div className="text-center mt-8">
                  <p className="text-3xl mb-2">🔒</p>
                  <p className="text-[10px] font-mono text-white/20">Private conversation with {targetUser.username}</p>
                  <p className="text-[9px] font-mono text-white/10 mt-1">Only you two can see these messages</p>
                </div>
              )}
            </div>
          ),
          Footer: () => (
            <div className="py-2">
              <AnimatePresence>
                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start px-4">
                    <div className="px-3 py-2 rounded-2xl rounded-bl-md" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-xs text-white/30">typing...</motion.span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }}
        itemContent={(index, msg) => (
          <div className="px-4 pb-3">
            <MessageBubble
              msg={msg}
              currentUser={currentUser}
              reactMsg={reactMsg}
              deleteMsg={deleteMsg}
              setReplyTo={setReplyTo}
            />
          </div>
        )}
      />

      {/* Reply indicator */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-t border-white/[0.04]"
            style={{ background: 'rgba(0,240,255,0.03)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-neon-cyan/60">↩ Replying to <b>{replyTo.sender_username}</b></p>
              <button onClick={() => setReplyTo(null)} className="text-white/20 text-xs">✕</button>
            </div>
            <p className="text-[10px] text-white/30 truncate">{replyTo.content}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-3 border-t flex gap-2 items-end flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        {isConnected ? (
          <>
            {/* File upload */}
            <FileUpload onSend={sendFile} />

            {/* Text input */}
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) sendDM();
                }
              }}
              placeholder={`Message ${targetUser.username}...`}
              rows={1}
              className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all resize-none"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
                maxHeight: '100px',
                overflowY: 'auto',
                lineHeight: '1.4',
              }}
            />

            {/* Voice */}
            <VoiceRecorder onSend={sendVoice} />

            {/* Send — only if text */}
            {input.trim() && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
                onClick={() => sendDM()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
                ➤
              </motion.button>
            )}
          </>
        ) : (
          <div className="flex-1 text-center py-2 text-xs" style={{ color: 'var(--text-3)' }}>
            {isBlocked ? '🚫 Messages suspended due to block.' : `Connect with ${targetUser.username} to message`}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ─── AI CHAT PANEL ───────────────────────────────────────── */
export const AIChatPanel = ({ ws, onClose }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '🧠 Hi! I\'m SmartChat X AI, powered by Groq. Ask me anything about networking, coding, or general topics!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'ai_chat_response') {
          setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
          setLoading(false);
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  const sendMessage = () => {
    if (!input.trim() || !ws || ws.readyState !== 1 || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    ws.send(JSON.stringify({ type: 'ai_chat', content: input.trim(), history: messages.slice(-6) }));
    setInput('');
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 z-50 flex flex-col"
      style={{
        width: 'min(384px, 100vw)',
        height: '100dvh',
        background: 'rgba(14,14,34,0.98)',
        borderLeft: '1px solid rgba(179,71,234,0.15)',
        backdropFilter: 'blur(30px)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'rgba(179,71,234,0.1)', border: '1px solid rgba(179,71,234,0.3)' }}>
            🧠
          </div>
          <div>
            <p className="font-poppins font-medium text-white/80 text-sm">AI Assistant</p>
            <p className="text-[9px] font-mono" style={{ color: '#b347ea' }}>Powered by Groq LLM</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/20 hover:text-white/50 text-xl transition-colors">✕</button>
      </div>

      <Virtuoso
        className="flex-1 w-full"
        data={messages}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        followOutput="smooth"
        itemContent={(i, msg) => (
          <div className="px-4 pb-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                style={{
                  background: msg.role === 'user' ? 'rgba(0,240,255,0.08)' : 'rgba(179,71,234,0.06)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(0,240,255,0.15)' : 'rgba(179,71,234,0.1)'}`,
                }}>
                <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          </div>
        )}
        components={{
          Header: () => <div className="py-2" />,
          Footer: () => (
            <div className="py-2">
              <AnimatePresence>
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start px-4">
                    <div className="px-3 py-2 rounded-2xl rounded-bl-md"
                      style={{ background: 'rgba(179,71,234,0.06)', border: '1px solid rgba(179,71,234,0.1)' }}>
                      <motion.p
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-xs text-white/40"
                      >🧠 Thinking...</motion.p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }}
      />

      <div className="p-3 border-t flex gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask AI anything..."
          className="flex-1 px-3 py-2 rounded-xl text-xs text-white/70 font-poppins outline-none"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
          onClick={sendMessage}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-xs font-orbitron font-bold"
          style={{ background: 'rgba(179,71,234,0.1)', border: '1px solid rgba(179,71,234,0.3)', color: '#b347ea', opacity: loading ? 0.5 : 1 }}
        >⚡</motion.button>
      </div>
    </motion.div>
  );
};
