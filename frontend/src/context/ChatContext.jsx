/**
 * ─── ChatContext.jsx ───────────────────────────────────
 * Provides chat state (messages, typing) to all children.
 */
import { createContext, useContext } from 'react';
import useChat from '@/hooks/useChat';
import { useSocket } from './SocketContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { sendMessage: sendWs } = useSocket();
  const chat = useChat(sendWs);

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatContext must be used within ChatProvider');
  return context;
};

export default ChatContext;
