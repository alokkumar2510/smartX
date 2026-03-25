/**
 * ─── ChatBubble.jsx ────────────────────────────────────
 * Renders a single chat message bubble.
 * Shows sender name, message content, timestamp, and
 * protocol badge (TCP/UDP/Hybrid).
 */
import { motion } from 'framer-motion';
import ProtocolBadge from './ProtocolBadge';

const ChatBubble = ({ message, isOwn = false }) => {
  const { sender, content, timestamp, protocol, encrypted } = message;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`
          max-w-[75%] px-4 py-3 rounded-2xl relative
          ${isOwn
            ? 'bg-gradient-to-br from-primary-500/20 to-neon-purple/10 border border-primary-500/20'
            : 'glass border border-white/10'
          }
        `}
      >
        {/* Sender Name */}
        {!isOwn && (
          <p className="text-xs font-semibold text-neon-blue mb-1">
            {sender}
          </p>
        )}

        {/* Message Content */}
        <p className="text-sm text-white/90 leading-relaxed break-words">
          {content}
        </p>

        {/* Footer: Timestamp + Protocol + Encryption */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-white/30">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <ProtocolBadge protocol={protocol} />
          {encrypted && (
            <span className="text-[10px] text-neon-green">🔒</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
