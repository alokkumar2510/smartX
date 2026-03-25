/**
 * ─── ChatPage.jsx ──────────────────────────────────────
 * Main chat interface page.
 * Integrates ChatWindow, ChatInput, and TypingIndicator.
 */
import { useState } from 'react';
import PageTransition from '@/animations/PageTransition';
import ChatWindow from '@/components/chat/ChatWindow';
import ChatInput from '@/components/chat/ChatInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import Card from '@/components/ui/Card';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const currentUser = 'You'; // Would come from UserContext

  const handleSend = (content) => {
    const newMsg = {
      id: Date.now(),
      sender: currentUser,
      content,
      timestamp: new Date().toISOString(),
      protocol: 'TCP',
      encrypted: true,
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  return (
    <PageTransition>
      <div className="h-[calc(100vh-12rem)] flex flex-col">
        <h1 className="heading-section text-2xl gradient-text mb-4">
          💬 Chat Room
        </h1>
        <Card padding="p-0" className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow messages={messages} currentUser={currentUser} />
          <div className="border-t border-white/5">
            <TypingIndicator typingUsers={[]} />
            <div className="p-3">
              <ChatInput onSend={handleSend} />
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ChatPage;
