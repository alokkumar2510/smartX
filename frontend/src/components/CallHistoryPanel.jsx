/**
 * CallHistoryPanel — Incoming / Outgoing / Missed calls
 * SmartChat X v4.1
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffH = diffMs / 3600000;
  if (diffH < 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const directionMeta = {
  outgoing: { icon: '↗', color: '#00f0ff', label: 'Outgoing' },
  incoming: { icon: '↙', color: '#00ff88', label: 'Incoming' },
  missed:   { icon: '↙', color: '#ff4466', label: 'Missed'   },
};

export default function CallHistoryPanel({ currentUser, onClose, onCall }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | incoming | outgoing | missed

  useEffect(() => {
    if (!currentUser?.supabase_id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('call_history')
        .select('*')
        .or(`caller_id.eq.${currentUser.supabase_id},callee_id.eq.${currentUser.supabase_id}`)
        .order('started_at', { ascending: false })
        .limit(100);
      setCalls(data || []);
      setLoading(false);
    };
    load();

    // Realtime updates
    const ch = supabase.channel('call-history-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_history' }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [currentUser?.supabase_id]);

  const filtered = calls.filter(c => filter === 'all' || c.direction === filter || (filter === 'missed' && c.status === 'missed'));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-sm bg-[#0e0e22] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,240,255,0.08)] flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-white/5"
          style={{ background: 'rgba(0,240,255,0.03)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📞</span>
            <h2 className="font-orbitron text-sm font-bold text-white/90 tracking-wider">Call History</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">✕</button>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-white/5 shrink-0">
          {[
            { key: 'all', label: 'All' },
            { key: 'incoming', label: 'Incoming' },
            { key: 'outgoing', label: 'Outgoing' },
            { key: 'missed', label: 'Missed' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 py-2.5 text-[10px] font-mono font-medium border-b-2 transition-colors ${
                filter === key
                  ? 'border-neon-cyan text-neon-cyan'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="text-2xl">⟳</motion.div>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 px-6">
              <p className="text-white/20 text-xs font-mono">No {filter === 'all' ? '' : filter} calls yet.</p>
            </div>
          )}
          <AnimatePresence>
            {filtered.map((call, i) => {
              const isOutgoing = call.caller_id === currentUser?.supabase_id;
              const dir = call.status === 'missed' ? 'missed' : isOutgoing ? 'outgoing' : 'incoming';
              const meta = directionMeta[dir];
              const otherName = isOutgoing ? (call.callee_name || 'Unknown') : (call.caller_name || 'Unknown');

              return (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  {/* Direction icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
                  >
                    <span style={{ color: meta.color }}>{meta.icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-poppins font-medium text-white/85 truncate">{otherName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-mono" style={{ color: meta.color }}>{meta.label}</span>
                      <span className="text-[9px] text-white/25">•</span>
                      <span className="text-[9px] text-white/30 font-mono">
                        {call.call_type === 'video' ? '📹' : '📞'} {formatDuration(call.duration_s)}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp + callback */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono text-white/25">{formatTimestamp(call.started_at)}</span>
                    {onCall && (
                      <motion.button
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => onCall(isOutgoing ? call.callee_id : call.caller_id, otherName, call.call_type)}
                        className="text-[10px] px-2 py-0.5 rounded-lg transition-colors"
                        style={{ background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.15)', color: '#00f0ff' }}
                        title="Call back"
                      >
                        ↩
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
