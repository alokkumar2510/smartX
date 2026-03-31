/* ─────────────────────────────────────────────────────────────
   WelcomeScreen — Intro splash matching the landing page style
   ───────────────────────────────────────────────────────────── */
import { motion } from 'framer-motion';
import CyberBg from './CyberBg';

const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

const WelcomeScreen = ({ onStart }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ background: '#05050A' }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
  >
    <CyberBg />
    {/* Very subtle grid */}
    <div className="fixed inset-0 bg-cyber-grid pointer-events-none z-0" />

    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: [0.16,1,0.3,1] }}
      className="relative z-10 text-center px-6 max-w-2xl"
    >
      {/* Badge pill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.16,1,0.3,1] }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          borderRadius: 9999,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          padding: '7px 16px', marginBottom: 40,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#fff', display: 'inline-block',
          boxShadow: '0 0 8px #fff',
        }} />
        <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1 }}>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>Next-gen comms — </span>
          <span style={{ color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>
            WebRTC + Groq AI
          </span>
        </span>
      </motion.div>

      {/* H1 */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.9, ease: [0.16,1,0.3,1] }}
        className="hero-heading-gradient"
        style={{
          fontSize: 'clamp(42px,7vw,76px)',
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: '-0.04em',
          marginBottom: 28,
          filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
        }}
      >
        SmartChat X
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.8 }}
        style={{
          fontSize: 16, fontWeight: 400, lineHeight: 1.7,
          color: 'rgba(255,255,255,0.6)',
          marginBottom: 48,
          letterSpacing: '-0.01em',
          maxWidth: 500, margin: '0 auto 48px',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        Advanced TCP/UDP communication powered by WebRTC, Groq AI,
        and dual-protocol smart routing.
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.8, ease: [0.16,1,0.3,1] }}
        style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}
      >
        {/* Primary CTA — white pill */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="btn-pill-white btn-glow-streak"
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          Get Started <ArrowRight />
        </motion.button>

        {/* Secondary CTA — dark pill */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-pill-dark"
          onClick={() => window.open('https://github.com', '_blank')}
        >
          View Architecture
        </motion.button>
      </motion.div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        style={{
          marginTop: 56,
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        TCP:9000 · UDP:9001 · WebSocket · E2E Encrypted
      </motion.p>
    </motion.div>
  </motion.div>
);

export default WelcomeScreen;
