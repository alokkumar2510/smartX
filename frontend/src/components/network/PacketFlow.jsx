/**
 * ─── PacketFlow.jsx ────────────────────────────────────
 * Animated packet flow visualization showing data
 * traveling between nodes in real-time.
 */
import { motion } from 'framer-motion';

const PacketFlow = ({ packets = [] }) => {
  return (
    <div className="relative h-20">
      {packets.map((packet) => (
        <motion.div
          key={packet.id}
          initial={{ x: 0, opacity: 0 }}
          animate={{
            x: [0, 100, 200, 300],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 2, ease: 'linear' }}
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full
            ${packet.protocol === 'TCP' ? 'bg-blue-400 shadow-neon-blue' : 'bg-green-400 shadow-neon-purple'}
          `}
        />
      ))}

      {/* Track Line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
    </div>
  );
};

export default PacketFlow;
