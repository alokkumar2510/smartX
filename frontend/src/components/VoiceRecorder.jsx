/**
 * VoiceRecorder — In-chat voice message recorder
 * SmartChat X v5 · Uses MediaRecorder + Supabase Storage
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

/* ─── Animated Waveform ─────────────────────────────────────── */
const Waveform = ({ isRecording }) => (
  <div className="flex items-center gap-0.5 h-5">
    {Array.from({ length: 14 }).map((_, i) => (
      <motion.div
        key={i}
        className="w-0.5 rounded-full"
        style={{ background: 'var(--accent)' }}
        animate={isRecording ? {
          height: [4, Math.random() * 16 + 4, 4],
          opacity: [0.4, 1, 0.4],
        } : { height: 4, opacity: 0.3 }}
        transition={{
          duration: 0.6 + i * 0.05,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: i * 0.04,
        }}
      />
    ))}
  </div>
);

/* ─── Audio Player for received voice messages ──────────────── */
export const VoicePlayer = ({ url, isOwn, duration }) => {
  const audioRef = useRef(null);
  const [playing,   setPlaying]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [totalDur,  setTotalDur]  = useState(duration || 0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else         { audioRef.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl min-w-[160px] max-w-[220px]"
         style={{
           background: isOwn ? 'rgba(255,255,255,0.12)' : 'var(--bg-hover)',
           border: `1px solid ${isOwn ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`,
         }}>
      <audio ref={audioRef} src={url}
        onTimeUpdate={e => setProgress((e.target.currentTime / e.target.duration) * 100 || 0)}
        onLoadedMetadata={e => setTotalDur(Math.round(e.target.duration))}
        onEnded={() => setPlaying(false)} />

      <motion.button whileTap={{ scale: 0.85 }} onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
        <span className="text-white text-xs">{playing ? '⏸' : '▶'}</span>
      </motion.button>

      {/* Progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <motion.div className="h-full rounded-full"
            style={{ background: 'var(--accent)', width: `${progress}%` }}
            transition={{ ease: 'linear' }} />
        </div>
        <div className="flex justify-between">
          <span className="text-[10px]" style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-3)' }}>
            {playing ? `${Math.round((progress / 100) * totalDur)}s` : '🎤 Voice'}
          </span>
          <span className="text-[10px]" style={{ color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--text-3)' }}>
            {totalDur}s
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─── VoiceRecorder Button ──────────────────────────────────── */
export default function VoiceRecorder({ onSend, disabled }) {
  const [recording,  setRecording]  = useState(false);
  const [seconds,    setSeconds]    = useState(0);
  const [uploading,  setUploading]  = useState(false);
  const mediaRecRef  = useRef(null);
  const chunksRef    = useRef([]);
  const timerRef     = useRef(null);
  const MAX_SECS     = 120; // 2 min max

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startRecording = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current  = [];
      mediaRecRef.current = recorder;

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob    = new Blob(chunksRef.current, { type: 'audio/webm' });
        const dur     = seconds;
        setSeconds(0);
        setUploading(true);
        await uploadVoice(blob, dur);
        setUploading(false);
      };

      recorder.start(250);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= MAX_SECS) { stopRecording(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    setRecording(false);
    mediaRecRef.current?.stop();
  };

  const cancelRecording = () => {
    clearInterval(timerRef.current);
    setRecording(false);
    setSeconds(0);
    mediaRecRef.current?.stream?.getTracks().forEach(t => t.stop());
    mediaRecRef.current = null;
    chunksRef.current   = [];
  };

  const uploadVoice = async (blob, duration) => {
    const filename = `voice_${Date.now()}.webm`;
    const { data, error } = await supabase.storage
      .from('voice-messages')
      .upload(filename, blob, { contentType: 'audio/webm', upsert: false });
    if (error) { console.error('Voice upload failed:', error); return; }
    const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(filename);
    onSend?.({ type: 'voice', url: urlData.publicUrl, duration });
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (disabled) return null;

  return (
    <AnimatePresence mode="wait">
      {/* Recording state */}
      {recording ? (
        <motion.div key="rec"
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 20 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>

          {/* Recording dot */}
          <motion.div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0"
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />

          <Waveform isRecording />

          <span className="text-xs font-mono text-red-400 flex-shrink-0">{fmt(seconds)}</span>

          {/* Cancel */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={cancelRecording}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            ✕
          </motion.button>

          {/* Send */}
          <motion.button whileTap={{ scale: 0.85 }} onClick={stopRecording}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
            ✓
          </motion.button>
        </motion.div>
      ) : uploading ? (
        <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
          style={{ color: 'var(--text-3)' }}>
          <motion.div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)' }} />
          Sending...
        </motion.div>
      ) : (
        /* Idle mic button */
        <motion.button key="idle"
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }}
          onMouseDown={startRecording}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-colors"
          style={{ color: 'var(--text-3)', background: 'var(--bg-hover)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          title="Hold to record voice message">
          🎤
        </motion.button>
      )}
    </AnimatePresence>
  );
}
