/**
 * ─── StatsCard.jsx ─────────────────────────────────────
 * Dashboard stat card with icon, value, and trend indicator.
 */
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';

const StatsCard = ({ icon, label, value, trend, trendUp = true }) => {
  return (
    <Card className="flex items-center gap-4">
      {/* Icon */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500/20 to-neon-purple/10 border border-primary-500/20">
        <span className="text-2xl">{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1">
        <p className="text-label mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white"
          >
            {value}
          </motion.span>
          {trend && (
            <span className={`text-xs font-semibold ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;
