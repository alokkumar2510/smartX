/**
 * SmartChatX — Auth Screen
 *
 * LOGIN  tab: email + password  → instant access
 * SIGNUP tab: email + username + password → 6-digit OTP verification
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import CyberBg from './CyberBg';

// ── Kept for backward-compat imports in App.jsx ──────────────────────────────
export function ResetPasswordPage({ onDone }) {
  useEffect(() => { onDone?.(); }, [onDone]);
  return null;
}
export function EmailVerificationBanner() { return null; }

// ── Alert ─────────────────────────────────────────────────────────────────────
function Alert({ type, msg }) {
  if (!msg) return null;
  const isErr = type === 'error';
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        marginBottom: 16, padding: '10px 14px', borderRadius: 10,
        fontSize: 12, fontFamily: 'var(--font-mono)',
        background: isErr ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.08)',
        border: isErr ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(52,211,153,0.25)',
        color: isErr ? '#f87171' : '#34d399',
      }}
    >
      {isErr ? '⚠ ' : '✓ '}{msg}
    </motion.div>
  );
}

// ── Styled input ───────────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, autoFocus, disabled, id, helpText, rightSlot }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontFamily: 'var(--font-mono)',
                      color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase',
                      letterSpacing: '0.08em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus} disabled={disabled}
          autoComplete={type === 'password' ? 'current-password' : 'off'}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: rightSlot ? '12px 48px 12px 14px' : '12px 14px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12, color: '#fff', fontSize: 14, outline: 'none',
            fontFamily: 'var(--font-sans)', transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.6)'; }}
          onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
      {helpText && <p style={{ margin: '5px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)',
                               fontFamily: 'var(--font-mono)' }}>{helpText}</p>}
    </div>
  );
}

// ── 6-box OTP input ───────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const update = (i, ch) => {
    if (!/^\d?$/.test(ch)) return;
    const next = [...digits]; next[i] = ch;
    onChange(next.join(''));
    if (ch && i < 5) setTimeout(() => refs.current[i + 1]?.focus(), 0);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!digits[i] && i > 0) {
        const next = [...digits]; next[i - 1] = '';
        onChange(next.join(''));
        setTimeout(() => refs.current[i - 1]?.focus(), 0);
      }
    } else if (e.key === 'ArrowLeft'  && i > 0) refs.current[i - 1]?.focus();
    else if   (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(digits.padEnd(6, '').slice(0, 6));
    if (digits.length > 0) setTimeout(() => refs.current[Math.min(digits.length, 5)]?.focus(), 0);
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '8px 0 20px' }}>
      {digits.map((d, i) => (
        <input key={i}
          ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" pattern="\d*"
          value={d} disabled={disabled}
          maxLength={1}
          onChange={e => update(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
            background: 'rgba(255,255,255,0.05)',
            border: d ? '2px solid rgba(99,102,241,0.7)' : '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, color: '#fff', outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: d ? '0 0 12px rgba(99,102,241,0.25)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────────
function SubmitBtn({ children, onClick, loading, disabled }) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled   ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: 15, letterSpacing: '0.02em',
        background: disabled || loading
          ? 'rgba(99,102,241,0.3)'
          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff',
        boxShadow: disabled || loading ? 'none' : '0 0 24px rgba(99,102,241,0.35)',
        transition: 'all 0.2s',
      }}
    >
      {loading ? '⏳ Please wait…' : children}
    </motion.button>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
function Tabs({ active, onChange }) {
  return (
    <div style={{
      display: 'flex', background: 'rgba(255,255,255,0.04)',
      borderRadius: 12, padding: 4, marginBottom: 28, gap: 4,
    }}>
      {['login', 'signup'].map(tab => (
        <button key={tab} onClick={() => onChange(tab)}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, letterSpacing: '0.03em',
            background: active === tab
              ? 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.4))'
              : 'transparent',
            color: active === tab ? '#fff' : 'rgba(255,255,255,0.35)',
            boxShadow: active === tab ? '0 0 12px rgba(99,102,241,0.2)' : 'none',
            transition: 'all 0.2s',
          }}>
          {tab === 'login' ? '🔑 Login' : '✨ Sign Up'}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  LOGIN PANEL
// ══════════════════════════════════════════════════════════════════════════════
function LoginPanel() {
  const { login } = useAuth();
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [showPass, setShow]   = useState(false);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (busy) return;
    setError('');
    const em = email.trim().toLowerCase();
    if (!em.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (!password)         { setError('Please enter your password.'); return; }
    setBusy(true);
    try {
      await login(em, password);
      // onAuthStateChange in AuthContext fires → isLoggedIn → dashboard
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [email, password, busy, login]);

  return (
    <form onSubmit={handleSubmit} autoComplete="on">
      <AnimatePresence mode="wait">
        {error && <Alert key="err" type="error" msg={error} />}
      </AnimatePresence>

      <Field label="Email" type="email" value={email} onChange={setEmail}
             placeholder="you@example.com" autoFocus id="login-email"
             disabled={busy} />

      <Field label="Password" type={showPass ? 'text' : 'password'}
             value={password} onChange={setPass}
             placeholder="Your password" id="login-password" disabled={busy}
             rightSlot={
               <button type="button" onClick={() => setShow(v => !v)}
                 style={{ background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>
                 {showPass ? '🙈' : '👁'}
               </button>
             } />

      <div style={{ height: 8 }} />
      <SubmitBtn loading={busy}>Sign In →</SubmitBtn>
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SIGNUP PANEL  (Step 1: form → Step 2: OTP)
// ══════════════════════════════════════════════════════════════════════════════
function SignupPanel() {
  const { signUp, verifyEmailOtp } = useAuth();

  // Step state
  const [step, setStep]       = useState('form'); // 'form' | 'sending' | 'otp'
  const [email, setEmail]     = useState('');
  const [username, setUname]  = useState('');
  const [password, setPass]   = useState('');
  const [confirmPw, setConf]  = useState('');
  const [showPass, setShow]   = useState(false);
  const [otp, setOtp]         = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (otp.length === 6 && step === 'otp' && !busy) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleSignUp = useCallback(async (e) => {
    e?.preventDefault();
    if (busy) return;
    setError(''); setSuccess('');

    const em = email.trim().toLowerCase();
    const un = username.trim();

    if (!em.includes('@'))       { setError('Please enter a valid email address.'); return; }
    if (un.length < 3)           { setError('Username must be at least 3 characters.'); return; }
    if (/\s/.test(un))           { setError('Username cannot contain spaces.'); return; }
    if (password.length < 8)     { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPw)  { setError('Passwords do not match.'); return; }

    setBusy(true); setStep('sending');
    try {
      await signUp(em, password, un);
      setStep('otp');
      setSuccess(`Verification code sent to ${em} — check your inbox!`);
    } catch (err) {
      setError(err.message);
      setStep('form');
    } finally {
      setBusy(false);
    }
  }, [email, username, password, confirmPw, busy, signUp]);

  const handleVerify = useCallback(async () => {
    if (busy || otp.length < 6) return;
    setError(''); setSuccess('');
    setBusy(true);
    try {
      await verifyEmailOtp(email.trim().toLowerCase(), otp);
      // onAuthStateChange fires → user logged in → dashboard
    } catch (err) {
      setError(err.message);
      setOtp('');
      setBusy(false);
    }
  }, [email, otp, busy, verifyEmailOtp]);

  const handleBack = () => {
    setStep('form'); setOtp(''); setError(''); setSuccess('');
  };

  // ── OTP step ────────────────────────────────────────────────────
  if (step === 'otp' || step === 'verifying') {
    return (
      <motion.div key="otp-step"
        initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}>

        <AnimatePresence mode="wait">
          {error   && <Alert key="e" type="error"   msg={error} />}
          {success && <Alert key="s" type="success" msg={success} />}
        </AnimatePresence>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}
            style={{ fontSize: 36, marginBottom: 10 }}>📬</motion.div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            Enter the <strong style={{ color: '#a78bfa' }}>6-digit code</strong> sent to<br/>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              {email}
            </span>
          </p>
        </div>

        <OtpInput value={otp} onChange={setOtp} disabled={busy} />

        <SubmitBtn onClick={handleVerify} loading={busy}
          disabled={otp.length < 6 || busy}>
          Verify & Create Account ✓
        </SubmitBtn>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={handleBack} disabled={busy}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
                     color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            ← Change details
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Form step ───────────────────────────────────────────────────
  return (
    <motion.div key="form-step"
      initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}>
      <form onSubmit={handleSignUp} autoComplete="off">
        <AnimatePresence mode="wait">
          {error && <Alert key="err" type="error" msg={error} />}
        </AnimatePresence>

        <Field label="Email" type="email" value={email} onChange={setEmail}
               placeholder="you@example.com" autoFocus id="signup-email"
               disabled={busy} />

        <Field label="Username" value={username} onChange={setUname}
               placeholder="e.g. john_doe" id="signup-username" disabled={busy}
               helpText="Min 3 chars · no spaces" />

        <Field label="Password" type={showPass ? 'text' : 'password'}
               value={password} onChange={setPass}
               placeholder="Min 8 characters" id="signup-password" disabled={busy}
               helpText="At least 8 characters"
               rightSlot={
                 <button type="button" onClick={() => setShow(v => !v)}
                   style={{ background: 'none', border: 'none', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.35)', fontSize: 16 }}>
                   {showPass ? '🙈' : '👁'}
                 </button>
               } />

        <Field label="Confirm Password" type={showPass ? 'text' : 'password'}
               value={confirmPw} onChange={setConf}
               placeholder="Repeat your password" id="signup-confirm" disabled={busy} />

        <div style={{ height: 8 }} />
        <SubmitBtn loading={busy || step === 'sending'}>
          {step === 'sending' ? 'Sending code…' : 'Create Account →'}
        </SubmitBtn>
      </form>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN AuthScreen
// ══════════════════════════════════════════════════════════════════════════════
const AuthScreen = () => {
  const [tab, setTab] = useState('login');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative"
         style={{ background: '#05050A' }}>
      <CyberBg />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

      <motion.div
        key="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: 'spring', damping: 24 }}
        className="glass-card p-9 w-full max-w-[440px] relative z-10"
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
              border: '1px solid rgba(99,102,241,0.3)', fontSize: 26, marginBottom: 16,
              boxShadow: '0 0 30px rgba(99,102,241,0.15)',
            }}
          >⚡</motion.div>

          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 26,
                       color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
            SMART<span style={{ background: 'linear-gradient(90deg,#818cf8,#a78bfa)',
                                 WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CHAT X
            </span>
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
            {tab === 'login' ? 'Welcome back. Sign in to continue.' : 'Create your account — it only takes a minute.'}
          </p>
        </div>

        {/* Tab bar */}
        <Tabs active={tab} onChange={t => setTab(t)} />

        {/* Panels */}
        <AnimatePresence mode="wait">
          {tab === 'login'
            ? <motion.div key="login-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LoginPanel />
              </motion.div>
            : <motion.div key="signup-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SignupPanel />
              </motion.div>
          }
        </AnimatePresence>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11,
                    color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
          🔒 End-to-end encrypted · Powered by Supabase
        </p>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
