/**
 * ═══════════════════════════════════════════════════════════════════
 *  SmartChat X — COMPLETE INTEGRATED CHAT APPLICATION
 *  Welcome Screen → Auth → Chat Dashboard → TCP/UDP Integration
 *
 *  INTEGRATION FLOW:
 *  User types → React → WebSocket → FastAPI → NetworkBridge
 *  → TCP/UDP Socket Server → Packet Processing → ACK/Drop
 *  → Response → FastAPI → WebSocket → React UI Update
 * ═══════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DMPanel, CallModal, AIChatPanel } from './DMPanel';
import { playMessageSound, playSentSound, playDMSound, startRingtone, stopRingtone, playCallConnected, playCallEnded, playErrorSound, showNotification, requestNotificationPermission } from './sounds';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const _host = window.location.hostname || '127.0.0.1';
const API = `http://${_host}:8000`;
const WS_URL = `ws://${_host}:8000`;

/* ═══════════════════════════════════════════════════════════
   AUTH CONTEXT — Global authentication state with persistence
   ═══════════════════════════════════════════════════════════ */
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Use sessionStorage for per-tab isolation (allows multiple logins in different tabs)
    const saved = sessionStorage.getItem('smartchat_auth');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setUser(data.user);
        setToken(data.token);
      } catch {}
    }
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    sessionStorage.setItem('smartchat_auth', JSON.stringify({ user: userData, token: authToken }));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('smartchat_auth');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => useContext(AuthContext);

/* ═══════════════════════════════════════════════════════════
   ANIMATED BACKGROUND — Cyberpunk particles + grid
   ═══════════════════════════════════════════════════════════ */
const CyberBg = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    let anim;
    const particles = [];
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    class P {
      constructor() { this.r(); }
      r() {
        this.x = Math.random() * c.width;
        this.y = Math.random() * c.height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.s = Math.random() * 2 + 0.5;
        this.a = Math.random() * 0.4 + 0.1;
        this.col = ['0,240,255', '179,71,234', '255,45,120'][~~(Math.random() * 3)];
      }
      u() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > c.width) this.vx *= -1;
        if (this.y < 0 || this.y > c.height) this.vy *= -1;
      }
      d() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.s, 0, 6.28);
        ctx.fillStyle = `rgba(${this.col},${this.a})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.s * 3, 0, 6.28);
        ctx.fillStyle = `rgba(${this.col},${this.a * 0.12})`;
        ctx.fill();
      }
    }
    for (let i = 0; i < 50; i++) particles.push(new P());

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      particles.forEach(p => { p.u(); p.d(); });
      for (let i = 0; i < particles.length; i++)
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,240,255,${(1 - d / 120) * 0.05})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      anim = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(anim); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-60" />;
};

/* ═══════════════════════════════════════════════════════════
   WELCOME SCREEN — Full-screen animated intro
   ═══════════════════════════════════════════════════════════ */
const WelcomeScreen = ({ onStart }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ background: 'radial-gradient(ellipse at center, #0f0f2a 0%, #0a0a1a 50%, #050510 100%)' }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.5 }}
  >
    <CyberBg />
    <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.3 }}
      className="relative z-10 text-center px-6"
    >
      {/* Glowing orb */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-32 h-32 mx-auto mb-8 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,240,255,0.25) 0%, transparent 70%)',
          boxShadow: '0 0 80px rgba(0,240,255,0.2), 0 0 160px rgba(179,71,234,0.1)',
        }}
      >
        <div className="w-full h-full flex items-center justify-center text-5xl">
          <motion.span animate={{ rotate: [0, 360] }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}>
            ⚡
          </motion.span>
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="font-orbitron text-4xl md:text-6xl font-black mb-4 text-neon-gradient tracking-wider"
      >
        SMARTCHAT X
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-white/30 font-poppins text-sm md:text-base mb-2 tracking-widest uppercase"
      >
        Advanced TCP/UDP Communication System
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="text-white/15 font-mono text-xs mb-10 tracking-wider"
      >
        Real Socket Servers • Packet Fragmentation • ACK Handling • Encrypted
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0,240,255,0.3), 0 0 80px rgba(179,71,234,0.15)' }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="px-10 py-4 rounded-2xl font-orbitron font-bold text-sm tracking-widest relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(179,71,234,0.15))',
          border: '1px solid rgba(0,240,255,0.3)',
          color: '#00f0ff',
          textShadow: '0 0 15px rgba(0,240,255,0.4)',
        }}
      >
        <span className="relative z-10">GET STARTED</span>
        <motion.div
          className="absolute inset-0"
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.05), transparent)',
            backgroundSize: '200% 100%',
          }}
        />
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="mt-8 text-[9px] font-mono text-white/10 tracking-[0.3em] uppercase"
      >
        Real TCP (Port 9000) + UDP (Port 9001) + WebSocket Bridge
      </motion.p>
    </motion.div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════
   AUTH SCREEN — Login / Signup
   ═══════════════════════════════════════════════════════════ */
const AuthScreen = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const avatars = ['👤', '🧑‍💻', '👨‍🚀', '🦸', '🧙', '🤖', '👽', '💀', '🐱', '🦊', '🐺', '🦅'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/login' : '/api/register';
      const body = mode === 'login'
        ? { username, password }
        : { username, password, avatar };

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');

      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: '#0a0a1a' }}>
      <CyberBg />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="glass-card p-8 w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="text-4xl mb-3">⚡</motion.div>
          <h2 className="font-orbitron text-xl font-bold text-neon-gradient">
            {mode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
          </h2>
          <p className="text-white/20 text-xs font-mono mt-1 tracking-wider uppercase">
            {mode === 'login' ? 'Enter your credentials' : 'Join SmartChat X'}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 px-4 py-2 rounded-xl text-xs font-mono"
              style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.2)', color: '#ff2d78' }}
            >
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2 block">Choose Avatar</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {avatars.map(a => (
                    <motion.button
                      key={a} type="button"
                      whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setAvatar(a)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                      style={{
                        background: avatar === a ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${avatar === a ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.05)'}`,
                        boxShadow: avatar === a ? '0 0 15px rgba(0,240,255,0.2)' : 'none',
                      }}
                    >
                      {a}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1.5 block">Username</label>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Enter username" className="neon-input"
              required minLength={2}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1.5 block">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Enter password" className="neon-input"
              required minLength={3}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" disabled={loading}
            className="btn-neon w-full py-3.5 font-bold tracking-wider"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⏳ Processing...' : mode === 'login' ? '⚡ Login' : '🚀 Create Account'}
          </motion.button>
        </form>

        <p className="text-center mt-6 text-xs text-white/25">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-neon-cyan hover:underline font-semibold"
          >
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   NETWORK PACKET INFO — Shows packet processing details
   ═══════════════════════════════════════════════════════════ */
