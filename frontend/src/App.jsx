/**
 * SmartChat X — Main Application Shell
 * Private contacts-first dashboard. No global chat room.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';

// Services & Context
import { API, WS_URL } from './services/api';
import { useAuth, AuthProvider } from './context/AuthContext';
import { useNetwork, NetworkProvider } from './context/NetworkContext';
import { usePrivacy } from './hooks/usePrivacy';
import { useOfflineQueue } from './hooks/useOfflineQueue';
import { useMediasoup } from './hooks/useMediasoup';
import { supabase } from './lib/supabase';
import { requestBackgroundSync } from './lib/serviceWorkerRegistration';

// Components
import CyberBg from './components/CyberBg';
import WelcomeScreen from './components/WelcomeScreen';
import AuthScreen, { ResetPasswordPage, EmailVerificationBanner } from './components/AuthScreen';
import NetworkBanner from './components/NetworkBanner';
import Sidebar from './components/Sidebar';
import AnalyticsPanel from './components/AnalyticsPanel';
import UserProfileModal from './components/UserProfileModal';
import CallHistoryPanel from './components/CallHistoryPanel';
import IncomingCallPopup from './components/call/IncomingCallPopup';
import CallUI from './components/call/CallUI';
import VoiceRecorder, { VoicePlayer } from './components/VoiceRecorder';
import FileUpload, { FileMessage } from './components/FileShare';

// DM & AI panels (drawer versions kept for AI chat)
import { AIChatPanel } from './DMPanel';

import {
  playDMSound, startRingtone, stopRingtone,
  playCallConnected, playCallEnded,
  showNotification, requestNotificationPermission,
} from './sounds';

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler,
);

/* ═══════════════════════════════════════════════════════════
   DM PANEL BODY — Messages + Input (inline, no fixed/drawer)
   ═══════════════════════════════════════════════════════════ */
// Emoji shortcuts for DMPanelBody reaction picker
const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👏'];

