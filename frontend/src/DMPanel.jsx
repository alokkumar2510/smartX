/* ═══════════════════════════════════════════════════════════
   DMPanel.jsx — Private DM + Call UI (Voice/Video) + AI Chat
   SmartChat X v4.0
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playDMSound } from './sounds';
import { supabase } from './lib/supabase';
import VoiceRecorder, { VoicePlayer } from './components/VoiceRecorder';
import FileUpload, { FileMessage } from './components/FileShare';
import { useNetwork } from './context/NetworkContext';

const API = import.meta.env.VITE_API_URL || `http://${window.location.hostname || '127.0.0.1'}:8000`;

/* ─── PARTICIPANT VIDEO ───────────────────────────── */
const ParticipantVideo = ({ stream, isVideo, label, isLocal }) => {
  const vRef = useRef(null);
  const aRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (vRef.current && stream) vRef.current.srcObject = stream;
    if (aRef.current && stream && !isLocal) aRef.current.srcObject = stream;
  }, [stream, isLocal]);

  useEffect(() => {
    if (!stream || isLocal) return; // Optional: show active for local too
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    try {
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
    } catch (e) { return; }
    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let afId;
    const checkActive = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0; for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
      setIsActive(sum > dataArray.length * 15);
      afId = requestAnimationFrame(checkActive);
    };
    checkActive();
    return () => { cancelAnimationFrame(afId); ctx.close(); };
  }, [stream, isLocal]);

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden bg-[#111] border-2 transition-all duration-300 ${isActive ? 'border-neon-green shadow-[0_0_20px_rgba(0,255,136,0.4)] scale-[1.02]' : 'border-[rgba(255,255,255,0.05)]'}`}>
      <video ref={vRef} autoPlay playsInline muted={isLocal} className={`w-full h-full object-cover ${!isVideo && 'hidden'}`} />
      {!isLocal && <audio ref={aRef} autoPlay playsInline className="hidden" />}
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

  const remoteUsers = Object.entries(remoteStreams);
  const allCount = remoteUsers.length + 1; // including local
  // Dynamic layout calculation
  let gridCols = 'grid-cols-1';
  let gridRows = 'grid-rows-1';
  if (allCount === 2) { gridCols = 'grid-cols-1 md:grid-cols-2'; }
  else if (allCount === 3 || allCount === 4) { gridCols = 'grid-cols-2'; gridRows = 'grid-rows-2'; }
  else if (allCount > 4) { gridCols = 'grid-cols-3'; gridRows = 'grid-rows-2'; }

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
                {remoteUsers.map(([id, stream]) => (
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
                  <p className="text-white/40 font-mono text-sm">{isVideo ? 'Video Call' : 'Voice Call'} - WebRTC P2P</p>
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
  const chatEnd = useRef(null);
  const chatContainer = useRef(null);
  const typingTimeout = useRef(null);

  // Load initial DM history
  useEffect(() => {
    if (ws?.readyState === 1 && targetUser) {
      setMessages([]);
      ws.send(JSON.stringify({ type: 'get_dm_history', target_user_id: targetUser.id, limit: 50 }));
      // Send read receipt when opening conversation
      ws.send(JSON.stringify({ type: 'read_receipt', target_user_id: targetUser.id }));
    }
  }, [targetUser, ws]);

  // Listen for DM events
  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'dm_history' && data.target_user_id === targetUser?.id) {
          if (data.messages?.[0]?.id && messages.length > 0) {
            // Prepend older messages (infinite scroll)
            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = data.messages.filter(m => !existingIds.has(m.id));
              return [...newMsgs, ...prev];
            });
          } else {
            setMessages(data.messages || []);
          }
          setHasMore(data.has_more || false);
          setLoadingMore(false);
        } else if (data.type === 'private_message' && data.sender_id === targetUser?.id) {
          setMessages(prev => [...prev, data]);
          playDMSound();
          // Auto-send read receipt
          ws.send(JSON.stringify({ type: 'read_receipt', target_user_id: targetUser.id, message_ids: [data.id] }));
        } else if (data.type === 'dm_sent' && data.target_user_id === targetUser?.id) {
          setMessages(prev => [...prev, data]);
        } else if (data.type === 'messages_read' && data.reader_id === targetUser?.id) {
          // Update ticks to read
          setMessages(prev => prev.map(m => 
            m.sender_id === currentUser?.id ? { ...m, status: 'read' } : m
          ));
        } else if (data.type === 'user_typing' && data.user_id === targetUser?.id) {
          setIsTyping(true);
          clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
        } else if (data.type === 'user_stop_typing' && data.user_id === targetUser?.id) {
          setIsTyping(false);
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws, targetUser, currentUser, messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Infinite scroll — load older on scroll to top
  const handleScroll = () => {
    const el = chatContainer.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop < 80 && messages.length > 0) {
      setLoadingMore(true);
      const oldestId = messages[0]?.id;
      ws.send(JSON.stringify({
        type: 'get_dm_history',
        target_user_id: targetUser.id,
        before_id: oldestId,
        limit: 50,
      }));
    }
  };

  // Typing indicator sender
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'typing', target_user_id: targetUser.id }));
    }
  };

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
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(payload));
    if (!overridePayload) { setInput(''); setReplyTo(null); }
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

  if (!targetUser) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
      style={{
        width: 'min(384px, 100vw)',
        background: 'rgba(14,14,34,0.98)',
        borderLeft: '1px solid rgba(0,240,255,0.1)',
        backdropFilter: 'blur(30px)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
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
        <div className="flex items-center gap-3">
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

      {/* Messages */}
      <div
        ref={chatContainer}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Loading more indicator */}
        {loadingMore && (
          <div className="text-center py-2">
            <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="text-[10px] font-mono text-neon-cyan/40">Loading older messages...</motion.p>
          </div>
        )}
        {!hasMore && messages.length > 0 && (
          <div className="text-center py-2">
            <p className="text-[9px] font-mono text-white/10">🔒 Start of conversation</p>
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-3xl mb-2">🔒</p>
            <p className="text-[10px] font-mono text-white/20">Private conversation with {targetUser.username}</p>
            <p className="text-[9px] font-mono text-white/10 mt-1">Only you two can see these messages</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUser?.id;
          const ctype = msg.content_type;
          return (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
            >
              {/* Render voice messages */}
              {ctype === 'voice' ? (
                <VoicePlayer url={msg.voice_url} isOwn={isOwn} duration={msg.voice_duration} />
              ) : ctype === 'file' ? (
                <FileMessage url={msg.file_url} name={msg.file_name} size={msg.file_size} isOwn={isOwn} />
              ) : (
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'} relative`}
                  style={{
                    background: isOwn ? 'var(--accent)' : 'var(--bg-hover)',
                    boxShadow: isOwn ? '0 2px 12px rgba(99,102,241,0.25)' : 'none',
                  }}>
                  {msg.reply_to && (
                    <div className="text-[9px] border-l-2 pl-2 mb-1 italic opacity-60"
                         style={{ borderColor: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--accent)', color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-2)' }}>
                      ↩ Replying...
                    </div>
                  )}
                  {!isOwn && <p className="text-[9px] font-medium mb-0.5" style={{ color: 'var(--accent)' }}>{msg.sender_username}</p>}
                  <p className="text-xs leading-relaxed" style={{ color: isOwn ? '#fff' : 'var(--text-1)' }}>{msg.content}</p>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <p className="text-[8px]" style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--text-3)' }}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                    <div className="flex items-center gap-1">
                      {isOwn && (
                        <span className="text-[8px]" style={{ color: msg.status === 'read' ? '#a5f3fc' : 'rgba(255,255,255,0.4)' }}>
                          {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                      <button onClick={() => setReplyTo(msg)}
                        className="text-[9px] opacity-0 group-hover:opacity-60 transition-opacity hover:opacity-100"
                        style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-2)' }}>↩</button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        {/* Typing indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl rounded-bl-md" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-xs text-white/30">typing...</motion.span>
            </div>
          </motion.div>
        )}
        <div ref={chatEnd} />
      </div>

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
      <div className="p-3 border-t flex gap-2 items-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
        {isConnected ? (
          <>
            {/* File upload */}
            <FileUpload onSend={sendFile} />

            {/* Text input */}
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => e.key === 'Enter' && sendDM()}
              placeholder={`Message ${targetUser.username}...`}
              className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
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
  const chatEnd = useRef(null);

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

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
      style={{
        width: 'min(384px, 100vw)',
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
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
        ))}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
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
        <div ref={chatEnd} />
      </div>

      <div className="p-3 border-t border-white/[0.06] flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
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
