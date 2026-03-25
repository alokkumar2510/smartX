/**
 * ─── Navbar.jsx ────────────────────────────────────────
 * Top navigation bar with logo, nav links, connection
 * status, and theme toggle.
 */
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Badge from '@/components/ui/Badge';

const NAV_LINKS = [
  { to: '/',          label: 'Home',      icon: '🏠' },
  { to: '/chat',      label: 'Chat',      icon: '💬' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/network',   label: 'Network',   icon: '🌐' },
  { to: '/settings',  label: 'Settings',  icon: '⚙️' },
];

const Navbar = ({ isConnected = false }) => {
  const { pathname } = useLocation();

  return (
    <nav className="glass-strong border-b border-white/5 px-6 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <motion.span
            className="text-2xl"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            ⚡
          </motion.span>
          <span className="heading-gradient text-lg font-bold hidden sm:block">
            SmartChat X
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ to, label, icon }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`
                  relative px-3 py-2 rounded-xl text-sm transition-all duration-300
                  ${isActive
                    ? 'text-white bg-white/10'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }
                `}
              >
                <span className="mr-1.5">{icon}</span>
                <span className="hidden md:inline">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Connection Status */}
        <Badge variant={isConnected ? 'success' : 'danger'} dot>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>
    </nav>
  );
};

export default Navbar;
