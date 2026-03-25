/**
 * ─── ProtocolBadge.jsx ─────────────────────────────────
 * Displays a colored badge indicating the transport protocol
 * used for a message (TCP, UDP, Hybrid, WebRTC).
 */
const PROTOCOL_CONFIG = {
  TCP:    { label: 'TCP',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  UDP:    { label: 'UDP',    color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  HYBRID: { label: 'HYBRID', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  WEBRTC: { label: 'P2P',    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

const ProtocolBadge = ({ protocol = 'TCP' }) => {
  const config = PROTOCOL_CONFIG[protocol.toUpperCase()] || PROTOCOL_CONFIG.TCP;

  return (
    <span
      className={`
        inline-flex items-center px-1.5 py-0.5 rounded-md
        text-[9px] font-bold uppercase tracking-wider
        border ${config.color}
      `}
    >
      {config.label}
    </span>
  );
};

export default ProtocolBadge;