const PacketInfo = ({ info, protocol }) => {
  if (!info) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-1 px-2 py-1 rounded-lg text-[8px] font-mono leading-relaxed"
      style={{
        background: protocol === 'TCP'
          ? 'rgba(0,240,255,0.05)'
          : 'rgba(255,45,120,0.05)',
        border: `1px solid ${protocol === 'TCP'
          ? 'rgba(0,240,255,0.1)'
          : 'rgba(255,45,120,0.1)'}`,
      }}
    >
      <div className="flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {info.fragments_sent && (
          <span>📦 {info.fragments_sent} fragment{info.fragments_sent > 1 ? 's' : ''}</span>
        )}
        {info.delivery_time_ms !== undefined && (
          <span>⏱ {info.delivery_time_ms}ms</span>
        )}
        {info.reliability && (
          <span>🔒 {info.reliability}</span>
        )}
        {info.packet_info?.[0]?.checksum && (
          <span>✅ {info.packet_info[0].checksum}</span>
        )}
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CHAT MESSAGE BUBBLE — With delivery status + packet info
   ═══════════════════════════════════════════════════════════ */
const ChatBubble = ({ msg, isOwn, networkInfo, onReact, onReply, reactions }) => {
  const delivered = msg.delivered || msg.type === 'message_sent';
  const [showPacketInfo, setShowPacketInfo] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const msgReactions = reactions?.[msg.id] || {};

  const copyMessage = (e) => {
    e.stopPropagation();
    if (msg.content) {
      navigator.clipboard.writeText(msg.content).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  const quickReact = (emoji, e) => {
    e.stopPropagation();
    onReact?.(msg.id, emoji);
    setShowActions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2.5 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} relative`}>
        {/* Hover action bar */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`absolute ${isOwn ? 'left-0' : 'right-0'} -top-8 flex gap-1 z-10`}
              style={{ background: 'rgba(20,20,50,0.95)', borderRadius: 12, padding: '3px 6px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 25px rgba(0,0,0,0.4)' }}
            >
              {['❤️','😂','👍','🔥','😮'].map(em => (
                <button key={em} onClick={(e) => quickReact(em, e)}
                  className="text-sm hover:scale-125 transition-transform px-0.5">{em}</button>
              ))}
              <span className="w-px bg-white/10 mx-0.5" />
              <button onClick={copyMessage} className="text-[10px] text-white/30 hover:text-white/60 px-1"
                title="Copy">{copied ? '✓' : '📋'}</button>
              <button onClick={(e) => { e.stopPropagation(); onReply?.(msg); setShowActions(false); }}
                className="text-[10px] text-white/30 hover:text-white/60 px-1" title="Reply">↩</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`rounded-2xl px-4 py-2.5 relative cursor-pointer ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}`}
          onClick={() => isOwn && setShowPacketInfo(!showPacketInfo)}
          style={{
            background: isOwn
              ? 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(77,124,255,0.12))'
              : 'linear-gradient(135deg, rgba(30,30,70,0.7), rgba(20,20,50,0.7))',
            border: isOwn
              ? '1px solid rgba(0,240,255,0.15)'
              : '1px solid rgba(255,255,255,0.05)',
            boxShadow: isOwn ? '0 4px 15px rgba(0,240,255,0.06)' : '0 4px 15px rgba(0,0,0,0.15)',
          }}
        >
          {!isOwn && (
            <p className="text-[10px] font-bold mb-1" style={{ color: '#b347ea' }}>
              {msg.sender_username}
            </p>
          )}

          {/* Reply quote */}
          {msg.reply_to && (
            <div className="mb-1.5 pl-2 border-l-2 border-neon-cyan/30 py-0.5"
              style={{ background: 'rgba(0,240,255,0.03)', borderRadius: '0 8px 8px 0' }}>
              <p className="text-[9px] font-mono text-neon-cyan/50">{msg.reply_to.sender_username}</p>
              <p className="text-[10px] text-white/25 truncate">{msg.reply_to.content?.slice(0, 60)}</p>
            </div>
          )}

          {msg.image_url && (
            <motion.img
              src={`${API}${msg.image_url}`}
              alt="shared"
              className="rounded-xl mb-2 max-w-full max-h-60 object-cover cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              whileHover={{ scale: 1.02 }}
              onClick={(e) => { e.stopPropagation(); window.open(`${API}${msg.image_url}`, '_blank'); }}
            />
          )}

          {msg.content && (
            <p className="text-sm leading-relaxed" style={{ color: isOwn ? '#d0f0ff' : '#c0c0d8' }}>
              {msg.content}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 mt-1.5">
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              msg.protocol === 'UDP'
                ? 'text-neon-pink bg-neon-pink/10 border border-neon-pink/20'
                : msg.protocol === 'WebRTC'
                ? 'text-purple-400 bg-purple-400/10 border border-purple-400/20'
                : 'text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20'
            }`}>
              {msg.protocol || 'TCP'}
            </span>
            <span className="text-[9px] font-mono text-white/15">
              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            {isOwn && (
              <span className="text-[10px]" style={{
                color: msg.dropped ? '#ff2d78' : delivered ? '#00ff88' : '#ffffff30'
              }}>
                {msg.dropped ? '✕' : delivered ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        {/* Emoji reactions display */}
        {Object.keys(msgReactions).length > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            {Object.entries(msgReactions).map(([emoji, count]) => (
              <button key={emoji} onClick={(e) => quickReact(emoji, e)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] hover:scale-110 transition-transform"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span>{emoji}</span>
                {count > 1 && <span className="text-white/30 text-[8px]">{count}</span>}
              </button>
            ))}
          </motion.div>
        )}

        {/* Packet processing info */}
        <AnimatePresence>
          {showPacketInfo && isOwn && networkInfo && (
            <PacketInfo info={networkInfo} protocol={msg.protocol} />
          )}
        </AnimatePresence>

        {/* Dropped indicator */}
        {msg.dropped ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[9px] font-mono text-neon-pink mt-1 px-2 flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse" style={{ boxShadow: '0 0 4px #ff2d78' }} />
            Packet dropped (UDP) — No ACK received
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   TYPING INDICATOR
   ═══════════════════════════════════════════════════════════ */
const TypingIndicator = ({ users }) => (
  <AnimatePresence>
    {users.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2 px-4 py-1.5"
      >
        <span className="text-[10px] text-white/30 font-mono">{users.join(', ')} typing</span>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-neon-cyan"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
            style={{ boxShadow: '0 0 4px rgba(0,240,255,0.5)' }}
          />
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

/* ═══════════════════════════════════════════════════════════
   IMAGE UPLOAD PREVIEW
   ═══════════════════════════════════════════════════════════ */
const ImagePreview = ({ file, onRemove }) => {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  if (!preview) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pb-2"
    >
      <div className="glass-card p-2 inline-flex items-end gap-2">
        <img src={preview} alt="preview" className="h-20 rounded-lg object-cover" />
        <button onClick={onRemove} className="text-neon-pink text-xs hover:underline font-mono">✕ Remove</button>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SIDEBAR — Users list with online status
   ═══════════════════════════════════════════════════════════ */
const Sidebar = ({ users, onlineIds, currentUser, show, onClose, onConnectP2P, p2pConnections, onDMClick, onCall }) => (
  <>
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
    </AnimatePresence>

    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: show ? 0 : -300 }}
      transition={{ type: 'spring', damping: 25 }}
      className={`fixed lg:static z-40 w-72 h-full flex flex-col border-r border-white/[0.04]`}
      style={{ background: 'rgba(14,14,34,0.95)', backdropFilter: 'blur(20px)' }}
    >
      <div className="p-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-orbitron text-sm font-bold text-neon-gradient tracking-wider">OPERATORS</h2>
          <span className="text-[9px] font-mono text-white/20 bg-white/[0.03] px-2 py-0.5 rounded-full">
            {onlineIds.length} online
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {users.map(u => {
          const isOnline = onlineIds.some(o => o.user_id === u.id);
          const isMe = u.id === currentUser?.id;
          const p2pState = p2pConnections?.[u.id];
          return (
            <motion.div
              key={u.id}
              whileHover={{ x: 3, background: 'rgba(0,240,255,0.03)' }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer mb-0.5"
              style={{ opacity: isOnline ? 1 : 0.4 }}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isOnline ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {u.avatar || '👤'}
                </div>
                {isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2"
                    style={{ borderColor: '#0e0e22', boxShadow: '0 0 8px rgba(0,255,136,0.5)' }}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-poppins font-medium text-white/70 truncate">
                  {u.username} {isMe && <span className="text-neon-cyan text-[8px]">(You)</span>}
                </p>
                <p className="text-[9px] font-mono text-white/20 truncate">
                  {isOnline ? 'Online' : `Last seen ${u.last_seen ? new Date(u.last_seen).toLocaleString() : 'N/A'}`}
                </p>
              </div>

              {/* DM + Call + P2P buttons */}
              {isOnline && !isMe && (
                <div className="flex gap-1">
                  {onDMClick && (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); onDMClick(u); }}
                      className="text-[10px] px-1.5 py-1 rounded-lg transition-all"
                      style={{ background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)', color: '#00f0ff' }}
                      title="Direct Message"
                    >💬</motion.button>
                  )}
                  {onCall && (
                    <>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onCall(u.id, u.username, 'voice'); }}
                        className="text-[10px] px-1.5 py-1 rounded-lg transition-all"
                        style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', color: '#00ff88' }}
                        title="Voice Call"
                      >📞</motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onCall(u.id, u.username, 'video'); }}
                        className="text-[10px] px-1.5 py-1 rounded-lg transition-all"
                        style={{ background: 'rgba(179,71,234,0.06)', border: '1px solid rgba(179,71,234,0.15)', color: '#b347ea' }}
                        title="Video Call"
                      >📹</motion.button>
                    </>
                  )}
                  {onConnectP2P && (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); onConnectP2P(u.id); }}
                      className="text-[10px] px-1.5 py-1 rounded-lg transition-all"
                      style={{
                        background: p2pState === 'connected' ? 'rgba(0,255,136,0.1)' : 'rgba(0,240,255,0.06)',
                        border: `1px solid ${p2pState === 'connected' ? 'rgba(0,255,136,0.3)' : 'rgba(0,240,255,0.15)'}`,
                        color: p2pState === 'connected' ? '#00ff88' : '#00f0ff',
                      }}
                      title={p2pState === 'connected' ? 'P2P Connected' : 'Connect P2P'}
                    >
                      {p2pState === 'connected' ? '🟢' : '🔗'}
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.aside>
  </>
);

/* ═══════════════════════════════════════════════════════════
   ANALYTICS PANEL — Protocol stats + network info
   ═══════════════════════════════════════════════════════════ */
const AnalyticsPanel = ({ show, messages, networkStats, onClose }) => {
  const tcpCount = messages.filter(m => m.protocol === 'TCP').length;
  const udpCount = messages.filter(m => m.protocol === 'UDP').length;
  const droppedCount = messages.filter(m => m.dropped).length;
  const deliveredCount = messages.filter(m => m.delivered || m.type === 'message_sent').length;

  const protocolChart = {
    labels: ['TCP', 'UDP'],
    datasets: [{
      data: [tcpCount || 1, udpCount || 1],
      backgroundColor: ['rgba(0,240,255,0.25)', 'rgba(255,45,120,0.25)'],
      borderColor: ['#00f0ff', '#ff2d78'],
      borderWidth: 2,
      hoverOffset: 8,
    }],
  };

  const deliveryChart = {
    labels: ['Delivered', 'Dropped'],
    datasets: [{
      data: [deliveredCount || 1, droppedCount || 0],
      backgroundColor: ['rgba(0,255,136,0.25)', 'rgba(255,45,120,0.25)'],
      borderColor: ['#00ff88', '#ff2d78'],
      borderWidth: 2,
    }],
  };

  const bridgeStats = networkStats?.bridge_stats || {};

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="w-80 h-full border-l border-white/[0.04] flex flex-col overflow-hidden"
          style={{ background: 'rgba(14,14,34,0.95)', backdropFilter: 'blur(20px)' }}
        >
          <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="font-orbitron text-xs text-neon-gradient tracking-wider">NETWORK ANALYTICS</h3>
            <button onClick={onClose} className="text-white/20 hover:text-white/50 text-sm">✕</button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Total Messages */}
            <div className="stat-card">
              <div className="stat-label">Total Messages</div>
              <div className="stat-value text-neon-cyan" style={{ fontSize: '1.5rem' }}>{messages.length}</div>
            </div>

            {/* Protocol Split */}
            <div className="grid grid-cols-2 gap-2">
              <div className="stat-card">
                <div className="stat-label">TCP (Reliable)</div>
                <div className="stat-value text-neon-cyan" style={{ fontSize: '1.2rem' }}>{tcpCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">UDP (Fast)</div>
                <div className="stat-value text-neon-pink" style={{ fontSize: '1.2rem' }}>{udpCount}</div>
              </div>
            </div>

            {/* Delivery Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="stat-card">
                <div className="stat-label">Delivered ✓✓</div>
                <div className="stat-value" style={{ fontSize: '1.2rem', color: '#00ff88' }}>{deliveredCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Dropped ✕</div>
                <div className="stat-value text-neon-pink" style={{ fontSize: '1.2rem' }}>{droppedCount}</div>
              </div>
            </div>

            {/* Protocol Distribution Chart */}
            <div className="glass-card p-4">
              <h4 className="text-[9px] font-orbitron text-white/30 uppercase tracking-widest mb-3">Protocol Distribution</h4>
              <div className="h-40">
                <Doughnut data={protocolChart} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '65%',
                  plugins: { legend: { display: false } }
                }} />
              </div>
              <div className="flex justify-center gap-4 mt-3">
                <span className="flex items-center gap-1 text-[9px] font-mono text-neon-cyan">
                  <span className="w-2 h-2 rounded-full bg-neon-cyan" style={{ boxShadow: '0 0 4px #00f0ff' }} /> TCP
                </span>
                <span className="flex items-center gap-1 text-[9px] font-mono text-neon-pink">
                  <span className="w-2 h-2 rounded-full bg-neon-pink" style={{ boxShadow: '0 0 4px #ff2d78' }} /> UDP
                </span>
              </div>
            </div>

            {/* Network Bridge Stats */}
            {bridgeStats.tcp_messages_sent !== undefined && (
              <div className="glass-card p-4">
                <h4 className="text-[9px] font-orbitron text-white/30 uppercase tracking-widest mb-3">Network Bridge</h4>
                <div className="space-y-2 text-[10px] font-mono text-white/40">
                  <div className="flex justify-between">
                    <span>TCP Delivery Rate</span>
                    <span className="text-neon-cyan">{bridgeStats.tcp_delivery_rate || '100%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UDP Delivery Rate</span>
                    <span className="text-neon-pink">{bridgeStats.udp_delivery_rate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UDP Drop Rate</span>
                    <span style={{ color: '#ff2d78' }}>{bridgeStats.udp_drop_rate || '0%'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TCP Bytes Sent</span>
                    <span className="text-white/50">{bridgeStats.tcp_bytes_sent || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UDP Bytes Sent</span>
                    <span className="text-white/50">{bridgeStats.udp_bytes_sent || 0}</span>
                  </div>
                  {bridgeStats.packet_engine && (
                    <>
                      <div className="flex justify-between">
                        <span>Packets Created</span>
                        <span className="text-white/50">{bridgeStats.packet_engine.packets_created || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Packets Fragmented</span>
                        <span className="text-white/50">{bridgeStats.packet_engine.packets_fragmented || 0}</span>
                      </div>
                    </>
                  )}
                  {bridgeStats.ack_manager && (
                    <>
                      <div className="flex justify-between">
                        <span>ACKs Received</span>
                        <span className="text-neon-cyan">{bridgeStats.ack_manager.acks_received || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retransmissions</span>
                        <span style={{ color: '#ffaa00' }}>{bridgeStats.ack_manager.retransmissions || 0}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Chart */}
            <div className="glass-card p-4">
              <h4 className="text-[9px] font-orbitron text-white/30 uppercase tracking-widest mb-3">Delivery Success</h4>
              <div className="h-32">
                <Doughnut data={deliveryChart} options={{
                  responsive: true, maintainAspectRatio: false, cutout: '70%',
                  plugins: { legend: { display: false } }
                }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ═══════════════════════════════════════════════════════════
   PROTOCOL TOGGLE — Switch between TCP, UDP, and AUTO
   ═══════════════════════════════════════════════════════════ */
const PROTOCOL_INFO = {
  TCP: { color: '#00f0ff', bg: 'rgba(0,240,255,0.08)', border: 'rgba(0,240,255,0.2)', label: 'Reliable', emoji: '🔵' },
  UDP: { color: '#ff2d78', bg: 'rgba(255,45,120,0.08)', border: 'rgba(255,45,120,0.2)', label: 'Fast', emoji: '🟣' },
  AUTO: { color: '#b347ea', bg: 'rgba(179,71,234,0.08)', border: 'rgba(179,71,234,0.2)', label: 'AI Smart', emoji: '🧠' },
};

const ProtocolToggle = ({ protocol, onToggle }) => {
  const info = PROTOCOL_INFO[protocol] || PROTOCOL_INFO.TCP;
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl select-none"
      style={{ background: info.bg, border: `1px solid ${info.border}` }}
    >
      <span className="text-xs">{info.emoji}</span>
      <span className="text-[10px] font-orbitron font-bold" style={{ color: info.color }}>
        {protocol}
      </span>
      <span className="text-[8px] font-mono text-white/20">
        ({info.label})
      </span>
    </motion.button>
  );
};

/* ═══════════════════════════════════════════════════════════
   CONNECTION STATUS BANNER
   ═══════════════════════════════════════════════════════════ */
const ConnectionBanner = ({ status, reconnectIn }) => {
  if (status === 'connected') return null;
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="px-4 py-2 text-center text-xs font-mono"
      style={{
        background: status === 'reconnecting'
          ? 'rgba(255,170,0,0.1)'
          : 'rgba(255,45,120,0.1)',
        borderBottom: `1px solid ${status === 'reconnecting'
          ? 'rgba(255,170,0,0.2)'
          : 'rgba(255,45,120,0.2)'}`,
        color: status === 'reconnecting' ? '#ffaa00' : '#ff2d78',
      }}
    >
      {status === 'reconnecting'
        ? `⏳ Reconnecting in ${reconnectIn}s...`
        : '⚠ Disconnected from server'}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CHAT DASHBOARD — WhatsApp-style layout with full integration
   + AI Engine + WebRTC P2P + Adaptive Protocol Routing
   ═══════════════════════════════════════════════════════════ */
const ChatDashboard = () => {
  const { user, token, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [protocol, setProtocol] = useState('TCP');
  const [imageFile, setImageFile] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reconnectIn, setReconnectIn] = useState(0);
  const [networkStats, setNetworkStats] = useState({});
  const [networkInfoMap, setNetworkInfoMap] = useState({});
  // AI Features
  const [smartReplies, setSmartReplies] = useState([]);
  const [toxicityWarning, setToxicityWarning] = useState(null);
  const [studyMode, setStudyMode] = useState(false);
  const [studyResponse, setStudyResponse] = useState(null);
  const [chatSummary, setChatSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  // WebRTC P2P
  const [p2pConnections, setP2pConnections] = useState({});
  const [p2pMessages, setP2pMessages] = useState([]);
  const peerConnections = useRef({});
  const dataChannels = useRef({});
  // DM & Call & AI Chat
  const [dmTarget, setDmTarget] = useState(null); // user object for DM panel
  const [callState, setCallState] = useState(null); // { status, username, user_id, type, offer }
  const [showAIChat, setShowAIChat] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const callPC = useRef(null); // WebRTC peer connection for calls
  const callStream = useRef(null); // local media stream

  const ws = useRef(null);
  const chatEnd = useRef(null);
  const fileInput = useRef(null);
  const typingTimer = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempt = useRef(0);
  const maxReconnectAttempts = 10;

  const cycleProtocol = () => setProtocol(p => p === 'TCP' ? 'UDP' : p === 'UDP' ? 'AUTO' : 'TCP');

  // Chat feature states
  const [reactions, setReactions] = useState({}); // { msgId: { emoji: count } }
  const [replyingTo, setReplyingTo] = useState(null); // message being replied to
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleReact = (msgId, emoji) => {
    setReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      msgReactions[emoji] = (msgReactions[emoji] || 0) + 1;
      return { ...prev, [msgId]: msgReactions };
    });
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages from your view? (Server messages remain)')) {
      setMessages([]);
      setReactions({});
    }
  };

  const filteredMessages = showSearch && searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()) || m.sender_username?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // ── Load messages + users on mount ──────────────────
  useEffect(() => {
    requestNotificationPermission();
    fetch(`${API}/api/messages?room=global&limit=100`)
      .then(r => r.json()).then(setMessages).catch(() => {});
    fetch(`${API}/api/users`)
      .then(r => r.json()).then(setAllUsers).catch(() => {});
  }, []);

  // ── WebSocket connection with reconnection logic ────
  const connectWebSocket = useCallback(() => {
    if (!token) return;

    const socket = new WebSocket(`${WS_URL}/ws/${token}`);

    socket.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttempt.current = 0;
      console.log('[WS] ⚡ Connected to SmartChat X');

      // Request network stats periodically
      const statsInterval = setInterval(() => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'get_network_stats' }));
        }
      }, 10000);
      socket._statsInterval = statsInterval;
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        switch (data.type) {
          case 'new_message':
            setMessages(prev => [...prev, data]);
            if (data.sender_id !== user?.id) {
              playMessageSound();
              showNotification(`💬 ${data.sender_username}`, data.content?.slice(0, 80) || 'New message');
            }
            break;

          case 'message_sent':
            setMessages(prev => [...prev, data]);
            playSentSound();
            if (data.smart_replies?.length) setSmartReplies(data.smart_replies);
            break;

          case 'message_delivered':
            setMessages(prev => prev.map(m =>
              m.id === data.message_id ? { ...m, delivered: 1 } : m
            ));
            break;

          case 'message_dropped':
            setMessages(prev => prev.map(m =>
              m.id === data.message_id ? { ...m, dropped: 1 } : m
            ));
            break;

          case 'network_processed':
            setNetworkInfoMap(prev => ({
              ...prev,
              [data.message_id]: data.network_result,
            }));
            break;

          case 'network_stats':
            setNetworkStats(data);
            break;

          case 'user_online':
          case 'user_offline':
            setOnlineUsers(data.online_users || []);
            fetch(`${API}/api/users`).then(r => r.json()).then(setAllUsers).catch(() => {});
            break;

          case 'user_typing':
            setTypingUsers(prev => [...new Set([...prev, data.username])]);
            break;

          case 'user_stop_typing':
            setTypingUsers(prev => prev.filter(u => u !== data.username));
            break;

          // ── AI Features ──────────────────────────
          case 'toxicity_warning':
            setToxicityWarning(data);
            setTimeout(() => setToxicityWarning(null), 5000);
            break;

          case 'smart_replies':
            setSmartReplies(data.replies || []);
            break;

          case 'study_response':
            setStudyResponse(data);
            break;

          case 'summary_response':
            setChatSummary(data);
            setShowSummary(true);
            break;

          case 'translate_response':
            alert(`🌍 Translation (${data.language}):\n\n"${data.original}"\n→ "${data.translated}"`);
            break;

          // ── WebRTC P2P Signaling ─────────────────
          case 'webrtc_offer':
            handleWebRTCOffer(data);
            break;

          case 'webrtc_answer':
            handleWebRTCAnswer(data);
            break;

          case 'webrtc_ice':
            handleWebRTCICE(data);
            break;

          case 'webrtc_disconnect':
            handleWebRTCDisconnect(data);
            break;

          // ── Call Signaling ───────────────────────
          case 'incoming_call':
            startRingtone();
            showNotification(`📞 ${data.from_username}`, `${data.call_type === 'video' ? 'Video' : 'Voice'} call`);
            setCallState({
              status: 'incoming',
              username: data.from_username,
              user_id: data.from_user_id,
              type: data.call_type || 'voice',
              offer: data.offer,
            });
            break;

          case 'call_accepted':
            stopRingtone();
            if (callPC.current && data.answer) {
              callPC.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
            playCallConnected();
            setCallState(prev => prev ? { ...prev, status: 'active' } : null);
            break;

          case 'call_rejected':
            stopRingtone();
            playCallEnded();
            cleanupCall();
            break;

          case 'call_ended':
            stopRingtone();
            playCallEnded();
            cleanupCall();
            break;

          case 'call_ice':
            if (callPC.current && data.candidate) {
              callPC.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;

          // ── Private DM (handled by DMPanel) ──────
          case 'private_message':
            playDMSound();
            if (data.sender_username) {
              showNotification(`🔒 DM from ${data.sender_username}`, data.content?.slice(0, 80) || 'Private message');
            }
            // Falls through to DMPanel listener
            break;
          case 'dm_sent':
          case 'dm_history':
            // These are handled by DMPanel's own listener
            break;

          // ── AI Chat (handled by AIChatPanel) ─────
          case 'ai_chat_response':
            break;
        }
      } catch {}
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
      console.log('[WS] 👋 Disconnected');
      clearInterval(socket._statsInterval);

      // Auto-reconnect with exponential backoff
      if (reconnectAttempt.current < maxReconnectAttempts) {
        const delay = Math.min(2 ** reconnectAttempt.current * 1000, 30000);
        const delaySec = Math.ceil(delay / 1000);
        setConnectionStatus('reconnecting');
        setReconnectIn(delaySec);

        // Countdown timer
        let countdown = delaySec;
        const countdownInterval = setInterval(() => {
          countdown--;
          setReconnectIn(countdown);
          if (countdown <= 0) clearInterval(countdownInterval);
        }, 1000);

        reconnectTimer.current = setTimeout(() => {
          reconnectAttempt.current++;
          console.log(`[WS] 🔄 Reconnect attempt ${reconnectAttempt.current}...`);
          connectWebSocket();
        }, delay);
      }
    };

    socket.onerror = () => {
      console.log('[WS] ❌ Connection error');
    };

    ws.current = socket;
  }, [token]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
      // Cleanup WebRTC
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [connectWebSocket]);

  // ── WebRTC P2P Handlers ─────────────────────────────
  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = (e) => {
      if (e.candidate && ws.current?.readyState === 1) {
        ws.current.send(JSON.stringify({ type: 'webrtc_ice', target_user_id: targetUserId, candidate: e.candidate }));
      }
    };
    pc.onconnectionstatechange = () => {
      setP2pConnections(prev => ({ ...prev, [targetUserId]: pc.connectionState }));
    };
    peerConnections.current[targetUserId] = pc;
    return pc;
  };

  const connectP2P = async (targetUserId) => {
    const pc = createPeerConnection(targetUserId);
    const dc = pc.createDataChannel('chat');
    dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setMessages(prev => [...prev, { ...msg, protocol: 'WebRTC', type: 'new_message' }]);
      } catch {}
    };
    dc.onopen = () => setP2pConnections(prev => ({ ...prev, [targetUserId]: 'connected' }));
    dataChannels.current[targetUserId] = dc;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.current?.send(JSON.stringify({ type: 'webrtc_offer', target_user_id: targetUserId, offer }));
  };

  const handleWebRTCOffer = async (data) => {
    const pc = createPeerConnection(data.from_user_id);
    pc.ondatachannel = (e) => {
      const dc = e.channel;
      dc.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          setMessages(prev => [...prev, { ...msg, protocol: 'WebRTC', type: 'new_message' }]);
        } catch {}
      };
      dc.onopen = () => setP2pConnections(prev => ({ ...prev, [data.from_user_id]: 'connected' }));
      dataChannels.current[data.from_user_id] = dc;
    };
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.current?.send(JSON.stringify({ type: 'webrtc_answer', target_user_id: data.from_user_id, answer }));
  };

  const handleWebRTCAnswer = async (data) => {
    const pc = peerConnections.current[data.from_user_id];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  };

  const handleWebRTCICE = async (data) => {
    const pc = peerConnections.current[data.from_user_id];
    if (pc && data.candidate) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
  };

  const handleWebRTCDisconnect = (data) => {
    const pc = peerConnections.current[data.from_user_id];
    if (pc) { pc.close(); delete peerConnections.current[data.from_user_id]; }
    delete dataChannels.current[data.from_user_id];
    setP2pConnections(prev => { const n = {...prev}; delete n[data.from_user_id]; return n; });
  };

  const sendP2PMessage = (targetUserId, content) => {
    const dc = dataChannels.current[targetUserId];
    if (dc?.readyState === 'open') {
      const msg = { id: Date.now(), sender_id: user?.id, sender_username: user?.username, content, created_at: new Date().toISOString() };
      dc.send(JSON.stringify(msg));
      setMessages(prev => [...prev, { ...msg, protocol: 'WebRTC', type: 'message_sent' }]);
    }
  };

  // ── Call Management ─────────────────────────────────
  const initiateCall = async (targetUserId, targetUsername, callType = 'voice') => {
    try {
      const constraints = callType === 'video'
        ? { audio: true, video: { width: 640, height: 480 } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      callStream.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });

      // Add local tracks
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // ★ KEY: Handle remote tracks (this is what makes audio/video work!)
      const remote = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => remote.addTrack(track));
        setRemoteStream(remote);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && ws.current?.readyState === 1) {
          ws.current.send(JSON.stringify({ type: 'call_ice', target_user_id: targetUserId, candidate: e.candidate }));
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          playCallConnected();
          setCallState(prev => prev ? { ...prev, status: 'active' } : null);
        }
      };

      callPC.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.current?.send(JSON.stringify({
        type: 'call_offer',
        target_user_id: targetUserId,
        call_type: callType,
        offer,
      }));

      setCallState({ status: 'ringing', username: targetUsername, user_id: targetUserId, type: callType });
    } catch (err) {
      console.error('Call initiation failed:', err);
      playErrorSound();
      const isSecure = window.isSecureContext;
      alert(
        isSecure
          ? `❌ Call failed: ${err.message}\n\nPlease allow microphone${callType === 'video' ? '/camera' : ''} access.`
          : `❌ Microphone blocked!\n\nYour browser requires HTTPS for microphone access.\n\nFix: Open chrome://flags → "Insecure origins treated as secure" → Add "${window.location.origin}" → Enable → Relaunch`
      );
    }
  };

  const acceptCall = async () => {
    if (!callState?.offer) return;
    stopRingtone();
    try {
      const constraints = callState.type === 'video'
        ? { audio: true, video: { width: 640, height: 480 } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      callStream.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      });

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // ★ KEY: Handle remote tracks
      const remote = new MediaStream();
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => remote.addTrack(track));
        setRemoteStream(remote);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && ws.current?.readyState === 1) {
          ws.current.send(JSON.stringify({ type: 'call_ice', target_user_id: callState.user_id, candidate: e.candidate }));
        }
      };

      callPC.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(callState.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      ws.current?.send(JSON.stringify({
        type: 'call_answer',
        target_user_id: callState.user_id,
        answer,
      }));

      playCallConnected();
      setCallState(prev => prev ? { ...prev, status: 'active' } : null);
    } catch (err) {
      console.error('Call accept failed:', err);
      playErrorSound();
      const isSecure = window.isSecureContext;
      alert(
        isSecure
          ? `❌ Call failed: ${err.message}\n\nPlease allow microphone access.`
          : `❌ Microphone blocked!\n\nFix: Open chrome://flags → "Insecure origins treated as secure" → Add "${window.location.origin}" → Enable → Relaunch`
      );
      cleanupCall();
    }
  };

  const cleanupCall = () => {
    stopRingtone();
    if (callStream.current) {
      callStream.current.getTracks().forEach(t => t.stop());
      callStream.current = null;
    }
    if (callPC.current) {
      callPC.current.close();
      callPC.current = null;
    }
    setCallState(null);
    setRemoteStream(null);
  };

  const endCall = () => {
    if (callState?.user_id && ws.current?.readyState === 1) {
      ws.current.send(JSON.stringify({ type: 'call_end', target_user_id: callState.user_id }));
    }
    playCallEnded();
    cleanupCall();
  };

  const rejectCall = () => {
    stopRingtone();
    if (callState?.user_id && ws.current?.readyState === 1) {
      ws.current.send(JSON.stringify({ type: 'call_reject', target_user_id: callState.user_id }));
    }
    playCallEnded();
    cleanupCall();
  };

  // ── Auto scroll ─────────────────────────────────────
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // ── Send message (through the full pipeline) ────────
  const sendMessage = async () => {
    if (!input.trim() && !imageFile) return;
    if (!ws.current || ws.current.readyState !== 1) return;

    const trimmed = input.trim();

    // ── Study Mode Commands ──────────────────────
    if (trimmed.startsWith('/study ') || trimmed.startsWith('/quiz')) {
      const query = trimmed.startsWith('/study ') ? trimmed.slice(7) : trimmed;
      ws.current.send(JSON.stringify({ type: 'study_query', query }));
      setStudyMode(true);
      setInput('');
      return;
    }
    if (trimmed === '/summarize') {
      ws.current.send(JSON.stringify({ type: 'summarize', room: 'global', limit: 50 }));
      setInput('');
      return;
    }
    if (trimmed.startsWith('/ai ')) {
      ws.current.send(JSON.stringify({ type: 'ai_chat', content: trimmed.slice(4) }));
      setShowAIChat(true);
      setInput('');
      return;
    }
    if (trimmed.startsWith('/translate ')) {
      const parts = trimmed.slice(11).split(' to ');
      if (parts.length === 2) {
        ws.current.send(JSON.stringify({ type: 'translate', text: parts[0].trim(), language: parts[1].trim() }));
      }
      setInput('');
      return;
    }
    if (trimmed === '/clear') {
      clearChat();
      setInput('');
      return;
    }

    let imageUrl = null;

    // Upload image if present
    if (imageFile) {
      const form = new FormData();
      form.append('file', imageFile);
      try {
        const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
        const data = await res.json();
        imageUrl = data.url;
      } catch {
        console.error('Image upload failed');
      }
    }

    // Send via WebSocket → Backend → NetworkBridge → TCP/UDP Server
    const msgPayload = {
      type: 'message',
      content: trimmed,
      image_url: imageUrl,
      protocol,
      room: 'global',
    };
    if (replyingTo) {
      msgPayload.reply_to = {
        id: replyingTo.id,
        sender_username: replyingTo.sender_username,
        content: replyingTo.content?.slice(0, 100),
      };
    }
    ws.current.send(JSON.stringify(msgPayload));

    setInput('');
    setImageFile(null);
    setSmartReplies([]);
    setReplyingTo(null);

    // Stop typing indicator
    ws.current.send(JSON.stringify({ type: 'stop_typing' }));
  };

  // ── Handle typing indicator ─────────────────────────
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (ws.current?.readyState === 1) {
      ws.current.send(JSON.stringify({ type: 'typing' }));
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        ws.current?.send(JSON.stringify({ type: 'stop_typing' }));
      }, 2000);
    }
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="h-screen flex relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      <CyberBg />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

      {/* Sidebar */}
      <Sidebar
        users={allUsers}
        onlineIds={onlineUsers}
        currentUser={user}
        show={showSidebar}
        onClose={() => setShowSidebar(false)}
        onConnectP2P={connectP2P}
        p2pConnections={p2pConnections}
        onDMClick={setDmTarget}
        onCall={initiateCall}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Connection Banner */}
        <AnimatePresence>
          <ConnectionBanner status={connectionStatus} reconnectIn={reconnectIn} />
        </AnimatePresence>

        {/* Header */}
        <header className="border-b border-white/[0.04] px-4 py-3 flex items-center justify-between"
          style={{ background: 'rgba(10,10,26,0.9)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="lg:hidden text-white/30 hover:text-white/60 text-lg mr-1">☰</button>

            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="text-xl">⚡</motion.div>
            <div>
              <h1 className="font-orbitron text-sm font-bold text-neon-gradient tracking-wider">SMARTCHAT X</h1>
              <p className="text-[8px] font-mono text-white/15 uppercase tracking-[0.2em]">
                Global Channel • {onlineUsers.length} Online • TCP:{9000} UDP:{9001}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProtocolToggle protocol={protocol} onToggle={cycleProtocol} />

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setStudyMode(!studyMode); setStudyResponse(null); }}
              className={`text-lg transition-colors ${studyMode ? 'text-neon-green' : 'text-white/25 hover:text-neon-green'}`}
              title="Study Mode (type /study or /quiz)"
            >📚</motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => ws.current?.send(JSON.stringify({ type: 'summarize', room: 'global', limit: 50 }))}
              className="text-white/25 hover:text-neon-cyan text-lg transition-colors"
              title="Summarize Chat"
            >📝</motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAIChat(!showAIChat)}
              className={`text-lg transition-colors ${showAIChat ? 'text-purple-400' : 'text-white/25 hover:text-purple-400'}`}
              title="AI Chat (Groq)"
            >🤖</motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}
              className={`text-lg transition-colors ${showSearch ? 'text-neon-cyan' : 'text-white/25 hover:text-neon-cyan'}`}
              title="Search Messages"
            >🔍</motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={clearChat}
              className="text-white/25 hover:text-neon-pink text-lg transition-colors"
              title="Clear Chat"
            >🗑️</motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="text-white/25 hover:text-neon-cyan text-lg transition-colors"
              title="Network Analytics"
            >📊</motion.button>

            {Object.values(p2pConnections).some(s => s === 'connected') && (
              <span className="p2p-indicator">🟢 P2P Active</span>
            )}

            {/* Connection status */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-neon-green animate-pulse'
                : connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
              }`}
                style={{ boxShadow: isConnected ? '0 0 8px rgba(0,255,136,0.5)' : 'none' }} />
              <span className="text-[9px] font-mono text-white/20 hidden sm:inline">
                {isConnected ? 'LIVE' : connectionStatus === 'reconnecting' ? 'RECONNECTING' : 'OFFLINE'}
              </span>
            </div>

            {/* User + Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.06]">
              <span className="text-lg">{user?.avatar || '👤'}</span>
              <span className="text-[10px] font-mono text-white/30 hidden sm:inline">{user?.username}</span>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={logout}
                className="text-white/15 hover:text-neon-pink text-xs transition-colors ml-1"
                title="Logout"
              >⏻</motion.button>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 border-b border-white/[0.04]"
              style={{ background: 'rgba(0,240,255,0.02)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-white/20 text-sm">🔍</span>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search messages or users..."
                  autoFocus
                  className="flex-1 bg-transparent text-xs text-white/60 font-poppins outline-none placeholder-white/20"
                />
                {searchQuery && (
                  <span className="text-[9px] font-mono text-neon-cyan">
                    {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}
                  </span>
                )}
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="text-white/20 hover:text-white/50 text-xs">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollBehavior: 'smooth' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-6"
          >
            <span className="inline-block px-4 py-1.5 rounded-xl text-[9px] font-mono text-white/20"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              🔒 AI-Powered • TCP/UDP/WebRTC • Smart Routing • /study /quiz /summarize
            </span>
          </motion.div>

          <AnimatePresence>
            {filteredMessages.map((msg, idx) => (
              <ChatBubble
                key={msg.id || idx}
                msg={msg}
                isOwn={msg.sender_id === user?.id}
                networkInfo={networkInfoMap[msg.id]}
                reactions={reactions}
                onReact={handleReact}
                onReply={setReplyingTo}
              />
            ))}
          </AnimatePresence>

          {/* Study Mode Response */}
          <AnimatePresence>
            {studyMode && studyResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="study-panel mx-4 mb-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-orbitron text-neon-green tracking-wider">🧠 STUDY MODE</span>
                  <button onClick={() => { setStudyMode(false); setStudyResponse(null); }} className="text-white/20 hover:text-white/50 text-sm">✕</button>
                </div>
                <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{studyResponse.response}</p>
                {studyResponse.tip && (
                  <p className="text-[10px] text-white/30 mt-2 italic">{studyResponse.tip}</p>
                )}
                {studyResponse.related_topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {studyResponse.related_topics.map(t => (
                      <span key={t} className="smart-reply-chip text-[9px]" style={{ color: '#00ff88', borderColor: 'rgba(0,255,136,0.2)' }}
                        onClick={() => { setInput(`/study ${t}`); }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {studyResponse.type === 'quiz' && studyResponse.answer && (
                  <details className="mt-2">
                    <summary className="text-[10px] font-mono text-neon-cyan cursor-pointer">Show Answer</summary>
                    <p className="text-xs text-white/60 mt-1">{studyResponse.answer}</p>
                  </details>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Summary Modal */}
          <AnimatePresence>
            {showSummary && chatSummary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card mx-4 mb-3 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-orbitron text-neon-cyan tracking-wider">📝 CHAT SUMMARY</span>
                  <button onClick={() => setShowSummary(false)} className="text-white/20 hover:text-white/50 text-sm">✕</button>
                </div>
                <p className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">{chatSummary.summary}</p>
                {chatSummary.key_topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {chatSummary.key_topics.map(t => (
                      <span key={t} className="badge-tcp text-[8px]">{t}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toxicity Warning */}
          <AnimatePresence>
            {toxicityWarning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="toxicity-warn mx-4 mb-2"
              >
                ⚠️ {toxicityWarning.message} (severity: {toxicityWarning.severity}, score: {toxicityWarning.score})
              </motion.div>
            )}
          </AnimatePresence>

          <TypingIndicator users={typingUsers.filter(u => u !== user?.username)} />
          <div ref={chatEnd} />
        </div>

        {/* Smart Reply Chips */}
        <AnimatePresence>
          {smartReplies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-white/[0.03]"
              style={{ background: 'rgba(10,10,26,0.7)' }}
            >
              <span className="text-[9px] font-mono text-white/20 self-center whitespace-nowrap">💡 Quick:</span>
              {smartReplies.map((reply, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="smart-reply-chip"
                  onClick={() => { setInput(reply); setSmartReplies([]); }}
                >
                  {reply}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Preview */}
        {imageFile && <ImagePreview file={imageFile} onRemove={() => setImageFile(null)} />}

        {/* Reply Indicator */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 border-t border-white/[0.04]"
              style={{ background: 'rgba(0,240,255,0.02)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-neon-cyan text-sm">↩</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono text-neon-cyan/70">Replying to <b>{replyingTo.sender_username}</b></p>
                    <p className="text-[10px] text-white/25 truncate">{replyingTo.content?.slice(0, 80)}</p>
                  </div>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-white/20 hover:text-white/50 text-xs ml-2">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Bar */}
        <div className="border-t border-white/[0.04] px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(10,10,26,0.9)', backdropFilter: 'blur(20px)' }}
        >
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => fileInput.current?.click()}
            className="text-white/20 hover:text-neon-cyan text-lg transition-colors"
            title="Upload Image"
          >📎</motion.button>
          <input
            type="file"
            ref={fileInput}
            onChange={e => setImageFile(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />

          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder={protocol === 'AUTO' ? 'AI picks best protocol...' : `Message via ${protocol}${protocol === 'TCP' ? ' (reliable)' : ' (fast, may drop)'}...`}
            className="neon-input flex-1"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            className="btn-neon px-5 py-2.5"
            disabled={!isConnected}
            style={{ opacity: isConnected ? 1 : 0.4 }}
          >
            ⚡ Send
          </motion.button>
        </div>
      </div>

      {/* Analytics Panel */}
      <AnalyticsPanel
        show={showAnalytics}
        messages={messages}
        networkStats={networkStats}
        onClose={() => setShowAnalytics(false)}
      />

      {/* DM Panel (Private Messaging) */}
      <AnimatePresence>
        {dmTarget && (
          <DMPanel
            targetUser={dmTarget}
            currentUser={user}
            ws={ws.current}
            onClose={() => setDmTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* AI Chat Panel */}
      <AnimatePresence>
        {showAIChat && (
          <AIChatPanel
            ws={ws.current}
            onClose={() => setShowAIChat(false)}
          />
        )}
      </AnimatePresence>

      {/* Call Modal */}
      {callState && (
        <CallModal
          callState={callState}
          localStream={callStream.current}
          remoteStream={remoteStream}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   APP — Main entry point with screen routing
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <WelcomeScreen key="welcome" onStart={() => setShowWelcome(false)} />
        ) : (
          <AppContent key="app" />
        )}
      </AnimatePresence>
    </AuthProvider>
  );
}

function AppContent() {
  const { isLoggedIn } = useAuth();
  return (
    <AnimatePresence mode="wait">
      {isLoggedIn ? (
        <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ChatDashboard />
        </motion.div>
      ) : (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AuthScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
