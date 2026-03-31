/**
 * UserProfileModal — Profile Picture, Display Name, Bio
 * SmartChat X v4.1
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

/* ─── Avatar Upload Helper ───────────────────────────────── */
const MAX_SIZE = 400; // px – resize before upload

function resizeImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(resolve, 'image/webp', 0.82);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/* ─── Avatar Component ───────────────────────────────────── */
const Avatar = ({ url, username, size = 'lg' }) => {
  const dim = size === 'lg' ? 'w-24 h-24 text-4xl' : 'w-10 h-10 text-lg';
  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className={`${dim} rounded-full object-cover border-2 border-neon-cyan/40`}
        style={{ boxShadow: '0 0 20px rgba(0,240,255,0.2)' }}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center bg-white/5 border-2 border-white/10`}
    >
      {username?.[0]?.toUpperCase() || '👤'}
    </div>
  );
};

/* ─── Main Modal ─────────────────────────────────────────── */
export default function UserProfileModal({ currentUser, onClose, onProfileUpdate }) {
  const [profile, setProfile] = useState({
    username: currentUser?.username || '',
    display_name: currentUser?.display_name || '',
    bio: currentUser?.bio || '',
    avatar_url: currentUser?.avatar_url || null,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const fileRef = useRef(null);

  // Reload fresh profile from DB
  useEffect(() => {
    if (!currentUser?.supabase_id) return;
    supabase
      .from('users')
      .select('username, display_name, bio, avatar_url')
      .eq('supabase_id', currentUser.supabase_id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(p => ({ ...p, ...data }));
      });
  }, [currentUser?.supabase_id]);

  /* ── Upload avatar ────────────────────────────── */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const blob = await resizeImage(file);
      const path = `${currentUser.supabase_id}/avatar.webp`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/webp' });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      // Bust cache
      const urlWithTs = `${publicUrl}?t=${Date.now()}`;
      setProfile(p => ({ ...p, avatar_url: urlWithTs }));
      setMsg({ type: 'ok', text: 'Avatar uploaded!' });
    } catch (err) {
      setMsg({ type: 'err', text: `Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await supabase.storage.from('avatars').remove([`${currentUser.supabase_id}/avatar.webp`]);
      setProfile(p => ({ ...p, avatar_url: null }));
      setMsg({ type: 'ok', text: 'Avatar removed.' });
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  /* ── Save profile ─────────────────────────────── */
  const saveProfile = async () => {
    if (!currentUser?.supabase_id) return;
    setSaving(true);
    setMsg(null);
    try {
      const updates = {
        display_name: profile.display_name.trim() || null,
        bio: profile.bio.trim(),
        avatar_url: profile.avatar_url,
      };
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('supabase_id', currentUser.supabase_id);
      if (error) throw error;
      setMsg({ type: 'ok', text: 'Profile saved successfully!' });
      setEditMode(false);
      onProfileUpdate?.({ ...currentUser, ...updates });
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-sm bg-[#0e0e22] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,240,255,0.08)] flex flex-col"
      >
        {/* Header */}
        <div
          className="relative h-28 flex items-end pb-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0,240,255,0.12) 0%, rgba(179,71,234,0.12) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/30 hover:text-white transition-colors text-lg"
          >
            ✕
          </button>
          <div className="px-5 pb-0 -mb-12 relative z-10">
            <div className="relative inline-block">
              <Avatar url={profile.avatar_url} username={profile.username} size="lg" />
              {editMode && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center gap-1">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-xs text-white/90 hover:text-white font-mono"
                  >
                    {uploading ? '⟳' : '📷'}
                  </button>
                  {profile.avatar_url && (
                    <button
                      onClick={removeAvatar}
                      disabled={uploading}
                      className="text-[10px] text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Profile Content */}
        <div className="px-5 pt-14 pb-5 space-y-4">
          {/* Name Row */}
          <div>
            {editMode ? (
              <input
                value={profile.display_name}
                onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
                placeholder="Display name"
                maxLength={40}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 font-poppins outline-none focus:border-neon-cyan/40 transition-colors"
              />
            ) : (
              <p className="font-orbitron font-bold text-white/90 text-base tracking-wide">
                {profile.display_name || profile.username}
              </p>
            )}
            <p className="text-xs text-white/30 font-mono mt-0.5">@{profile.username}</p>
          </div>

          {/* Bio */}
          <div>
            <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-1">Bio</p>
            {editMode ? (
              <textarea
                value={profile.bio}
                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell people about yourself..."
                maxLength={200}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 font-poppins outline-none focus:border-neon-cyan/40 transition-colors resize-none"
              />
            ) : (
              <p className="text-xs text-white/50 font-poppins leading-relaxed">
                {profile.bio || <span className="text-white/20 italic">No bio yet.</span>}
              </p>
            )}
          </div>

          {/* Status message */}
          <AnimatePresence>
            {msg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-xs font-mono ${msg.type === 'ok' ? 'text-neon-green' : 'text-red-400'}`}
              >
                {msg.type === 'ok' ? '✓ ' : '✗ '}{msg.text}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {editMode ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,240,255,0.1))',
                    border: '1px solid rgba(0,255,136,0.3)',
                    color: '#00ff88',
                  }}
                >
                  {saving ? '⟳ Saving...' : '✓ Save Profile'}
                </motion.button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 text-xs text-white/30 hover:text-white/60 font-mono transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setEditMode(true)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-all"
                style={{
                  background: 'rgba(0,240,255,0.05)',
                  border: '1px solid rgba(0,240,255,0.15)',
                  color: '#00f0ff',
                }}
              >
                ✎ Edit Profile
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
