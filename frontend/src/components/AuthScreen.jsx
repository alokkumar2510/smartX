/**
 * SmartChatX — Auth Screen
 * Step 1: Enter email → Step 2: Enter 6-digit OTP code
 * Sends via Brevo SMTP (configured in Supabase Dashboard)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import CyberBg from './CyberBg';

// ── Password reset page (kept for recovery URLs) ────────────────────────────
export function ResetPasswordPage({ onDone }) {
  useEffect(() => {
    // OTP flow doesn't use password reset — redirect to login
    onDone?.();
  }, [onDone]);
  return null;
}

// ── Email verification banner (no longer needed with OTP) ────────────────────
export function EmailVerificationBanner({ email }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: '#05050A' }}>
      <CyberBg />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 24 }}
        className="glass-card p-10 w-full max-w-[420px] relative z-10 text-center"
      >
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}
          style={{ fontSize: 44, marginBottom: 20 }}>📧</motion.div>
        <h2 className="hero-heading-gradient" style={{ fontSize: 26, fontWeight: 600, marginBottom: 12 }}>
          Verifying…
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>
          Please wait while we verify your session.
        </p>
        <button onClick={logout}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Back to login
        </button>
      </motion.div>
    </div>
  );
}

// ── Alert component ───────────────────────────────────────────────────────────
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

// ── 6-Box OTP Input ───────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (i, ch) => {
    if (!/^\d?$/.test(ch)) return; // digits only
    const next = [...digits];
    next[i] = ch;
    onChange(next.join(''));
    // Auto-advance
    if (ch && i < 5) {
      setTimeout(() => inputs.current[i + 1]?.focus(), 0);
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!digits[i] && i > 0) {
        const next = [...digits];
        next[i - 1] = '';
        onChange(next.join(''));
        setTimeout(() => inputs.current[i - 1]?.focus(), 0);
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      inputs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted.padEnd(6, '').slice(0, 6));
      // Focus the last filled box
      const lastIdx = Math.min(pasted.length - 1, 5);
      setTimeout(() => inputs.current[lastIdx]?.focus(), 0);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '24px 0' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digits[i]}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={e => e.target.select()}
          disabled={disabled}
          whileFocus={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{
            width: 48,
            height: 58,
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            borderRadius: 12,
            background: digits[i]
              ? 'rgba(99,102,241,0.12)'
              : 'rgba(255,255,255,0.04)',
            border: digits[i]
              ? '2px solid rgba(99,102,241,0.55)'
              : '2px solid rgba(255,255,255,0.08)',
            color: digits[i] ? '#fff' : 'rgba(255,255,255,0.3)',
            outline: 'none',
            transition: 'all 0.18s ease',
            caretColor: 'transparent',
            opacity: disabled ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ── Resend Timer ──────────────────────────────────────────────────────────────
function ResendTimer({ cooldownUntil, onResend, loading }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const r = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemaining(r);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [cooldownUntil]);

  if (remaining > 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ textAlign: 'center', marginTop: 16 }}
      >
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Arc countdown */}
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
            <motion.circle
              cx="9" cy="9" r="7" fill="none"
              stroke="rgba(99,102,241,0.6)" strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 7}
              strokeDashoffset={2 * Math.PI * 7 * (1 - remaining / 60)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)' }}>
            Resend in {remaining}s
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 16 }}>
      <button
        onClick={onResend}
        disabled={loading}
        style={{
          fontSize: 12, fontFamily: 'var(--font-mono)',
          color: loading ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.8)',
          background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
          textDecoration: 'underline', textUnderlineOffset: 3,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => !loading && (e.currentTarget.style.color = '#818cf8')}
        onMouseLeave={e => !loading && (e.currentTarget.style.color = 'rgba(99,102,241,0.8)')}
      >
        {loading ? '⏳ Sending…' : '📨 Resend code'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN AUTH SCREEN — Step 1 (Email) + Step 2 (OTP)
// ═══════════════════════════════════════════════════════════════════════════
const AuthScreen = () => {
  const { sendOtp, verifyOtp, resendOtp } = useAuth();

  // ── State machine: idle → sending → otp_sent → verifying → done
  const [step, setStep]           = useState('idle'); // 'idle' | 'sending' | 'otp_sent' | 'verifying'
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const emailInputRef             = useRef(null);
  const isSending                 = step === 'sending';
  const isVerifying               = step === 'verifying';

  // Focus email input on mount
  useEffect(() => {
    setTimeout(() => emailInputRef.current?.focus(), 100);
  }, []);

  // Auto-submit OTP when all 6 digits are filled
  useEffect(() => {
    if (otp.length === 6 && step === 'otp_sent') {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleSendOtp = useCallback(async (e) => {
    e?.preventDefault();
    if (isSending) return;
    setError(''); setSuccess('');
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setStep('sending');
    try {
      const { cooldownUntil: until } = await sendOtp(cleaned);
      setCooldownUntil(until);
      setOtp('');
      setStep('otp_sent');
      setSuccess(`Code sent to ${cleaned} — check your inbox`);
    } catch (err) {
      setError(err.message || 'Failed to send code. Try again.');
      setStep('idle');
    }
  }, [email, isSending, sendOtp]);

  const handleVerify = useCallback(async () => {
    if (isVerifying) return;
    setError(''); setSuccess('');
    setStep('verifying');
    try {
      await verifyOtp(email.trim().toLowerCase(), otp);
      // onAuthStateChange in AuthContext will fire → user gets set → App redirects
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
      setOtp('');
      setStep('otp_sent');
    }
  }, [email, otp, isVerifying, verifyOtp]);

  const handleResend = useCallback(async () => {
    setError(''); setSuccess('');
    try {
      setStep('sending');
      const { cooldownUntil: until } = await resendOtp(email.trim().toLowerCase());
      setCooldownUntil(until);
      setOtp('');
      setStep('otp_sent');
      setSuccess('New code sent!');
    } catch (err) {
      setError(err.message || 'Could not resend. Please wait.');
      setStep('otp_sent');
    }
  }, [email, resendOtp]);

  const handleBackToEmail = () => {
    setStep('idle');
    setOtp('');
    setError('');
    setSuccess('');
    setTimeout(() => emailInputRef.current?.focus(), 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative" style={{ background: '#05050A' }}>
      <CyberBg />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

      <AnimatePresence mode="wait">
        {/* ── STEP 1: EMAIL ─────────────────────────────────── */}
        {step !== 'otp_sent' && step !== 'verifying' ? (
          <motion.div
            key="step-email"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24 }}
            className="glass-card p-9 w-full max-w-[420px] relative z-10"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 56, height: 56, borderRadius: 18,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                  border: '1px solid rgba(99,102,241,0.3)',
                  fontSize: 26, marginBottom: 20,
                  boxShadow: '0 0 30px rgba(99,102,241,0.15)',
                }}
              >⚡</motion.div>
              <h2 className="hero-heading-gradient"
                style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 6 }}>
                SMARTCHAT X
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.01em' }}>
                Enter your email to receive a sign-in code
              </p>
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {error   && <Alert type="error"   msg={error} />}
              {success && <Alert type="success" msg={success} />}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label style={{
                  display: 'block', fontSize: 10, fontWeight: 600,
                  color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: 8,
                }}>Email Address</label>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="neon-input"
                  required
                  autoComplete="email"
                  disabled={isSending}
                  style={{ opacity: isSending ? 0.6 : 1 }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={isSending || !email.trim()}
                className="btn-pill-white w-full font-semibold"
                style={{
                  justifyContent: 'center', borderRadius: 12,
                  padding: '13px 24px', marginTop: 4,
                  opacity: (isSending || !email.trim()) ? 0.55 : 1,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {isSending ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{ display: 'inline-block' }}
                    >⏳</motion.span>
                    Sending code…
                  </span>
                ) : (
                  '📨  Send Sign-In Code'
                )}
              </motion.button>
            </form>

            {/* OTP info note */}
            <p style={{
              textAlign: 'center', marginTop: 24,
              fontSize: 11, fontFamily: 'var(--font-mono)',
              color: 'rgba(255,255,255,0.18)', lineHeight: 1.6,
            }}>
              We'll send a 6-digit code to your email.<br />
              No password required. Secured by Supabase.
            </p>
          </motion.div>
        ) : (
        /* ── STEP 2: OTP ────────────────────────────────────── */
          <motion.div
            key="step-otp"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24 }}
            className="glass-card p-9 w-full max-w-[420px] relative z-10"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: 44, marginBottom: 16 }}
              >📬</motion.div>
              <h2 className="hero-heading-gradient"
                style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
                Check Your Email
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                We sent a 6-digit code to
              </p>
              <p style={{
                fontSize: 14, fontWeight: 600, color: '#fff',
                fontFamily: 'var(--font-mono)', marginTop: 4,
                padding: '6px 14px', borderRadius: 8,
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'inline-block',
              }}>
                {email}
              </p>
            </div>

            {/* Alerts */}
            <AnimatePresence>
              {error   && <Alert type="error"   msg={error} />}
              {success && <Alert type="success" msg={success} />}
            </AnimatePresence>

            {/* OTP Input */}
            <div>
              <label style={{
                display: 'block', fontSize: 10, fontWeight: 600,
                color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em',
                textTransform: 'uppercase', textAlign: 'center', marginBottom: 0,
              }}>Enter 6-digit code</label>
              <OtpInput
                value={otp}
                onChange={setOtp}
                disabled={isVerifying}
              />
            </div>

            {/* Verify button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleVerify}
              disabled={otp.length !== 6 || isVerifying}
              className="btn-pill-white w-full font-semibold"
              style={{
                justifyContent: 'center', borderRadius: 12,
                padding: '13px 24px',
                opacity: (otp.length !== 6 || isVerifying) ? 0.5 : 1,
              }}
            >
              {isVerifying ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ display: 'inline-block' }}
                  >⏳</motion.span>
                  Verifying…
                </span>
              ) : (
                '✓  Verify & Sign In'
              )}
            </motion.button>

            {/* Resend timer */}
            <ResendTimer
              cooldownUntil={cooldownUntil}
              onResend={handleResend}
              loading={step === 'sending'}
            />

            {/* Back link */}
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={handleBackToEmail}
                style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.25)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
              >
                ← Change Email
              </button>
            </div>

            <p style={{
              textAlign: 'center', marginTop: 18,
              fontSize: 10, fontFamily: 'var(--font-mono)',
              color: 'rgba(255,255,255,0.12)',
            }}>
              Code expires in 10 minutes · Secured by Supabase
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthScreen;
