/* ═══════════════════════════════════════════════════════════
   DMPanel.jsx — Private DM + Call UI (Voice/Video) + AI Chat
   SmartChat X v4.0
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playDMSound } from './sounds';

const API = `http://${window.location.hostname || '127.0.0.1'}:8000`;

/* ─── CALL MODAL — Voice & Video ──────────────────────────── */
export const CallModal = ({ callState, localStream, remoteStream, onAccept, onReject, onEnd, onToggleScreenShare, isScreenSharing }) => {
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    let timer;
    if (callState?.status === 'active') {
      timer = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState?.status]);

  // Attach local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState?.status]);

  // Attach remote video/audio
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  if (!callState) return null;
  const isVideo = callState.type === 'video';
  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
      >
        {/* Hidden audio element to always play remote audio */}
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

        <div className="text-center w-full max-w-lg px-4">

          {/* ── Video Call Active View ── */}
          {isVideo && callState.status === 'active' ? (
            <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
              {/* Remote video (large) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full rounded-2xl object-cover"
                style={{ background: '#111', border: '1px solid rgba(0,240,255,0.15)' }}
              />
              {/* Local video (small overlay) */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-3 right-3 w-28 h-20 rounded-xl object-cover"
                style={{ border: '2px solid rgba(0,255,136,0.4)', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
              />
              {/* Timer overlay */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
                <span className="text-neon-green font-mono text-sm">{formatTime(duration)}</span>
                <span className="text-white/30 text-[9px] ml-2">
                  {isScreenSharing ? '🖥️ Screen' : '📹 Video'}
                </span>
              </div>
              {/* Username */}
              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                <span className="text-white/80 text-xs font-poppins">{callState.username}</span>
              </div>
            </div>
          ) : (
            /* ── Voice Call / Ringing / Incoming View ── */
            <>
              {/* Avatar / Animation */}
              {callState.status === 'incoming' ? (
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl"
                  style={{
                    background: 'rgba(0,240,255,0.08)',
                    border: '2px solid rgba(0,240,255,0.3)',
                    boxShadow: '0 0 60px rgba(0,240,255,0.15)',
                  }}
                >
                  {isVideo ? '📹' : '📞'}
                </motion.div>
              ) : callState.status === 'ringing' ? (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl"
                  style={{
                    background: 'rgba(0,255,136,0.08)',
                    border: '2px solid rgba(0,255,136,0.3)',
                    boxShadow: '0 0 60px rgba(0,255,136,0.15)',
                  }}
                >
                  {isVideo ? '📹' : '📞'}
                </motion.div>
              ) : (
                <div className="w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl"
                  style={{
                    background: 'rgba(0,255,136,0.12)',
                    border: '2px solid rgba(0,255,136,0.4)',
                    boxShadow: '0 0 60px rgba(0,255,136,0.2)',
                  }}
                >
                  🎙️
                </div>
              )}

              {/* Voice call active timer */}
              {callState.status === 'active' && !isVideo && (
                <p className="text-neon-green font-mono text-2xl mb-2">{formatTime(duration)}</p>
              )}

              <h2 className="font-orbitron text-xl text-white/90 mb-1">
                {callState.status === 'incoming' ? 'Incoming Call' :
                 callState.status === 'ringing' ? 'Calling...' : 'In Call'}
              </h2>
              <p className="text-base font-poppins text-white/60 mb-1">{callState.username}</p>
              <p className="text-[10px] font-mono text-white/25 mb-8">
                {isVideo ? '📹 Video Call' : '🎙️ Voice Call'} • WebRTC P2P
              </p>
            </>
          )}

          {/* ── Action Buttons ── */}
          <div className="flex gap-5 justify-center mt-6">
            {callState.status === 'incoming' && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onAccept}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,255,136,0.1))',
                    border: '2px solid rgba(0,255,136,0.5)',
                    boxShadow: '0 0 30px rgba(0,255,136,0.3)',
                    color: '#00ff88',
                  }}
                >
                  ✓
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onReject}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,45,120,0.2), rgba(255,45,120,0.1))',
                    border: '2px solid rgba(255,45,120,0.5)',
                    boxShadow: '0 0 30px rgba(255,45,120,0.3)',
                    color: '#ff2d78',
                  }}
                >
                  ✕
                </motion.button>
              </>
            )}
            {(callState.status === 'ringing' || callState.status === 'active') && (
              <>
                {/* Screen Share / Mirror button — only during active call */}
                {callState.status === 'active' && onToggleScreenShare && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onToggleScreenShare}
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl relative"
                    style={{
                      background: isScreenSharing
                        ? 'linear-gradient(135deg, rgba(0,240,255,0.25), rgba(179,71,234,0.2))'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
                      border: `2px solid ${isScreenSharing ? 'rgba(0,240,255,0.6)' : 'rgba(255,255,255,0.15)'}`,
                      boxShadow: isScreenSharing ? '0 0 30px rgba(0,240,255,0.3)' : 'none',
                      color: isScreenSharing ? '#00f0ff' : 'rgba(255,255,255,0.5)',
                    }}
                    title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                  >
                    🖥️
                    {isScreenSharing && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neon-cyan"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{ boxShadow: '0 0 8px rgba(0,240,255,0.6)' }}
                      />
                    )}
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onEnd}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,45,120,0.3), rgba(255,45,120,0.1))',
                    border: '2px solid rgba(255,45,120,0.5)',
                    boxShadow: '0 0 30px rgba(255,45,120,0.3)',
                    color: '#ff2d78',
                  }}
                >
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
export const DMPanel = ({ targetUser, currentUser, ws, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const chatEnd = useRef(null);

  useEffect(() => {
    if (ws?.readyState === 1 && targetUser) {
      ws.send(JSON.stringify({ type: 'get_dm_history', target_user_id: targetUser.id }));
    }
  }, [targetUser, ws]);

  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'dm_history' && data.target_user_id === targetUser?.id) {
          setMessages(data.messages || []);
        } else if (data.type === 'private_message' && data.sender_id === targetUser?.id) {
          setMessages(prev => [...prev, data]);
          playDMSound();
        } else if (data.type === 'dm_sent' && data.target_user_id === targetUser?.id) {
          setMessages(prev => [...prev, data]);
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws, targetUser]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendDM = () => {
    if (!input.trim() || !ws || ws.readyState !== 1) return;
    const payload = {
      type: 'private_message',
      target_user_id: targetUser.id,
      content: input.trim(),
    };
    if (replyTo) payload.reply_to = replyTo;
    ws.send(JSON.stringify(payload));
    setInput('');
    setReplyTo(null);
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
            <p className="text-[9px] font-mono text-neon-cyan">🔒 Private • End-to-End</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/20 hover:text-white/50 text-xl transition-colors">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-3xl mb-2">🔒</p>
            <p className="text-[10px] font-mono text-white/20">Private conversation with {targetUser.username}</p>
            <p className="text-[9px] font-mono text-white/10 mt-1">Only you two can see these messages</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUser?.id;
          return (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
            >
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'} relative`}
                style={{
                  background: isOwn ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isOwn ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                {/* Reply quote */}
                {msg.reply_to && (
                  <div className="text-[9px] text-white/25 border-l-2 border-neon-cyan/30 pl-2 mb-1 italic">
                    ↩ Replying...
                  </div>
                )}
                {!isOwn && <p className="text-[9px] font-mono text-neon-cyan/60 mb-0.5">{msg.sender_username}</p>}
                <p className="text-xs text-white/70 leading-relaxed">{msg.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[8px] font-mono text-white/15">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                  {/* Reply button */}
                  <button
                    onClick={() => setReplyTo(msg)}
                    className="text-[9px] text-white/0 group-hover:text-white/30 transition-colors hover:text-neon-cyan"
                  >↩</button>
                </div>
              </div>
            </motion.div>
          );
        })}
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
      <div className="p-3 border-t border-white/[0.06] flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendDM()}
          placeholder={`Message ${targetUser.username}...`}
          className="flex-1 px-3 py-2 rounded-xl text-xs text-white/70 font-poppins outline-none"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={sendDM}
          className="px-4 py-2 rounded-xl text-xs font-orbitron font-bold"
          style={{ background: 'rgba(0,240,255,0.1)', border: '1px solid rgba(0,240,255,0.3)', color: '#00f0ff' }}
        >
          ⚡
        </motion.button>
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
