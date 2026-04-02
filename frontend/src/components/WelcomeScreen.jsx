/* ─────────────────────────────────────────────────────────────
   WelcomeScreen — Powered by HeroSection (hero-odyssey)
   Uses the WebGL lightning shader as the landing splash.
   ───────────────────────────────────────────────────────────── */
import { motion } from 'framer-motion';
import { HeroSection } from '@/components/ui/hero-odyssey';

const WelcomeScreen = ({ onStart }) => (
  <motion.div
    className="fixed inset-0 z-50"
    style={{ background: '#05050A' }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
  >
    <HeroSection
      title="SmartChat X"
      subtitle="Powered by Groq AI"
      description="Next-gen TCP/UDP communication powered by WebRTC, Groq AI, and dual-protocol smart routing. Encrypted, fast, and intelligent."
      primaryCta="Get Started"
      onPrimaryCta={onStart}
      secondaryCta="View Architecture"
      onSecondaryCta={() => window.open('https://github.com', '_blank')}
      badgeText="Next-gen comms — WebRTC + Groq AI"
      techTags={['TCP:9000', 'UDP:9001', 'WebSocket', 'E2E Encrypted']}
      features={[
        { name: 'WebRTC', value: 'P2P calls' },
        { name: 'Groq AI', value: 'smart replies' },
        { name: 'Supabase', value: 'realtime DB' },
        { name: 'WebGL Shader', value: 'live FX' },
      ]}
      defaultHue={220}
      navLinks={[
        { label: 'Home' },
        { label: 'Features' },
        { label: 'Docs' },
        { label: 'Status' },
      ]}
    />
  </motion.div>
);

export default WelcomeScreen;
