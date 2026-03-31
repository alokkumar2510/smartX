/**
 * StatusStories — Stories/Status feature
 * SmartChat X v5 · 24-hour expiry statuses
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const BG_PRESETS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #6366f1)',
  'linear-gradient(135deg, #10b981, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #8b5cf6, #ec4899)',
  'linear-gradient(135deg, #1e3a5f, #1e40af)',
  'linear-gradient(135deg, #1a1a2e, #16213e)',
];

const EMOJIS = ['🔥', '💬', '✨', '🎯', '🚀', '💡', '❤️', '🎉', '🌙', '⚡'];
const initials = (n = '') => n.slice(0, 2).toUpperCase();

/* ─── Status Ring ───────────────────────────────────────────── */
export const StatusRing = ({ hasStatus, viewed }) => (
  <div className={`absolute -inset-0.5 rounded-full ${hasStatus
    ? viewed ? 'bg-gradient-to-br from-gray-500 to-gray-600' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
    : ''}`}
  style={{ padding: hasStatus ? 2 : 0 }}>
    <div className="w-full h-full rounded-full" style={{ background: 'var(--bg-raised)' }} />
  </div>
);

/* ─── Compose Status Modal ──────────────────────────────────── */
const ComposeStatus = ({ currentUser, onDone, onClose }) => {
  const [text,    setText]    = useState('');
  const [bg,      setBg]      = useState(BG_PRESETS[0]);
  const [emoji,   setEmoji]   = useState('');
  const [posting, setPosting] = useState(false);

  const post = async () => {
    if (!text.trim() && !emoji) return;
    setPosting(true);
    await supabase.from('statuses').insert({
      user_id: currentUser.supabase_id || currentUser.id,
      type: 'text',
      content: text.trim(),
      bg_color: bg,
      emoji,
    });
    setPosting(false);
    onDone?.();
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-3d)' }}>

        {/* Preview */}
        <div className="h-52 flex flex-col items-center justify-center gap-3 relative"
             style={{ background: bg }}>
          {emoji && <span className="text-5xl drop-shadow-lg">{emoji}</span>}
          {text && <p className="text-white font-bold text-center text-lg px-6 leading-snug drop-shadow">{text}</p>}
          {!text && !emoji && <p className="text-white/40 text-sm">Your status preview</p>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="p-4 space-y-3">
          {/* Text input */}
          <textarea
            value={text} onChange={e => setText(e.target.value.slice(0, 100))}
            placeholder="What's on your mind? (100 chars)"
            rows={2}
            className="input resize-none text-sm"
          />

          {/* Emoji row */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setEmoji('')}
              className="w-8 h-8 rounded-lg text-xs flex items-center justify-center border transition-all"
              style={{ borderColor: !emoji ? 'var(--accent)' : 'var(--border)', background: !emoji ? 'rgba(99,102,241,0.12)' : 'var(--bg-hover)' }}>
              ✕
            </button>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className="w-8 h-8 rounded-lg text-lg flex items-center justify-center border transition-all"
                style={{ borderColor: emoji === e ? 'var(--accent)' : 'var(--border)', background: emoji === e ? 'rgba(99,102,241,0.12)' : 'var(--bg-hover)' }}>
                {e}
              </button>
            ))}
          </div>

          {/* BG picker */}
          <div className="flex gap-1.5">
            {BG_PRESETS.map((g, i) => (
              <button key={i} onClick={() => setBg(g)}
                className="w-7 h-7 rounded-lg flex-shrink-0 border-2 transition-all"
                style={{ background: g, borderColor: bg === g ? 'white' : 'transparent',
                         boxShadow: bg === g ? '0 0 0 1px var(--accent)' : 'none' }} />
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 btn-ghost text-sm">Cancel</button>
            <button onClick={post} disabled={posting || (!text.trim() && !emoji)}
              className="flex-1 btn-primary text-sm">
              {posting ? '⏳ Posting...' : '✨ Post Status'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Status Viewer ─────────────────────────────────────────── */
const StatusViewer = ({ statuses, author, currentUser, onClose }) => {
  const [idx, setIdx] = useState(0);
  const status = statuses[idx];
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const duration = 6000;
    const start    = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct     = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(tick);
      else if (idx < statuses.length - 1) { setIdx(i => i + 1); }
      else onClose();
    };
    const raf = requestAnimationFrame(tick);

    // Mark as viewed
    if (status && currentUser) {
      const userId = currentUser.supabase_id || currentUser.id;
      if (!status.viewed_by?.includes(userId)) {
        supabase.from('statuses')
          .update({ viewed_by: [...(status.viewed_by || []), userId] })
          .eq('id', status.id);
      }
    }
    return () => cancelAnimationFrame(raf);
  }, [idx]);

  if (!status) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        className="relative w-full max-w-xs mx-auto h-[70vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: status.bg_color }}
        onClick={e => e.stopPropagation()}>

        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3">
          {statuses.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <div className="h-full bg-white transition-none"
                   style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* Author */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
               style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
            {author?.avatar_url
              ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
              : initials(author?.display_name || author?.username)
            }
          </div>
          <div>
            <p className="text-white text-xs font-semibold">{author?.display_name || author?.username}</p>
            <p className="text-white/60 text-[10px]">{new Date(status.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/60 hover:text-white transition-colors">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
          {status.emoji && <span className="text-7xl drop-shadow-2xl">{status.emoji}</span>}
          {status.content && (
            <p className="text-white font-bold text-xl text-center leading-snug drop-shadow-lg">
              {status.content}
            </p>
          )}
        </div>

        {/* Nav hints */}
        <div className="absolute inset-y-1/4 left-0 w-1/3 cursor-pointer"
             onClick={() => setIdx(Math.max(0, idx - 1))} />
        <div className="absolute inset-y-1/4 right-0 w-1/3 cursor-pointer"
             onClick={() => setIdx(Math.min(statuses.length - 1, idx + 1))} />
      </motion.div>
    </motion.div>
  );
};

/* ─── StatusRow — Horizontal strip ─────────────────────────── */
export default function StatusStrip({ currentUser, connectedUsers }) {
  const [statuses, setStatuses]     = useState({}); // { user_id: [statuses] }
  const [composing, setComposing]   = useState(false);
  const [viewing, setViewing]       = useState(null); // { userId, statuses }

  const loadStatuses = async () => {
    const { data } = await supabase.from('statuses')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    if (!data) return;
    const grouped = {};
    data.forEach(s => {
      if (!grouped[s.user_id]) grouped[s.user_id] = [];
      grouped[s.user_id].push(s);
    });
    setStatuses(grouped);
  };

  useEffect(() => {
    loadStatuses();
    const channel = supabase.channel('statuses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuses' }, loadStatuses)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const myId    = currentUser?.supabase_id || currentUser?.id;
  const myStatus = statuses[myId] || [];

  const peers   = connectedUsers?.filter(u => statuses[u.supabase_id || u.id]?.length > 0) || [];

  const hasViewed = (userId) => {
    const s = statuses[userId]?.[0];
    return s?.viewed_by?.includes(myId);
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b overflow-x-auto"
           style={{ borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
        {/* My status */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative cursor-pointer" onClick={() => setComposing(true)}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {currentUser?.avatar_url
                ? <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials(currentUser?.display_name || currentUser?.username)
              }
            </div>
            {/* Add button overlay */}
            {myStatus.length === 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white"
                   style={{ background: 'var(--accent)', border: '2px solid var(--bg-raised)' }}>+</div>
            )}
            {myStatus.length > 0 && (
              <div className="absolute inset-0 rounded-full p-0.5"
                   style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                <div className="w-full h-full rounded-full" style={{ background: 'var(--bg-raised)' }} />
              </div>
            )}
          </div>
          <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>My Status</span>
        </div>

        {/* Connections with status */}
        {peers.map(u => {
          const uid   = u.supabase_id || u.id;
          const sList = statuses[uid] || [];
          const seen  = hasViewed(uid);
          return (
            <div key={uid} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
                 onClick={() => setViewing({ userId: uid, statuses: sList, author: u })}>
              <div className="relative w-12 h-12">
                {/* Status ring */}
                <div className="absolute inset-0 rounded-full p-0.5"
                     style={{ background: seen ? 'var(--border)' : 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                  <div className="w-full h-full rounded-full" style={{ background: 'var(--bg-raised)' }} />
                </div>
                <div className="absolute inset-1 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                     style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    : initials(u.display_name || u.username)
                  }
                </div>
              </div>
              <span className="text-[9px] truncate max-w-[48px]" style={{ color: 'var(--text-3)' }}>
                {u.display_name?.split(' ')[0] || u.username}
              </span>
            </div>
          );
        })}
      </div>

      {/* Compose modal */}
      <AnimatePresence>
        {composing && (
          <ComposeStatus currentUser={currentUser} onClose={() => setComposing(false)} onDone={loadStatuses} />
        )}
      </AnimatePresence>

      {/* Viewer modal */}
      <AnimatePresence>
        {viewing && (
          <StatusViewer
            statuses={viewing.statuses}
            author={viewing.author}
            currentUser={currentUser}
            onClose={() => setViewing(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
