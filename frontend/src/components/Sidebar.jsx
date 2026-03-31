/**
 * Sidebar — Modern 3D Chat Sidebar
 * SmartChat X v5 · Clean DM-first design
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserSearch from './UserSearch';
import SettingsModal from './SettingsModal';
import { supabase } from '../lib/supabase';

/* ─── Avatar Initials Helper ───────────────────────────────── */
const initials = (name = '') => name.slice(0, 2).toUpperCase() || '??';
const avatarGradients = [
  'linear-gradient(135deg,rgba(255,255,255,0.15),rgba(255,255,255,0.05))',
  'linear-gradient(135deg,rgba(150,180,255,0.15),rgba(255,255,255,0.05))',
  'linear-gradient(135deg,rgba(52,211,153,0.12),rgba(255,255,255,0.05))',
  'linear-gradient(135deg,rgba(251,191,36,0.12),rgba(255,255,255,0.05))',
  'linear-gradient(135deg,rgba(248,113,113,0.10),rgba(255,255,255,0.05))',
];
const userGradient = (id) => avatarGradients[(id?.charCodeAt?.(0) || 0) % avatarGradients.length];

/* ─── User Card ─────────────────────────────────────────────── */
const UserCard = ({ user, isMe, isOnline, isDND, onDM, onCall, p2pState, onP2P, privacyLastSeen }) => {
  const [hovered, setHovered] = useState(false);
  const showActions = hovered && !isMe && isOnline;

  const lastSeenText = () => {
    if (privacyLastSeen === 'nobody') return '';
    if (isOnline) return isDND ? '🌙 Do Not Disturb' : 'Active now';
    if (privacyLastSeen === 'everyone' && user.last_seen) {
      const d = new Date(user.last_seen);
      const now = new Date();
      const diff = Math.floor((now - d) / 60000);
      if (diff < 60) return `${diff}m ago`;
      if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
      return d.toLocaleDateString();
    }
    return '';
  };

  return (
    <motion.div
      layout
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.98 }}
      onClick={() => !isMe && onDM?.(user)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer relative group"
      style={{
        background: hovered && !isMe ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
             style={{ background: user.avatar_url ? 'transparent' : userGradient(user.id) }}>
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            : initials(user.display_name || user.username)
          }
        </div>
        {/* Online dot */}
        {isOnline && (
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isDND ? 'bg-amber-400' : 'bg-emerald-400'}`}
               style={{ borderColor: 'var(--bg-raised)', boxShadow: `0 0 6px ${isDND ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}` }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate" style={{ color: isOnline ? 'var(--text-1)' : 'var(--text-2)' }}>
            {user.display_name || user.username}
          </p>
          {isMe && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>You</span>
          )}
        </div>
        <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>
          {lastSeenText()}
        </p>
      </div>

      {/* Actions (appear on hover) */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1 flex-shrink-0"
            onClick={e => e.stopPropagation()}>

            <motion.button whileTap={{ scale: 0.85 }}
              onClick={() => onCall?.(user.id, user.username, 'voice')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
              style={{ background: 'rgba(52,211,153,0.10)', color: '#34d399' }}
              title="Voice Call">📞</motion.button>

            <motion.button whileTap={{ scale: 0.85 }}
              onClick={() => onCall?.(user.id, user.username, 'video')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
              style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
              title="Video Call">📹</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
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

/* ─── Main Sidebar ──────────────────────────────────────────── */
const Sidebar = ({
  users, connections, blocks, onlineIds,
  currentUser, show, onClose,
  onConnectP2P, p2pConnections,
  onDMClick, onCall,
  onThemeChange, isDND,
}) => {
  const [showSearch,   setShowSearch]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSection, setActiveSection] = useState('chats'); // 'chats' | 'requests'

  const blockedIds = blocks?.map(b =>
    b.blocker_id === currentUser?.id ? b.blocked_id : b.blocker_id) || [];

  const acceptedIds = connections
    .filter(c => c.status === 'accepted')
    .map(c => c.sender_id === currentUser?.id ? c.receiver_id : c.sender_id)
    .filter(id => !blockedIds.includes(id));

  const incomingPending = connections
    .filter(c => c.status === 'pending' && c.receiver_id === currentUser?.id)
    .filter(c => !blockedIds.includes(c.sender_id));

  const connectedUsers = users.filter(u => acceptedIds.includes(u.id));
  const onlineCount = onlineIds.filter(o => acceptedIds.includes(o.user_id)).length;

  const respondToRequest = (id, status) =>
    supabase.from('connections').update({ status }).eq('id', id);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
            onClick={onClose} />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <motion.aside
        id="sidebar-panel"
        initial={{ x: -320 }}
        animate={{ x: show ? 0 : -320 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed lg:static z-40 w-72 h-full flex flex-col border-r"
        style={{
          background: 'var(--bg-raised)',
          borderColor: 'var(--border)',
          boxShadow: show ? 'var(--shadow-3d)' : 'none',
        }}>

        {/* Search overlay */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20">
              <UserSearch
                currentUser={currentUser}
                connections={connections}
                blocks={blocks}
                onClose={() => setShowSearch(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ─────────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          {/* Brand */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                   style={{
                     background: 'rgba(255,255,255,0.08)',
                     border: '1px solid rgba(255,255,255,0.12)',
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
            {/* Icon actions */}
            <div className="flex items-center gap-1">
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => setShowSearch(true)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors"
                style={{ color: 'var(--text-3)', background: 'var(--bg-hover)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                title="Find users">
                🔍
              </motion.button>
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
        <div className="flex border-b shrink-0 px-2 pt-2" style={{ borderColor: 'var(--border)' }}>
          {[
            { key: 'chats', label: 'Chats', count: connectedUsers.length },
            { key: 'requests', label: 'Requests', count: incomingPending.length },
          ].map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className="flex items-center gap-1.5 flex-1 justify-center py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all"
              style={{
                borderColor: activeSection === s.key ? 'rgba(255,255,255,0.4)' : 'transparent',
                color: activeSection === s.key ? 'var(--text-1)' : 'var(--text-3)',
              }}>
              {s.label}
              {s.count > 0 && (
                <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                      style={{ background: s.key === 'requests' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.08)',
                               color: s.key === 'requests' ? '#fbbf24' : 'rgba(255,255,255,0.65)' }}>
                  {s.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-2">
          <AnimatePresence mode="wait">

            {/* CHATS */}
            {activeSection === 'chats' && (
              <motion.div key="chats"
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {connectedUsers.length === 0 ? (
                  <div className="flex flex-col items-center py-14 px-6 text-center">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-4xl mb-4">💬</motion.div>
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>No connections yet</p>
                    <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                      Search for users to connect and start chatting
                    </p>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => setShowSearch(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                      style={{
                        background: 'rgba(255,255,255,0.09)',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}>
                      + Find People
                    </motion.button>
                  </div>
                ) : (
                  <div className="px-2 space-y-0.5">
                    {connectedUsers.map(u => (
                      <UserCard
                        key={u.id}
                        user={u}
                        isMe={false}
                        isOnline={onlineIds.some(o => o.user_id === u.id)}
                        isDND={false /* would come from their privacy settings */}
                        onDM={onDMClick}
                        onCall={onCall}
                        p2pState={p2pConnections?.[u.id]}
                        onP2P={onConnectP2P}
                        privacyLastSeen="everyone"
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* REQUESTS */}
            {activeSection === 'requests' && (
              <motion.div key="requests"
                initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                {incomingPending.length === 0 ? (
                  <div className="flex flex-col items-center py-14 px-6 text-center">
                    <span className="text-4xl mb-3">🤝</span>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>No pending requests</p>
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
