/* ─────────────────────────────────────────────────────────────
   WelcomeScreen — Powered by HeroSection (hero-odyssey)
   Uses the WebGL lightning shader as the landing splash.
   ───────────────────────────────────────────────────────────── */
import { motion } from 'framer-motion';
import { HeroSection } from '@/components/ui/hero-odyssey';

const WelcomeScreen = ({ onStart }) => {
  const isPortfolio = window.location.hostname === 'alokkumarsahu.in' || window.location.hostname === 'www.alokkumarsahu.in';

  const content = isPortfolio
    ? {
        title: "Alok Kumar Sahu",
        subtitle: "Full-Stack Engineer & AI Hacker",
        description: "Crafting high-performance scalable systems, real-time WebRTC communication layers, and beautiful AI-powered UI experiences.",
        primaryCta: "Enter App Experience",
        secondaryCta: "View GitHub",
        badgeText: "Welcome to my digital space",
        techTags: ['React', 'WebRTC', 'Supabase', 'Node.js', 'AI'],
        features: [
          { name: 'Engineering', value: 'scalable apps' },
          { name: 'Architecture', value: 'cloud native' },
          { name: 'Innovation', value: 'AI integration' },
          { name: 'UX/UI', value: 'WebGL shaders' },
        ],
        navLinks: [
          { label: 'About' },
          { label: 'Projects' },
          { label: 'Contact' },
        ],
        githubLink: 'https://github.com/alokkumar2510'
      }
    : {
        title: "SmartChat X",
        subtitle: "Powered by Groq AI",
        description: "Next-gen TCP/UDP communication powered by WebRTC, Groq AI, and dual-protocol smart routing. Encrypted, fast, and intelligent.",
        primaryCta: "Get Started",
        secondaryCta: "View Architecture",
        badgeText: "Next-gen comms — WebRTC + Groq AI",
        techTags: ['TCP:9000', 'UDP:9001', 'WebSocket', 'E2E Encrypted'],
        features: [
          { name: 'WebRTC', value: 'P2P calls' },
          { name: 'Groq AI', value: 'smart replies' },
          { name: 'Supabase', value: 'realtime DB' },
          { name: 'WebGL Shader', value: 'live FX' },
        ],
        navLinks: [
          { label: 'Home' },
          { label: 'Features' },
          { label: 'Docs' },
          { label: 'Status' },
        ],
        githubLink: 'https://github.com/alokkumar2510'
      };

  return (
    <motion.div
      className="fixed inset-0 z-50"
      style={{ background: '#05050A' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <HeroSection
        title={content.title}
        subtitle={content.subtitle}
        description={content.description}
        primaryCta={content.primaryCta}
        onPrimaryCta={onStart}
        secondaryCta={content.secondaryCta}
        onSecondaryCta={() => window.open(content.githubLink, '_blank')}
        badgeText={content.badgeText}
        techTags={content.techTags}
        features={content.features}
        defaultHue={240}
        navLinks={content.navLinks}
      />
    </motion.div>
  );
};

export default WelcomeScreen;
