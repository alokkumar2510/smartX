/**
 * Sidebar — Contacts-First Sidebar
 * SmartChat X v6 · Private contacts only, 3-tab nav
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserSearch from './UserSearch';
import SettingsModal from './SettingsModal';
import { supabase } from '../lib/supabase';
import { API } from '../services/api';

/* ─── Helpers ──────────────────────────────────────────────── */
const initials = (name = '') => name.slice(0, 2).toUpperCase() || '??';
const avatarGradients = [
  'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.2))',
  'linear-gradient(135deg,rgba(52,211,153,0.3),rgba(16,185,129,0.15))',
  'linear-gradient(135deg,rgba(251,191,36,0.3),rgba(245,158,11,0.15))',
  'linear-gradient(135deg,rgba(248,113,113,0.25),rgba(239,68,68,0.1))',
  'linear-gradient(135deg,rgba(0,240,255,0.2),rgba(56,189,248,0.1))',
];
const userGradient = (id) => avatarGradients[(id?.charCodeAt?.(0) || 0) % avatarGradients.length];

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/* ─── Contact Card (WhatsApp-style) ────────────────────────── */
const ContactCard = ({ user, isOnline, isDND, lastMessage, lastMessageTime, unread, isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(user)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer relative"
      style={{
        background: isActive
          ? 'rgba(99,102,241,0.12)'
          : hovered ? 'var(--bg-hover)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
          style={{ background: user.avatar_url ? 'transparent' : userGradient(user.id) }}
        >
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            : initials(user.display_name || user.username)
          }
        </div>
        {/* Online dot */}
        {isOnline && (
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isDND ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{
              borderColor: 'var(--bg-raised)',
              boxShadow: `0 0 6px ${isDND ? 'rgba(245,158,11,0.6)' : 'rgba(16,185,129,0.6)'}`,
            }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
            {user.display_name || user.username}
          </p>
          {lastMessageTime && (
            <span className="text-[9px] flex-shrink-0" style={{ color: unread ? 'var(--accent)' : 'var(--text-3)' }}>
              {formatTime(lastMessageTime)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-[11px] truncate" style={{ color: unread ? 'var(--text-2)' : 'var(--text-3)', fontWeight: unread ? '500' : '400' }}>
            {lastMessage || (isOnline ? (isDND ? '🌙 Do Not Disturb' : 'Active now') : 'Tap to chat')}
          </p>
          {unread > 0 && (
            <span
              className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center px-1"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Request Card ──────────────────────────────────────────── */
const RequestCard = ({ request, sender, onAccept, onDecline }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, height: 0 }}
    className="rounded-xl p-3 mb-2 mx-1"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
    <div className="flex items-center gap-2.5 mb-2.5">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
           style={{ background: userGradient(sender?.id) }}>
        {sender?.avatar_url
          ? <img src={sender.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
          : initials(sender?.display_name || sender?.username)
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>
          {sender?.display_name || sender?.username}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>wants to connect</p>
      </div>
    </div>
    <div className="flex gap-2">
      <button onClick={onAccept}
        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
        style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}>
        ✓ Accept
      </button>
      <button onClick={onDecline}
        className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
        style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.16)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
        ✕ Decline
      </button>
    </div>
  </motion.div>
);

/* ─── Section Tabs ──────────────────────────────────────────── */
const TABS = [
  { key: 'chats',    label: 'Chats',    icon: '💬' },
  { key: 'requests', label: 'Requests', icon: '🤝' },
  { key: 'search',   label: 'Search',   icon: '🔍' },
];

/* ─── Main Sidebar ──────────────────────────────────────────── */
const Sidebar = ({
  users, connections, blocks, onlineIds,
  currentUser, show, onClose,
  onDMClick, onCall,
  onThemeChange, isDND,
  activeDmId,
  // Unread counts & last messages are now passed from App.jsx (WS-driven)
  unreadCounts = {},
  onClearUnread,
  lastMessageOverrides = {}, // { [userId]: { content, created_at } } — live WS updates
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [activeSection, setActiveSection] = useState('chats'); // 'chats' | 'requests' | 'search'
  const [lastMessages, setLastMessages] = useState({}); // userId → { content, created_at }

  const blockedIds = blocks?.map(b =>
    b.blocker_id === currentUser?.id ? b.blocked_id : b.blocker_id) || [];

  const acceptedConnections = connections.filter(c => c.status === 'accepted');
  const acceptedIds = acceptedConnections
    .map(c => c.sender_id === currentUser?.id ? c.receiver_id : c.sender_id)
    .filter(id => !blockedIds.includes(id));

  const incomingPending = connections
    .filter(c => c.status === 'pending' && c.receiver_id === currentUser?.id)
    .filter(c => !blockedIds.includes(c.sender_id));

  // Contacts with accepted connections only
  const connectedUsers = users.filter(u => acceptedIds.includes(u.id));

  // ── Load last DM message previews from FastAPI REST (source of truth) ──
  const loadPreviews = useCallback(async () => {
    if (!currentUser?.id || connectedUsers.length === 0) return;
    const previews = {};
    await Promise.all(connectedUsers.map(async (u) => {
      try {
        const res = await fetch(
          `${API}/api/dm/history?user_id=${currentUser.id}&target_id=${u.id}&limit=1`
        );
        if (!res.ok) return;
        const { messages } = await res.json();
        if (messages && messages.length > 0) {
          const msg = messages[messages.length - 1]; // most recent
          let preview = '';
          if (msg.content_type === 'voice') preview = '🎙️ Voice message';
          else if (msg.content_type === 'file') preview = '📎 File';
          else if (msg.content_type === 'image') preview = '🖼️ Image';
          else preview = msg.content || '';
          if (msg.sender_id === currentUser.id) preview = `You: ${preview}`;
          previews[u.id] = { content: preview.slice(0, 55), created_at: msg.created_at };
        }
      } catch {}
    }));
    setLastMessages(previews);
  }, [currentUser?.id, connectedUsers.length]); // eslint-disable-line

  useEffect(() => { loadPreviews(); }, [loadPreviews]);

  // Merge in any live WS-driven last-message overrides from App.jsx
  const mergedLastMessages = { ...lastMessages, ...lastMessageOverrides };

  // Sort contacts: most recent message first, then alphabetically
  const sortedContacts = [...connectedUsers].sort((a, b) => {
    const aTime = mergedLastMessages[a.id]?.created_at;
    const bTime = mergedLastMessages[b.id]?.created_at;
    if (aTime && bTime) return new Date(bTime) - new Date(aTime);
    if (aTime) return -1;
    if (bTime) return 1;
    const aOnline = onlineIds.some(o => o.user_id === a.id);
    const bOnline = onlineIds.some(o => o.user_id === b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return (a.display_name || a.username).localeCompare(b.display_name || b.username);
  });

  const onlineCount = onlineIds.filter(o => acceptedIds.includes(o.user_id)).length;

  const respondToRequest = async (id, status) => {
    const { error } = await supabase.from('connections').update({ status }).eq('id', id);
    if (error) console.error('Failed to respond to request:', error);
  };

  return (
    <>
      {/* Sidebar Panel */}
      <motion.aside
        id="sidebar-panel"
        className="w-full h-full flex flex-col transition-all bg-base"
        style={{
          background: 'var(--bg-raised)',
          borderColor: 'var(--border)',
        }}>

        {/* ── Header ─────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          {/* Brand + actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                   style={{
                     background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1))',
                     border: '1px solid rgba(99,102,241,0.25)',
                   }}>⚡</div>
              <div>
                <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>
                  SmartChat<span className="text-gradient"> X</span>
                </h1>
                {isDND && (
                  <p className="text-[10px]" style={{ color: '#fbbf24' }}>🌙 Do Not Disturb</p>
                )}
              </div>
            </div>
            {/* Only settings icon in header now */}
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors"
              style={{ color: 'var(--text-3)', background: 'var(--bg-hover)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              title="Settings">
              ⚙️
            </motion.button>
          </div>

          {/* Current User Mini Profile */}
          {currentUser && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl"
                 style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                     style={{ background: currentUser.avatar_url ? 'transparent' : userGradient(currentUser.id) }}>
                  {currentUser.avatar_url
                    ? <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    : initials(currentUser.display_name || currentUser.username)
                  }
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${isDND ? 'bg-amber-400' : 'bg-emerald-400'}`}
                     style={{ borderColor: 'var(--bg-raised)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                  {currentUser.display_name || currentUser.username}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                  {onlineCount} connection{onlineCount !== 1 ? 's' : ''} online
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Section Tabs ────────────────────────────── */}
        <div className="flex border-b shrink-0 px-1 pt-1" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(tab => {
            const count = tab.key === 'requests' ? incomingPending.length : tab.key === 'chats' ? connectedUsers.length : 0;
            const isActive = activeSection === tab.key;
            return (
              <button key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className="flex items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium rounded-t-lg border-b-2 transition-all"
                style={{
                  borderColor: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                  background: isActive ? 'rgba(99,102,241,0.06)' : 'transparent',
                }}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="min-w-[16px] h-4 rounded-full text-[8px] font-bold flex items-center justify-center px-1"
                        style={{
                          background: tab.key === 'requests' ? 'rgba(251,191,36,0.2)' : 'rgba(99,102,241,0.15)',
                          color: tab.key === 'requests' ? '#fbbf24' : 'var(--accent)',
                        }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-1.5 relative">
          <AnimatePresence mode="wait">

            {/* ── CHATS TAB ── */}
            {activeSection === 'chats' && (
              <motion.div key="chats"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {sortedContacts.length === 0 ? (
                  <div className="flex flex-col items-center py-16 px-6 text-center">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-5xl mb-4">💬</motion.div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>No contacts yet</p>
                    <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                      Find and connect with people to start private conversations
                    </p>
                    <div className="flex flex-col gap-2 w-full">
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setActiveSection('search')}
                        className="py-2 px-4 rounded-xl text-xs font-semibold text-white transition-all"
                        style={{
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                          border: '1px solid rgba(99,102,241,0.3)',
                        }}>
                        🔍 Search Users
                      </motion.button>
                      {incomingPending.length > 0 && (
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => setActiveSection('requests')}
                          className="py-2 px-4 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: 'rgba(251,191,36,0.08)',
                            border: '1px solid rgba(251,191,36,0.2)',
                            color: '#fbbf24',
                          }}>
                          🤝 View Requests ({incomingPending.length})
                        </motion.button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="px-2 space-y-0.5">
                    {sortedContacts.map(u => (
                      <ContactCard
                        key={u.id}
                        user={u}
                        isOnline={onlineIds.some(o => o.user_id === u.id)}
                        isDND={false}
                        lastMessage={mergedLastMessages[u.id]?.content}
                        lastMessageTime={mergedLastMessages[u.id]?.created_at}
                        unread={unreadCounts[u.id] || 0}
                        isActive={activeDmId === u.id}
                        onClick={(contact) => {
                          onClearUnread?.(u.id);
                          onDMClick?.(contact);
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── REQUESTS TAB ── */}
            {activeSection === 'requests' && (
              <motion.div key="requests"
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {incomingPending.length === 0 ? (
                  <div className="flex flex-col items-center py-16 px-6 text-center">
                    <span className="text-4xl mb-3">🤝</span>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>No pending requests</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Connection requests will appear here</p>
                  </div>
                ) : (
                  <div className="px-2 pt-1">
                    <AnimatePresence>
                      {incomingPending.map(req => {
                        const sender = users.find(u => u.id === req.sender_id);
                        return (
                          <RequestCard
                            key={req.id}
                            request={req}
                            sender={sender}
                            onAccept={() => respondToRequest(req.id, 'accepted')}
                            onDecline={() => respondToRequest(req.id, 'rejected')}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SEARCH TAB ── */}
            {activeSection === 'search' && (
              <motion.div key="search"
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="absolute inset-0">
                <UserSearch
                  currentUser={currentUser}
                  connections={connections}
                  blocks={blocks}
                  onClose={() => setActiveSection('chats')}
                  embedded={true}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            currentUser={currentUser}
            users={users}
            blocks={blocks}
            onClose={() => setShowSettings(false)}
            onThemeChange={onThemeChange}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
