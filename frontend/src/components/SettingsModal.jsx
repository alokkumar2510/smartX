/**
 * SettingsModal — Privacy, Appearance, Blocked Users
 * SmartChat X v5
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { usePrivacy, DEFAULT_PRIVACY } from '../hooks/usePrivacy';

/* ─── Shared Sub-components ────────────────────────────────── */

const Toggle = ({ checked, onChange, label, sub }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b last:border-0" 
       style={{ borderColor: 'var(--border)' }}>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
      style={{ background: checked ? 'var(--accent)' : 'var(--border)', 
               boxShadow: checked ? '0 0 10px rgba(99,102,241,0.4)' : 'none' }}
    >
      <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow"
            style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  </div>
);

const Select = ({ label, sub, value, onChange, options }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0"
       style={{ borderColor: 'var(--border)' }}>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs px-3 py-1.5 rounded-lg border outline-none cursor-pointer"
      style={{ 
        background: 'var(--bg-hover)', 
        color: 'var(--text-1)', 
        borderColor: 'var(--border)',
        minWidth: 110
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const visOpts = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'connections', label: 'Connections' },
  { value: 'nobody', label: 'Only Me' },
];
const msgOpts = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'connections', label: 'Connections only' },
];

/* ─── Tab Definitions ──────────────────────────────────────── */
const TABS = [
  { key: 'privacy',    icon: '🔒', label: 'Privacy'   },
  { key: 'appearance', icon: '🎨', label: 'Appearance' },
  { key: 'blocks',     icon: '🚫', label: 'Blocked'   },
];

/* ─── Main Modal ───────────────────────────────────────────── */
export default function SettingsModal({ currentUser, users, blocks, onClose, onThemeChange }) {
  const [tab, setTab] = useState('privacy');
  const { privacy, savePrivacy, loaded } = usePrivacy(currentUser?.supabase_id);
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Derived blocked list
  const blockedUsers = blocks
    .filter(b => b.blocker_id === currentUser?.id)
    .map(id => users.find(u => u.id === id.blocked_id))
    .filter(Boolean);

  const unblock = async (targetId) => {
    await supabase.from('blocks').delete()
      .eq('blocker_id', currentUser.id)
      .eq('blocked_id', targetId);
  };

  const handleSave = async (key, val) => {
    setSaving(true);
    await savePrivacy({ [key]: val });
    if (key === 'theme') onThemeChange?.(val);
    setSaving(false);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1800);
  };

  const handleDND = async (val) => {
    const dnd_until = val ? null : null; // you can add time picker later
    setSaving(true);
    await savePrivacy({ do_not_disturb: val, dnd_until });
    setSaving(false);
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ 
          background: 'var(--bg-raised)', 
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-3d)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
             style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                 style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              ⚙️
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Settings</h2>
              <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>Privacy & Appearance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {savedIndicator && (
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
                  ✓ Saved
                </motion.span>
              )}
            </AnimatePresence>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors"
              style={{
                borderColor: tab === t.key ? 'var(--accent)' : 'transparent',
                color: tab === t.key ? 'var(--accent)' : 'var(--text-3)',
              }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll p-5">
          <AnimatePresence mode="wait">
            {tab === 'privacy' && loaded && (
              <motion.div key="privacy" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                
                {/* DND Banner */}
                {privacy.do_not_disturb && (
                  <div className="mb-4 flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl"
                       style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                    🌙 Do Not Disturb is active — calls & notifications silenced
                  </div>
                )}

                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 mt-0" 
                   style={{ color: 'var(--text-3)' }}>VISIBILITY</p>
                <div className="rounded-xl overflow-hidden mb-4" 
                     style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                  <div className="px-4">
                    <Select label="Last Seen" sub="Who can see when you were last active"
                      value={privacy.last_seen} onChange={v => handleSave('last_seen', v)}
                      options={visOpts} />
                    <Select label="Profile Visibility" sub="Who can view your profile information"
                      value={privacy.profile_vis} onChange={v => handleSave('profile_vis', v)}
                      options={[{ value: 'everyone', label: 'Everyone' }, { value: 'connections', label: 'Connections' }]} />
                  </div>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" 
                   style={{ color: 'var(--text-3)' }}>COMMUNICATION</p>
                <div className="rounded-xl overflow-hidden mb-4"
                     style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                  <div className="px-4">
                    <Select label="Who Can Message Me" sub="Non-connections will see a 'Request' option"
                      value={privacy.who_can_message} onChange={v => handleSave('who_can_message', v)}
                      options={msgOpts} />
                    <Select label="Who Can Call Me" sub="Others will get a 'Request Call' prompt"
                      value={privacy.who_can_call} onChange={v => handleSave('who_can_call', v)}
                      options={msgOpts} />
                  </div>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                   style={{ color: 'var(--text-3)' }}>READ STATUS & FOCUS</p>
                <div className="rounded-xl overflow-hidden"
                     style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                  <div className="px-4">
                    <Toggle label="Read Receipts"
                      sub="Show double-check when you've read messages"
                      checked={privacy.read_receipts}
                      onChange={v => handleSave('read_receipts', v)} />
                    <Toggle label="Do Not Disturb"
                      sub="Silence all calls, messages & notifications"
                      checked={privacy.do_not_disturb}
                      onChange={v => handleDND(v)} />
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'appearance' && (
              <motion.div key="appearance" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                   style={{ color: 'var(--text-3)' }}>THEME</p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { key: 'dark', label: 'Dark', desc: 'Deep space vibes', icon: '🌑' },
                    { key: 'light', label: 'Light', desc: 'Clean & bright', icon: '☀️' },
                  ].map(t => (
                    <motion.button
                      key={t.key}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleSave('theme', t.key)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all"
                      style={{
                        background: t.key === 'dark' ? '#09090b' : '#f8f8fc',
                        borderColor: privacy.theme === t.key ? 'var(--accent)' : 'var(--border)',
                        boxShadow: privacy.theme === t.key ? '0 0 20px rgba(99,102,241,0.2)' : 'none',
                      }}>
                      <span className="text-2xl">{t.icon}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: t.key === 'dark' ? '#f4f4f5' : '#18181b' }}>{t.label}</p>
                        <p className="text-[10px]" style={{ color: t.key === 'dark' ? '#71717a' : '#a1a1aa' }}>{t.desc}</p>
                      </div>
                      {privacy.theme === t.key && (
                        <span className="text-xs rounded-full px-2 py-0.5" 
                              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>Active</span>
                      )}
                    </motion.button>
                  ))}
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                   style={{ color: 'var(--text-3)' }}>APP INFO</p>
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                         style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>⚡</div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>SmartChat X</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>v5.0 · AI-Powered · P2P</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                    End-to-end encrypted DMs · WebRTC calls · AI smart replies · TCP/UDP/P2P routing
                  </p>
                </div>
              </motion.div>
            )}

            {tab === 'blocks' && (
              <motion.div key="blocks" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                {blockedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-3xl mb-3 block">✅</span>
                    <p className="text-sm" style={{ color: 'var(--text-3)' }}>No blocked users</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Your block list is empty</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map(u => (
                      <motion.div key={u.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-3">
                          <div className="avatar-md text-sm"
                               style={{ background: 'linear-gradient(135deg, #71717a, #52525b)' }}>
                            {u.avatar || u.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{u.username}</span>
                        </div>
                        <button onClick={() => unblock(u.id)}
                          className="text-xs px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}>
                          Unblock
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
