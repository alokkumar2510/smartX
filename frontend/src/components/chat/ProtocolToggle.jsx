import { motion } from 'framer-motion';

export const PROTOCOL_INFO = {
  TCP: { color: '#00f0ff', bg: 'rgba(0,240,255,0.08)', border: 'rgba(0,240,255,0.2)', label: 'Reliable', emoji: '🔵' },
  UDP: { color: '#ff2d78', bg: 'rgba(255,45,120,0.08)', border: 'rgba(255,45,120,0.2)', label: 'Fast', emoji: '🟣' },
  AUTO: { color: '#b347ea', bg: 'rgba(179,71,234,0.08)', border: 'rgba(179,71,234,0.2)', label: 'AI Smart', emoji: '🧠' },
};

const ProtocolToggle = ({ protocol, onToggle }) => {
  const info = PROTOCOL_INFO[protocol] || PROTOCOL_INFO.TCP;
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl select-none"
      style={{ background: info.bg, border: `1px solid ${info.border}` }}
    >
      <span className="text-xs">{info.emoji}</span>
      <span className="text-[10px] font-orbitron font-bold" style={{ color: info.color }}>
        {protocol}
      </span>
      <span className="text-[8px] font-mono text-white/20">
        ({info.label})
      </span>
    </motion.button>
  );
};

export default ProtocolToggle;
