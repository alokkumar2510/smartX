/**
 * ─── useChat.js ────────────────────────────────────────
 * Custom hook managing chat state: messages, typing,
 * and message sending integration.
 */
import { useState, useCallback } from 'react';

const useChat = (sendWsMessage) => {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, { ...message, id: Date.now() + Math.random() }]);
  }, []);

  const sendMessage = useCallback((content, protocol = 'TCP') => {
    const message = {
      type: 'chat_message',
      content,
      protocol,
      timestamp: new Date().toISOString(),
    };
    sendWsMessage?.(message);
    return message;
  }, [sendWsMessage]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    typingUsers,
    addMessage,
    sendMessage,
    clearMessages,
    setTypingUsers,
  };
};

export default useChat;
