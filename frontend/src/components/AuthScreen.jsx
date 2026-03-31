import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import CyberBg from './CyberBg';

// ── Password strength helper ───────────────────────────────────────────────
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)      score++;
  if (/[A-Z]/.test(pw))   score++;
  if (/[0-9]/.test(pw))   score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: 'Weak',   color: '#ff4564' },
    { label: 'Fair',   color: '#ff9445' },
    { label: 'Good',   color: '#ffd700' },
    { label: 'Strong', color: '#00ff88' },
    { label: 'Great',  color: '#00f0ff' },
  ];
  return { score, ...levels[score] };
}

const AVATARS = ['👤','🧑‍💻','👨‍🚀','🦸','🧙','🤖','👽','💀','🐱','🦊','🐺','🦅'];

// ═══════════════════════════════════════════════════════════════════════
//  ResetPasswordPage — rendered when URL contains type=recovery
// ═══════════════════════════════════════════════════════════════════════
export function ResetPasswordPage({ onDone }) {
  const { updatePassword } = useAuth();
  const [pw, setPw]         = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = useMemo(() => passwordStrength(pw), [pw]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw !== confirm)  return setError('Passwords do not match');
    if (pw.length < 8)   return setError('Password must be at least 8 characters');
    if (strength.score < 2) return setError('Please choose a stronger password');
    setLoading(true);
    try {
      await updatePassword(pw);
      setSuccess('Password updated! Redirecting…');
      setTimeout(onDone, 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: '#05050A' }}>
      <CyberBg />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 24 }}
        className="glass-card p-9 w-full max-w-[420px] relative z-10"
      >
        <div className="text-center mb-8">
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: 24, marginBottom: 20,
          }}>🔐</div>
          <h2
            className="hero-heading-gradient"
            style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 6 }}>
            Set New Password
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.01em' }}>Choose a strong password</p>
        </div>

        <AnimatePresence>
          {error   && <Alert type="error"   msg={error} />}
          {success && <Alert type="success" msg={success} />}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>New Password</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Min 8 characters" className="neon-input" required minLength={8} />
            {pw && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div className="h-1 rounded-full transition-all" animate={{ width: `${(strength.score/4)*100}%` }}
                    style={{ width: `${(strength.score/4)*100}%`, background: strength.color }} />
                </div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" className="neon-input" required minLength={8} />
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            type="submit" disabled={loading}
            className="btn-pill-dark w-full py-3 font-semibold relative overflow-hidden"
            style={{ borderRadius: 12, opacity: loading ? 0.6 : 1, justifyContent: 'center' }}>
            {loading ? 'Updating…' : 'Update Password'}
          </motion.button>
        </form>

        <p className="text-center mt-4" style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.12)' }}>
          Secured by Supabase Auth · PKCE · Token rotation
        </p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Shared alert component
// ═══════════════════════════════════════════════════════════════════════
function Alert({ type, msg }) {
  const isError = type === 'error';
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      style={{
        marginBottom: 16, padding: '10px 14px',
        borderRadius: 10, fontSize: 12,
        fontFamily: 'var(--font-mono)',
        background: isError ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)',
        border: isError ? '1px solid rgba(248,113,113,0.20)' : '1px solid rgba(52,211,153,0.20)',
        color: isError ? '#f87171' : '#34d399',
      }}>
      {isError ? '⚠ ' : '✓ '}{msg}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  EmailVerificationBanner — shown when logged in but email not confirmed
// ═══════════════════════════════════════════════════════════════════════
export function EmailVerificationBanner({ email }) {
  const { resendVerification, logout } = useAuth();
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    setLoading(true);
    try {
      await resendVerification(email);
      setSent(true);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: '#05050A' }}>
      <CyberBg />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 24 }}
        className="glass-card p-10 w-full max-w-[420px] relative z-10 text-center"
        style={{ gap: 0 }}
      >
        <motion.div animate={{ y: [0,-6,0] }} transition={{ repeat: Infinity, duration: 2.5 }}
          style={{ fontSize: 44, marginBottom: 20 }}>📧</motion.div>
        <h2 className="hero-heading-gradient"
          style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 12 }}>Verify Your Email</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 6 }}>
          We sent a link to <span style={{ color: '#fff', fontWeight: 500 }}>{email}</span>.
          Click it to activate your account.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', marginBottom: 28 }}>
          Check your spam folder if you don't see it.
        </p>
        {sent ? (
          <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#34d399', marginBottom: 16 }}>✓ Verification email resent!</p>
        ) : (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={resend} disabled={loading}
            className="btn-pill-dark w-full"
            style={{ justifyContent: 'center', borderRadius: 12, opacity: loading ? 0.6 : 1, marginBottom: 16 }}>
            {loading ? 'Sending…' : 'Resend Verification Email'}
          </motion.button>
        )}
        <button onClick={logout}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>
          ← Back to login
        </button>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  AuthScreen — Login / Signup / Forgot-password
