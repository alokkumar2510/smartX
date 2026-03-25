/**
 * ─── ChatWindow.jsx ────────────────────────────────────
 * Scrollable container that renders all chat messages.
 * Auto-scrolls to the latest message on update.
 */
import { useEffect, useRef } from 'react';
import ChatBubble from './ChatBubble';

const ChatWindow = ({ messages, currentUser }) => {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      id="chat-window"
      className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-thin"
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-white/20">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm">No messages yet. Start a conversation!</p>
        </div>
      ) : (
        messages.map((msg, index) => (
          <ChatBubble
            key={msg.id || index}
            message={msg}
            isOwn={msg.sender === currentUser}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatWindow;
