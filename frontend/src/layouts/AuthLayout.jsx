/**
 * ─── AuthLayout.jsx ────────────────────────────────────
 * Layout for authentication-related pages.
 * Centered card with animated background.
 */
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 bg-gradient-mesh p-4 relative overflow-hidden">
      {/* Animated Orbs */}
      <div className="absolute w-96 h-96 rounded-full bg-primary-500/10 blur-3xl animate-float" />
      <div className="absolute w-72 h-72 rounded-full bg-neon-purple/10 blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      {/* Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-strong rounded-3xl p-8 w-full max-w-md relative z-10"
      >
        <Outlet />
      </motion.div>
    </div>
  );
};

export default AuthLayout;
