import { motion, AnimatePresence } from 'framer-motion';

const TypingIndicator = ({ users }) => (
  <AnimatePresence>
    {users.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2 px-4 py-1.5"
      >
        <span className="text-[10px] text-white/30 font-mono">{users.join(', ')} typing</span>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-neon-cyan"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
            style={{ boxShadow: '0 0 4px rgba(0,240,255,0.5)' }}
          />
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

export default TypingIndicator;