const DMPanelBody = ({ targetUser, currentUser, connections, blocks, ws }) => {
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [replyTo, setReplyTo]       = useState(null);
  const [hasMore, setHasMore]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isTyping, setIsTyping]     = useState(false);
  const chatEnd       = useRef(null);
  const chatContainer = useRef(null);
  const typingTimeout = useRef(null);
  const sentTyping    = useRef(false);

  const isBlocked = blocks?.some(b =>
    (b.blocker_id === currentUser?.id && b.blocked_id === targetUser?.id) ||
    (b.blocked_id === currentUser?.id && b.blocker_id === targetUser?.id)
  );
  const amIBlocker = blocks?.some(b =>
    b.blocker_id === currentUser?.id && b.blocked_id === targetUser?.id
  );
  const canMessage = !isBlocked && connections?.some(c =>
    c.status === 'accepted' &&
    (c.sender_id === targetUser?.id || c.receiver_id === targetUser?.id)
  );

  // Load history whenever target changes
  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    if (ws?.readyState === 1 && targetUser?.id) {
      ws.send(JSON.stringify({ type: 'get_dm_history', target_user_id: targetUser.id, limit: 50 }));
      ws.send(JSON.stringify({ type: 'read_receipt', target_user_id: targetUser.id }));
    }
  }, [targetUser?.id, ws]);

  // WS event listener
  useEffect(() => {
    if (!ws) return;
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'dm_history' && data.target_user_id === targetUser?.id) {
          setMessages(prev => {
            if (!prev.length || !data.messages?.[0]?.id) return data.messages || [];
            const ids = new Set(prev.map(m => m.id));
            return [...(data.messages || []).filter(m => !ids.has(m.id)), ...prev];
          });
          setHasMore(data.has_more || false);
          setLoadingMore(false);
        } else if (data.type === 'private_message' && data.sender_id === targetUser?.id) {
          setMessages(prev => [...prev, data]);
          playDMSound();
          ws.send(JSON.stringify({ type: 'read_receipt', target_user_id: targetUser.id, message_ids: [data.id] }));
        } else if (data.type === 'dm_sent' && data.target_user_id === targetUser?.id) {
          setMessages(prev => [...prev, data]);
        } else if (data.type === 'messages_read' && data.reader_id === targetUser?.id) {
          setMessages(prev => prev.map(m =>
            m.sender_id === currentUser?.id ? { ...m, status: 'read' } : m
          ));
        } else if (data.type === 'user_typing' && data.user_id === targetUser?.id) {
          setIsTyping(true);
          clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setIsTyping(false), 3000);
        } else if (data.type === 'user_stop_typing' && data.user_id === targetUser?.id) {
          setIsTyping(false);
        } else if (data.type === 'dm_deleted') {
          setMessages(prev => prev.map(m =>
            m.id === data.message_id ? { ...m, deleted: 1, content: '' } : m
          ));
        } else if (data.type === 'dm_reaction') {
          setMessages(prev => prev.map(m =>
            m.id === data.message_id ? { ...m, reactions: data.reactions } : m
          ));
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws, targetUser?.id, currentUser?.id]);

  // Auto-scroll (near bottom only)
  useEffect(() => {
    const el = chatContainer.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    if (near) chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleScroll = () => {
    const el = chatContainer.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop < 80 && messages.length > 0) {
      setLoadingMore(true);
      ws?.send(JSON.stringify({
        type: 'get_dm_history',
        target_user_id: targetUser.id,
        before_id: messages[0]?.id,
        limit: 50,
      }));
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (ws?.readyState === 1 && !sentTyping.current) {
      ws.send(JSON.stringify({ type: 'typing', target_user_id: targetUser.id }));
      sentTyping.current = true;
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      ws?.send(JSON.stringify({ type: 'stop_typing', target_user_id: targetUser.id }));
      sentTyping.current = false;
    }, 2000);
  };

  const sendDM = (overridePayload) => {
    const payload = overridePayload || (input.trim() ? {
      type: 'private_message',
      target_user_id: targetUser.id,
      content: input.trim(),
      ...(replyTo ? { reply_to: replyTo } : {}),
    } : null);
    if (!payload) return;
    if (ws?.readyState === 1) ws.send(JSON.stringify(payload));
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

  const deleteMsg = useCallback((msgId) => {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'dm_delete', message_id: msgId, target_user_id: targetUser.id }));
  }, [ws, targetUser?.id]);

  const reactMsg = useCallback((msgId, emoji) => {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'dm_react', message_id: msgId, emoji, target_user_id: targetUser.id }));
  }, [ws, targetUser?.id]);

  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (!searchMode) { setSearchQuery(''); setSearchResults([]); return; }
  }, [searchMode]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${API}/api/dm/search?user_id=${currentUser?.id}&target_id=${targetUser?.id}&q=${encodeURIComponent(searchQuery)}&limit=30`
        );
        const json = await res.json();
        setSearchResults(json.messages || []);
      } catch {}
      setSearching(false);
    }, 350);
  }, [searchQuery]); // eslint-disable-line


  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* ── Optional Search Bar ── */}
      <AnimatePresence>
        {searchMode && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-b shrink-0 flex items-center gap-2 overflow-hidden"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
            <span className="text-white/40">🔍</span>
            <input autoFocus placeholder={`Search in conversation...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
            <button onClick={() => setSearchMode(false)} className="text-xs text-white/40 hover:text-white transition-colors">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 z-20">
        {!searchMode && (
          <button onClick={() => setSearchMode(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors text-white/50 hover:text-white backdrop-blur-md"
            title="Search conversation"
          >🔍</button>
        )}
      </div>

      {searchMode && searchQuery ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10" style={{ background: 'var(--bg-base)' }}>
          {searching ? (
             <p className="text-center text-[10px] text-white/40 font-mono py-4 animate-pulse">Searching...</p>
          ) : searchResults.length === 0 ? (
             <p className="text-center text-[10px] text-white/40 font-mono py-4">No results found for "{searchQuery}"</p>
          ) : (
            searchResults.map(msg => (
              <div key={msg.id} className="p-3 rounded-xl border"
                   style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold" style={{ color: msg.sender_id === currentUser?.id ? 'var(--accent)' : '#fff' }}>
                    {msg.sender_id === currentUser?.id ? 'You' : msg.sender_username}
                  </span>
                  <span className="text-[9px] text-white/40 font-mono">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-white/80">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── Messages List ── */
        <div
          ref={chatContainer}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3"
          style={{ scrollBehavior: 'smooth' }}
        >
        {loadingMore && (
          <div className="text-center py-2">
            <motion.p animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}
              className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
              Loading older messages…
            </motion.p>
          </div>
        )}

        {!hasMore && messages.length > 0 && (
          <div className="text-center py-3">
            <span className="text-[9px] font-mono px-3 py-1 rounded-full"
                  style={{ color: 'var(--text-3)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              🔒 Start of conversation
            </span>
          </div>
        )}

        {messages.length === 0 && !loadingMore && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Private conversation</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Only you and {targetUser?.display_name || targetUser?.username} can see these messages
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUser?.id;
          const ctype = msg.content_type;
          const isDeleted = msg.deleted === 1 || msg.deleted === true;
          const reactions = msg.reactions
            ? (typeof msg.reactions === 'string' ? JSON.parse(msg.reactions) : msg.reactions)
            : {};
          const hasReactions = Object.keys(reactions).length > 0;
          return (
            <motion.div key={msg.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
              style={{ marginBottom: hasReactions ? '12px' : undefined }}
            >
              {!isDeleted && ctype === 'voice' ? (
                <VoicePlayer url={msg.voice_url} isOwn={isOwn} duration={msg.voice_duration} />
              ) : !isDeleted && ctype === 'file' ? (
                <FileMessage url={msg.file_url} name={msg.file_name} size={msg.file_size} isOwn={isOwn} />
              ) : (
                <div className="flex flex-col" style={{ maxWidth: '72%', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'} relative`}
                    style={{
                      background: isDeleted ? 'rgba(255,255,255,0.03)' : isOwn ? 'var(--accent)' : 'var(--bg-hover)',
                      border: isDeleted ? '1px dashed rgba(255,255,255,0.08)' : isOwn ? 'none' : '1px solid var(--border)',
                      boxShadow: isOwn && !isDeleted ? '0 2px 14px rgba(99,102,241,0.25)' : 'none',
                    }}
                  >
                    {/* Reply quote */}
                    {msg.reply_to && !isDeleted && (
                      <div className="text-[9px] border-l-2 pl-2 mb-1.5 italic opacity-60"
                           style={{
                             borderColor: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--accent)',
                             color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-2)',
                           }}>
                        ↩ {msg.reply_to?.sender_username}: {msg.reply_to?.content?.slice(0, 60)}
                      </div>
                    )}

                    {/* Sender name */}
                    {!isOwn && !isDeleted && (
                      <p className="text-[9px] font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>
                        {msg.sender_username}
                      </p>
                    )}

                    {/* Image */}
                    {msg.image_url && !isDeleted && (
                      <img src={msg.image_url} alt=""
                        className="rounded-xl mb-1.5 max-w-full cursor-pointer"
                        style={{ maxHeight: 280 }}
                        onClick={() => window.open(msg.image_url, '_blank')} />
                    )}

                    {/* Text or tombstone */}
                    {isDeleted ? (
                      <p className="text-[10px] italic" style={{ color: 'rgba(255,255,255,0.2)' }}>🗑️ Message deleted</p>
                    ) : msg.content && (
                      <p className="text-xs leading-relaxed whitespace-pre-wrap"
                         style={{ color: isOwn ? '#fff' : 'var(--text-1)' }}>
                        {msg.content}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <p className="text-[8px]"
                         style={{ color: isOwn ? 'rgba(255,255,255,0.45)' : 'var(--text-3)' }}>
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </p>
                      <div className="flex items-center gap-1">
                        {isOwn && !isDeleted && (
                          <span className="text-[8px]"
                                style={{ color: msg.status === 'read' ? '#a5f3fc' : 'rgba(255,255,255,0.4)' }}>
                            {msg.status === 'read' ? '✓✓' : '✓'}
                          </span>
                        )}
                        {!isDeleted && (
                          <>
                            <button onClick={() => setReplyTo(msg)}
                              className="text-[9px] opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                              style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-2)' }}>↩</button>
                            {/* Emoji picker trigger */}
                            <div className="relative">
                              <button
                                className="text-[9px] opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                                style={{ color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-2)' }}
                                onClick={e => {
                                  e.stopPropagation();
                                  const el = e.currentTarget.nextSibling;
                                  el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
                                }}
                              >😊</button>
                              <div
                                style={{ display: 'none', position: 'absolute', bottom: '120%', right: 0, zIndex: 99 }}
                                className="flex gap-1 bg-[#1a1a2e] border border-white/10 rounded-xl p-1.5 shadow-2xl"
                                onClick={e => e.stopPropagation()}
                              >
                                {QUICK_EMOJIS.map(em => (
                                  <button key={em}
                                    className="text-sm leading-none hover:scale-125 transition-transform"
                                    onClick={ev => {
                                      reactMsg(msg.id, em);
                                      ev.currentTarget.closest('[style]').style.display = 'none';
                                    }}
                                  >{em}</button>
                                ))}
                              </div>
                            </div>
                            {/* Delete (own messages only) */}
                            {isOwn && (
                              <button
                                onClick={() => deleteMsg(msg.id)}
                                className="text-[9px] opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
                                style={{ color: '#f87171' }}
                                title="Delete"
                              >🗑</button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Reaction bubbles */}
                  {hasReactions && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(reactions).map(([em, users]) => (
                        <button key={em}
                          onClick={() => reactMsg(msg.id, em)}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-all hover:scale-110"
                          style={{
                            background: users.includes(String(currentUser?.id)) ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)',
                            border: users.includes(String(currentUser?.id)) ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          <span>{em}</span><span style={{ color: 'var(--text-3)' }}>{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Typing bubbles */}
        <AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex justify-start">
              <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl rounded-bl-md"
                   style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                {[0, 1, 2].map(dot => (
                  <motion.div key={dot}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: dot * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--text-3)' }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chatEnd} />
      </div>
      )}

      {/* ── Reply Strip ── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-t flex items-center justify-between gap-2 shrink-0 overflow-hidden"
            style={{ borderColor: 'var(--border)', background: 'rgba(99,102,241,0.04)' }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>
                ↩ Replying to <b>{replyTo.sender_username}</b>
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
                {replyTo.content?.slice(0, 80)}
              </p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-sm flex-shrink-0"
                    style={{ color: 'var(--text-3)' }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Bar ── */}
      <div className="px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t flex items-center gap-2 shrink-0"
           style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
        {isBlocked ? (
          <p className="flex-1 text-center text-xs py-1" style={{ color: 'var(--text-3)' }}>
            {amIBlocker
              ? '🚫 You blocked this user. Unblock in Settings to message.'
              : '🚫 You cannot message this user.'}
          </p>
        ) : !canMessage ? (
          <p className="flex-1 text-center text-xs py-1" style={{ color: 'var(--text-3)' }}>
            Connect with {targetUser?.display_name || targetUser?.username} to message
          </p>
        ) : (
          <>
            <FileUpload onSend={sendFile} />
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDM(); }
              }}
              placeholder={`Message ${targetUser?.display_name || targetUser?.username}…`}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-1)',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <VoiceRecorder onSend={sendVoice} />
            {input.trim() && (
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
                onClick={() => sendDM()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: 'var(--accent)', boxShadow: '0 2px 10px rgba(99,102,241,0.4)' }}
              >➤</motion.button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   INLINE DM PANEL — Header + DMPanelBody in the main content area
   ═══════════════════════════════════════════════════════════ */
const InlineDMPanel = ({ targetUser, currentUser, connections, blocks, ws, onClose, onCall, onlineUsers }) => {
  const isOnline = onlineUsers.some(o => o.user_id === targetUser?.id);
  const amIBlocker = blocks?.some(b => b.blocker_id === currentUser?.id && b.blocked_id === targetUser?.id);

  const toggleBlock = async () => {
    if (amIBlocker) {
      await supabase.from('blocks').delete()
        .eq('blocker_id', currentUser.id).eq('blocked_id', targetUser.id);
    } else {
      await supabase.from('blocks').insert({ blocker_id: currentUser.id, blocked_id: targetUser.id });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full" style={{ background: 'var(--bg-base)' }}>
      {/* Chat header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          {/* Mobile back */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-lg lg:hidden"
            style={{ background: 'transparent', color: 'var(--text-1)' }}>←</motion.button>

          {/* Avatar + online dot */}
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
              style={{ background: targetUser?.avatar_url ? 'transparent' : 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.25))' }}
            >
              {targetUser?.avatar_url
                ? <img src={targetUser.avatar_url} alt="" className="w-full h-full object-cover" />
                : (targetUser?.display_name || targetUser?.username || '?').slice(0, 2).toUpperCase()
              }
            </div>
            {isOnline && (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 bg-emerald-400"
                style={{ borderColor: 'var(--bg-raised)', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }}
              />
            )}
          </div>

          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
              {targetUser?.display_name || targetUser?.username}
            </p>
            <p className="text-[10px] font-mono flex items-center gap-1.5"
               style={{ color: isOnline ? '#34d399' : 'var(--text-3)' }}>
              <span>{isOnline ? '● Online' : '○ Offline'}</span>
              <span style={{ color: 'var(--text-3)' }}>·</span>
              <span style={{ color: 'var(--text-3)' }}>🔒 Private</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Voice call */}
          {onCall && targetUser && (
            <>
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                onClick={() => onCall(targetUser.id, targetUser.display_name || targetUser.username, 'voice')}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-2)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#34d399'; e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                title="Voice call">📞</motion.button>
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                onClick={() => onCall(targetUser.id, targetUser.display_name || targetUser.username, 'video')}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-2)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                title="Video call">📹</motion.button>
            </>
          )}

          {/* Block/Unblock */}
          {targetUser?.id !== currentUser?.id && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}
              onClick={toggleBlock}
              className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all border"
              style={amIBlocker
                ? { color: '#34d399', background: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.2)' }
                : { color: '#f87171', background: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.15)' }}>
              {amIBlocker ? 'Unblock' : 'Block'}
            </motion.button>
          )}

          {/* Close (desktop) */}
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-xl hidden lg:flex items-center justify-center text-sm"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; }}
            title="Close chat">✕</motion.button>
        </div>
      </div>

      {/* Body */}
      <DMPanelBody
        targetUser={targetUser}
        currentUser={currentUser}
        connections={connections}
        blocks={blocks}
        ws={ws}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CHAT DASHBOARD — Main app orchestrator
   ═══════════════════════════════════════════════════════════ */
const ChatDashboard = () => {
  const { user, token, logout } = useAuth();
  const { isLow: isLowNetwork } = useNetwork();

  // ── Core state ──────────────────────────────────────────
  const [onlineUsers, setOnlineUsers]   = useState([]);
  const [allUsers, setAllUsers]         = useState([]);
  const [connections, setConnections]   = useState([]);
  const [blocks, setBlocks]             = useState([]);
  const blocksRef = useRef([]);

  const [showSidebar, setShowSidebar]       = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState('chats');
  const [showAnalytics, setShowAnalytics]   = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reconnectIn, setReconnectIn]       = useState(0);
  const [networkStats, setNetworkStats]     = useState({});

  // ── Active DM & panels ───────────────────────────────────
  const [dmTarget, setDmTarget]             = useState(null);
  const [showAIChat, setShowAIChat]         = useState(false);
  const [showProfile, setShowProfile]       = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [profileData, setProfileData]       = useState(null);

  // ── Privacy & Theme ──────────────────────────────────────
  const { savePrivacy, isDND } = usePrivacy(user?.supabase_id || user?.id);
  const [theme, setTheme] = useState(() => localStorage.getItem('sx-theme') || 'dark');

  const handleThemeChange = useCallback((t) => {
    setTheme(t);
    localStorage.setItem('sx-theme', t);
    savePrivacy({ theme: t });
  }, [savePrivacy]);

  useEffect(() => { document.documentElement.className = theme; }, [theme]);

  // ── Last-message sidebar overrides (WS-driven) ───────────
  const [lastMsgOverrides, setLastMsgOverrides] = useState({});

  const pushSentPreview = useCallback((targetId, preview, createdAt) => {
    setLastMsgOverrides(prev => ({ ...prev, [targetId]: { content: `You: ${preview}`, created_at: createdAt } }));
  }, []);

  // ── Unread counts (WS-driven) ─────────────────────────────
  const [unreadMap, setUnreadMap] = useState({});  // { [userId]: count }

  const pushUnread = useCallback((senderId, preview, createdAt) => {
    setUnreadMap(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
    setLastMsgOverrides(prev => ({ ...prev, [senderId]: { content: preview, created_at: createdAt } }));
  }, []);

  const clearUnread = useCallback((userId) => {
    setUnreadMap(prev => { const n = { ...prev }; delete n[userId]; return n; });
  }, []);

  // ── Browser tab title notification badge ────────────────
  useEffect(() => {
    const total = Object.values(unreadMap).reduce((a, b) => a + b, 0);
    document.title = total > 0
      ? `(${total}) SmartChat X — Messages`
      : 'SmartChat X — Secure Messaging';
  }, [unreadMap]);


  const ws                = useRef(null);
  const reconnectTimer    = useRef(null);
  const reconnectAttempt  = useRef(0);
  const maxReconnect      = 10;
  const activeDmRef       = useRef(null); // Track active DM for unread count logic

  // ── Active socket state — updates children on reconnect ──
  const [wsSocket, setWsSocket] = useState(null);

  // ── Offline queue ────────────────────────────────────────
  const { send: queueSend } = useOfflineQueue(ws.current);

  // ── Mediasoup SFU ────────────────────────────────────────
  const {
    callState, localStream, remoteStreams,
    isMuted, isCameraOff, isScreenSharing,
    initiateCall, acceptCall, rejectCall, endCall,
    toggleMic, toggleCamera, toggleScreenShare,
  } = useMediasoup(user, token);

  // ── Load all users ───────────────────────────────────────
  useEffect(() => {
    requestNotificationPermission();
    fetch(`${API}/api/users`)
      .then(r => r.json()).then(setAllUsers).catch(() => {});
  }, []);

  // ── Connections & blocks (Supabase realtime) ─────────────
  useEffect(() => {
    if (!user?.id) { setConnections([]); setBlocks([]); return; }

    const loadConnections = async () => {
      const { data } = await supabase.from('connections')
        .select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      setConnections(data || []);
    };
    const loadBlocks = async () => {
      const { data } = await supabase.from('blocks')
        .select('*').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      setBlocks(data || []);
      blocksRef.current = data || [];
    };

    loadConnections();
    loadBlocks();

    const channel = supabase.channel('realtime:contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, loadConnections)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, loadBlocks)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  // ── Health check ─────────────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${API}/api/health`, { signal: ctrl.signal });
      clearTimeout(tid);
      return res.ok;
    } catch { return false; }
  }, []);

  // ── WebSocket with reconnect ──────────────────────────────
  const connectWS = useCallback(async () => {
    if (!token) return;
    setConnectionStatus('connecting');

    const healthy = await checkHealth();
    if (!healthy) {
      setConnectionStatus('server_offline');
      if (reconnectAttempt.current < maxReconnect) {
        const delay = Math.min(2 ** reconnectAttempt.current * 2000, 60000);
        const sec = Math.ceil(delay / 1000);
        setReconnectIn(sec);
        let c = sec;
        const iv = setInterval(() => { c--; setReconnectIn(c); if (c <= 0) clearInterval(iv); }, 1000);
        reconnectTimer.current = setTimeout(() => { reconnectAttempt.current++; connectWS(); }, delay);
      }
      return;
    }

    const socket = new WebSocket(`${WS_URL}/ws/${token}`);

    socket.onopen = () => {
      setConnectionStatus('connected');
      setWsSocket(socket);           // tell React children about the new socket
      reconnectAttempt.current = 0;
      const iv = setInterval(() => {
        if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'get_network_stats' }));
      }, 10000);
      socket._statsInterval = iv;
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        switch (data.type) {
          case 'network_stats':
            setNetworkStats(data);
            break;
          case 'user_online':
          case 'user_offline':
            setOnlineUsers(data.online_users || []);
            fetch(`${API}/api/users`).then(r => r.json()).then(setAllUsers).catch(() => {});
            break;
          case 'private_message': {
            const blks = blocksRef.current;
            const blocked = blks.some(b =>
              (b.blocker_id === user?.id && b.blocked_id === data.sender_id) ||
              (b.blocked_id === user?.id && b.blocker_id === data.sender_id)
            );
            if (blocked) break;
            // Build preview text for sidebar
            let preview = '';
            if (data.content_type === 'voice') preview = '🎙️ Voice message';
            else if (data.content_type === 'file') preview = '📎 File';
            else if (data.content_type === 'image') preview = '🖼️ Image';
            else preview = (data.content || '').slice(0, 55);

            if (activeDmRef.current?.id !== data.sender_id) {
              pushUnread(data.sender_id, preview, data.created_at || new Date().toISOString());
              playDMSound();
              showNotification(`💬 ${data.sender_username}`, data.content?.slice(0, 80) || 'Sent a message');
            } else {
              // Message is for the currently open DM panel. No unread badge needed.
              // We just update the sidebar preview.
              setLastMsgOverrides(prev => ({ ...prev, [data.sender_id]: { content: preview, created_at: data.created_at || new Date().toISOString() } }));
            }
            break;
          }
          case 'dm_sent': {
            // Update sidebar preview for sent message
            let preview = '';
            if (data.content_type === 'voice') preview = '🎙️ Voice message';
            else if (data.content_type === 'file') preview = '📎 File';
            else if (data.content_type === 'image') preview = '🖼️ Image';
            else preview = (data.content || '').slice(0, 55);
            pushSentPreview(data.target_user_id, preview, data.created_at || new Date().toISOString());
            break;
          }
          case 'incoming_call': {
            const blks = blocksRef.current;
            const blocked = blks.some(b =>
              (b.blocker_id === user?.id && b.blocked_id === data.from_user_id) ||
              (b.blocked_id === user?.id && b.blocker_id === data.from_user_id)
            );
            if (blocked) {
              socket.send(JSON.stringify({ type: 'call_rejected', target_user_id: data.from_user_id }));
              break;
            }
            startRingtone();
            showNotification(`📞 ${data.from_username}`, `${data.call_type === 'video' ? 'Video' : 'Voice'} call`);
            break;
          }
          case 'call_accepted':
            stopRingtone(); playCallConnected();
            break;
          case 'call_rejected':
          case 'call_ended':
            stopRingtone(); playCallEnded();
            break;
          default:
            break;
        }
      } catch {}
    };

    socket.onclose = (event) => {
      clearInterval(socket._statsInterval);
      setWsSocket(null);             // clear stale socket from children
      requestBackgroundSync();
      if (event.code === 4001) { setConnectionStatus('auth_failed'); return; }
      if (reconnectAttempt.current < maxReconnect) {
        const delay = Math.min(2 ** reconnectAttempt.current * 1000, 30000);
        const sec = Math.ceil(delay / 1000);
        setConnectionStatus('reconnecting');
        setReconnectIn(sec);
        let c = sec;
        const iv = setInterval(() => { c--; setReconnectIn(c); if (c <= 0) clearInterval(iv); }, 1000);
        reconnectTimer.current = setTimeout(() => { reconnectAttempt.current++; connectWS(); }, delay);
      } else {
        setConnectionStatus('server_offline');
        setReconnectIn(0);
      }
    };

    socket.onerror = () => {};
    ws.current = socket;
  }, [token, checkHealth, user?.id]);

  useEffect(() => {
    connectWS();
    return () => { clearTimeout(reconnectTimer.current); ws.current?.close(); };
  }, [connectWS]);

  const retryConnection = useCallback(() => {
    reconnectAttempt.current = 0;
    clearTimeout(reconnectTimer.current);
    connectWS();
  }, [connectWS]);

  // ── Derived ──────────────────────────────────────────────
  const isConnected      = connectionStatus === 'connected';
  const acceptedIds      = connections
    .filter(c => c.status === 'accepted')
    .map(c => c.sender_id === user?.id ? c.receiver_id : c.sender_id);
  const connectedContacts = allUsers.filter(u => acceptedIds.includes(u.id));
  const onlineCount      = onlineUsers.filter(o => acceptedIds.includes(o.user_id)).length;

  const handleDMClick = useCallback((target) => {
    setDmTarget(target);
    activeDmRef.current = target;
    clearUnread(target.id);
    if (window.innerWidth < 1024) setShowSidebar(false);
  }, [clearUnread]);

  const handleCloseDM = useCallback(() => {
    setDmTarget(null);
    activeDmRef.current = null;
  }, []);

  // ── Home screen ───────────────────────────────────────────
  const HomePanel = () => (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
         style={{ background: 'var(--bg-base)' }}>
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position:'absolute', top:'20%', left:'40%', width:500, height:500,
          background:'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          transform:'translate(-50%,-50%)' }} />
        <div style={{ position:'absolute', bottom:'20%', right:'25%', width:350, height:350,
          background:'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
          transform:'translate(50%,50%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center max-w-sm px-8"
      >
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 3, -3, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-7xl mb-6"
        >💬</motion.div>

        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
          {connectedContacts.length > 0 ? 'Select a conversation' : 'Welcome to SmartChat X'}
        </h2>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-3)' }}>
          {connectedContacts.length > 0
            ? 'Choose a contact from the sidebar to start messaging.'
            : 'Search for users and send connection requests to start private conversations.'}
        </p>

        {connectedContacts.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 w-full">
            {connectedContacts.slice(0, 4).map(u => (
              <motion.button key={u.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleDMClick(u)}
                className="flex items-center gap-2 p-2.5 rounded-xl text-left"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                     style={{ background: u.avatar_url ? 'transparent' : 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))' }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (u.display_name || u.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-1)' }}>
                    {u.display_name || u.username}
                  </p>
                  {onlineUsers.some(o => o.user_id === u.id) && (
                    <p className="text-[9px]" style={{ color: '#34d399' }}>● Online</p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowSidebar(true)}
            className="py-2.5 px-6 rounded-xl text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
              border: '1px solid rgba(99,102,241,0.3)',
            }}>
            🔍 Search Users
          </motion.button>
        )}

        {/* Connection pill */}
        <div className="mt-8 flex items-center gap-2 px-3 py-1.5 rounded-full"
             style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? 'bg-emerald-400 animate-pulse' :
            connectionStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
          }`} style={{ boxShadow: isConnected ? '0 0 6px rgba(52,211,153,0.6)' : 'none' }} />
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
            {isConnected ? 'Securely connected' :
             connectionStatus === 'reconnecting' ? `Reconnecting in ${reconnectIn}s…` : 'Connecting…'}
          </span>
        </div>
      </motion.div>
    </div>
  );

  const renderMobileBottomNav = () => (
    <div className="lg:hidden flex border-t shrink-0 z-40 bg-base"
         style={{ borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)', background: 'var(--bg-raised)', backdropFilter: 'blur(20px)' }}>
      <button onClick={() => { setActiveMobileTab('chats'); setDmTarget(null); }}
              className={`flex-1 py-3 text-2xl flex justify-center items-center flex-col gap-1 transition-opacity ${activeMobileTab === 'chats' ? 'opacity-100' : 'opacity-40'}`}>
        💬 <span className="text-[9px] font-bold text-white tracking-widest">CHATS</span>
      </button>
      <button onClick={() => { setActiveMobileTab('ai'); setShowAIChat(true); }}
              className={`flex-1 py-3 text-2xl flex justify-center items-center flex-col gap-1 transition-opacity ${activeMobileTab === 'ai' || showAIChat ? 'opacity-100' : 'opacity-40'}`}>
        🤖 <span className="text-[9px] font-bold text-white tracking-widest">AI</span>
      </button>
      <button onClick={() => { setActiveMobileTab('calls'); setShowCallHistory(true); }}
              className={`flex-1 py-3 text-2xl flex justify-center items-center flex-col gap-1 transition-opacity ${activeMobileTab === 'calls' || showCallHistory ? 'opacity-100' : 'opacity-40'}`}>
        📞 <span className="text-[9px] font-bold text-white tracking-widest">CALLS</span>
      </button>
      <button onClick={() => { setActiveMobileTab('profile'); setShowProfile(true); }}
              className={`flex-1 py-3 text-2xl flex justify-center items-center flex-col gap-1 transition-opacity ${activeMobileTab === 'profile' || showProfile ? 'opacity-100' : 'opacity-40'}`}>
        👤 <span className="text-[9px] font-bold text-white tracking-widest">PROFILE</span>
      </button>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {!isLowNetwork && <CyberBg />}
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

      {/* ── Sidebar ─────────────────────────────────────── */}
      <div className={`lg:flex lg:w-80 lg:shrink-0 lg:border-r z-20 transition-all ${dmTarget ? 'hidden' : 'flex flex-1 w-full min-h-0'}`} style={{ borderColor: 'var(--border)' }}>
        <Sidebar
          users={allUsers}
          connections={connections}
          blocks={blocks}
          onlineIds={onlineUsers}
          currentUser={user}
          show={showSidebar}
          onClose={() => setShowSidebar(false)}
          onDMClick={handleDMClick}
          onCall={initiateCall}
          isDND={isDND}
          onThemeChange={handleThemeChange}
          activeDmId={dmTarget?.id}
          unreadCounts={unreadMap}
          onClearUnread={clearUnread}
          lastMessageOverrides={lastMsgOverrides}  // live WS-driven updates
        />
      </div>

      {/* ── Main panel ──────────────────────────────────── */}
      <div className={`flex-1 flex flex-col relative z-10 min-w-0 ${dmTarget ? 'flex' : 'hidden lg:flex'}`}>
        <NetworkBanner connectionStatus={connectionStatus} reconnectIn={reconnectIn} onRetry={retryConnection} />

        {/* Header (desktop mainly OR home panel header) */}
        {!dmTarget && (
          <header className="border-b px-4 py-3 flex items-center justify-between shrink-0"
            style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSidebar(s => !s)}
                className="w-8 h-8 rounded-xl hidden lg:flex items-center justify-center text-sm transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}
                title="Toggle sidebar">☰</button>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
                   style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>⚡</div>
              <div>
                <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
                  SmartChat <span className="text-gradient">X</span>
                </h1>
                <p className="text-[9px] font-mono uppercase tracking-widest hidden sm:block" style={{ color: 'var(--text-3)' }}>
                  {connectedContacts.length} Contact{connectedContacts.length !== 1 ? 's' : ''} · {onlineCount} Online
                </p>
              </div>
            </div>

          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAIChat(v => !v)}
              className={`text-lg transition-colors ${showAIChat ? 'text-purple-400' : 'text-white/25 hover:text-purple-400'}`}
              title="AI Assistant">🤖</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowAnalytics(v => !v)}
              className="text-white/25 hover:text-neon-cyan text-lg transition-colors"
              title="Network Analytics">📊</motion.button>

            {/* WS status dot */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-neon-green animate-pulse' :
                connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
              }`} style={{ boxShadow: isConnected ? '0 0 8px rgba(0,255,136,0.5)' : 'none' }} />
              <span className="text-[9px] font-mono text-white/20 hidden sm:inline">
                {isConnected ? 'LIVE' : connectionStatus === 'reconnecting' ? 'RECONN…' : 'OFFLINE'}
              </span>
            </div>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowCallHistory(true)}
              className="text-white/25 hover:text-neon-green text-lg transition-colors"
              title="Call History">📋</motion.button>

            {/* Profile + logout */}
            <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 group cursor-pointer"
                title="My Profile">
                {profileData?.avatar_url || user?.avatar_url ? (
                  <img src={profileData?.avatar_url || user?.avatar_url} alt="avatar"
                    className="w-7 h-7 rounded-full object-cover border border-neon-cyan/30" />
                ) : (
                  <span className="text-lg">{user?.avatar || '👤'}</span>
                )}
                <span className="text-[10px] font-mono text-white/30 hidden sm:inline group-hover:text-white/60 transition-colors">
                  {profileData?.display_name || user?.username}
                </span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={logout}
                className="text-white/40 hover:text-neon-pink text-sm transition-colors ml-1 p-2 rounded-lg hover:bg-white/5"
                title="Logout"
                id="logout-btn">⏻</motion.button>
            </div>
          </div>
        </header>
        )}

        {/* Content */}
        <div className="flex-1 flex min-h-0 relative">
          <AnimatePresence mode="wait">
            {dmTarget ? (
              <motion.div key={`dm-${dmTarget.id}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex min-h-0">
                <InlineDMPanel
                  targetUser={dmTarget}
                  currentUser={user}
                  connections={connections}
                  blocks={blocks}
                  ws={wsSocket}
                  onClose={handleCloseDM}
                  onCall={initiateCall}
                  onlineUsers={onlineUsers}
                />
              </motion.div>
            ) : (
              <motion.div key="home"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex min-h-0 hidden lg:flex">
                <HomePanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      {!dmTarget && renderMobileBottomNav()}

      {/* ── Overlays ────────────────────────────────────── */}
      <AnalyticsPanel show={showAnalytics} messages={[]} networkStats={networkStats}
                      onClose={() => setShowAnalytics(false)} />

      <AnimatePresence>
        {showAIChat && <AIChatPanel ws={wsSocket} onClose={() => setShowAIChat(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <UserProfileModal
            currentUser={{ ...user, ...(profileData || {}) }}
            onClose={() => setShowProfile(false)}
            onProfileUpdate={setProfileData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCallHistory && (
          <CallHistoryPanel
            currentUser={user}
            onClose={() => setShowCallHistory(false)}
            onCall={(uid, name, type) => { setShowCallHistory(false); initiateCall(uid, name, type); }}
          />
        )}
      </AnimatePresence>

      <IncomingCallPopup callState={callState} onAccept={acceptCall} onReject={rejectCall} />
      <CallUI
        callState={callState}
        localStream={localStream}
        remoteStreams={remoteStreams}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onEnd={endCall}
        username={callState?.username}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   APP — Entry point
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  return (
    <NetworkProvider>
      <AuthProvider>
        <AnimatePresence mode="wait">
          {showWelcome ? (
            <WelcomeScreen key="welcome" onStart={() => setShowWelcome(false)} />
          ) : (
            <AppContent key="app" />
          )}
        </AnimatePresence>
      </AuthProvider>
    </NetworkProvider>
  );
}

function AppContent() {
  // isLoggedIn = !!token && isEmailVerified (both required)
  const { isLoggedIn, isEmailVerified, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{
            fontSize: 40,
            filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.6))',
          }}
        >⚡</motion.div>
      </div>
    );
  }

  // Gate: must have a session token AND be email-verified to reach the dashboard
  const canAccessApp = isLoggedIn && isEmailVerified;

  return (
    <AnimatePresence mode="wait">
      {canAccessApp ? (
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
