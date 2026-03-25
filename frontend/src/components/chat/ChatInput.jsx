/**
 * ─── ChatInput.jsx ─────────────────────────────────────
 * Message input field with send button.
 * Supports Enter to send and shows character count.
 */
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiPaperAirplane } from 'react-icons/hi2';

const ChatInput = ({ onSend, disabled = false }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 glass-strong rounded-2xl">
      <input
        ref={inputRef}
        id="chat-message-input"
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        maxLength={1000}
        className="input-field flex-1"
        autoComplete="off"
      />

      {/* Character Count */}
      <span className="text-xs text-white/20 min-w-[3rem] text-right">
        {message.length}/1000
      </span>

      {/* Send Button */}
      <motion.button
        id="chat-send-button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className={`
          p-3 rounded-xl transition-all duration-300
          ${message.trim()
            ? 'bg-gradient-to-r from-primary-500 to-neon-purple text-white shadow-neon-blue'
            : 'bg-white/5 text-white/30 cursor-not-allowed'
          }
        `}
      >
        <HiPaperAirplane className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

export default ChatInput;
