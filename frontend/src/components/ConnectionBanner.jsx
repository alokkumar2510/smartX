import { motion } from 'framer-motion';

const ConnectionBanner = ({ status, reconnectIn }) => {
  if (status === 'connected') return null;
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="px-4 py-2 text-center text-xs font-mono"
      style={{
        background: status === 'reconnecting' ? 'rgba(255,170,0,0.1)' : 'rgba(255,45,120,0.1)',
        borderBottom: `1px solid ${status === 'reconnecting' ? 'rgba(255,170,0,0.2)' : 'rgba(255,45,120,0.2)'}`,
        color: status === 'reconnecting' ? '#ffaa00' : '#ff2d78',
      }}
    >
      {status === 'reconnecting' ? `⏳ Reconnecting in ${reconnectIn}s...` : '⚠ Disconnected from server'}
    </motion.div>
  );
};

export default ConnectionBanner;