// ═══════════════════════════════════════════════════════════════════════
const AuthScreen = () => {
  const { login, signUp, resetPassword } = useAuth();
  const [mode, setMode]               = useState('login');
  const [email, setEmail]             = useState('');
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar]           = useState('👤');
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPw, setShowPw]           = useState(false);
  const strength = useMemo(() => passwordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        // AuthContext listener triggers → user is set automatically
      } else if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (password.length < 8)         throw new Error('Password must be at least 8 characters');
        if (strength.score < 2)          throw new Error('Please choose a stronger password');
        if (username.length < 2)         throw new Error('Username must be at least 2 characters');
        const data = await signUp(email, password, username, avatar);
        // Supabase returns empty identities array when email already exists
        if (data?.user?.identities?.length === 0) {
          throw new Error('This email is already registered. Try logging in.');
        }
        setMode('verify');
        setSuccess('Check your email for a verification link!');
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccess('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); };

  const titles = {
    login:  ['WELCOME BACK',    'Enter your credentials'],
    signup: ['CREATE ACCOUNT',  'Join SmartChat X'],
    forgot: ['RESET PASSWORD',  'Enter your email'],
    verify: ['CHECK YOUR EMAIL','Verification sent'],
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: '#05050A' }}>
      <CyberBg />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 24 }}
        className="glass-card p-9 w-full max-w-[420px] relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: 24, marginBottom: 20,
          }}>⚡</div>
          <h2 className="hero-heading-gradient"
            style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 6 }}>
            {titles[mode][0]}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.01em' }}>
            {titles[mode][1]}
          </p>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error   && <Alert type="error"   msg={error} />}
          {success && <Alert type="success" msg={success} />}
        </AnimatePresence>

        {/* Verify screen */}
        {mode === 'verify' ? (
          <VerifyScreen email={email} onBack={() => switchMode('login')} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Avatar picker — signup only */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Choose Avatar</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {AVATARS.map(a => (
                      <motion.button key={a} type="button" whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setAvatar(a)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                        style={{
                          background: avatar === a ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${avatar === a ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.07)'}`,
                          boxShadow: avatar === a ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
                        }}>
                        {a}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username — signup only */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="Choose a username" className="neon-input" required minLength={2} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" className="neon-input" required autoComplete="email" />
            </div>

            {/* Password fields (not for forgot mode) */}
            {mode !== 'forgot' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Password</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters" className="neon-input pr-10" required minLength={8}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs font-mono transition-colors">
                      {showPw ? 'hide' : 'show'}
                    </button>
                  </div>
                  {/* Strength meter — signup only */}
                  {mode === 'signup' && password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <motion.div className="h-1 rounded-full"
                          style={{ width: `${(strength.score / 4) * 100}%`, background: strength.color }}
                          animate={{ width: `${(strength.score / 4) * 100}%` }} />
                      </div>
                      <span className="text-[9px] font-mono" style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  )}
                </div>
                {mode === 'signup' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password" className="neon-input" required minLength={8}
                      autoComplete="new-password" />
                    {/* Match indicator */}
                    {confirmPassword && (
                      <p className="text-[9px] font-mono mt-1" style={{ color: confirmPassword === password ? '#00ff88' : '#ff4564' }}>
                        {confirmPassword === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              type="submit" disabled={loading}
              className="btn-pill-white w-full font-semibold"
              style={{ justifyContent: 'center', borderRadius: 12, opacity: loading ? 0.6 : 1, padding: '13px 24px', marginTop: 4 }}>
              {loading ? 'Processing…' :
               mode === 'login'  ? 'Sign In' :
               mode === 'signup' ? 'Create Account' :
               'Send Reset Link'}
            </motion.button>
          </form>
        )}

        {/* Mode switchers */}
        <div className="text-center mt-6 space-y-2">
          {mode === 'login' && (
            <>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
                Don't have an account?{' '}
                <button onClick={() => switchMode('signup')}
                  style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
                    textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign Up</button>
              </p>
              <p>
                <button onClick={() => switchMode('forgot')}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.20)', background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.20)'}>
                  Forgot password?
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
              Already have an account?{' '}
              <button onClick={() => switchMode('login')}
                style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign In</button>
            </p>
          )}
          {(mode === 'forgot' || mode === 'verify') && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)' }}>
              <button onClick={() => switchMode('login')}
                style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>← Back to Login</button>
            </p>
          )}
        </div>

        <div className="text-center mt-4">
          <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.12)' }}>Secured by Supabase Auth · PKCE · Auto token refresh</p>
        </div>
      </motion.div>
    </div>
  );
};

// Inline verify sub-screen (shown after signup)
function VerifyScreen({ email, onBack }) {
  const { resendVerification } = useAuth();
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    setLoading(true);
    try { await resendVerification(email); setSent(true); } catch {}
    setLoading(false);
  };

  return (
    <div className="text-center space-y-4">
      <motion.div animate={{ y: [0,-6,0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-5xl mb-2">📧</motion.div>
      <p className="text-sm text-white/50 font-poppins">
        We sent a link to <span className="text-neon-cyan">{email}</span>
      </p>
      <p className="text-[10px] text-white/25 font-mono">Check your spam folder if you don't see it.</p>

      {sent ? (
        <p className="text-xs font-mono" style={{ color: '#00ff88' }}>✓ Verification email resent!</p>
      ) : (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={resend} disabled={loading}
          className="btn-neon w-full py-2.5 text-sm font-bold tracking-wider"
          style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? '⏳ Sending…' : '📨 Resend Verification Email'}
        </motion.button>
      )}

      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={onBack}
        className="btn-neon w-full py-3 font-bold tracking-wider mt-2">
        ⚡ Go to Login
      </motion.button>
    </div>
  );
}

export default AuthScreen;
