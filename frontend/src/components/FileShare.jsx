/**
 * FileShare — File upload + preview + download for DMs
 * SmartChat X v5 · Supabase Storage
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const MAX_MB      = 25;
const MAX_BYTES   = MAX_MB * 1024 * 1024;

const ICONS = {
  pdf:  '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt:  '📊', pptx: '📊', zip: '🗜️', rar: '🗜️', mp3: '🎵',
  mp4:  '🎬', mov: '🎬', txt: '📋', csv: '📊', json: '🔧',
  js: '🔧', ts: '🔧', py: '🐍', default: '📎',
};

const fileIcon  = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return ICONS[ext] || ICONS.default;
};

const fmtSize = (bytes) => {
  if (bytes < 1024)       return `${bytes}B`;
  if (bytes < 1024**2)    return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024**2).toFixed(1)}MB`;
};

/* ─── File Message Bubble Component ────────────────────────── */
export const FileMessage = ({ url, name, size, isOwn }) => (
  <a href={url} target="_blank" rel="noopener noreferrer"
     className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl no-underline min-w-[200px] max-w-[280px] group transition-all"
     style={{
       background: isOwn ? 'rgba(255,255,255,0.12)' : 'var(--bg-hover)',
       border: `1px solid ${isOwn ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`,
     }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
         style={{ background: isOwn ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.12)' }}>
      {fileIcon(name)}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold truncate"
         style={{ color: isOwn ? 'rgba(255,255,255,0.9)' : 'var(--text-1)' }}>
        {name}
      </p>
      <p className="text-[10px]" style={{ color: isOwn ? 'rgba(255,255,255,0.5)' : 'var(--text-3)' }}>
        {fmtSize(size || 0)} · Tap to open
      </p>
    </div>
    <div className="text-sm opacity-0 group-hover:opacity-100 transition-opacity"
         style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--accent)' }}>
      ↓
    </div>
  </a>
);

/* ─── FileUpload Button ─────────────────────────────────────── */
export default function FileUpload({ onSend, disabled }) {
  const inputRef           = useRef(null);
  const [progress, setProgress] = useState(null); // null | 0-100

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      alert(`Max file size is ${MAX_MB}MB.`);
      return;
    }

    setProgress(0);

    // Simulate chunked upload with progress (Supabase doesn't fire progress natively)
    const filename = `files/${Date.now()}_${file.name.replace(/[^a-z0-9.\-_]/gi, '_')}`;

    // Chunk simulation for progress UI
    const interval = setInterval(() => {
      setProgress(p => {
        if (p === null || p >= 85) { clearInterval(interval); return p; }
        return p + Math.random() * 15;
      });
    }, 200);

    const { error } = await supabase.storage
      .from('file-attachments')
      .upload(filename, file, { contentType: file.type, upsert: false });

    clearInterval(interval);
    if (error) { console.error('File upload error:', error); setProgress(null); return; }

    setProgress(100);
    const { data: urlData } = supabase.storage.from('file-attachments').getPublicUrl(filename);

    setTimeout(() => setProgress(null), 600);

    onSend?.({ type: 'file', url: urlData.publicUrl, name: file.name, size: file.size });
  };

  if (disabled) return null;

  return (
    <>
      <input ref={inputRef} type="file" className="hidden"
        accept="*/*" onChange={e => handleFile(e.target.files[0])} />

      <AnimatePresence mode="wait">
        {progress !== null ? (
          <motion.div key="progress"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', minWidth: 80 }}>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div className="h-full rounded-full"
                style={{ background: 'var(--accent)', width: `${Math.min(progress, 100)}%` }}
                transition={{ ease: 'easeOut' }} />
            </div>
            <span className="text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
              {Math.round(progress)}%
            </span>
          </motion.div>
        ) : (
          <motion.button key="btn"
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
            onClick={() => inputRef.current?.click()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-all"
            style={{ color: 'var(--text-3)', background: 'var(--bg-hover)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            title="Share file (max 25MB)">
            📎
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
