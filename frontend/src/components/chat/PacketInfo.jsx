import { motion } from 'framer-motion';

const PacketInfo = ({ info, protocol }) => {
  if (!info) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-1 px-2 py-1 rounded-lg text-[8px] font-mono leading-relaxed"
      style={{
        background: protocol === 'TCP' ? 'rgba(0,240,255,0.05)' : 'rgba(255,45,120,0.05)',
        border: `1px solid ${protocol === 'TCP' ? 'rgba(0,240,255,0.1)' : 'rgba(255,45,120,0.1)'}`,
      }}
    >
      <div className="flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
        {info.fragments_sent && <span>📦 {info.fragments_sent} fragment{info.fragments_sent > 1 ? 's' : ''}</span>}
        {info.delivery_time_ms !== undefined && <span>⏱ {info.delivery_time_ms}ms</span>}
        {info.reliability && <span>🔒 {info.reliability}</span>}
        {info.packet_info?.[0]?.checksum && <span>✅ {info.packet_info[0].checksum}</span>}
      </div>
    </motion.div>
  );
};

export default PacketInfo;
