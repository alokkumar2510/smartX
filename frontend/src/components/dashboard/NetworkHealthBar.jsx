/**
 * ─── NetworkHealthBar.jsx ──────────────────────────────
 * Visual health bar for network status with animated fill.
 */
import { motion } from 'framer-motion';

const NetworkHealthBar = ({ health = 100, label = 'Network Health' }) => {
  const getColor = (val) => {
    if (val >= 80) return 'from-green-500 to-emerald-400';
    if (val >= 50) return 'from-yellow-500 to-orange-400';
    return 'from-red-500 to-rose-400';
  };

  const getStatus = (val) => {
    if (val >= 80) return 'Excellent';
    if (val >= 50) return 'Moderate';
    return 'Critical';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-semibold text-white/70">
          {getStatus(health)} — {health}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(health, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${getColor(health)}`}
        />
      </div>
    </div>
  );
};

export default NetworkHealthBar;
