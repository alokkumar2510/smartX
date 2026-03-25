/**
 * ─── LoadingSpinner.jsx ────────────────────────────────
 * Animated loading spinner with neon glow effect.
 */
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'md', label = '' }) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`${sizes[size]} rounded-full border-2 border-white/10 border-t-neon-blue`}
      />
      {label && (
        <p className="text-xs text-white/40 animate-pulse">{label}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
