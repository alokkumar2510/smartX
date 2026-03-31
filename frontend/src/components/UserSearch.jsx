/**
 * UserSearch — Find and connect with users
 * SmartChat X v5 · Modern design
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const initials = (name = '') => name.slice(0, 2).toUpperCase() || '??';
const gradients = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#06b6d4,#6366f1)',
  'linear-gradient(135deg,#10b981,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
];
const userGradient = (id) => gradients[(id?.charCodeAt?.(0) || 0) % gradients.length];

export default function UserSearch({ currentUser, connections, blocks, onClose }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = async (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) { setResults([]); return; }
    
    setSearching(true);
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${val}%`)
      .neq('id', currentUser.id)
      .limit(12);
    setResults(data || []);
    setSearching(false);
  };

  const sendRequest = async (targetId) => {
    const { error } = await supabase
      .from('connections')
      .insert({ sender_id: currentUser.id, receiver_id: targetId, status: 'pending' });
    if (!error) {
      setResults(prev => prev.map(u => u.id === targetId ? { ...u, requested: true } : u));
    }
  };

  const getStatus = (userId) => {
    if (results.find(u => u.id === userId)?.requested) return 'sent';
    const isBlocked = blocks?.some(b =>
      (b.blocker_id === currentUser.id && b.blocked_id === userId) ||
      (b.blocked_id === currentUser.id && b.blocker_id === userId)
    );
    if (isBlocked) return 'blocked';
    const conn = connections.find(c =>
      (c.sender_id === currentUser.id && c.receiver_id === userId) ||
      (c.receiver_id === currentUser.id && c.sender_id === userId)
    );
    if (!conn) return null;
    if (conn.status === 'accepted') return 'accepted';
    if (conn.status === 'pending') return conn.sender_id === currentUser.id ? 'sent' : 'received';
    return conn.status;
  };

  return (
    <div className="flex flex-col h-full"
         style={{ background: 'var(--bg-raised)', borderRight: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors flex-shrink-0"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-2)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}>
            ←
          </motion.button>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Find People</h2>
        </div>

        {/* Search Input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-3)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search by username..."
            className="input pl-9 pr-10"
            style={{ paddingLeft: '2.25rem' }}
          />
          <AnimatePresence>
            {searching && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--accent)' }} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto modal-scroll py-2 px-2">
        <AnimatePresence>
          {query && !searching && results.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center py-12 text-center px-4">
              <span className="text-3xl mb-3">🔎</span>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>No users found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Try a different username</p>
            </motion.div>
          )}

          {!query && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center py-12 text-center px-4">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="text-4xl mb-3">🌐</motion.div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-2)' }}>Search for people</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Type a username to find and connect with others
              </p>
            </motion.div>
          )}

          {results.map((u, i) => {
            const status = getStatus(u.id);
            if (status === 'blocked') return null;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between gap-3 p-3 rounded-xl mb-1.5 transition-colors"
                style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden"
                     style={{ background: u.avatar_url ? 'transparent' : userGradient(u.id) }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    : initials(u.display_name || u.username)
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                    {u.display_name || u.username}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>@{u.username}</p>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {status === 'accepted' ? (
                    <span className="text-[11px] px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                      ✓ Connected
                    </span>
                  ) : status === 'sent' ? (
                    <span className="text-[11px] px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                      ⏳ Sent
                    </span>
                  ) : status === 'received' ? (
                    <span className="text-[11px] px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
                      Action ↗
                    </span>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => sendRequest(u.id)}
                      className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                               boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                      + Connect
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
