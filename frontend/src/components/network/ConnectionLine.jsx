/**
 * ─── ConnectionLine.jsx ────────────────────────────────
 * SVG line connecting two nodes with animated dashes.
 */
import { motion } from 'framer-motion';

const ConnectionLine = ({ from, to, active = true, protocol = 'TCP' }) => {
  const colors = {
    TCP: '#3b82f6',
    UDP: '#22c55e',
    HYBRID: '#a855f7',
  };

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none">
      <motion.line
        x1={from.x} y1={from.y}
        x2={to.x} y2={to.y}
        stroke={active ? colors[protocol] : 'rgba(255,255,255,0.1)'}
        strokeWidth={active ? 2 : 1}
        strokeDasharray={active ? '8 4' : '4 4'}
        initial={{ opacity: 0 }}
        animate={{
          opacity: active ? [0.3, 0.8, 0.3] : 0.2,
          strokeDashoffset: active ? [0, -24] : 0,
        }}
        transition={{
          opacity: { duration: 2, repeat: Infinity },
          strokeDashoffset: { duration: 1, repeat: Infinity, ease: 'linear' },
        }}
      />
    </svg>
  );
};

export default ConnectionLine;
