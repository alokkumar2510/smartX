/**
 * ─── HomePage.jsx ──────────────────────────────────────
 * Landing page with hero section, feature grid, and
 * animated protocol visualization.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '@/animations/PageTransition';
import AnimatedList from '@/animations/AnimatedList';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const FEATURES = [
  { icon: '💬', title: 'Real-Time Chat',       desc: 'Instant messaging with TCP/UDP protocol switching' },
  { icon: '📊', title: 'Analytics Dashboard',   desc: 'Live charts, latency graphs, and network metrics' },
  { icon: '🌐', title: 'Network Visualization', desc: 'Interactive topology view with packet flow animation' },
  { icon: '🔐', title: 'End-to-End Encryption', desc: 'AES-256 encryption with Diffie-Hellman key exchange' },
  { icon: '⛓️', title: 'Blockchain Ledger',     desc: 'Immutable message logging with SHA-256 proof-of-work' },
  { icon: '🎮', title: 'Gamification',          desc: 'XP, levels, badges, and global leaderboard' },
];

const HomePage = () => {
  return (
    <PageTransition>
      <div className="space-y-16 py-8">
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
          >
            <h1 className="heading-display text-5xl md:text-7xl heading-gradient">
              SmartChat X
            </h1>
            <p className="text-xl md:text-2xl text-white/40 mt-4 max-w-2xl mx-auto text-balance">
              A production-grade TCP/UDP chat system with AI, blockchain, and real-time analytics.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 justify-center"
          >
            <Link to="/chat">
              <Button variant="primary" size="lg" id="cta-start-chatting">
                ⚡ Start Chatting
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="secondary" size="lg" id="cta-view-dashboard">
                📊 View Dashboard
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section>
          <h2 className="heading-section text-2xl text-center mb-8 gradient-text">
            Core Features
          </h2>
          <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <Card key={feature.title} neon className="text-center space-y-3">
                <span className="text-4xl">{feature.icon}</span>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-white/40">{feature.desc}</p>
              </Card>
            ))}
          </AnimatedList>
        </section>

        {/* Protocol Stats Preview */}
        <section className="text-center space-y-4">
          <h2 className="heading-section text-2xl gradient-text">
            Protocol Intelligence
          </h2>
          <p className="text-white/40 max-w-xl mx-auto">
            SmartChat X automatically selects the optimal protocol (TCP, UDP, or Hybrid)
            based on message type, network conditions, and user preferences.
          </p>
          <div className="flex justify-center gap-8 mt-6">
            {[
              { label: 'TCP', desc: 'Reliable', color: 'text-blue-400' },
              { label: 'UDP', desc: 'Fast', color: 'text-green-400' },
              { label: 'Hybrid', desc: 'Smart', color: 'text-purple-400' },
            ].map(({ label, desc, color }) => (
              <motion.div
                key={label}
                whileHover={{ scale: 1.1 }}
                className="text-center"
              >
                <p className={`text-3xl font-bold ${color}`}>{label}</p>
                <p className="text-xs text-white/30 mt-1">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default HomePage;
