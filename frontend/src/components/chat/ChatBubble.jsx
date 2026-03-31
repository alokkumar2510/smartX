import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '../../services/api';
import PacketInfo from './PacketInfo';

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
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(255,255,255,0.03)',
            border: isOwn
              ? '1px solid rgba(255,255,255,0.16)'
              : '1px solid rgba(255,255,255,0.07)',
            boxShadow: isOwn
              ? '0 4px 20px rgba(0,0,0,0.3)'
              : '0 2px 10px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {!isOwn && (
            <p className="text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '-0.01em' }}>
              {msg.sender_username}
            </p>
          )}

          {msg.reply_to && (
            <div className="mb-1.5 pl-2 border-l-2 py-0.5"
              style={{ borderColor: 'rgba(255,255,255,0.20)', background: 'rgba(255,255,255,0.03)', borderRadius: '0 8px 8px 0' }}>
              <p className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{msg.reply_to.sender_username}</p>
              <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>{msg.reply_to.content?.slice(0, 60)}</p>
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
            <p className="text-sm leading-relaxed" style={{ color: isOwn ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)' }}>
              {msg.content}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 mt-1.5">
            <span className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
              msg.protocol === 'UDP'
                ? 'badge-udp'
                : msg.protocol === 'WebRTC'
                ? 'badge-webrtc'
                : 'badge-tcp'
            }`}>
              {msg.protocol || 'TCP'}
            </span>
            <span className="text-[9px] font-mono text-white/15">
              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            {isOwn && (
              <span className="text-[10px]" style={{
                color: msg._queued ? '#fbbf24'
                     : msg.dropped ? '#f87171'
                     : delivered   ? '#34d399'
                     : 'rgba(255,255,255,0.25)'
              }} title={msg._queued ? 'Queued — will send when reconnected' : undefined}>
                {msg._queued ? '⏳' : msg.dropped ? '✕' : delivered ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

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

        <AnimatePresence>
          {showPacketInfo && isOwn && networkInfo && (
            <PacketInfo info={networkInfo} protocol={msg.protocol} />
          )}
        </AnimatePresence>

        {msg.dropped ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[9px] font-mono mt-1 px-2 flex items-center gap-1"
            style={{ color: '#f87171' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f87171', boxShadow: '0 0 4px #f87171' }} />
            Packet dropped (UDP) — No ACK received
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default ChatBubble;
