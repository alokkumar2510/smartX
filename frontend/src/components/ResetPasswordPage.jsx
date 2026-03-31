import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import CyberBg from './CyberBg';

const ResetPasswordPage = ({ onDone }) => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => onDone?.(), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <CyberBg />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 text-center relative z-10">
          <p className="text-4xl mb-4">✅</p>
          <p className="font-orbitron text-lg text-neon-gradient">Password Updated!</p>
          <p className="text-xs text-white/30 mt-2">Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a1a' }}>
      <CyberBg />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <p className="text-3xl mb-2">🔑</p>
          <h2 className="font-orbitron text-xl font-bold text-neon-gradient">SET NEW PASSWORD</h2>
        </div>
        {error && (
          <div className="mb-4 px-4 py-2 rounded-xl text-xs font-mono"
            style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.2)', color: '#ff2d78' }}>
            ⚠ {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1.5 block">New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters" className="neon-input" required minLength={6} />
          </div>
          <div>
            <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1.5 block">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" className="neon-input" required minLength={6} />
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" disabled={loading}
            className="btn-neon w-full py-3.5 font-bold tracking-wider">
            {loading ? '⏳ Updating...' : '🔐 Update Password'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
